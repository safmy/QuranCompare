# iOS Payment Implementation Guide

## Overview
Apple requires all digital content and features to be purchased through their In-App Purchase (IAP) system, where they take a 30% commission. Here's how to implement this properly:

## 1. Required Changes

### Platform Detection
The app needs to detect which platform it's running on and use the appropriate payment method:
- **iOS**: Apple In-App Purchases (required)
- **Android**: Google Play Billing (required)
- **Web**: Stripe/PayPal (your choice)

### Pricing Strategy
Since Apple takes 30%, you have two options:
1. **Same price everywhere**: Absorb the 30% loss on mobile
2. **Higher mobile prices**: $3.99 on web, $4.99 on iOS (common practice)

## 2. Implementation Steps

### Step 1: Install Capacitor IAP Plugin
```bash
npm install @awesome-cordova-plugins/in-app-purchase-2
npm install cordova-plugin-purchase
npx cap sync
```

### Step 2: Configure App Store Connect
1. Create your app in App Store Connect
2. Go to "In-App Purchases" section
3. Create subscription products:
   - `com.yourapp.premium_monthly` - Monthly Premium ($4.99)
   - `com.yourapp.premium_yearly` - Yearly Premium ($49.99)

### Step 3: Update Info.plist
Add to `ios/App/App/Info.plist`:
```xml
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
</array>
```

### Step 4: Backend Receipt Validation
Your backend needs to validate Apple receipts:
```javascript
// Backend endpoint
app.post('/api/payment/validate-receipt', async (req, res) => {
  const { receipt, platform, userId } = req.body;
  
  if (platform === 'ios') {
    // Validate with Apple
    const appleResponse = await validateWithApple(receipt);
    if (appleResponse.status === 0) {
      // Valid receipt - update user subscription in database
      await updateUserSubscription(userId, appleResponse);
      res.json({ valid: true });
    }
  }
});
```

## 3. User Experience Flow

### For iOS Users:
1. User taps "Subscribe" in app
2. Apple's payment sheet appears
3. User authorizes with Face ID/Touch ID
4. App receives receipt
5. Backend validates receipt
6. User gets premium access

### For Web Users:
1. User clicks "Subscribe" 
2. Redirected to Stripe checkout
3. Completes payment
4. Redirected back to app
5. User gets premium access

## 4. Important Considerations

### What's Allowed:
- ✅ In-app purchases for digital content
- ✅ Subscriptions through Apple IAP
- ✅ "Reader" apps can link to external website (with approval)
- ✅ Different prices on different platforms

### What's NOT Allowed:
- ❌ Direct payment buttons in iOS app
- ❌ Links to external payment pages (except "reader" apps)
- ❌ Mentioning cheaper prices on other platforms
- ❌ Asking users to pay outside the app

## 5. Alternative Approach: Reader App

If your app qualifies as a "reader" app (provides previously purchased content), you can apply for the External Link Account Entitlement. This allows:
- One link to your external website for account management
- Still can't process payments in-app
- Must use specific Apple-approved language

## 6. Testing

### TestFlight Testing:
1. Use sandbox test accounts
2. Test all subscription scenarios:
   - New purchase
   - Renewal
   - Cancellation
   - Restore purchases

### Sandbox Testing:
- Subscriptions renew faster (monthly = 5 minutes)
- No real charges
- Must use test Apple IDs

## 7. Revenue Comparison

### Current (Web only with Stripe):
- Price: $3.99/month
- You keep: ~$3.75 (after Stripe fees)

### With iOS (Apple IAP):
- Price: $4.99/month
- You keep: $3.49 (after Apple's 30%)
- OR: Keep same price, you get $2.79

### Small Business Program:
If you make < $1M/year, Apple only takes 15% after the first year.

## 8. Recommended Approach

1. **Implement platform-specific payments** (as shown in the code)
2. **Price iOS subscriptions 25% higher** to offset Apple's cut
3. **Use the same backend** to manage all subscriptions
4. **Store subscription source** (ios/android/web) in database
5. **Implement restore purchases** for mobile users

## 9. App Store Review Guidelines

Make sure to:
- Clearly describe what the subscription includes
- Show the price prominently
- Include restore purchases button
- Add subscription terms
- Link to privacy policy
- Handle subscription management properly

## 10. Next Steps

1. Register for Apple Developer Program ($99/year)
2. Set up products in App Store Connect
3. Implement the IAP plugin
4. Test thoroughly with TestFlight
5. Submit for review

Remember: Apple is strict about payments. It's better to implement their system correctly from the start than to risk rejection or removal from the App Store.