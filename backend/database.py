from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Production (Supabase/PostgreSQL or Render/PostgreSQL)
    # Handle different URL formats
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Supabase requires SSL connections
    # Check if it's a Supabase URL
    is_supabase = "supabase" in DATABASE_URL
    
    engine_args = {
        "poolclass": QueuePool,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,  # Recycle connections after 30 minutes
    }
    
    # Add SSL requirement for Supabase
    if is_supabase:
        engine_args["connect_args"] = {"sslmode": "require"}
    
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
