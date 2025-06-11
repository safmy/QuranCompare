#!/usr/bin/env python3
"""
Real User Testing Management Tool
=================================

This tool helps manage testing with real email addresses and phone numbers
from friends/volunteers who want to help test the QuranCompare subscription system.

Usage:
    python test_real_users.py [command] [options]

Commands:
    add         Add a new test user
    list        List all test users
    test        Run tests with real users
    export      Export user list
    import      Import user list
"""

import json
import csv
import os
import sys
import argparse
from datetime import datetime
from typing import List, Dict, Optional
import requests
from tabulate import tabulate
import getpass


class RealUserTester:
    """Manage testing with real volunteer users"""
    
    def __init__(self, data_file: str = "test_volunteers.json"):
        self.data_file = data_file
        self.users = self.load_users()
        
    def load_users(self) -> List[Dict]:
        """Load users from file"""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r') as f:
                return json.load(f)
        return []
    
    def save_users(self):
        """Save users to file"""
        with open(self.data_file, 'w') as f:
            json.dump(self.users, f, indent=2)
        print(f"✓ Saved {len(self.users)} users to {self.data_file}")
    
    def add_user(self):
        """Interactively add a new test user"""
        print("\n=== Add Test Volunteer ===")
        print("Enter details for the volunteer who will help test:\n")
        
        # Get user details
        name = input("Name: ").strip()
        email = input("Email: ").strip().lower()
        phone = input("Phone (with country code, e.g., +1234567890): ").strip()
        
        # Validate email
        if '@' not in email or '.' not in email:
            print("✗ Invalid email format")
            return
        
        # Check if user already exists
        existing = next((u for u in self.users if u['email'] == email), None)
        if existing:
            print(f"✗ User with email {email} already exists")
            update = input("Update existing user? (y/n): ").lower()
            if update != 'y':
                return
            # Update existing user
            existing['name'] = name
            existing['phone'] = phone
            existing['updated_at'] = datetime.now().isoformat()
        else:
            # Add new user
            user = {
                'name': name,
                'email': email,
                'phone': phone,
                'added_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'test_status': 'pending',
                'subscription_status': 'unknown',
                'notes': ''
            }
            
            # Optional notes
            notes = input("Notes (optional, press Enter to skip): ").strip()
            if notes:
                user['notes'] = notes
            
            self.users.append(user)
            print(f"✓ Added {name} ({email})")
        
        self.save_users()
    
    def add_bulk_users(self, csv_file: str):
        """Add multiple users from CSV file"""
        print(f"\n=== Importing users from {csv_file} ===")
        
        try:
            with open(csv_file, 'r') as f:
                reader = csv.DictReader(f)
                count = 0
                
                for row in reader:
                    email = row.get('email', '').strip().lower()
                    if not email:
                        continue
                    
                    # Check if already exists
                    if any(u['email'] == email for u in self.users):
                        print(f"⚠ Skipping {email} (already exists)")
                        continue
                    
                    user = {
                        'name': row.get('name', '').strip(),
                        'email': email,
                        'phone': row.get('phone', '').strip(),
                        'added_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat(),
                        'test_status': 'pending',
                        'subscription_status': 'unknown',
                        'notes': row.get('notes', '')
                    }
                    
                    self.users.append(user)
                    count += 1
                    print(f"✓ Added {user['name']} ({email})")
                
                self.save_users()
                print(f"\n✓ Imported {count} new users")
                
        except FileNotFoundError:
            print(f"✗ File {csv_file} not found")
        except Exception as e:
            print(f"✗ Error importing: {e}")
    
    def list_users(self, filter_status: Optional[str] = None):
        """List all test users"""
        if not self.users:
            print("No test users added yet. Use 'add' command to add users.")
            return
        
        users_to_show = self.users
        if filter_status:
            users_to_show = [u for u in self.users if u.get('test_status') == filter_status]
        
        if not users_to_show:
            print(f"No users with status '{filter_status}'")
            return
        
        # Prepare table data
        table_data = []
        for i, user in enumerate(users_to_show, 1):
            table_data.append([
                i,
                user['name'],
                user['email'],
                user.get('phone', 'N/A'),
                user.get('test_status', 'pending'),
                user.get('subscription_status', 'unknown'),
                user.get('notes', '')[:30] + '...' if len(user.get('notes', '')) > 30 else user.get('notes', '')
            ])
        
        print(f"\n=== Test Volunteers ({len(users_to_show)} users) ===")
        print(tabulate(
            table_data,
            headers=['#', 'Name', 'Email', 'Phone', 'Test Status', 'Subscription', 'Notes'],
            tablefmt='grid'
        ))
    
    def update_user_status(self, email: str, test_status: str = None, subscription_status: str = None):
        """Update user test status"""
        user = next((u for u in self.users if u['email'] == email), None)
        if not user:
            print(f"✗ User {email} not found")
            return
        
        if test_status:
            user['test_status'] = test_status
        if subscription_status:
            user['subscription_status'] = subscription_status
        
        user['updated_at'] = datetime.now().isoformat()
        self.save_users()
        print(f"✓ Updated {user['name']} ({email})")
    
    def test_users(self, api_url: str = "http://localhost:8000"):
        """Test subscription status for all users"""
        print(f"\n=== Testing User Subscriptions ===")
        print(f"API URL: {api_url}\n")
        
        for user in self.users:
            print(f"Testing {user['name']} ({user['email']})...", end=' ')
            
            try:
                # Check subscription status
                response = requests.get(f"{api_url}/api/payment/user/subscription/{user['email']}")
                
                if response.status_code == 200:
                    data = response.json()
                    status = data.get('status', 'unknown')
                    tier = data.get('tier', 'unknown')
                    
                    user['subscription_status'] = f"{tier}/{status}"
                    user['test_status'] = 'tested'
                    user['last_tested'] = datetime.now().isoformat()
                    
                    if status == 'active' and tier == 'premium':
                        print(f"✓ Premium Active")
                    elif status == 'inactive' and tier == 'free':
                        print(f"✓ Free Account")
                    else:
                        print(f"✓ {tier}/{status}")
                else:
                    print(f"✗ Error: Status {response.status_code}")
                    user['test_status'] = 'error'
                    
            except Exception as e:
                print(f"✗ Failed: {str(e)}")
                user['test_status'] = 'error'
        
        self.save_users()
        print("\n✓ Testing complete")
        
        # Show summary
        tested = sum(1 for u in self.users if u.get('test_status') == 'tested')
        errors = sum(1 for u in self.users if u.get('test_status') == 'error')
        premium = sum(1 for u in self.users if 'premium/active' in u.get('subscription_status', ''))
        
        print(f"\nSummary:")
        print(f"  Total users: {len(self.users)}")
        print(f"  Successfully tested: {tested}")
        print(f"  Errors: {errors}")
        print(f"  Premium subscribers: {premium}")
    
    def export_users(self, format: str = 'csv'):
        """Export users to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if format == 'csv':
            filename = f"test_users_export_{timestamp}.csv"
            with open(filename, 'w', newline='') as f:
                fieldnames = ['name', 'email', 'phone', 'test_status', 'subscription_status', 'notes', 'added_at']
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for user in self.users:
                    writer.writerow({k: user.get(k, '') for k in fieldnames})
            
            print(f"✓ Exported {len(self.users)} users to {filename}")
        
        elif format == 'json':
            filename = f"test_users_export_{timestamp}.json"
            with open(filename, 'w') as f:
                json.dump(self.users, f, indent=2)
            print(f"✓ Exported {len(self.users)} users to {filename}")
    
    def create_sharing_instructions(self):
        """Create instructions for test volunteers"""
        filename = "test_instructions.md"
        
        instructions = f"""# QuranCompare Beta Testing Instructions

