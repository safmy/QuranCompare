# Quick Guide: Testing with Gmail Aliases

## The Gmail + Trick

Gmail ignores anything after a + sign in email addresses. This means:
- `youremail@gmail.com` 
- `youremail+test1@gmail.com`
- `youremail+beta@gmail.com` 
- `youremail+quranapp@gmail.com`

**All deliver to the same inbox!**

## Step-by-Step Setup

### 1. Use Your Existing Gmail
```
Base email: youremail@gmail.com
```

### 2. Generate Test Accounts
Run the setup script:
```bash
python setup_test_accounts.py
# Choose option 1: Setup Gmail aliases
# Enter your gmail address
# Choose option 4: Generate aliases
```

### 3. You'll Get Accounts Like:
```
youremail+test1@gmail.com
youremail+test2@gmail.com
youremail+test3@gmail.com
youremail+beta1@gmail.com
youremail+beta2@gmail.com
```

### 4. Managing Test Emails

In Gmail, create filters:
1. Settings → Filters → Create new filter
2. To: `youremail+test`
3. Apply label: "QuranCompare Testing"

## Phone Numbers for Testing

### Option 1: Ask Friends/Family
Create a spreadsheet:
```
Name         | Phone          | Email Used              | Permission Date
-------------|----------------|------------------------|----------------
John (brother)| +1234567890   | youremail+john@gmail.com| Jan 28, 2025
Sarah (friend)| +447700900123 | youremail+sarah@gmail.com| Jan 28, 2025
```

### Option 2: Google Voice (US Only)
- Get a free US number at voice.google.com
- Can receive SMS for verification

### Option 3: TextNow App
- Free US/Canada numbers
- Install app on phone
- Use for SMS verification

## Testing Checklist

For each test account:
- [ ] Can create account
- [ ] Receives magic link email
- [ ] Can log in successfully
- [ ] Free features work
- [ ] Can access subscription page
- [ ] Payment flow works (use Stripe test cards)
- [ ] Premium features unlock after payment
- [ ] Subscription status persists

## Stripe Test Cards

For testing payments without real charges:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires Auth: `4000 0025 0000 3155`

Use any future date and any 3-digit CVC.

## Sample Test Scenarios

### Test 1: New User Flow
1. Visit app with clean browser
2. Sign up with `youremail+newuser@gmail.com`
3. Check email arrives
4. Complete signup
5. Verify free tier access

### Test 2: Subscription Flow  
1. Login as free user
2. Click upgrade
3. Use test card
4. Verify premium access
5. Check subscription status

### Test 3: Multi-Device
1. Login on desktop
2. Login same account on mobile
3. Verify sync works
4. Test subscription on both

## Tracking Your Tests

Create a simple spreadsheet:
```
Test Account              | Tested | Issues | Notes
-------------------------|--------|--------|-------
youremail+test1@gmail.com|   ✓    | None   | Works great
youremail+test2@gmail.com|   ✓    | Login  | Magic link slow
youremail+mobile@gmail.com|   ✓   | None   | iOS tested
```

## Tips

1. **Use Incognito/Private Mode** for each test to simulate new users
2. **Clear localStorage** between tests: 
   - Chrome DevTools → Application → Storage → Clear
3. **Test different scenarios**:
   - Slow internet (Chrome DevTools → Network → Slow 3G)
   - Different browsers (Chrome, Firefox, Safari)
   - Mobile vs Desktop
4. **Document everything** - Screenshots help!

## Need More Accounts?

If you need more than Gmail aliases provide:
1. Ask family members to use their Gmail
2. Create a few Outlook accounts (outlook.com)
3. Use your work email (if allowed)
4. Buy a domain ($10/year) for unlimited emails

Remember: The goal is to test real-world scenarios with real email addresses that you control.