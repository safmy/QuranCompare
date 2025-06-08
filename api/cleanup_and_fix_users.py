#!/usr/bin/env python3
"""
Script to clean up duplicate users and fix premium subscriptions.
This combines duplicate cleanup with premium user fixes.
"""
import os
from supabase import create_client, Client
from datetime import datetime, timedelta, timezone
from collections import defaultdict

# Supabase configuration
supabase_url = 'https://fsubmqjevlfpcirgsbhi.supabase.co'

# IMPORTANT: You need the SERVICE KEY (not anon key) to modify database
# Get it from: Supabase Dashboard > Settings > API > service_role key
print("⚠️  IMPORTANT: You need the SERVICE KEY (not anon key) to modify the database")
print("Get it from: Supabase Dashboard > Settings > API > service_role key")
print("The key you provided appears to be an anon key which has read-only access.\n")

supabase_key = os.getenv('SUPABASE_SERVICE_KEY', '')

if not supabase_key:
    print("Please set SUPABASE_SERVICE_KEY environment variable")
    supabase_key = input("Enter your Supabase SERVICE key (starts with 'eyJ...'): ").strip()

# List of premium users
PREMIUM_USERS = [
    'syedahmadfahmybinsyedsalim@gmail.com',
    'safmy@example.com',
    'zipkaa@gmail.com'
]

