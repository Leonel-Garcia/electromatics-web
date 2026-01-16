
import os
from sqlalchemy import create_engine, text
import sys

# FORMATO: postgresql://postgres:[PASSWORD]@db.zvsxurjbfqwqwvottdka.supabase.co:5432/postgres
db_url = input("Pega tu DATABASE_URL de Supabase aquí: ")

if not db_url.startswith("postgresql://") and not db_url.startswith("postgres://"):
    print("Error: La URL debe empezar con postgresql:// o postgres://")
    sys.exit(1)

if "postgres://" in db_url:
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print("\nIntentando conectar a Supabase...")

try:
    engine = create_engine(db_url, connect_args={"sslmode": "require"})
    with engine.connect() as conn:
        result = conn.execute(text("SELECT current_database(), now();"))
        row = result.fetchone()
        print(f"✅ ¡CONEXIÓN EXITOSA!")
        print(f"Base de datos: {row[0]}")
        print(f"Hora en servidor: {row[1]}")
        
except Exception as e:
    print(f"\n❌ ERROR DE CONEXIÓN:")
    print(str(e))
