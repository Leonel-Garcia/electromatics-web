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
    Prioritizes DeepSeek -> fallback to Gemini.
    """
    try:
        body = await request.json()
        
        # 1. Try DeepSeek first (User Preference)
        deepseek_key = os.getenv("DEEPSEEK_API_KEY") or "sk-09180722007046cd8ac3cc7007f4dcd8"
        
        if deepseek_key:
            try:
                # Extract text from Gemini-format payload
                user_prompt = body.get('contents', [])[0].get('parts', [])[0].get('text', '')
                
                deepseek_url = "https://api.deepseek.com/chat/completions"
                deepseek_payload = {
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": "You are ElectrIA, an expert electrical engineering assistant. Always output valid JSON when requested."},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.7
                }
                
                response = requests.post(
                    deepseek_url,
                    json=deepseek_payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {deepseek_key}"
                    },
                    timeout=60
                )
                
                if response.status_code == 200:
                    data = response.json()
                    content_text = data['choices'][0]['message']['content']
                    # Return in a format the frontend (expecting Gemini or simple text) can handle
                    # If the frontend expects raw text, we return it. If it expects Gemini JSON, we emulate it.
                    # Based on previous logic, let's return a JSON with the text.
                    return JSONResponse(content={"text": content_text})
                else:
                    logger.error(f"DeepSeek Error {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"DeepSeek Exception: {str(e)}")
        
        # 2. Fallback to Gemini
        # 2. Fallback to Gemini (Try 2.0 Flash first, then 1.5 Flash)
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="No API Keys available")

        # Attempt 1: Gemini 2.0 Flash
        try:
            url_v2 = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={api_key}"
            google_response = requests.post(url_v2, json=body, headers={"Content-Type": "application/json"}, timeout=60)
            
            if google_response.status_code == 200:
                return JSONResponse(content=google_response.json())
                
            logger.warning(f"Gemini 2.0 Flash failed ({google_response.status_code}), trying 1.5 Flash...")
        except Exception as e:
            logger.error(f"Gemini 2.0 Error: {e}")

        # Attempt 2: Gemini 1.5 Flash (Fallback)
        try:
            url_v15 = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            google_response = requests.post(url_v15, json=body, headers={"Content-Type": "application/json"}, timeout=60)
            
            if google_response.status_code == 200:
                return JSONResponse(content=google_response.json())
            else:
                return JSONResponse(status_code=google_response.status_code, content=google_response.json())
        except Exception as e:
            logger.error(f"Gemini 1.5 Error: {e}")
            return JSONResponse(status_code=500, content={"error": {"message": "All AI models are currently busy."}})

    except Exception as e:
        logger.error(f"Proxy Error: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/")
def read_root():
    return {"message": "Electromatics API is running"}

if __name__ == "__main__":
    import uvicorn
    # Reload disabled to prevent loop in some envs, but usually fine
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
