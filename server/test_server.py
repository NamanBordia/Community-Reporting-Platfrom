import requests
import json

def test_admin_login():
    """Test the admin login endpoint"""
    try:
        # Test the admin login endpoint
        url = "http://localhost:5000/api/admin/login"
        data = {
            "username": "adminuser",
            "password": "YourSecurePassword"
        }
        
        print(f"Testing admin login at: {url}")
        print(f"Data: {data}")
        
        response = requests.post(url, json=data)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response data: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response text: {response.text}")
            
    except Exception as e:
        print(f"Error testing admin login: {e}")

if __name__ == "__main__":
    test_admin_login() 