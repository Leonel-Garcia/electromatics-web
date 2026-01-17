from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # 1. Corregir esquema para SQLAlchemy
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # 2. Extraer parámetros especiales antes de crear el motor
    import urllib.parse as urlparse
    from urllib.parse import urlencode, urlunparse
    
    url_parts = list(urlparse.urlparse(DATABASE_URL))
    query = dict(urlparse.parse_qsl(url_parts[4]))
    
    # Extraer prepare_threshold si existe para evitar error en psycopg2/SQLAlchemy
    # Lo quitamos tanto de la URL como de los argumentos internos para máxima compatibilidad
    query.pop('prepare_threshold', None)
    
    url_parts[4] = urlencode(query)
    DATABASE_URL = urlunparse(url_parts)
    
    # Determinar sslmode basado en el host
    # heroweb.top no soporta SSL, otros servidores (Supabase, Render) sí lo requieren
    if "heroweb" in DATABASE_URL.lower():
        ssl_mode = "disable"
        print("DATABASE: SSL disabled (heroweb.top does not support SSL)")
    else:
        ssl_mode = "require"
        print("DATABASE: SSL enabled")
    
    connect_args = {
        "sslmode": ssl_mode,
        "connect_timeout": 30
    }
    # No añadimos prep_threshold a connect_args ya que psycopg2 no lo soporta en el DSN o argumentos de conexión directos de esta forma

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
        connect_args=connect_args
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
