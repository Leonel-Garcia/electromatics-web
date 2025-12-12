import requests
import json
import random

email = f"debug_{random.randint(1000,9999)}@example.com"
url = "https://electromatics-api.onrender.com/register"
payload = {
    "email": email,
    "password": "start123password",
    "full_name": "Debug User"
}

print(f"Attempting register to {url} with {email}...")

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    try:
        print("Response JSON:", response.json())
    except:
        print("Response Text:", response.text)
except Exception as e:
    print(f"Request failed: {e}")
