from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timedelta
import models, schemas, auth, database
from email_service import email_service
import requests
import os
import pydantic
import migrations
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    # Run migrations and create tables safely in background
    try:
        logger.info("🚀 Starting database initialization in background...")
        # Obfuscated URL for logging
        db_url_clean = str(database.engine.url).split("@")[-1] if "@" in str(database.engine.url) else "local"
        logger.info(f"📡 Target DB Host: {db_url_clean}")
        
        migrations.run_migrations(database.engine)
        models.Base.metadata.create_all(bind=database.engine)
        logger.info("✅ Database initialization successful.")
    except Exception as e:
        logger.error(f"❌ DATABASE INIT FAILED: {str(e)}")
        logger.error("The app is running but DB calls might fail.")


# CORS Configuration - Allow frontend origins
# Manual CORS Middleware - Brute Force
@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    # Handle preflight OPTIONS requests directly
    if request.method == "OPTIONS":
        return Response(
            status_code=204,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    
    # Handle normal requests
    try:
        response = await call_next(request)
        # Force CORS headers on response
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    except Exception as e:
        # Fallback for errors to ensure they also get CORS headers
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*"
            }
        )

@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    logger.info(f"Attempting to register user: {user.email}")
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if this is the first user to make them admin
    is_first_user = db.query(models.User).count() == 0
    
    # Generate verification token
    verification_token = email_service.generate_verification_token()
    token_expiry = email_service.get_token_expiry()
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        is_premium=True, # BETA: Free Premium for everyone
        is_admin=is_first_user, # First user is admin
        email_verified=True,  # BETA: Auto-verified to allow immediate login
        verification_token=verification_token,
        verification_token_expires=token_expiry
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Send verification email (in dev mode, this logs to console)
    email_service.send_verification_email(
        email=new_user.email,
        token=verification_token,
        user_name=new_user.full_name
    )
    
    return new_user

