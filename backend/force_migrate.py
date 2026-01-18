
import logging
from database import engine
from migrations import run_migrations

logging.basicConfig(level=logging.INFO)

print("Running migrations...")
try:
    run_migrations(engine)
    print("Migrations finished.")
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
