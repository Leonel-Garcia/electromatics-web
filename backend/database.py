from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Production (Supabase/PostgreSQL or Render/PostgreSQL)
    # 1. Fix 'postgres://' for SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # 2. Add sslmode=require if it's Supabase and not already there
    if "supabase" in DATABASE_URL and "sslmode" not in DATABASE_URL:
        if "?" in DATABASE_URL:
            DATABASE_URL += "&sslmode=require"
        else:
            DATABASE_URL += "?sslmode=require"
    
    engine_args = {
        "poolclass": QueuePool,
        "pool_size": 2,        # Reduced for Free Tier compatibility
        "max_overflow": 5,
        "pool_timeout": 30,
        "pool_recycle": 600,  # More frequent recycle for dynamic IPs
    }
    
    # 3. Connect args (redundancy)
    if "supabase" in DATABASE_URL:
        engine_args["connect_args"] = {"sslmode": "require", "connect_timeout": 10}
    
    engine = create_engine(DATABASE_URL, **engine_args)
else:
    # Local development (SQLite)
    DATABASE_URL = "sqlite:///./sql_app.db"
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    Dependency that provides a database session.
    Ensures proper connection cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
