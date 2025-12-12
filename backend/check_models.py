import urllib.request
import json
import ssl

KEY = "AIzaSyApTuw6vfjhS1ZwDv2yNl0FC3iimVtKi1U"
URL = f"https://generativelanguage.googleapis.com/v1beta/models?key={KEY}"

def list_models():
    try:
        # Create unverified context to avoid SSL certificate issues in some dev environments
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(URL, context=context) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print("Available Models:")
                for model in data.get('models', []):
                    if 'generateContent' in model.get('supportedGenerationMethods', []):
                        print(f"- {model['name']}")
            else:
                print(f"Error: {response.status}")
                print(response.read().decode())
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    list_models()
