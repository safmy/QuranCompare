# Render Environment Variables Setup

To deploy the API successfully on Render, you need to set the following environment variables in your Render dashboard:

## Required Environment Variables

### Stripe Configuration
```
STRIPE_PUBLISHABLE_KEY=pk_test_... (your Stripe publishable key)
STRIPE_SECRET_KEY=sk_test_... (your Stripe secret key)
STRIPE_DEBATER_PRICE_ID=price_1RXeD5ImvcH9DSE1KcvO2Iy9
STRIPE_WEBHOOK_SECRET=(set this after creating webhook endpoint in Stripe)
```

### Supabase Configuration
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=(your service key from Supabase dashboard - needed for server-side operations)
```

### Optional Configuration
```
ALLOWED_ORIGINS=https://quranonlystudies.netlify.app,capacitor://localhost,ionic://localhost
```

## How to Set Environment Variables on Render

1. Go to your Render dashboard
2. Select your web service (API deployment)
3. Click on "Environment" in the left sidebar
4. Add each environment variable using the "Add Environment Variable" button
5. Deploy the service after adding all variables

## Notes

- Use your actual Stripe test keys for development
- For production, you'll need to replace these with live Stripe keys
- The SUPABASE_SERVICE_KEY is different from the anon key and is required for server-side database operations
- STRIPE_WEBHOOK_SECRET should be set after creating the webhook endpoint in Stripe dashboard
- Contact the project owner for the actual API key values to use