import requests
import json

def test_server_status():
    """Test if the Flask server is running and accessible"""
    try:
        print("Testing Flask server status...")
        
        # Test basic connection
        response = requests.get("http://localhost:5000/", timeout=5)
        print(f"✓ Server is running (Status: {response.status_code})")
        
        # Test analytics endpoint (should fail without auth, but server should respond)
        response = requests.get("http://localhost:5000/api/analytics/overview", timeout=5)
        print(f"✓ Analytics endpoint accessible (Status: {response.status_code})")
        
        if response.status_code == 401:
            print("✓ Server is running but requires authentication (expected)")
        elif response.status_code == 500:
            print("✗ Server error - check Flask logs")
        else:
            print(f"Response: {response.text[:200]}...")
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to Flask server. Make sure it's running on port 5000.")
        print("Run: python run.py")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    test_server_status() 