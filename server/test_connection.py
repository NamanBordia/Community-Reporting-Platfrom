import requests
import json

def test_flask_connection():
    """Test if Flask server is running and accessible"""
    print("🔍 Testing Flask Server Connection...")
    print("=" * 50)
    
    try:
        # Test 1: Basic server connection
        print("1. Testing basic server connection...")
        response = requests.get("http://localhost:5000/", timeout=5)
        print(f"   ✅ Server responds (Status: {response.status_code})")
        
        # Test 2: Analytics endpoint without auth (should return 401)
        print("2. Testing analytics endpoint without auth...")
        response = requests.get("http://localhost:5000/api/analytics/overview", timeout=5)
        print(f"   ✅ Analytics endpoint accessible (Status: {response.status_code})")
        
        if response.status_code == 401:
            print("   ✅ Expected: Requires authentication")
        elif response.status_code == 500:
            print("   ❌ Server error - check Flask logs")
            return False
        
        # Test 3: Test with admin token
        print("3. Testing with admin authentication...")
        
        # First, get admin token
        login_response = requests.post("http://localhost:5000/api/admin/login", 
                                     json={"username": "adminuser", "password": "YourSecurePassword"},
                                     timeout=5)
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            admin_token = token_data['access_token']
            print("   ✅ Admin login successful")
            
            # Test analytics with token
            headers = {'Authorization': f'Bearer {admin_token}'}
            analytics_response = requests.get("http://localhost:5000/api/analytics/overview", 
                                           headers=headers, timeout=5)
            
            if analytics_response.status_code == 200:
                print("   ✅ Analytics endpoint works with admin token")
                data = analytics_response.json()
                print(f"   📊 Data received: {list(data.keys())}")
                return True
            else:
                print(f"   ❌ Analytics failed (Status: {analytics_response.status_code})")
                print(f"   Response: {analytics_response.text}")
                return False
        else:
            print(f"   ❌ Admin login failed (Status: {login_response.status_code})")
            print(f"   Response: {login_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask server")
        print("   Make sure Flask server is running: python run.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_flask_connection()
    if success:
        print("\n✅ Flask server is working correctly!")
        print("   The issue might be with the React proxy configuration.")
    else:
        print("\n❌ Flask server has issues.")
        print("   Please check the server logs and try again.") 