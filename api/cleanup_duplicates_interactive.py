#!/usr/bin/env python3
"""
Interactive script to clean up duplicate user entries in the database.
"""
import os
from supabase import create_client
from datetime import datetime
from collections import defaultdict

# Supabase configuration
supabase_url = 'https://fsubmqjevlfpcirgsbhi.supabase.co'

print("🔧 Duplicate User Cleanup Tool")
print("="*50)
print("")
print("This tool will help clean up duplicate user entries in the database.")
print("It will keep the most recent entry for each email and remove duplicates.")
print("")
print("You'll need your Supabase service key (not the anon key).")
print("You can find it in your Supabase dashboard under Settings > API.")
print("")

# Get service key from user
supabase_key = input("Enter your Supabase service key: ").strip()

if not supabase_key:
    print("❌ No key provided. Exiting.")
    exit()

try:
    print("\n🔄 Connecting to Supabase...")
    # Initialize Supabase client
    supabase = create_client(supabase_url, supabase_key)
    
    # Get all users
    print("📋 Fetching user data...")
    response = supabase.table('user_subscriptions').select('*').execute()
    
    if not response.data:
        print("✅ No users found in database")
        exit()
    
    print(f"✅ Found {len(response.data)} total user entries")
    
    # Group users by email
    users_by_email = defaultdict(list)
    for user in response.data:
        users_by_email[user['email']].append(user)
    
    # Find duplicates
    duplicates_found = False
    duplicate_count = 0
    
    for email, users in users_by_email.items():
        if len(users) > 1:
            duplicates_found = True
            duplicate_count += len(users) - 1
            print(f"\n📧 Found {len(users)} entries for {email}:")
            
            # Sort by created_at to find the most recent
            users.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            for i, user in enumerate(users):
                status_emoji = "✅" if i == 0 else "❌"
                action = "KEEP" if i == 0 else "DELETE"
                print(f"  {status_emoji} [{action}] ID: {user.get('id')}")
                print(f"     Created: {user.get('created_at')}")
                print(f"     Status: {user.get('status')} | Tier: {user.get('tier')}")
                if user.get('expires_at'):
                    print(f"     Expires: {user.get('expires_at')}")
    
    if not duplicates_found:
        print("\n✅ No duplicate users found! Database is clean.")
        exit()
    
    # Summary
    print("\n" + "="*50)
    print(f"📊 Summary: Found {duplicate_count} duplicate entries to remove")
    print("="*50)
    
    # Ask for confirmation
    confirm = input("\nDo you want to clean up these duplicates? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("❌ Cleanup cancelled.")
        exit()
    
    # Clean up duplicates
    print("\n🧹 Cleaning up duplicates...")
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
                    print(f"✅ Deleted duplicate entry for {email} (ID: {user['id']})")
                except Exception as e:
                    print(f"⚠️  Failed to delete ID {user['id']}: {e}")
    
    print(f"\n✅ Cleanup complete! Deleted {deleted_count} duplicate entries.")
    print("\n🎉 Your database is now clean!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("\nPlease check:")
    print("1. Your service key is correct (not the anon key)")
    print("2. You have the right permissions on the user_subscriptions table")
    print("3. Your Supabase project is active")