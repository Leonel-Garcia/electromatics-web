from database import engine
import models
from sqlalchemy import inspect

def check_tables():
    print("Connecting to database...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {tables}")
    
    if "page_visits" in tables:
        print("SUCCESS: 'page_visits' table exists.")
        columns = [c['name'] for c in inspector.get_columns("page_visits")]
        print(f"Columns: {columns}")
    else:
        print("ERROR: 'page_visits' table MISSING.")
        print("Attempting to create tables...")
        models.Base.metadata.create_all(bind=engine)
        print("Creation command sent.")

if __name__ == "__main__":
    check_tables()
