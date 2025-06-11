# Guide: Creating Real Test Accounts for QuranCompare Testing

## Email Account Options

### 1. Gmail (Google) - Manual Creation
- **Limit**: ~5 accounts per phone number
- **Process**: 
  - Go to accounts.google.com
  - Each account needs unique recovery info
  - Use variations: yourname+test1@gmail.com, yourname+test2@gmail.com (all go to yourname@gmail.com)
- **Note**: Google has strict bot detection - no official API for creating accounts

### 2. Outlook/Hotmail - Manual Creation
- **Limit**: Similar restrictions as Gmail
- **Process**: 
  - Go to outlook.com
  - Requires phone verification after a few accounts
- **Note**: No public API for account creation

### 3. Professional Email Services with API

#### SendGrid Email API
```python
# Doesn't create accounts, but provides email addresses for testing
# Inbound parse feature can receive emails
```

#### Mailgun
- Provides sandbox domain for testing
- Can create multiple email addresses under your domain
- API available for programmatic access

### 4. Custom Domain Email (Recommended)
```bash
# If you own a domain (e.g., yourdomain.com), you can create unlimited emails:
test1@yourdomain.com
test2@yourdomain.com
beta.tester.1@yourdomain.com
```

Services that support this:
- Google Workspace ($6/user/month)
- Zoho Mail (free for up to 5 users)
- ProtonMail
- Namecheap Private Email

## Phone Number Options

### 1. Virtual Phone Numbers (Legitimate Services)

#### Twilio (Recommended)
- **Cost**: ~$1/month per number
- **API**: Full API support
- **Features**: SMS/Voice capable
```python
from twilio.rest import Client

client = Client(account_sid, auth_token)
phone_number = client.incoming_phone_numbers.create(
    phone_number='+15551234567'  # or search for available numbers
)
```

#### TextNow
- Free US/Canada numbers
- App-based
- Manual process

#### Google Voice
- Free US numbers
- Requires existing US phone number
- Manual process only

### 2. eSIM Services
- Airalo
- Nomad
- Provides real phone numbers in various countries

### 3. Temporary Number Services (Not Recommended for Testing)
- These are often blacklisted by auth systems
- Numbers get recycled frequently

## Recommended Approach for Your Testing

### Option 1: Domain Email + Twilio (Professional)
1. Register a domain ($10-15/year)
2. Set up email catch-all on your domain
3. Use Twilio API for phone numbers
4. Total cost: ~$25 setup + $1/month per phone number

### Option 2: Gmail Aliases + Friend's Numbers (Budget)
1. Use Gmail's + addressing: yourname+test1@gmail.com
2. Ask friends/family for permission to use their numbers
3. Keep a spreadsheet of who's testing what

### Option 3: Business Testing Service
Services like:
- UserTesting.com
- TestingTime
- Provide real testers with real accounts

## Sample Implementation

Here's how to manage test accounts properly:

```python
# test_account_manager.py
import csv
from datetime import datetime

class TestAccountManager:
    def __init__(self):
        self.accounts = []
    
    def add_gmail_alias(self, base_email, alias):
        """Add Gmail alias account"""
        email = f"{base_email.split('@')[0]}+{alias}@gmail.com"
        return {
            'email': email,
            'type': 'gmail_alias',
            'base_email': base_email,
            'created': datetime.now().isoformat()
        }
    
    def add_domain_email(self, username, domain):
        """Add custom domain email"""
        return {
            'email': f"{username}@{domain}",
            'type': 'custom_domain',
            'created': datetime.now().isoformat()
        }
    
    def add_twilio_number(self, country_code='US'):
        """Instructions for adding Twilio number"""
        return {
            'instructions': [
                '1. Sign up at twilio.com',
                '2. Get API credentials',
                '3. Purchase number via API or console',
                f'4. Choose {country_code} number'
            ]
        }
```

## Important Legal/Ethical Notes

1. **Terms of Service**: Creating multiple accounts may violate ToS of some services
2. **Verification**: Most services now require phone verification
3. **Purpose**: Ensure testing is for legitimate development purposes
4. **Privacy**: If using friends' info, get explicit permission
5. **Cleanup**: Delete test accounts after testing is complete

## Quick Start Checklist

- [ ] Decide on email strategy (domain vs aliases)
- [ ] Set up phone number solution (Twilio recommended)
- [ ] Create spreadsheet to track accounts
- [ ] Get permission from any real people involved
- [ ] Document which accounts are for testing
- [ ] Plan for account cleanup post-testing

## Cost Estimate

- Custom domain: $15/year
- Email hosting: $0-50/year
- 10 Twilio numbers: $10/month
- Total: ~$15-25 setup, $10/month ongoing

This approach gives you real, working accounts that won't be flagged as fake by authentication systems.