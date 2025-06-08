#!/usr/bin/env python3
"""
Test the subscription flow to ensure duplicate users are not created
"""
import requests
import json
import time

API_BASE_URL = "https://qurancompare.onrender.com"

def test_subscription_flow(email):
    print(f"\n🧪 Testing subscription flow for: {email}")
    print("="*50)
    
    # Step 1: Check initial subscription status
    print("\n1️⃣ Checking initial subscription status...")
    response = requests.get(f"{API_BASE_URL}/api/payment/user/subscription/{email}")
    print(f"   Status: {response.status_code}")
    data = response.json()
    print(f"   Has Subscription: {data.get('hasSubscription')}")
    if data.get('user'):
        print(f"   User ID: {data['user'].get('id')}")
        print(f"   Status: {data['user'].get('status')}")
        print(f"   Tier: {data['user'].get('tier')}")
    
    # Step 2: Create/update user (simulating login)
    print("\n2️⃣ Creating/updating user (simulating login)...")
    response = requests.post(
        f"{API_BASE_URL}/api/payment/user/subscription",
        json={"email": email}
    )
    print(f"   Status: {response.status_code}")
    data = response.json()
    print(f"   Success: {data.get('success')}")
    if data.get('user'):
        print(f"   User ID: {data['user'].get('id')}")
    
    # Step 3: Check subscription again
    print("\n3️⃣ Checking subscription after login...")
    response = requests.get(f"{API_BASE_URL}/api/payment/user/subscription/{email}")
    data = response.json()
    print(f"   Has Subscription: {data.get('hasSubscription')}")
    
    # Step 4: Try creating user again (should not create duplicate)
    print("\n4️⃣ Attempting to create user again (should not duplicate)...")
    response = requests.post(
        f"{API_BASE_URL}/api/payment/user/subscription",
        json={"email": email}
    )
    data = response.json()
    print(f"   Success: {data.get('success')}")
    if data.get('user'):
        print(f"   User ID: {data['user'].get('id')} (should be same as before)")
    
    print("\n✅ Test complete!")

if __name__ == "__main__":
    # Test with a few different emails
    test_emails = [
        "test@example.com",
        "syedahmadfahmybinsyedsalim@gmail.com",  # Should have premium
        "newuser@example.com"
    ]
    
    for email in test_emails:
        test_subscription_flow(email)
        time.sleep(1)  # Small delay between tests