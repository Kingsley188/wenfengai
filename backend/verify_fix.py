
import requests
import sys
import time

BASE_URL = "http://127.0.0.1:8001"

def test_fix():
    print("🚀 Starting local verification...")
    
    # 1. Register a user
    username = f"test_user_{int(time.time())}"
    print(f"👤 Registering user: {username}")
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": username,
        "password": "valid_password_123",
        "email": f"{username}@example.com"
    })
    
    if resp.status_code != 200:
        print(f"❌ Registration failed: {resp.text}")
        return
        
    # 2. Login to get token
    print("🔑 Logging in...")
    resp = requests.post(f"{BASE_URL}/api/auth/token", data={
        "username": username,
        "password": "valid_password_123"
    })
    
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.text}")
        return
        
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Call /api/tasks (Should return empty list [] if no tasks, but 200 OK)
    print("📋 Fetching tasks (Expect 200 OK)...")
    resp = requests.get(f"{BASE_URL}/api/tasks", headers=headers)
    
    if resp.status_code == 200:
        print(f"✅ /api/tasks returned 200 OK! Response: {resp.json()}")
    else:
        print(f"❌ /api/tasks failed code {resp.status_code}: {resp.text}")

if __name__ == "__main__":
    try:
        test_fix()
    except Exception as e:
        print(f"❌ Connection error: {e}")
