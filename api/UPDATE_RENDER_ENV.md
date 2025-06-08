# Update Render Environment Variables

## Steps to Update STRIPE_DEBATER_PRICE_ID

1. **Log in to Render Dashboard**
   - Go to https://dashboard.render.com
   - Log in with your account

2. **Navigate to Your Service**
   - Find and click on your `qurancompare` service

3. **Go to Environment Tab**
   - Click on the "Environment" tab in the service dashboard

4. **Update the Variable**
   - Find `STRIPE_DEBATER_PRICE_ID` in the list
   - If it doesn't exist, click "Add Environment Variable"
   - Set the value to: `price_1RXiaxImvcH9DSE1RHJJioZb`
   - This is the LIVE mode price for £2.99/month subscription

5. **Save Changes**
   - Click "Save Changes" at the bottom
   - Your service will automatically redeploy with the new configuration

## Verification

After the service redeploys, you can verify the configuration by visiting:
```
https://qurancompare.onrender.com/api/payment/test
```

This should show:
- `stripe_status: "configured"`
- The correct price ID in the environment variables

## Important Notes

- This price ID (`price_1RXiaxImvcH9DSE1RHJJioZb`) is for LIVE mode payments
- It's configured for £2.99/month recurring subscription
- Make sure your Stripe account is in LIVE mode when processing real payments