#!/bin/bash
# Quick Start Script for QuranCompare Testing

echo "QuranCompare Testing Setup"
echo "========================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
pip3 install twilio faker tabulate requests

echo ""
echo "Step 1: Setting up Email Accounts"
echo "---------------------------------"
echo "We'll use Gmail aliases for testing"
echo ""

python3 setup_test_accounts.py

echo ""
echo "Step 2: Setting up Phone Numbers"
echo "---------------------------------"
echo "Choose your phone number sources:"
echo ""

python3 phone_number_manager.py

echo ""
echo "Step 3: Creating Test Plan"
echo "-------------------------"

# Create test plan
cat > test_plan.md << 'EOF'
# QuranCompare Testing Plan

## Phase 1: Basic Testing (5 users)
- [ ] Create 5 Gmail aliases
- [ ] Get 5 phone numbers (mix of Google Voice, TextNow)
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test free features

## Phase 2: Subscription Testing (10 users)  
- [ ] Create 10 more test accounts
- [ ] Test subscription purchase (Stripe test mode)
- [ ] Verify premium features unlock
- [ ] Test subscription management
- [ ] Test cancellation flow

## Phase 3: Stress Testing (50+ users)
- [ ] Generate 50 accounts using various methods
- [ ] Run concurrent login tests
- [ ] Test API rate limits
- [ ] Monitor performance
- [ ] Document any issues

## Test Scenarios

### New User Experience
1. Visit site fresh (incognito)
2. Sign up with email
3. Verify email arrives
4. Complete profile
5. Browse free content
6. Hit paywall
7. Subscribe
8. Access premium content

### Returning User
1. Login with existing account
2. Check subscription status
3. Access previous content
4. Test "remember me"
5. Test logout

### Edge Cases
- [ ] Invalid email formats
- [ ] Network interruptions
- [ ] Payment failures
- [ ] Expired subscriptions
- [ ] Multiple devices

## Tracking Sheet

Create `test_results.csv`:
```
test_case,email,phone,result,issues,notes
new_user_signup,test1@gmail.com,+1234567890,pass,,Smooth process
subscription_flow,test2@gmail.com,+1234567891,fail,Payment timeout,Stripe slow
```
EOF

echo "✓ Created test_plan.md"

echo ""
echo "Next Steps:"
echo "----------"
echo "1. Add your Gmail account: python3 setup_test_accounts.py"
echo "2. Add phone numbers: python3 phone_number_manager.py add-google"
echo "3. Generate test accounts: python3 setup_test_accounts.py"
echo "4. Start testing with test_plan.md"
echo ""
echo "For help with each tool:"
echo "- python3 setup_test_accounts.py --help"
echo "- python3 phone_number_manager.py"
echo "- python3 test_real_users.py --help"