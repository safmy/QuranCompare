#!/usr/bin/env python3
"""
Phone Number Manager for Testing
================================

Manages real phone numbers from various services for testing.

Services supported:
- Google Voice (free)
- TextNow (free)
- Twilio (paid API)
- Personal numbers (friends/family)

Usage:
    python phone_number_manager.py [command]
"""

import json
import os
import sys
from datetime import datetime
from typing import List, Dict, Optional
import re

# Try importing Twilio
try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False


class PhoneNumberManager:
    def __init__(self):
        self.data_file = "phone_numbers.json"
        self.config_file = "phone_config.json"
        self.numbers = self.load_numbers()
        self.config = self.load_config()
        
    def load_numbers(self) -> List[Dict]:
        """Load phone numbers from file"""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r') as f:
                return json.load(f)
        return []
    
    def load_config(self) -> Dict:
        """Load configuration"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                return json.load(f)
        return {
            'twilio': {'account_sid': '', 'auth_token': ''},
            'default_country': 'US'
        }
    
    def save_numbers(self):
        """Save phone numbers"""
        with open(self.data_file, 'w') as f:
            json.dump(self.numbers, f, indent=2)
        print(f"✓ Saved {len(self.numbers)} phone numbers")
    
    def save_config(self):
        """Save configuration"""
        with open(self.config_file, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def format_phone(self, phone: str) -> str:
        """Format phone number consistently"""
        # Remove all non-numeric except +
        phone = re.sub(r'[^\d+]', '', phone)
        
        # Ensure + prefix for international
        if not phone.startswith('+'):
            if len(phone) == 10:  # US number without country code
                phone = '+1' + phone
            elif len(phone) == 11 and phone.startswith('1'):  # US with 1
                phone = '+' + phone
        
        return phone
    
    def add_google_voice(self):
        """Add Google Voice number interactively"""
        print("\n=== Add Google Voice Number ===")
        print("Get free US number at: voice.google.com")
        print("(Requires Google account)\n")
        
        number = input("Phone number (e.g., +1234567890): ").strip()
        number = self.format_phone(number)
        
        if not number:
            return
            
        gmail = input("Associated Gmail account: ").strip().lower()
        notes = input("Notes (optional): ").strip()
        
        # Check if already exists
        if any(n['number'] == number for n in self.numbers):
            print(f"✗ Number {number} already exists")
            return
        
        self.numbers.append({
            'number': number,
            'service': 'google_voice',
            'account': gmail,
            'cost_monthly': 0,
            'added': datetime.now().isoformat(),
            'status': 'active',
            'capabilities': ['sms', 'voice'],
            'notes': notes,
            'assigned_to': None
        })
        
        self.save_numbers()
        print(f"✓ Added Google Voice number: {number}")
    
    def add_textnow(self):
        """Add TextNow number"""
        print("\n=== Add TextNow Number ===")
        print("Get free US/Canada number at: textnow.com")
        print("(Works on app or web)\n")
        
        number = input("Phone number: ").strip()
        number = self.format_phone(number)
        
        if not number:
            return
            
        email = input("TextNow account email: ").strip().lower()
        is_premium = input("Premium account? (y/n): ").lower() == 'y'
        
        self.numbers.append({
            'number': number,
            'service': 'textnow',
            'account': email,
            'cost_monthly': 5 if is_premium else 0,
            'added': datetime.now().isoformat(),
            'status': 'active',
            'capabilities': ['sms'],
            'notes': 'Premium' if is_premium else 'Free with ads',
            'assigned_to': None
        })
        
        self.save_numbers()
        print(f"✓ Added TextNow number: {number}")
    
    def add_personal(self):
        """Add personal number (friend/family)"""
        print("\n=== Add Personal Number ===")
        print("Add friend/family number with permission\n")
        
        owner = input("Owner name: ").strip()
        number = input("Phone number: ").strip()
        number = self.format_phone(number)
        
        if not number or not owner:
            return
        
        permission = input("Confirmed permission? (y/n): ").lower()
        if permission != 'y':
            print("✗ Permission required")
            return
        
        self.numbers.append({
            'number': number,
            'service': 'personal',
            'account': owner,
            'cost_monthly': 0,
            'added': datetime.now().isoformat(),
            'status': 'active',
            'capabilities': ['sms', 'voice'],
            'notes': f"Personal - {owner}",
            'permission_date': datetime.now().isoformat(),
            'assigned_to': None
        })
        
        self.save_numbers()
        print(f"✓ Added personal number from {owner}: {number}")
    
    def setup_twilio(self):
        """Setup Twilio credentials"""
        if not TWILIO_AVAILABLE:
            print("✗ Install twilio: pip install twilio")
            return
            
        print("\n=== Twilio Setup ===")
        print("Sign up at: https://www.twilio.com")
        print("Get $15 free trial credit\n")
        
        sid = input("Account SID: ").strip()
        token = input("Auth Token: ").strip()
        
        if sid and token:
            self.config['twilio']['account_sid'] = sid
            self.config['twilio']['auth_token'] = token
            self.save_config()
            print("✓ Twilio credentials saved")
            
            # Test connection
            try:
                client = Client(sid, token)
                account = client.api.accounts(sid).fetch()
                print(f"✓ Connected to Twilio account: {account.friendly_name}")
            except Exception as e:
                print(f"✗ Connection failed: {e}")
    
    def buy_twilio_numbers(self, count: int = 1, area_code: str = None):
        """Buy Twilio phone numbers"""
        if not TWILIO_AVAILABLE:
            print("✗ Install twilio: pip install twilio")
            return
            
        if not self.config['twilio']['account_sid']:
            print("✗ Run setup first")
            return
        
        print(f"\n=== Buying {count} Twilio Numbers ===")
        
        try:
            client = Client(
                self.config['twilio']['account_sid'],
                self.config['twilio']['auth_token']
            )
            
            # Search for available numbers
            search_params = {'limit': count * 2}  # Get extra in case some fail
            if area_code:
                search_params['area_code'] = area_code
                
            available = client.available_phone_numbers('US').local.list(**search_params)
            
            if not available:
                print("✗ No numbers available")
                return
            
            purchased = 0
            for number in available[:count]:
                try:
                    print(f"Purchasing {number.phone_number}...", end=' ')
                    
                    new_number = client.incoming_phone_numbers.create(
                        phone_number=number.phone_number,
                        friendly_name=f"QuranTest_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    )
                    
                    self.numbers.append({
                        'number': new_number.phone_number,
                        'service': 'twilio',
                        'account': 'Twilio API',
                        'twilio_sid': new_number.sid,
                        'cost_monthly': 1.0,
                        'added': datetime.now().isoformat(),
                        'status': 'active',
                        'capabilities': ['sms', 'voice', 'mms'],
                        'notes': f"Auto-purchased",
                        'assigned_to': None
                    })
                    
                    purchased += 1
                    print("✓")
                    
                except Exception as e:
                    print(f"✗ Failed: {e}")
                
                if purchased >= count:
                    break
            
            self.save_numbers()
            print(f"\n✓ Purchased {purchased} numbers (${purchased:.2f}/month)")
            
        except Exception as e:
            print(f"✗ Error: {e}")
    
    def list_numbers(self, filter_available: bool = False):
        """List all phone numbers"""
        numbers_to_show = self.numbers
        
        if filter_available:
            numbers_to_show = [n for n in self.numbers if not n.get('assigned_to')]
        
        if not numbers_to_show:
            print("No phone numbers found")
            return
        
        print(f"\n=== Phone Numbers ({len(numbers_to_show)}) ===")
        
        # Group by service
        by_service = {}
        for num in numbers_to_show:
            service = num['service']
            if service not in by_service:
                by_service[service] = []
            by_service[service].append(num)
        
        total_cost = 0
        
        for service, nums in by_service.items():
            print(f"\n{service.upper()} ({len(nums)} numbers)")
            print("-" * 50)
            
            for num in nums:
                assigned = num.get('assigned_to', 'Available')
                cost = num.get('cost_monthly', 0)
                total_cost += cost
                
                print(f"{num['number']:<20} ${cost:<6.2f} {assigned:<30}")
                
                if num.get('notes'):
                    print(f"  └─ {num['notes']}")
        
        print(f"\nTotal Monthly Cost: ${total_cost:.2f}")
        print(f"Available Numbers: {sum(1 for n in self.numbers if not n.get('assigned_to'))}")
    
    def assign_number(self, email: str):
        """Assign available number to email"""
        available = [n for n in self.numbers if not n.get('assigned_to')]
        
        if not available:
            print("✗ No available numbers")
            return None
        
        # Prefer free services first
        for service in ['google_voice', 'textnow', 'personal', 'twilio']:
            for num in available:
                if num['service'] == service:
                    num['assigned_to'] = email
                    num['assigned_date'] = datetime.now().isoformat()
                    self.save_numbers()
                    print(f"✓ Assigned {num['number']} to {email}")
                    return num['number']
        
        return None
    
    def bulk_assign(self, emails_file: str):
        """Bulk assign numbers to emails from file"""
        try:
            with open(emails_file, 'r') as f:
                emails = [line.strip() for line in f if line.strip()]
            
            print(f"\n=== Assigning numbers to {len(emails)} emails ===")
            
            assigned = 0
            for email in emails:
                if self.assign_number(email):
                    assigned += 1
            
            print(f"\n✓ Assigned {assigned} numbers")
            
        except FileNotFoundError:
            print(f"✗ File not found: {emails_file}")
    
    def export_assignments(self):
        """Export email-phone assignments"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"phone_assignments_{timestamp}.csv"
        
        with open(filename, 'w') as f:
            f.write("email,phone,service,cost_monthly,capabilities\n")
            
            for num in self.numbers:
                if num.get('assigned_to'):
                    caps = ','.join(num.get('capabilities', []))
                    f.write(f"{num['assigned_to']},{num['number']},{num['service']},{num.get('cost_monthly', 0)},{caps}\n")
        
        print(f"✓ Exported assignments to {filename}")
    
    def create_setup_guide(self):
        """Create personalized setup guide"""
        guide = f"""# Your Phone Number Setup Guide

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}

## Quick Stats
- Total Numbers: {len(self.numbers)}
- Available: {sum(1 for n in self.numbers if not n.get('assigned_to'))}
- Monthly Cost: ${sum(n.get('cost_monthly', 0) for n in self.numbers):.2f}

## Numbers by Service

"""
        
        # Group by service
        by_service = {}
        for num in self.numbers:
            service = num['service']
            if service not in by_service:
                by_service[service] = []
            by_service[service].append(num)
        
        for service, nums in by_service.items():
            guide += f"### {service.title().replace('_', ' ')} ({len(nums)} numbers)\n\n"
            
            if service == 'google_voice':
                guide += "Access at: voice.google.com\n"
            elif service == 'textnow':
                guide += "Access at: textnow.com or mobile app\n"
            elif service == 'twilio':
                guide += "Manage at: console.twilio.com\n"
            
            guide += "\n"
            
            for num in nums:
                status = "Available" if not num.get('assigned_to') else f"Assigned to {num['assigned_to']}"
                guide += f"- {num['number']} - {status}\n"
            
            guide += "\n"
        
        guide += """## Next Steps

1. **Test Each Number**
   - Send a test SMS to verify it works
   - Note any issues

2. **Assign to Test Accounts**
   ```bash
   python phone_number_manager.py assign --email test@example.com
   ```

3. **Track Usage**
   - Monitor which numbers are being used
   - Replace any that stop working

4. **Add More Numbers**
   - Google Voice: 1 per Gmail account
   - TextNow: Multiple with different emails
   - Twilio: Unlimited (paid)

## Tips

- Keep numbers active by using them monthly
- Document which tester uses which number
- Set up forwarding for important numbers
- Use free options first, paid for scale
"""
        
        with open("phone_setup_guide.md", 'w') as f:
            f.write(guide)
        
        print("✓ Created phone_setup_guide.md")


