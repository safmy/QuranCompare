#!/usr/bin/env python3
import os
from supabase import create_client
from datetime import datetime

# Get the user's email
email = input("Enter the customer's email address: ")

# Supabase configuration
supabase_url = 'https://fsubmqjevlfpcirgsbhi.supabase.co'
supabase_key = input("Enter your Supabase service key: ")

try:
    # Initialize Supabase client
    supabase = create_client(supabase_url, supabase_key)
    
    # Check user subscription
    response = supabase.table('user_subscriptions').select('*').eq('email', email).execute()
    
    if response.data:
        user = response.data[0]
        print(f"\n✅ User found in database:")
        print(f"Email: {user.get('email')}")
        print(f"Status: {user.get('status')}")
        print(f"Tier: {user.get('tier')}")
        print(f"Stripe Customer ID: {user.get('stripe_customer_id')}")
        print(f"Stripe Subscription ID: {user.get('stripe_subscription_id')}")
        print(f"Expires at: {user.get('expires_at')}")
        print(f"Created at: {user.get('created_at')}")
        print(f"Updated at: {user.get('updated_at')}")
        
        # Check if subscription is active
        if user.get('status') == 'active' and user.get('expires_at'):
            expires = datetime.fromisoformat(user.get('expires_at').replace('Z', '+00:00'))
            if expires > datetime.now():
                print(f"\n✅ Subscription is ACTIVE and valid")
            else:
                print(f"\n❌ Subscription has EXPIRED")
        else:
            print(f"\n❌ Subscription is NOT ACTIVE")
    else:
        print(f"\n❌ User not found in database")
        
except Exception as e:
    print(f"\n❌ Error: {e}")