Thank you for volunteering to help test QuranCompare! Your participation helps ensure our app works smoothly for everyone.

## Testing Steps

### 1. Access the App
- Web: [https://qurancompare.app](https://qurancompare.app)
- Mobile: Download from App Store (coming soon)

### 2. Sign Up / Login
- Click "Login" or "Sign Up"
- Use the email address you provided: (check with coordinator)
- You'll receive a magic link via email
- Click the link to complete login

### 3. Test Free Features
Please test these features first:
- Browse and read Quran verses
- Search for keywords
- Switch between translations
- Test on mobile and desktop

### 4. Test Premium Features
If you'd like to test premium features:
- Click "Upgrade to Premium" 
- Complete the £2.99/month subscription
- Test premium features:
  - Advanced root analysis
  - Audio playback
  - Additional translations
  - Export features

### 5. Report Issues
Please report any issues you find:
- Screenshots are helpful
- Note which device/browser you used
- Describe what you expected vs what happened

## Contact
If you have questions or find issues, please contact:
- Email: [your-email@example.com]
- WhatsApp: [your-number]

## Important Notes
- This is beta testing - some features may not work perfectly
- Your subscription can be cancelled anytime
- Your feedback is valuable and appreciated!

Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M")}
"""
        
        with open(filename, 'w') as f:
            f.write(instructions)
        
        print(f"✓ Created {filename}")
        
        # Also create a simple user list for sharing
        user_list_file = "test_volunteers_list.txt"
        with open(user_list_file, 'w') as f:
            f.write("QuranCompare Test Volunteers\n")
            f.write("=" * 30 + "\n\n")
            
            for i, user in enumerate(self.users, 1):
                f.write(f"{i}. {user['name']}\n")
                f.write(f"   Email: {user['email']}\n")
                if user.get('phone'):
                    f.write(f"   Phone: {user['phone']}\n")
                f.write("\n")
        
        print(f"✓ Created {user_list_file}")


def main():
    parser = argparse.ArgumentParser(description="Manage real user testing for QuranCompare")
    
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Add command
    add_parser = subparsers.add_parser('add', help='Add a new test user')
    add_parser.add_argument('--bulk', type=str, help='Import from CSV file')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List all test users')
    list_parser.add_argument('--status', type=str, help='Filter by status')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test user subscriptions')
    test_parser.add_argument('--api-url', default='http://localhost:8000', help='API URL')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export user list')
    export_parser.add_argument('--format', choices=['csv', 'json'], default='csv', help='Export format')
    
    # Instructions command
    subparsers.add_parser('instructions', help='Create testing instructions')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Initialize tester
    tester = RealUserTester()
    
    if args.command == 'add':
        if args.bulk:
            tester.add_bulk_users(args.bulk)
        else:
            tester.add_user()
    
    elif args.command == 'list':
        tester.list_users(filter_status=args.status)
    
    elif args.command == 'test':
        tester.test_users(api_url=args.api_url)
    
    elif args.command == 'export':
        tester.export_users(format=args.format)
    
    elif args.command == 'instructions':
        tester.create_sharing_instructions()


if __name__ == "__main__":
    main()