import os
from sqlalchemy import create_engine, text
import sys
import socket

print("--- DIAGNÓSTICO DE RED ELECTROMATICS ---")
host = "db.zvsxurjbfqwqwvottdka.supabase.co"
try:
    ip = socket.gethostbyname(host)
    print(f"✅ DNS local funciona. IP encontrada: {ip}")
except Exception as e:
    print(f"❌ DNS local FALLÓ: {e}")
    print("Sugerencia: Cambia tus DNS a los de Google (8.8.8.8) o usa el Pooler.")

db_url = input("\nPega tu DATABASE_URL aquí: ").strip()

if not db_url:
    sys.exit(0)

# Corrección automática de protocolo
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

print("\nIntentando conectar...")

try:
    # Usamos un timeout más corto para no esperar infinito
    engine = create_engine(
        db_url, 
        connect_args={"sslmode": "require", "connect_timeout": 10}
    )
    with engine.connect() as conn:
        result = conn.execute(text("SELECT now();"))
        print(f"✅ ¡CONEXIÓN EXITOSA! Hora en Supabase: {result.fetchone()[0]}")
        
except Exception as e:
    print(f"\n❌ ERROR DE CONEXIÓN:")
    print(str(e))
    if "could not translate host name" in str(e):
        print("\nCONSEJO: Estás teniendo problemas de DNS.")
        print("Prueba usando esta URL de respaldo (Pooler):")
        print("postgresql://postgres.zvsxurjbfqwqwvottdka:Electrobase.5103@aws-0-sa-east-1.pooler.supabase.com:6543/postgres")
