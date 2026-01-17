from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Engine optimized for Supabase Pooler (Session Mode - Port 5432)
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,             # Allow up to 5 concurrent connections
        max_overflow=10,         # Allow temporary spikes
        pool_timeout=30,
        pool_recycle=1800,       # Keep connections alive for 30 min
        pool_pre_ping=True,      # Vital: Checks if connection is alive before using it
        connect_args={
            "sslmode": "require",
            "connect_timeout": 15
        }
    )
else:
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