try:
    # Initialize Supabase client with workaround for proxy issue
    from supabase.client import ClientOptions
    
    # Create options without any proxy settings
    options = ClientOptions(
        headers={},
        auto_refresh_token=True,
        persist_session=True
    )
    
    # Initialize Supabase client
    supabase = create_client(supabase_url, supabase_key, options)
    
    print("✅ Connected to Supabase\n")
    
    # Step 1: Get all users
    print("📊 Fetching all users...")
    response = supabase.table('user_subscriptions').select('*').execute()
    
    if not response.data:
        print("No users found in database")
        exit()
    
    print(f"Found {len(response.data)} total user entries\n")
    
    # Step 2: Group by normalized email (case-insensitive)
    users_by_email = defaultdict(list)
    for user in response.data:
        normalized_email = user['email'].lower().strip()
        users_by_email[normalized_email].append(user)
    
    # Step 3: Show duplicates
    print("🔍 Checking for duplicates...")
    duplicates_found = False
    duplicate_emails = []
    
    for email, users in users_by_email.items():
        if len(users) > 1:
            duplicates_found = True
            duplicate_emails.append(email)
            print(f"\n📧 {email} has {len(users)} entries:")
            
            # Sort by created_at to find the most recent
            users.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            for i, user in enumerate(users):
                status = "KEEP (newest)" if i == 0 else "DELETE"
                created = user.get('created_at', 'Unknown')[:19] if user.get('created_at') else 'Unknown'
                print(f"  [{status}] ID: {user.get('id')} | Created: {created} | Status: {user.get('status')} | Tier: {user.get('tier')}")
    
    if not duplicates_found:
        print("✅ No duplicate users found!")
    else:
        print(f"\n⚠️  Found {len(duplicate_emails)} emails with duplicates")
    
    # Step 4: Show premium users status
    print("\n" + "="*60)
    print("📊 Premium Users Status Check:")
    print("="*60)
    
    for premium_email in PREMIUM_USERS:
        normalized_email = premium_email.lower().strip()
        users = users_by_email.get(normalized_email, [])
        
        print(f"\n📧 {premium_email}:")
        if not users:
            print("  ❌ NOT FOUND - Will create")
        else:
            for user in users:
                expires = user.get('expires_at', 'None')
                if expires and expires != 'None':
                    try:
                        exp_date = datetime.fromisoformat(expires.replace('Z', '+00:00'))
                        is_active = exp_date > datetime.now(timezone.utc)
                        expires_str = exp_date.strftime('%Y-%m-%d')
                        active_str = "✅ Active" if is_active else "❌ Expired"
                    except:
                        expires_str = expires
                        active_str = "❓ Unknown"
                else:
                    expires_str = "None"
                    active_str = "❌ No expiry"
                
                print(f"  ID: {user.get('id')} | Status: {user.get('status')} | Tier: {user.get('tier')} | Expires: {expires_str} | {active_str}")
    
    # Step 5: Ask for confirmation
    print("\n" + "="*60)
    print("🔧 ACTIONS TO PERFORM:")
    print("="*60)
    print("1. Delete all duplicate user entries (keeping newest)")
    print("2. Update/create premium users with 1-year subscriptions")
    print("3. Normalize all emails to lowercase")
    
    confirm = input("\nDo you want to proceed with these actions? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("❌ Operation cancelled.")
        exit()
    
    # Step 6: Clean up duplicates
    if duplicates_found:
        print("\n🧹 Cleaning up duplicates...")
        deleted_count = 0
        
        for email, users in users_by_email.items():
            if len(users) > 1:
                # Sort by created_at to find the most recent
                users.sort(key=lambda x: x.get('created_at', ''), reverse=True)
                
                # Delete all except the newest
                for user in users[1:]:
                    try:
                        supabase.table('user_subscriptions').delete().eq('id', user['id']).execute()
                        deleted_count += 1
                        print(f"  ❌ Deleted duplicate for {email} (ID: {user['id']})")
                    except Exception as e:
                        print(f"  ⚠️  Failed to delete ID {user['id']}: {e}")
        
        print(f"\n✅ Deleted {deleted_count} duplicate entries")
    
    # Step 7: Fix premium users
    print("\n🌟 Updating premium users...")
    
    for premium_email in PREMIUM_USERS:
        normalized_email = premium_email.lower().strip()
        print(f"\n📧 Processing {premium_email}...")
        
        # Get current user (after cleanup)
        response = supabase.table('user_subscriptions').select('*').eq('email', normalized_email).execute()
        
        if not response.data:
            # Create new premium user
            print(f"  Creating new premium user...")
            user_data = {
                'email': normalized_email,
                'status': 'active',
                'tier': 'premium',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            try:
                create_response = supabase.table('user_subscriptions').insert(user_data).execute()
                if create_response.data:
                    print(f"  ✅ Created premium subscription")
                else:
                    print(f"  ❌ Failed to create subscription")
            except Exception as e:
                print(f"  ❌ Error creating user: {e}")
        else:
            # Update existing user
            user = response.data[0]
            print(f"  Updating existing user (ID: {user['id']})...")
            
            update_data = {
                'email': normalized_email,  # Ensure email is normalized
                'status': 'active',
                'tier': 'premium',
                'expires_at': (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            try:
                update_response = supabase.table('user_subscriptions').update(update_data).eq('id', user['id']).execute()
                if update_response.data:
                    print(f"  ✅ Updated to premium (expires in 365 days)")
                else:
                    print(f"  ❌ Failed to update")
            except Exception as e:
                print(f"  ❌ Error updating user: {e}")
    
    # Step 8: Final verification
    print("\n" + "="*60)
    print("📊 FINAL VERIFICATION:")
    print("="*60)
    
    for premium_email in PREMIUM_USERS:
        normalized_email = premium_email.lower().strip()
        response = supabase.table('user_subscriptions').select('*').eq('email', normalized_email).execute()
        
        if response.data:
            user = response.data[0]
            print(f"\n{premium_email}:")
            print(f"  Status: {user.get('status')}")
            print(f"  Tier: {user.get('tier')}")
            
            expires = user.get('expires_at')
            if expires:
                try:
                    exp_date = datetime.fromisoformat(expires.replace('Z', '+00:00'))
                    is_active = exp_date > datetime.now(timezone.utc)
                    print(f"  Expires: {exp_date.strftime('%Y-%m-%d %H:%M UTC')}")
                    print(f"  Active: {'✅ Yes' if is_active else '❌ No'}")
                except Exception as e:
                    print(f"  Expires: {expires} (parse error: {e})")
        else:
            print(f"\n{premium_email}: ❌ NOT FOUND")
    
    print("\n✅ All operations complete!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    
    print("\n💡 Common issues:")
    print("1. Make sure you're using the SERVICE key, not the anon key")
    print("2. Service key can be found in: Supabase Dashboard > Settings > API > service_role")
    print("3. The service key has full database access, unlike the anon key")