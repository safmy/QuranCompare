#!/usr/bin/env python3
"""
Script to fix users via the API endpoints
"""
import json
import requests
from datetime import datetime, timedelta, timezone

# API configuration
API_BASE_URL = 'https://qurancompare.onrender.com'

# Premium users to fix
PREMIUM_USERS = [
    'syedahmadfahmybinsyedsalim@gmail.com',
    'safmy@example.com', 
    'zipkaa@gmail.com'
]

def check_user_subscription(email):
    """Check if user exists and their subscription status"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/payment/user/subscription/{email}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error checking {email}: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error checking {email}: {e}")
        return None

def create_or_update_user(email):
    """Create or update user via API"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/payment/user/subscription",
            json={"email": email},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error creating/updating {email}: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error creating/updating {email}: {e}")
        return None

def main():
    print("🔧 Fixing Premium Users via API\n")
    print("=" * 60)
    
    # First, check current status of all premium users
    print("📊 Checking current status of premium users:\n")
    
    for email in PREMIUM_USERS:
        print(f"📧 {email}:")
        result = check_user_subscription(email)
        
        if result:
            if result.get('user'):
                user = result['user']
                print(f"  Status: {user.get('status')}")
                print(f"  Tier: {user.get('tier')}")
                print(f"  Has Subscription: {result.get('hasSubscription')}")
                print(f"  Expires: {user.get('expires_at', 'N/A')}")
            else:
                print("  ❌ User not found")
        else:
            print("  ❌ Error checking user")
        print()
    
    # Now create/update users
    print("\n" + "=" * 60)
    print("🌟 Creating/Updating Premium Users:\n")
    
    for email in PREMIUM_USERS:
        print(f"📧 Processing {email}...")
        result = create_or_update_user(email)
        
        if result and result.get('success'):
            print(f"  ✅ Successfully processed")
        else:
            print(f"  ❌ Failed to process")
    
    # Final verification
    print("\n" + "=" * 60)
    print("📊 FINAL VERIFICATION:\n")
    
    for email in PREMIUM_USERS:
        result = check_user_subscription(email)
        
        if result and result.get('user'):
            user = result['user']
            has_sub = result.get('hasSubscription')
            
            print(f"{email}:")
            print(f"  Status: {user.get('status')} {'✅' if user.get('status') == 'active' else '❌'}")
            print(f"  Tier: {user.get('tier')} {'✅' if user.get('tier') == 'premium' else '❌'}")
            print(f"  Has Active Subscription: {'✅ Yes' if has_sub else '❌ No'}")
            print()
    
    print("\n✅ Process complete!")
    print("\n⚠️  NOTE: The API currently sets these users as premium in the code.")
    print("If they're still not showing as premium, the backend may need to be redeployed.")

if __name__ == "__main__":
    main()