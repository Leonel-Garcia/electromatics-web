
from database import SessionLocal
import models

def list_users():
    db = SessionLocal()
    users = db.query(models.User).all()
    print(f"ID | Email | Created At")
    print("-" * 30)
    for u in users:
        print(f"{u.id} | {u.email} | {u.created_at}")
    db.close()

if __name__ == "__main__":
    list_users()
