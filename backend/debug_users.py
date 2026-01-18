
from database import SessionLocal
import models

def check_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        print(f"Total users: {len(users)}")
        for user in users:
            print(f"ID: {user.id}, Email: {user.email}, Created At: {user.created_at}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
