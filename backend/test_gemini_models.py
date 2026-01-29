import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: No GEMINI_API_KEY found in environment")
    exit(1)

print(f"Testing with API Key: {api_key[:10]}...")
print("\n" + "="*60)

# Test different API versions and endpoints
endpoints_to_test = [
    ("v1beta", "https://generativelanguage.googleapis.com/v1beta/models"),
    ("v1", "https://generativelanguage.googleapis.com/v1/models"),
]

for version, base_url in endpoints_to_test:
    print(f"\n Testing API {version}")
    print("-" * 60)
    
    try:
        response = requests.get(f"{base_url}?key={api_key}")
        
        if response.status_code == 200:
            data = response.json()
            models = data.get('models', [])
            
            # Filter for models that support generateContent
            compatible_models = [
                m for m in models 
                if 'generateContent' in m.get('supportedGenerationMethods', [])
            ]
            
            print(f" Found {len(compatible_models)} compatible models:\n")
            
            for model in compatible_models[:10]:  # Show first 10
                name = model.get('name', 'Unknown')
                display_name = model.get('displayName', 'N/A')
                print(f"  • {name}")
                print(f"    Display: {display_name}")
                print()
        else:
            print(f" Error {response.status_code}: {response.text[:200]}")
            
    except Exception as e:
        print(f" Exception: {str(e)}")

print("\n" + "="*60)
print(" RECOMMENDED: Use the first model name shown above")
print("="*60)
