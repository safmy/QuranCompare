#!/usr/bin/env python3
"""
Test Account Setup Assistant
============================

Helps create and manage real test accounts for QuranCompare testing.

Features:
- Gmail alias generator
- Custom domain email manager  
- Twilio phone number integration
- Account tracking and export

Usage:
    python setup_test_accounts.py [command]
"""

import os
import json
import csv
from datetime import datetime
from typing import List, Dict, Optional
import re

# Optional: Twilio integration
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    print("Note: Install twilio package for phone number features: pip install twilio")


class TestAccountSetup:
    def __init__(self, config_file: str = "test_accounts_config.json"):
        self.config_file = config_file
        self.config = self.load_config()
        self.accounts = self.load_accounts()
        
    def load_config(self) -> Dict:
        """Load configuration"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                return json.load(f)
        return {
            'gmail_base_accounts': [],
            'custom_domains': [],
            'twilio': {
                'account_sid': '',
                'auth_token': '',
                'phone_numbers': []
            }
        }
    
    def save_config(self):
        """Save configuration"""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
        print(f"✓ Configuration saved to {self.config_file}")
    
    def load_accounts(self) -> List[Dict]:
        """Load test accounts"""
        accounts_file = "test_accounts.json"
        if os.path.exists(accounts_file):
            with open(accounts_file, 'r') as f:
                return json.load(f)
        return []
    
    def save_accounts(self):
        """Save test accounts"""
        accounts_file = "test_accounts.json"
        with open(accounts_file, 'w') as f:
            json.dump(self.accounts, f, indent=2)
        print(f"✓ Saved {len(self.accounts)} accounts")
    
    def setup_gmail_base(self):
        """Setup Gmail base account for aliases"""
        print("\n=== Gmail Alias Setup ===")
        print("Gmail allows aliases using the + symbol.")
        print("Example: yourname@gmail.com → yourname+test1@gmail.com")
        print("\nEnter your Gmail base account(s):")
        
        while True:
            email = input("Gmail address (or 'done' to finish): ").strip().lower()
            if email == 'done':
                break
            
            if '@gmail.com' not in email:
                print("✗ Must be a gmail.com address")
                continue
                
            if email not in self.config['gmail_base_accounts']:
                self.config['gmail_base_accounts'].append(email)
                print(f"✓ Added {email}")
            else:
                print(f"⚠ {email} already added")
        
        self.save_config()
    
    def generate_gmail_aliases(self, count: int = 10):
        """Generate Gmail aliases"""
        if not self.config['gmail_base_accounts']:
            print("✗ No Gmail base accounts configured. Run setup first.")
            return
        
        print(f"\n=== Generating {count} Gmail Aliases ===")
        
        base_email = self.config['gmail_base_accounts'][0]
        base_name = base_email.split('@')[0]
        
        generated = []
        for i in range(count):
            # Generate different alias patterns
            aliases = [
                f"{base_name}+test{i+1}@gmail.com",
                f"{base_name}+beta{i+1}@gmail.com",
                f"{base_name}+quran{i+1}@gmail.com",
                f"{base_name}+user{i+1}@gmail.com",
            ]
            
            for alias in aliases[:count]:
                if not any(acc['email'] == alias for acc in self.accounts):
                    account = {
                        'email': alias,
                        'base_email': base_email,
                        'type': 'gmail_alias',
                        'created': datetime.now().isoformat(),
                        'phone': None,
                        'status': 'ready',
                        'notes': f'Alias of {base_email}'
                    }
                    self.accounts.append(account)
                    generated.append(alias)
                    print(f"✓ Generated: {alias}")
                
                if len(generated) >= count:
                    break
            
            if len(generated) >= count:
                break
        
        self.save_accounts()
        print(f"\n✓ Generated {len(generated)} aliases")
        
        # Show instructions
        print("\nIMPORTANT: All these aliases will receive email at:", base_email)
        print("You can filter them in Gmail using: to:yourname+test1@gmail.com")
    
    def setup_custom_domain(self):
        """Setup custom domain for emails"""
        print("\n=== Custom Domain Setup ===")
        print("If you own a domain, you can create unlimited email addresses.")
        print("Services: Google Workspace, Zoho Mail, ProtonMail, etc.")
        
        domain = input("\nEnter your domain (e.g., yourdomain.com): ").strip().lower()
        if not domain:
            return
            
        if domain not in self.config['custom_domains']:
            self.config['custom_domains'].append(domain)
            self.save_config()
            print(f"✓ Added domain: {domain}")
        
        # Generate some email suggestions
        print(f"\nSuggested email patterns for {domain}:")
        patterns = [
            f"test@{domain}",
            f"beta@{domain}",
            f"test1@{domain}",
            f"user1@{domain}",
            f"tester.john@{domain}",
            f"beta.sarah@{domain}"
        ]
        
        for pattern in patterns:
            print(f"  - {pattern}")
        
        # Ask if they want to generate accounts
        generate = input("\nGenerate test accounts for this domain? (y/n): ").lower()
        if generate == 'y':
            count = int(input("How many accounts? "))
            self.generate_domain_emails(domain, count)
    
    def generate_domain_emails(self, domain: str, count: int):
        """Generate emails for custom domain"""
        print(f"\n=== Generating {count} emails for {domain} ===")
        
        prefixes = ['test', 'beta', 'user', 'tester', 'trial', 'demo']
        generated = []
        
        for i in range(count):
            # Generate unique email
            if i < len(prefixes):
                email = f"{prefixes[i]}@{domain}"
            else:
                email = f"{prefixes[0]}{i+1}@{domain}"
            
            if not any(acc['email'] == email for acc in self.accounts):
                account = {
                    'email': email,
                    'type': 'custom_domain',
                    'domain': domain,
                    'created': datetime.now().isoformat(),
                    'phone': None,
                    'status': 'ready',
                    'notes': f'Custom domain email'
                }
                self.accounts.append(account)
                generated.append(email)
                print(f"✓ Generated: {email}")
        
        self.save_accounts()
        print(f"\n✓ Generated {len(generated)} domain emails")
        print("\nNOTE: You'll need to create these in your email service provider")
    
    def setup_twilio(self):
        """Setup Twilio for phone numbers"""
        if not TWILIO_AVAILABLE:
            print("✗ Twilio package not installed. Run: pip install twilio")
            return
            
        print("\n=== Twilio Setup ===")
        print("Twilio provides real phone numbers via API (~$1/month each)")
        print("Sign up at: https://www.twilio.com")
        
        # Get credentials
        if not self.config['twilio']['account_sid']:
            sid = input("\nAccount SID: ").strip()
            token = input("Auth Token: ").strip()
            
            if sid and token:
                self.config['twilio']['account_sid'] = sid
                self.config['twilio']['auth_token'] = token
                self.save_config()
                print("✓ Twilio credentials saved")
        
        # Test connection
        try:
            client = Client(
                self.config['twilio']['account_sid'],
                self.config['twilio']['auth_token']
            )
            
            # List available numbers
            print("\nSearching for available US numbers...")
            available = client.available_phone_numbers('US').local.list(limit=5)
            
            print("\nAvailable numbers:")
            for number in available:
                print(f"  - {number.phone_number} ({number.locality})")
            
            # Purchase option
            purchase = input("\nPurchase a number? (y/n): ").lower()
            if purchase == 'y':
                number_to_buy = input("Enter number to purchase: ").strip()
                self.purchase_twilio_number(client, number_to_buy)
                
        except Exception as e:
            print(f"✗ Twilio error: {e}")
    
    def purchase_twilio_number(self, client, phone_number: str):
        """Purchase a Twilio phone number"""
        try:
            number = client.incoming_phone_numbers.create(
                phone_number=phone_number,
                friendly_name=f"QuranCompare Test {datetime.now().strftime('%Y%m%d')}"
            )
            
            self.config['twilio']['phone_numbers'].append({
                'number': number.phone_number,
                'sid': number.sid,
                'purchased': datetime.now().isoformat()
            })
            
            self.save_config()
            print(f"✓ Purchased: {number.phone_number}")
            
            # Assign to accounts without phones
            self.assign_phone_to_account(number.phone_number)
            
        except Exception as e:
            print(f"✗ Purchase failed: {e}")
    
    def assign_phone_to_account(self, phone_number: str):
        """Assign phone to an account without one"""
        for account in self.accounts:
            if not account.get('phone'):
                account['phone'] = phone_number
                print(f"✓ Assigned {phone_number} to {account['email']}")
                self.save_accounts()
                break
    
    def list_accounts(self):
        """List all test accounts"""
        if not self.accounts:
            print("No test accounts created yet.")
            return
        
        print(f"\n=== Test Accounts ({len(self.accounts)}) ===")
        print(f"{'Email':<40} {'Type':<15} {'Phone':<15} {'Status':<10}")
        print("-" * 80)
        
        for acc in self.accounts:
            print(f"{acc['email']:<40} {acc['type']:<15} {acc.get('phone', 'None'):<15} {acc['status']:<10}")
    
    def export_accounts(self):
        """Export accounts for testing"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # CSV export
        csv_file = f"test_accounts_{timestamp}.csv"
        with open(csv_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['email', 'phone', 'type', 'status', 'notes'])
            
            for acc in self.accounts:
                writer.writerow([
                    acc['email'],
                    acc.get('phone', ''),
                    acc['type'],
                    acc['status'],
                    acc.get('notes', '')
                ])
        
        print(f"✓ Exported to {csv_file}")
        
        # Create testing checklist
        checklist_file = f"testing_checklist_{timestamp}.md"
        with open(checklist_file, 'w') as f:
            f.write("# QuranCompare Testing Checklist\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
            
            f.write("## Test Accounts\n\n")
            for i, acc in enumerate(self.accounts, 1):
                f.write(f"### Account {i}\n")
                f.write(f"- Email: {acc['email']}\n")
                f.write(f"- Phone: {acc.get('phone', 'N/A')}\n")
                f.write(f"- Type: {acc['type']}\n")
                f.write("- [ ] Login tested\n")
                f.write("- [ ] Free features tested\n")
                f.write("- [ ] Subscription flow tested\n")
                f.write("- [ ] Premium features tested\n")
                f.write("- Notes: \n\n")
        
        print(f"✓ Created checklist: {checklist_file}")


def main():
    print("QuranCompare Test Account Setup")
    print("=" * 40)
    
    setup = TestAccountSetup()
    
    while True:
        print("\nOptions:")
        print("1. Setup Gmail aliases")
        print("2. Setup custom domain")
        print("3. Setup Twilio (phone numbers)")
        print("4. Generate Gmail aliases")
        print("5. List accounts")
        print("6. Export accounts")
        print("7. Exit")
        
        choice = input("\nSelect option (1-7): ").strip()
        
        if choice == '1':
            setup.setup_gmail_base()
        elif choice == '2':
            setup.setup_custom_domain()
        elif choice == '3':
            setup.setup_twilio()
        elif choice == '4':
            count = int(input("How many aliases to generate? "))
            setup.generate_gmail_aliases(count)
        elif choice == '5':
            setup.list_accounts()
        elif choice == '6':
            setup.export_accounts()
        elif choice == '7':
            print("\nGoodbye!")
            break
        else:
            print("Invalid option")


if __name__ == "__main__":
    main()