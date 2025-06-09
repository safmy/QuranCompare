# RevenueCat Setup Guide for iOS/Android

## Overview
RevenueCat handles all the complexity of in-app purchases and subscriptions across iOS and Android, while providing a unified API.

## Setup Steps

### 1. Create RevenueCat Account
1. Go to [RevenueCat.com](https://www.revenuecat.com)
2. Sign up for a free account
3. Create a new project

### 2. Configure iOS Products

#### In App Store Connect:
1. Create your app if not already done
2. Go to "In-App Purchases"
3. Create products:
   - **Product ID**: `premium_monthly`
   - **Type**: Auto-Renewable Subscription
   - **Price**: $3.99 (same as web to absorb Apple's cut)
   - **Duration**: 1 Month

#### In RevenueCat:
1. Go to your project
2. Click "Products" → "Add Product"
3. Add your App Store product:
   - Identifier: `premium_monthly`
   - App Store Product ID: `premium_monthly`
4. Create an Entitlement:
   - Identifier: `premium`
   - Description: Premium Access
5. Create an Offering:
   - Identifier: `default`
   - Add package: `$rc_monthly` → `premium_monthly`

### 3. Configure Android Products (if needed)

#### In Google Play Console:
1. Create your app
2. Go to "Monetization" → "Products" → "Subscriptions"
3. Create subscription:
   - Product ID: `premium_monthly`
   - Price: £2.99/month

#### In RevenueCat:
1. Add Google Play product
2. Link to same entitlement and offering

### 4. Get API Keys

In RevenueCat Dashboard:
1. Go to "API Keys"
2. Copy your public iOS SDK key
3. Copy your public Android SDK key (if using)

### 5. Update Your Code

Add to your `.env` file:
```
REACT_APP_REVENUECAT_IOS_KEY=your_ios_public_key_here
REACT_APP_REVENUECAT_ANDROID_KEY=your_android_public_key_here
```

### 6. iOS Native Setup

Add to `ios/App/App/Info.plist`:
```xml
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>v72qych5uu.skadnetwork</string>
  </dict>
</array>
```

### 7. Sync Capacitor
```bash
npx cap sync ios
```

## Testing

### Sandbox Testing:
1. Create sandbox tester in App Store Connect
2. Sign out of App Store on device
3. Run app from Xcode
4. Sign in with sandbox account when purchasing

### Important Notes:
- Sandbox subscriptions renew faster (monthly = 5 minutes)
- Always test restore purchases
- Test expired subscriptions

## Backend Integration (Optional)

If you want to sync with your backend:

```javascript
// Backend endpoint to receive webhooks
app.post('/api/webhooks/revenuecat', (req, res) => {
  const event = req.body;
  
  if (event.type === 'INITIAL_PURCHASE' || event.type === 'RENEWAL') {
    // Update user subscription in your database
    updateUserSubscription(event.app_user_id, {
      platform: event.store,
      status: 'active',
      expiresAt: event.expiration_at_ms
    });
  }
  
  res.status(200).send('OK');
});
```

## Pricing Strategy

Since you're absorbing the platform fees:
- **Web (Stripe)**: £2.99/month → You get ~£2.80
- **iOS (Apple)**: $3.99/month → You get ~$2.79
- **Android (Google)**: £2.99/month → You get ~£2.09

## App Store Review Tips

1. **Clear Subscription Description**: Explain exactly what premium includes
2. **Restore Button**: Must be visible and functional
3. **Privacy Policy**: Link must be accessible
4. **Terms of Service**: Include auto-renewal terms
5. **Manage Subscription**: Explain how to cancel

## Common Issues

### "Invalid Product IDs"
- Ensure products are approved in App Store Connect
- Wait 24 hours after creating products
- Check bundle ID matches

### "User Cancelled"
- This is normal - handle gracefully
- Don't show error message

### "Network Error"
- RevenueCat requires internet connection
- Add offline handling

## Production Checklist

- [ ] Products created and approved in stores
- [ ] RevenueCat products configured
- [ ] API keys in environment variables
- [ ] Restore purchases working
- [ ] Subscription status syncing
- [ ] Error handling implemented
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Tested on real devices
- [ ] Sandbox testing complete