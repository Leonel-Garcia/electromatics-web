"""
Test de conexión a la base de datos de heroweb.top
"""
import os
os.environ["DATABASE_URL"] = "postgresql://herowebt_admin:Electrobase.2026@heroweb.top:5432/herowebt_electromatics"

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ["DATABASE_URL"]

print("=" * 60)
print("🔌 PRUEBA DE CONEXIÓN A HEROWEB.TOP")
print("=" * 60)
print(f"URL: postgresql://herowebt_admin:****@heroweb.top:5432/herowebt_electromatics")
print()

try:
    # Crear engine con configuración para PostgreSQL remoto
    engine = create_engine(
        DATABASE_URL,
        pool_size=3,
        max_overflow=0,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        connect_args={
            "connect_timeout": 30
        }
    )
    
    # Probar conexión
    print("⏳ Conectando a la base de datos...")
    with engine.connect() as conn:
        result = conn.execute(text("SELECT version();"))
        version = result.fetchone()[0]
        print(f"✅ CONEXIÓN EXITOSA!")
        print(f"   PostgreSQL: {version[:60]}...")
        
        # Verificar tablas existentes
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in result.fetchall()]
        
        if tables:
            print(f"\n📋 Tablas existentes: {', '.join(tables)}")
        else:
            print(f"\n📋 No hay tablas aún (base de datos vacía)")
        
        print("\n" + "=" * 60)
        print("🎉 LA BASE DE DATOS ESTÁ LISTA PARA USAR")
        print("=" * 60)
        
except Exception as e:
    print(f"❌ ERROR DE CONEXIÓN: {e}")
    print("\nPosibles causas:")
    print("  1. El servidor no acepta conexiones externas")
    print("  2. El firewall bloquea el puerto 5432")
    print("  3. Las credenciales son incorrectas")
    print("  4. La base de datos no existe")
