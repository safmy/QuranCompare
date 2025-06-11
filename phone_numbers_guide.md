# Real Phone Numbers for Testing - Complete Guide

## 1. Twilio (Most Professional - API Available)
**Cost**: $1-2/month per number
**Best for**: Automated testing, multiple numbers

```python
# Example: Buy 10 US numbers via Twilio
from twilio.rest import Client

client = Client('your_account_sid', 'your_auth_token')

# Search for available numbers
numbers = client.available_phone_numbers('US').local.list(
    area_code="415",  # San Francisco
    limit=10
)

# Purchase numbers
for number in numbers:
    purchased = client.incoming_phone_numbers.create(
        phone_number=number.phone_number
    )
    print(f"Purchased: {purchased.phone_number}")
```

**Setup**:
1. Sign up at twilio.com ($15 free credit)
2. Verify your account
3. Buy numbers via console or API
4. Numbers can receive SMS/calls

## 2. Google Voice (Free - US Only)
**Cost**: Free
**Limit**: 1 per Google account (but you can use multiple accounts)

**Process**:
1. Go to voice.google.com
2. Choose a US number
3. Link to existing phone for verification
4. Can receive SMS and calls

**Tip**: If you have 5 Gmail accounts, you can get 5 Google Voice numbers

## 3. TextNow (Free US/Canada Numbers)
**Cost**: Free with ads, $5/month without ads
**Best for**: Quick testing

**Process**:
1. Download TextNow app (iOS/Android)
2. Sign up and get assigned a number instantly
3. Can receive SMS
4. Works on phone or web (textnow.com)

## 4. Burner App
**Cost**: $5/month per number
**Best for**: Temporary testing

**Features**:
- Create multiple numbers
- Auto-expire after set time
- Good for short-term testing

## 5. Virtual Number Services

### Hushed
- $2-5/month per number
- Multiple countries available
- API access for automation

### MySudo
- $1-3/month per number
- Privacy-focused
- Multiple numbers per account

### Sideline
- $10/month
- Professional features
- Good for business testing

## 6. VoIP Services (Multiple Numbers)

### Google Workspace
- $6/user/month
- Each user can have Google Voice
- Professional setup

### RingCentral
- $20/month
- Multiple numbers included
- API available

### Grasshopper
- $14/month
- Multiple extensions
- Professional features

## 7. eSIM Services (International Numbers)

### Airalo
- $5-20 for data + number
- Real numbers from 190+ countries
- Install via eSIM

### Nomad
- Similar to Airalo
- Good for international testing

## 8. Bulk SMS Services (Receive Only)

### Twilio Verify
- Pay per verification
- No monthly fees
- Good for OTP testing

### SMS-Activate (API)
- $0.10-1 per verification
- Multiple countries
- API available

## Practical Setup for QuranCompare Testing

### Option A: Budget ($0-10)
```
1. Your phone number (1)
2. Google Voice number (1) 
3. TextNow numbers (3-5)
4. Friends/family numbers (5)
Total: ~10 numbers for free
```

### Option B: Professional ($20-50/month)
```
1. Twilio numbers (10) - $10/month
2. TextNow Premium (2) - $10/month  
3. Burner numbers (5) - $25/month
Total: 17 numbers
```

### Option C: Scale Testing ($100+/month)
```
1. Twilio (50 numbers) - $50/month
2. Custom VoIP solution - $50/month
Total: 100+ numbers
```

## Implementation Script

Here's a complete solution using multiple services:

