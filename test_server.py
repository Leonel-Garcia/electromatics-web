import requests
import time
import sys

def test_server():
    print("Testing connection to http://127.0.0.1:8001/ ...")
    try:
        # Test Root Endpoint
        response = requests.get("http://127.0.0.1:8001/")
        if response.status_code == 200:
            print("Server is reachable! Response:", response.json())
        else:
            print(f"Server responded with status code: {response.status_code}")
            sys.exit(1)

        # Test Registration Endpoint (Dry Run)
        print("\nTesting Registration Endpoint...")
        payload = {
            "email": "test_user@example.com",
            "password": "TestPassword123!",
            "full_name": "Test User"
        }
        response = requests.post("http://127.0.0.1:8001/register", json=payload)
        
        if response.status_code == 200:
            print("Registration successful! User created:", response.json())
            print("Note: This test user is now the Admin (since it was the first user).")
        elif response.status_code == 400 and "Email already registered" in response.text:
             print("Server is working (User already exists).")
        else:
            print(f"Registration failed. Status: {response.status_code}, Body: {response.text}")
            sys.exit(1)

    except requests.exceptions.ConnectionError:
        print("Could not connect to the server. Is it running?")
        sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Wait a bit for server to ensure it's up if called immediately after start
    time.sleep(2)
    test_server()
