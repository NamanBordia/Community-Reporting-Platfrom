#!/usr/bin/env python3
import subprocess
import time
import requests
import sys
import os

def start_flask_server():
    """Start the Flask server and test connection"""
    print("Starting Flask server...")
    
    try:
        # Start Flask server in background
        process = subprocess.Popen([sys.executable, "run.py"], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        
        # Wait a moment for server to start
        time.sleep(3)
        
        # Test if server is running
        try:
            response = requests.get("http://localhost:5000/", timeout=5)
            if response.status_code == 404:  # 404 is expected for root route
                print("✅ Flask server is running successfully!")
                print("✅ Server accessible at http://localhost:5000")
                print("\n📊 You can now access:")
                print("   - Admin Dashboard: http://localhost:3000/admin")
                print("   - Analytics: http://localhost:3000/analytics")
                print("\n🔄 Keep this terminal open to keep the server running")
                print("   Press Ctrl+C to stop the server")
                
                # Keep the server running
                try:
                    process.wait()
                except KeyboardInterrupt:
                    print("\n🛑 Stopping Flask server...")
                    process.terminate()
                    process.wait()
                    print("✅ Server stopped")
                    
            else:
                print(f"⚠️  Server responded with status: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print("❌ Cannot connect to Flask server")
            print("   Make sure no other process is using port 5000")
            process.terminate()
            return False
            
    except Exception as e:
        print(f"❌ Error starting Flask server: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Community Reporting Platform - Flask Server")
    print("=" * 50)
    start_flask_server() 