def main():
    manager = PhoneNumberManager()
    
    if len(sys.argv) < 2:
        print("Phone Number Manager")
        print("=" * 40)
        print("\nCommands:")
        print("  add-google     Add Google Voice number")
        print("  add-textnow    Add TextNow number")
        print("  add-personal   Add personal number")
        print("  setup-twilio   Setup Twilio API")
        print("  buy-twilio     Buy Twilio numbers")
        print("  list           List all numbers")
        print("  list-available List available numbers")
        print("  assign         Assign number to email")
        print("  export         Export assignments")
        print("  guide          Create setup guide")
        print("\nExample: python phone_number_manager.py add-google")
        return
    
    command = sys.argv[1]
    
    if command == 'add-google':
        manager.add_google_voice()
    elif command == 'add-textnow':
        manager.add_textnow()
    elif command == 'add-personal':
        manager.add_personal()
    elif command == 'setup-twilio':
        manager.setup_twilio()
    elif command == 'buy-twilio':
        count = int(input("How many numbers? "))
        area_code = input("Area code (optional): ").strip()
        manager.buy_twilio_numbers(count, area_code if area_code else None)
    elif command == 'list':
        manager.list_numbers()
    elif command == 'list-available':
        manager.list_numbers(filter_available=True)
    elif command == 'assign':
        email = input("Email to assign to: ").strip()
        manager.assign_number(email)
    elif command == 'export':
        manager.export_assignments()
    elif command == 'guide':
        manager.create_setup_guide()
    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()