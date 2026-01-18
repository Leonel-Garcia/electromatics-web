
from database import SessionLocal
import models
from datetime import datetime

def fix_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).filter(models.User.created_at == None).all()
        print(f"Found {len(users)} users with missing created_at")
        for user in users:
            user.created_at = datetime.utcnow()
            print(f"Fixed user {user.id}")
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    fix_users()
