from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # 1. Corregir esquema para SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # 2. AUTO-CORRECCIÓN: Eliminar parámetros que Psycopg2 no entiende (como prepare_threshold)
    # Esto soluciona problemas de memoria caché en Render
    if "prepare_threshold" in DATABASE_URL:
        import urllib.parse as urlparse
        from urllib.parse import urlencode, urlunparse
        
        url_parts = list(urlparse.urlparse(DATABASE_URL))
        query = dict(urlparse.parse_qsl(url_parts[4]))
        query.pop('prepare_threshold', None)  # Borrar el culpable
        url_parts[4] = urlencode(query)
        DATABASE_URL = urlunparse(url_parts)

    # 3. Configurar el motor para USA Region
    print("🗄️ DATABASE: Connecting to PostgreSQL (Persistent)")
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