@app.post("/verify-email", response_model=schemas.VerificationResponse)
def verify_email(verification: schemas.EmailVerification, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(
        models.User.verification_token == verification.token
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    # Check if token is expired
    if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Verify the email
    user.email_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()
    
    return {"success": True, "message": "Email verified successfully!"}

@app.post("/resend-verification")
def resend_verification(email: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate new verification token
    verification_token = email_service.generate_verification_token()
    token_expiry = email_service.get_token_expiry()
    
    user.verification_token = verification_token
    user.verification_token_expires = token_expiry
    db.commit()
    
    # Send verification email
    email_service.send_verification_email(
        email=user.email,
        token=verification_token,
        user_name=user.full_name
    )
    
    return {"success": True, "message": "Verification email sent"}

@app.post("/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in",
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/admin/stats")
def read_admin_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(database.get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    today = datetime.utcnow().date()
    start_of_day = datetime(today.year, today.month, today.day)
    
    # Basic User Stats
    total_users = db.query(models.User).count()
    premium_users = db.query(models.User).filter(models.User.is_premium == True).count()
    verified_users = db.query(models.User).filter(models.User.email_verified == True).count()
    recent_users = db.query(models.User).order_by(models.User.id.desc()).limit(5).all()
    
    # Analytics Stats
    total_visits = db.query(models.PageVisit).count()
    
    # Total time (sum of durations)
    total_duration = db.query(func.sum(models.PageVisit.duration_seconds)).scalar() or 0
    
    # Active sessions (heartbeat in last 5 mins)
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    active_users = db.query(models.PageVisit.session_id).filter(models.PageVisit.last_heartbeat >= five_mins_ago).distinct().count()
    
    # Top Pages
    top_pages = db.query(
        models.PageVisit.path, 
        func.count(models.PageVisit.id).label('count')
    ).group_by(models.PageVisit.path).order_by(text('count DESC')).limit(5).all()
    
    # Format Top Pages
    top_pages_list = [{"path": p.path, "views": p.count} for p in top_pages]

    # Log registration dates for debugging
    if recent_users:
        logger.info(f"Sample user date: {recent_users[0].created_at}")

    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "verified_users": verified_users,
        "recent_users": recent_users,
        "analytics": {
            "total_visits": total_visits,
            "total_duration_minutes": round(total_duration / 60, 1),
            "active_users": active_users,
            "top_pages": top_pages_list
        }
    }

@app.get("/admin/users", response_model=schemas.UsersList)
def get_all_users(
    skip: int = 0, 
    limit: int = 20, 
    search: str = None,
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    """
    Get all users with pagination and optional search.
    Admin only endpoint.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Base query
    query = db.query(models.User)
    
    # Apply search filter if provided
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (models.User.email.ilike(search_filter)) | 
            (models.User.full_name.ilike(search_filter))
        )
    
    # Get total count for pagination
    total = query.count()
    
    # Apply pagination
    users = query.order_by(models.User.id.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "users": users
    }

@app.get("/admin/users/export")
def export_users_csv(
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(database.get_db)
):
    """
    Export all users to CSV format.
    Admin only endpoint.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all users
    users = db.query(models.User).order_by(models.User.id.desc()).all()
    
    # Create CSV content
    import io
    import csv
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['ID', 'Email', 'Nombre Completo', 'Fecha Registro', 'Premium', 'Verificado', 'Admin'])
    
    # Write user data
    for user in users:
        writer.writerow([
            user.id,
            user.email,
            user.full_name,
            (user.created_at - timedelta(hours=4)).strftime('%Y-%m-%d %H:%M') if user.created_at else '',
            'Sí' if user.is_premium else 'No',
            'Sí' if user.email_verified else 'No',
            'Sí' if user.is_admin else 'No'
        ])
    
    # Get CSV content
    csv_content = output.getvalue()
    output.close()
    
    # Return as downloadable file
    from fastapi.responses import Response
    filename = f"usuarios_electromatics_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@app.put("/admin/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Update a user's details. Admin only.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
        
    db.commit()
    db.refresh(db_user)
    return db_user

@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Delete a user. Admin only.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db.delete(db_user)
    db.commit()
    
    return {"success": True, "message": "User deleted successfully"}


@app.post("/analytics/visit")
def record_visit(visit: schemas.VisitCreate, db: Session = Depends(database.get_db), current_user_token: str = None):
    # Try to identify user from token if present (optional)
    user_id = None
    if current_user_token:
        # Simple decode user - in prod use proper dependecy but this is a tracking pixel essentially
        pass 

    new_visit = models.PageVisit(
        session_id=visit.session_id,
        path=visit.path,
        user_id=user_id
    )
    db.add(new_visit)
    db.commit()
    db.refresh(new_visit)
    return {"visit_id": new_visit.id}

@app.post("/analytics/heartbeat/{visit_id}")
def heartbeat(visit_id: int, db: Session = Depends(database.get_db)):
    visit = db.query(models.PageVisit).filter(models.PageVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    now = datetime.utcnow()
    visit.last_heartbeat = now
    
    # Update duration
    delta = now - visit.timestamp
    visit.duration_seconds = int(delta.total_seconds())
    
    db.commit()
    return {"status": "ok"}

@app.post("/generate-content")
async def generate_content_proxy(request: Request):
    """
    Secure proxy for AI API calls.
    Priority: Grok (xAI) -> Gemini -> DeepSeek
    """
    try:
        body = await request.json()
        errors_log = []  # Track all errors for debugging
        
        # 1. Try Grok (xAI) first - Newest provider
        grok_key = os.getenv("GROK_API_KEY")
        if grok_key:
            logger.info("🚀 Attempting Grok API (xAI)...")
            
            try:
                # Transform Gemini format to OpenAI-compatible format for Grok
                # Gemini format: {"contents": [{"parts": [{"text": "..."}]}]}
                # OpenAI format: {"messages": [{"role": "user", "content": "..."}]}
                
                grok_body = {
                    "model": "grok-beta",  # or "grok-2-latest"
                    "messages": [],
                    "temperature": 0.7,
                    "max_tokens": 4096
                }
                
                # Extract text from Gemini format
                if "contents" in body:
                    for content in body["contents"]:
                        if "parts" in content:
                            for part in content["parts"]:
                                if "text" in part:
                                    grok_body["messages"].append({
                                        "role": "user",
                                        "content": part["text"]
                                    })
                
                # Fallback: if no messages were extracted, use raw body
                if not grok_body["messages"] and "prompt" in body:
                    grok_body["messages"] = [{"role": "user", "content": body["prompt"]}]
                
                url = "https://api.x.ai/v1/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {grok_key}"
                }
                
                grok_response = requests.post(url, json=grok_body, headers=headers, timeout=25)
                
                if grok_response.status_code == 200:
                    logger.info("✅ Grok API responded successfully")
                    grok_data = grok_response.json()
                    
                    # Transform OpenAI response back to Gemini format
                    # OpenAI: {"choices": [{"message": {"content": "..."}}]}
                    # Gemini: {"candidates": [{"content": {"parts": [{"text": "..."}]}}]}
                    
                    gemini_format = {
                        "candidates": [{
                            "content": {
                                "parts": [{
                                    "text": grok_data["choices"][0]["message"]["content"]
                                }],
                                "role": "model"
                            },
                            "finishReason": "STOP",
                            "safetyRatings": []
                        }],
                        "usageMetadata": {
                            "promptTokenCount": grok_data.get("usage", {}).get("prompt_tokens", 0),
                            "candidatesTokenCount": grok_data.get("usage", {}).get("completion_tokens", 0),
                            "totalTokenCount": grok_data.get("usage", {}).get("total_tokens", 0)
                        }
                    }
                    
                    return JSONResponse(
                        content=gemini_format,
                        media_type="application/json"
                    )
                else:
                    errors_log.append(f"Grok: {grok_response.status_code} - {grok_response.text[:200]}")
                    logger.warning(f"⚠️ Grok API failed: {grok_response.status_code}")
            except Exception as e:
                errors_log.append(f"Grok Exception: {str(e)}")
                logger.error(f"❌ Grok API error: {str(e)}")
        else:
            errors_log.append("GROK_API_KEY not configured")
            logger.info("ℹ️ GROK_API_KEY not set, skipping Grok")
        
        # 2. Try Gemini (Google) - Primary fallback
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            logger.info("🤖 Attempting Gemini API...")
            
            # Use only stable, publicly available models
            # Avoiding beta/preview models that cause 404/429 errors
            models_to_try = [
                # Primary: Free tier Flash model (most reliable)
                "gemini-1.5-flash-latest",
                # Fallback: Pro model for complex queries
                "gemini-1.5-pro-latest",
                # Alternative: Experimental (may have higher limits)
                "gemini-exp-1206"
            ]

            for model_name in models_to_try:
                try:
                    # Use v1 stable endpoint for -latest models
                    api_version = "v1"
                    
                    url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent?key={gemini_key}"
                    
                    google_response = requests.post(url, json=body, headers={"Content-Type": "application/json"}, timeout=25)
                    
                    if google_response.status_code == 200:
                        logger.info(f"✅ {model_name} responded successfully")
                        return JSONResponse(
                            content=google_response.json(),
                            media_type="application/json"
                        )
                    else:
                        errors_log.append(f"{model_name}: {google_response.status_code}")
                except Exception as e:
                    errors_log.append(f"{model_name} Exception: {str(e)}")
        else:
            errors_log.append("GEMINI_API_KEY not configured")
            logger.warning("⚠️ GEMINI_API_KEY environment variable not set")

        # 3. Try DeepSeek as last fallback (Tertiary provider)
        deepseek_key = os.getenv("DEEPSEEK_API_KEY")
        if deepseek_key:
            logger.info("🔷 Attempting DeepSeek API...")
            try:
                # DeepSeek uses OpenAI-compatible format like Grok
                deepseek_body = {
                    "model": "deepseek-chat",
                    "messages": [],
                    "temperature": 0.7
                }
                
                # Extract text from Gemini format
                if "contents" in body:
                    for content in body["contents"]:
                        if "parts" in content:
                            for part in content["parts"]:
                                if "text" in part:
                                    deepseek_body["messages"].append({
                                        "role": "user",
                                        "content": part["text"]
                                    })
                
                url = "https://api.deepseek.com/v1/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {deepseek_key}"
                }
                
                deepseek_response = requests.post(url, json=deepseek_body, headers=headers, timeout=25)
                
                if deepseek_response.status_code == 200:
                    logger.info("✅ DeepSeek API responded successfully")
                    deepseek_data = deepseek_response.json()
                    
                    # Transform to Gemini format
                    gemini_format = {
                        "candidates": [{
                            "content": {
                                "parts": [{
                                    "text": deepseek_data["choices"][0]["message"]["content"]
                                }],
                                "role": "model"
                            },
                            "finishReason": "STOP"
                        }]
                    }
                    
                    return JSONResponse(
                        content=gemini_format,
                        media_type="application/json"
                    )
                else:
                    errors_log.append(f"DeepSeek: {deepseek_response.status_code}")
            except Exception as e:
                errors_log.append(f"DeepSeek Exception: {str(e)}")
        
        if errors_log:
             logger.warning(f"Failed attempts: {errors_log}")

        # All providers failed
        error_summary = " | ".join(errors_log) if errors_log else "Unknown error"
        logger.error(f"🚫 All AI providers failed: {error_summary}")
        raise HTTPException(
            status_code=503, 
            detail=f"ElectrIA no disponible temporalmente. Todos los proveedores de IA fallaron. Intenta de nuevo en unos segundos."
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        logger.error(f"🚫 Proxy Error: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/health/ai")
def check_ai_health():
    """
    Health check endpoint to verify AI API configuration.
    Does not reveal actual keys, only shows if they are configured.
    """
    grok_key = os.getenv("GROK_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    
    # At least one provider should be configured
    is_operational = bool(grok_key or gemini_key or deepseek_key)
    
    return {
        "status": "operational" if is_operational else "degraded",
        "providers": {
            "grok": {
                "configured": bool(grok_key),
                "key_preview": f"{grok_key[:6]}...{grok_key[-4:]}" if grok_key and len(grok_key) > 12 else "not set",
                "priority": 1
            },
            "gemini": {
                "configured": bool(gemini_key),
                "key_preview": f"{gemini_key[:8]}...{gemini_key[-4:]}" if gemini_key and len(gemini_key) > 12 else "not set",
                "priority": 2
            },
            "deepseek": {
                "configured": bool(deepseek_key),
                "key_preview": f"{deepseek_key[:8]}...{deepseek_key[-4:]}" if deepseek_key and len(deepseek_key) > 12 else "not set",
                "priority": 3
            }
        },
        "message": "ElectrIA is ready" if is_operational else "No AI providers configured. Set GROK_API_KEY, GEMINI_API_KEY or DEEPSEEK_API_KEY environment variables."
    }

@app.get("/api/bcv")
def get_bcv_rate():
    """
    Fetch the BCV (Banco Central de Venezuela) exchange rate.
    Uses multiple reliable APIs with fallbacks to ensure daily updates.
    Priority: 1) bcv-api.rafnixg.dev 2) api.dolarvzla.com 3) Direct BCV scrape 4) Fallback
    """
    errors_log = []
    
    # Source 1: BCV API by rafnixg (most reliable, dedicated BCV scraper)
    try:
        logger.info("📡 Intentando API bcv-api.rafnixg.dev...")
        resp = requests.get("https://bcv-api.rafnixg.dev/rates/", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            # API returns: {"dollar": 367.30, "date": "2026-01-29"}
            if "dollar" in data:
                rate = float(data["dollar"])
                logger.info(f"✅ bcv-api.rafnixg.dev: {rate}")
                return {
                    "rate": rate,
                    "source": "BCV Oficial (API rafnixg)",
                    "updated_at": data.get("date", datetime.utcnow().isoformat())
                }
            # Alternative format: {"rates": {"USD": 55.12}}
            elif "rates" in data and "USD" in data["rates"]:
                rate = float(data["rates"]["USD"])
                logger.info(f"✅ bcv-api.rafnixg.dev (alt): {rate}")
                return {
                    "rate": rate,
                    "source": "BCV Oficial (API rafnixg)",
                    "updated_at": data.get("date", datetime.utcnow().isoformat())
                }
        errors_log.append(f"rafnixg: {resp.status_code}")
    except Exception as e:
        errors_log.append(f"rafnixg: {str(e)[:50]}")
        logger.warning(f"⚠️ bcv-api.rafnixg.dev falló: {str(e)}")

    # Source 2: DolarVZLA API (public, high rate limit)
    try:
        logger.info("📡 Intentando API api.dolarvzla.com...")
        resp = requests.get("https://api.dolarvzla.com/public/exchange-rate", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            # Look for BCV rate in the response
            if isinstance(data, dict):
                # Format: {"bcv": {"usd": 55.12, ...}, "paralelo": {...}}
                if "bcv" in data and "usd" in data["bcv"]:
                    rate = float(data["bcv"]["usd"])
                    logger.info(f"✅ dolarvzla.com (bcv): {rate}")
                    return {
                        "rate": rate,
                        "source": "BCV Oficial (DolarVZLA API)",
                        "updated_at": datetime.utcnow().isoformat()
                    }
                # Alternative: direct USD field
                elif "usd" in data:
                    rate = float(data["usd"])
                    logger.info(f"✅ dolarvzla.com: {rate}")
                    return {
                        "rate": rate,
                        "source": "BCV Oficial (DolarVZLA)",
                        "updated_at": datetime.utcnow().isoformat()
                    }
        errors_log.append(f"dolarvzla: {resp.status_code}")
    except Exception as e:
        errors_log.append(f"dolarvzla: {str(e)[:50]}")
        logger.warning(f"⚠️ api.dolarvzla.com falló: {str(e)}")

    # Source 3: Direct Scrape from BCV Official (fallback due to SSL/JS issues)
    try:
        logger.info("📡 Intentando scrap directo de BCV (bcv.org.ve)...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
        
        bcv_resp = requests.get("https://www.bcv.org.ve/", headers=headers, timeout=15, verify=False)
        
        if bcv_resp.status_code == 200:
            import re
            html_content = bcv_resp.text
            
            # Pattern 1: Standard ID 'dolar' with strong tag
            match = re.search(r'id=["\']dolar["\'].*?strong>\s*([\d,.]+)\s*<', html_content, re.DOTALL | re.IGNORECASE)
            
            # Pattern 2: Search for USD text near a number
            if not match:
                match = re.search(r'USD.*?strong>\s*([\d,.]+)\s*<', html_content, re.DOTALL | re.IGNORECASE)
            
            # Pattern 3: Look for strong tags with rate-like values (50-500 range for current BCV)
            if not match:
                potentials = re.findall(r'strong>\s*([\d]{2,3},[\d]+)\s*<', html_content)
                if potentials:
                    # BCV order is EUR, CNY, TRY, RUB, USD (USD is usually last)
                    rate_str = potentials[-1].replace(',', '.')
                    rate = float(rate_str)
                    logger.info(f"✅ BCV Scrape (patrón secundario): {rate}")
                    return {
                        "rate": rate,
                        "source": "BCV Oficial (Scrape Directo)",
                        "updated_at": datetime.utcnow().isoformat()
                    }

            if match:
                rate_str = match.group(1).replace(',', '.')
                rate = float(rate_str)
                logger.info(f"✅ BCV Scrape Exitoso: {rate}")
                return {
                    "rate": rate,
                    "source": "BCV Oficial (Scrape en Tiempo Real)",
                    "updated_at": datetime.utcnow().isoformat()
                }
        errors_log.append(f"BCV scrape: {bcv_resp.status_code if 'bcv_resp' in dir() else 'failed'}")
    except Exception as e:
        errors_log.append(f"BCV scrape: {str(e)[:50]}")
        logger.warning(f"⚠️ BCV Scrape falló: {str(e)}")

    # Source 4: Hardcoded Fallback (last resort, needs manual update when all APIs fail)
    # IMPORTANT: Update this value periodically when APIs are unavailable
    # Last Manual Update: 29-Jan-2026
    current_fixed_rate = 367.30  # Updated to current BCV rate
    logger.warning(f"⚠️ Todas las APIs fallaron, usando tasa de respaldo: {current_fixed_rate}. Errores: {errors_log}")
    return {
        "rate": current_fixed_rate,
        "source": "Sistema Electromatics (Respaldo 29-Ene-2026)",
        "updated_at": datetime.utcnow().isoformat(),
        "warning": "Tasa de respaldo - APIs no disponibles temporalmente"
    }

@app.get("/")
def read_root():
    return {"message": "Electromatics API is running"}

if __name__ == "__main__":
    import uvicorn
    # Reload disabled to prevent loop in some envs, but usually fine
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
