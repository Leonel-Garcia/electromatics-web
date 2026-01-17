from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Production (Supabase/PostgreSQL)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Let Supabase handle the pooling via the URL parameters
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True
    )
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