```python
# phone_number_manager.py
import json
from datetime import datetime
from typing import List, Dict

class PhoneNumberManager:
    def __init__(self):
        self.numbers = []
        self.load_numbers()
    
    def add_google_voice(self, number: str, gmail_account: str):
        """Add Google Voice number"""
        self.numbers.append({
            'number': number,
            'service': 'google_voice',
            'account': gmail_account,
            'cost': 0,
            'added': datetime.now().isoformat(),
            'status': 'active'
        })
        self.save_numbers()
    
    def add_textnow(self, number: str, email: str):
        """Add TextNow number"""
        self.numbers.append({
            'number': number,
            'service': 'textnow',
            'account': email,
            'cost': 0,
            'added': datetime.now().isoformat(),
            'status': 'active'
        })
        self.save_numbers()
    
    def add_twilio(self, number: str, sid: str):
        """Add Twilio number"""
        self.numbers.append({
            'number': number,
            'service': 'twilio',
            'sid': sid,
            'cost': 1.0,
            'added': datetime.now().isoformat(),
            'status': 'active'
        })
        self.save_numbers()
    
    def bulk_add_twilio(self, count: int, country: str = 'US'):
        """Bulk add Twilio numbers"""
        from twilio.rest import Client
        
        # Load credentials
        client = Client('account_sid', 'auth_token')
        
        # Search for numbers
        available = client.available_phone_numbers(country).local.list(limit=count)
        
        purchased = []
        for number in available:
            try:
                new_number = client.incoming_phone_numbers.create(
                    phone_number=number.phone_number,
                    friendly_name=f"QuranTest_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                )
                self.add_twilio(new_number.phone_number, new_number.sid)
                purchased.append(new_number.phone_number)
                print(f"✓ Purchased: {new_number.phone_number}")
            except Exception as e:
                print(f"✗ Failed: {e}")
        
        return purchased
    
    def get_available_number(self) -> Optional[str]:
        """Get next available number for testing"""
        for number in self.numbers:
            if number['status'] == 'active' and not number.get('assigned'):
                return number['number']
        return None
    
    def assign_number(self, number: str, email: str):
        """Assign number to test account"""
        for num in self.numbers:
            if num['number'] == number:
                num['assigned'] = email
                num['assigned_date'] = datetime.now().isoformat()
                self.save_numbers()
                return True
        return False
    
    def list_numbers(self):
        """List all numbers with status"""
        print(f"\n=== Phone Numbers ({len(self.numbers)}) ===")
        print(f"{'Number':<20} {'Service':<15} {'Cost':<10} {'Status':<10} {'Assigned':<30}")
        print("-" * 85)
        
        total_cost = 0
        for num in self.numbers:
            assigned = num.get('assigned', 'Available')
            print(f"{num['number']:<20} {num['service']:<15} ${num['cost']:<9.2f} {num['status']:<10} {assigned:<30}")
            total_cost += num['cost']
        
        print(f"\nTotal monthly cost: ${total_cost:.2f}")
    
    def save_numbers(self):
        """Save numbers to file"""
        with open('phone_numbers.json', 'w') as f:
            json.dump(self.numbers, f, indent=2)
    
    def load_numbers(self):
        """Load numbers from file"""
        try:
            with open('phone_numbers.json', 'r') as f:
                self.numbers = json.load(f)
        except FileNotFoundError:
            self.numbers = []
```

## Step-by-Step Setup Guide

### 1. Start with Free Options
```bash
# Get Google Voice number
1. Go to voice.google.com
2. Select number
3. Add to phone_numbers.json

# Get TextNow numbers  
1. Download TextNow app
2. Sign up (use your Gmail aliases)
3. Get 3-5 numbers
4. Add to tracking sheet
```

### 2. Add Twilio for Scale
```bash
# Install Twilio
pip install twilio

# Set up account
1. Sign up at twilio.com
2. Add payment method
3. Buy numbers via console or API
```

### 3. Track Everything
Create `test_accounts_complete.csv`:
```csv
email,phone,phone_service,monthly_cost,status
yourname+test1@gmail.com,+14155551234,google_voice,0,active
yourname+test2@gmail.com,+16505551234,twilio,1.00,active
yourname+test3@gmail.com,+14085551234,textnow,0,active
```

## Quick Start Commands

```bash
# 1. Set up free numbers first
python phone_number_manager.py add-google-voice

# 2. Add TextNow numbers
python phone_number_manager.py add-textnow

# 3. If you need more, add Twilio
python phone_number_manager.py setup-twilio
python phone_number_manager.py buy-numbers --count 10

# 4. Assign to test accounts
python phone_number_manager.py assign
```

## Important Notes

1. **Verification**: Most services work with SMS verification
2. **International**: Twilio supports 100+ countries
3. **Persistence**: Keep numbers active by using them monthly
4. **Privacy**: These are real numbers - protect them
5. **Cost Management**: Track monthly costs carefully

## Recommended Testing Setup

For testing 50 users:
- 10 Google Voice numbers (free)
- 20 TextNow numbers (free)
- 10 Twilio numbers ($10/month)
- 10 Friend/family numbers (free)

Total: 50 real phone numbers for ~$10/month

This gives you real, working phone numbers that will pass any verification system!