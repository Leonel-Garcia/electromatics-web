
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

def fix_db():
    # Get DB URL from env or fallback
    url = os.getenv("DATABASE_URL") or "sqlite:///./backend/sql_app.db"
    
    # Simple fix for Heroku/Render postgres://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
        
    print(f"Connecting to {url.split('@')[-1] if '@' in url else 'local file'}")
    
    engine = create_engine(url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Check if column exists and has NULLs
        # Use text() for executable SQL
        result = session.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
        session.commit()
        print(f"Updated {result.rowcount} users with missing registration dates.")
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    fix_db()
