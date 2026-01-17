from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # 1. Corregir esquema para SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # 2. El motor SQLAlchemy gestionará los parámetros directamente

    # 3. Configurar el motor para USA Region
    if "dpg-" in DATABASE_URL:
        print("❌ CRITICAL WARNING: You are using a Render INTERNAL URL ('dpg-...').")
        print("   This URL only works inside Render's network and often expires.")
        print("   For persistence, please change it to your SUPABASE URL in the Render Dashboard.")
    
    print(f"DATABASE: Connecting to PostgreSQL")
    engine = create_engine(
        DATABASE_URL,
        pool_size=3,
        max_overflow=0,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 30
        }
    )
else:
    print("⚠️ DATABASE: Using SQLite (NON-PERSISTENT - DATA WILL BE LOST)")
    DATABASE_URL = "sqlite:///./sql_app.db"
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
