import requests
import sys

try:
    response = requests.get("http://127.0.0.1:8000/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    if response.status_code == 200:
        print("Connection Successful")
        sys.exit(0)
    else:
        print("Connection Failed with non-200 status")
        sys.exit(1)
except Exception as e:
    print(f"Connection Error: {e}")
    sys.exit(1)
