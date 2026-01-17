from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Engine for USA Region (us-east-1) Pooler
    engine = create_engine(
        DATABASE_URL,
        pool_size=3,
        max_overflow=0,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        # Force session stability for Supavisor in USA
        connect_args={
            "sslmode": "require",
            "connect_timeout": 30,
            "options": "-c statement_timeout=30000"
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
