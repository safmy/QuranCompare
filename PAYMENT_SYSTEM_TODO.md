# Payment System Implementation TODO

## Current Status
- ✅ Authentication system (Google + Email)
- ✅ User database (Supabase)
- ❌ **NO PAYMENT PROCESSING**
- ❌ **NO WAY TO COLLECT MONEY**

## Required for Real Payments

### 1. Stripe Setup
- Create Stripe account at stripe.com
- Get API keys (publishable + secret)
- Set up webhook endpoints
- Configure subscription products (£2.99/month)

### 2. Backend Implementation Needed
```python
# api/payment_endpoints.py
@app.post("/create-checkout-session")
async def create_checkout_session(user_email: str):
    # Create Stripe checkout session
    # Return checkout URL
    pass

@app.post("/webhook/stripe")
async def handle_stripe_webhook():
    # Update user subscription in database
    # when payment succeeds
    pass
```

### 3. Frontend Integration
```javascript
// Handle actual payment redirect
const handleStripeCheckout = async () => {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({ email: user.email })
  });
  const { checkoutUrl } = await response.json();
  window.location.href = checkoutUrl; // Redirect to Stripe
};
```

### 4. Database Updates
```sql
-- Add payment fields to user_subscriptions
ALTER TABLE user_subscriptions ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN last_payment_date TIMESTAMP;
```

## Alternative: Simple PayPal Button
For quick setup without backend:
1. Create PayPal business account
2. Generate subscription button (£2.99/month)
3. Manually activate users who pay

## Current Workaround
Since no payment system exists:
1. Users contact you via email
2. You arrange payment manually (PayPal, bank transfer, etc.)
3. You manually update their subscription in Supabase

## Money Flow (When Implemented)
- User pays via Stripe/PayPal → Your business account
- Webhook updates database → User gets access
- Monthly recurring billing → Automatic renewal