
import os
from sqlalchemy import create_engine, inspect

def check_db_schema():
    url = os.getenv("DATABASE_URL") or "sqlite:///./backend/sql_app.db"
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
        
    print(f"Connecting to DB...")
    engine = create_engine(url)
    inspector = inspect(engine)
    
    if "users" in inspector.get_table_names():
        columns = inspector.get_columns("users")
        print("Columns in 'users' table:")
        for c in columns:
            print(f"- {c['name']} ({c['type']})")
    else:
        print("Table 'users' NOT FOUND!")

if __name__ == "__main__":
    check_db_schema()
