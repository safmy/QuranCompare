#!/usr/bin/env python3
"""
Script to fix premium users who are stuck on subscription page.
Updates their subscription status to active with proper expiry dates.
"""
import os
from supabase import create_client
from datetime import datetime, timedelta, timezone

# Supabase configuration
supabase_url = 'https://fsubmqjevlfpcirgsbhi.supabase.co'
supabase_key = os.getenv('SUPABASE_SERVICE_KEY', '')

# List of premium users who should have active subscriptions
PREMIUM_USERS = [
    'syedahmadfahmybinsyedsalim@gmail.com',
    # Add other premium users here
]

if not supabase_key:
    print("Please set SUPABASE_SERVICE_KEY environment variable")
    supabase_key = input("Enter your Supabase service key: ")

try:
    # Initialize Supabase client
    supabase = create_client(supabase_url, supabase_key)
    
    print("🔧 Fixing premium users...\n")
    
    for email in PREMIUM_USERS:
        print(f"📧 Processing {email}...")
        
        # Get user's current status
        response = supabase.table('user_subscriptions').select('*').eq('email', email).execute()
        
        if not response.data:
            print(f"  ⚠️  User not found, creating new premium entry...")
            # Create new premium user
            user_data = {
                'email': email,
                'status': 'active',
                'tier': 'premium',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            create_response = supabase.table('user_subscriptions').insert(user_data).execute()
            if create_response.data:
                print(f"  ✅ Created premium subscription for {email}")
            else:
                print(f"  ❌ Failed to create subscription for {email}")
        else:
            # Update existing user(s)
            for user in response.data:
                print(f"  📍 Found user ID: {user['id']}")
                print(f"     Current status: {user.get('status')} | Tier: {user.get('tier')} | Expires: {user.get('expires_at')}")
                
                # Update to premium with 1 year expiry
                update_data = {
                    'status': 'active',
                    'tier': 'premium',
                    'expires_at': (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }
                
                update_response = supabase.table('user_subscriptions').update(update_data).eq('id', user['id']).execute()
                
                if update_response.data:
                    print(f"  ✅ Updated to premium (expires: {update_data['expires_at']})")
                else:
                    print(f"  ❌ Failed to update user")
    
    print("\n✅ Premium user fix complete!")
    
    # Verify the changes
    print("\n📊 Verifying changes...")
    for email in PREMIUM_USERS:
        response = supabase.table('user_subscriptions').select('*').eq('email', email).execute()
        if response.data:
            user = response.data[0]
            print(f"\n{email}:")
            print(f"  Status: {user.get('status')}")
            print(f"  Tier: {user.get('tier')}")
            print(f"  Expires: {user.get('expires_at')}")
            
            # Check if subscription is truly active
            if user.get('expires_at'):
                expires_at = datetime.fromisoformat(user['expires_at'].replace('Z', '+00:00'))
                is_active = expires_at > datetime.now(timezone.utc)
                print(f"  Active: {'✅ Yes' if is_active else '❌ No'}")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()