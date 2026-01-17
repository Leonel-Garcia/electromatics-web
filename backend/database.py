from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Engine configured for Supabase Transaction Pooler (Port 6543)
    engine = create_engine(
        DATABASE_URL,
        pool_size=3,              # Small pool for better stability
        max_overflow=0,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        # IMPORTANT: Disable statement caching for Supavisor compatibility
        execution_options={
            "isolation_level": "AUTOCOMMIT"
        },
        connect_args={
            "sslmode": "require",
            "connect_timeout": 20
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
