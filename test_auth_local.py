import sys
import os

# Add the current directory to path so we can import backend modules
sys.path.append(os.getcwd())

try:
    from backend import auth
    
    print("Testing password hashing...")
    long_password = "a" * 100
    print(f"Hashing password of length {len(long_password)}")
    
    hashed = auth.get_password_hash(long_password)
    print(f"Hash success: {hashed[:10]}...")
    
    print("Verifying password...")
    is_valid = auth.verify_password(long_password, hashed)
    print(f"Verify success: {is_valid}")
    
except Exception as e:
    print(f"ERROR: {e}")
