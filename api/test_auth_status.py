#!/usr/bin/env python3
"""
Quick test to check if API authentication endpoints are working
"""

import requests

def test_auth_endpoints():
    base_url = "https://qurancompare.onrender.com"
    
    print("🔍 Testing API authentication endpoints...")
    
    # Test Stripe config endpoint
    try:
        response = requests.get(f"{base_url}/api/payment/config")
        print(f"✅ Stripe config: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            has_key = bool(data.get('publishable_key'))
            print(f"   Publishable key configured: {has_key}")
    except Exception as e:
        print(f"❌ Stripe config error: {e}")
    
    # Test payment endpoint (should fail without auth, but at least respond)
    try:
        response = requests.post(f"{base_url}/api/payment/create-checkout-session", 
                               json={"email": "test@example.com"})
        print(f"✅ Payment endpoint: {response.status_code}")
        if response.status_code != 200:
            print(f"   Expected error: {response.text[:100]}")
    except Exception as e:
        print(f"❌ Payment endpoint error: {e}")
    
    print("\n🔧 If endpoints are working, issue is with frontend auth configuration")

if __name__ == "__main__":
    test_auth_endpoints()