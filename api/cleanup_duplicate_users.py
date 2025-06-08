#!/usr/bin/env python3
"""
Script to clean up duplicate user entries in the database.
Keeps the most recent entry for each email and removes duplicates.
"""
import os
from supabase import create_client
from datetime import datetime
from collections import defaultdict

# Supabase configuration
supabase_url = 'https://fsubmqjevlfpcirgsbhi.supabase.co'
supabase_key = os.getenv('SUPABASE_SERVICE_KEY', '')

if not supabase_key:
    print("Please set SUPABASE_SERVICE_KEY environment variable")
    supabase_key = input("Enter your Supabase service key: ")

try:
    # Initialize Supabase client
    supabase = create_client(supabase_url, supabase_key)
    
    # Get all users
    response = supabase.table('user_subscriptions').select('*').execute()
    
    if not response.data:
        print("No users found in database")
        exit()
    
    # Group users by email
    users_by_email = defaultdict(list)
    for user in response.data:
        users_by_email[user['email']].append(user)
    
    # Find duplicates
    duplicates_found = False
    for email, users in users_by_email.items():
        if len(users) > 1:
            duplicates_found = True
            print(f"\n📧 Found {len(users)} entries for {email}:")
            
            # Sort by created_at to find the most recent
            users.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            for i, user in enumerate(users):
                status = "KEEP" if i == 0 else "DELETE"
                print(f"  [{status}] ID: {user.get('id')} | Created: {user.get('created_at')} | Status: {user.get('status')} | Expires: {user.get('expires_at')}")
    
    if not duplicates_found:
        print("✅ No duplicate users found!")
        exit()
    
    # Ask for confirmation
    print("\n" + "="*50)
    confirm = input("\nDo you want to clean up these duplicates? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("Cleanup cancelled.")
        exit()
    
    # Clean up duplicates
    deleted_count = 0
    for email, users in users_by_email.items():
        if len(users) > 1:
            # Sort by created_at to find the most recent
            users.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            # Keep the first (most recent) and delete the rest
            for user in users[1:]:
                try:
                    delete_response = supabase.table('user_subscriptions').delete().eq('id', user['id']).execute()
                    deleted_count += 1
                    print(f"❌ Deleted duplicate entry for {email} (ID: {user['id']})")
                except Exception as e:
                    print(f"⚠️  Failed to delete ID {user['id']}: {e}")
    
    print(f"\n✅ Cleanup complete! Deleted {deleted_count} duplicate entries.")
    
except Exception as e:
    print(f"\n❌ Error: {e}")