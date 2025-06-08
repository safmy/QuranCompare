import os
import stripe
from fastapi import HTTPException
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Stripe configuration
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')  # Will need to set this after creating webhook

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

# Product/Price IDs - Create these in Stripe Dashboard or via API
DEBATER_BOT_PRICE_ID = os.getenv('STRIPE_DEBATER_PRICE_ID', 'price_1RXeD5ImvcH9DSE1KcvO2Iy9')

def create_checkout_session(user_email: str, success_url: str, cancel_url: str):
    """Create a Stripe checkout session for subscription"""
    try:
        # Create or retrieve customer
        customers = stripe.Customer.list(email=user_email, limit=1)
        if customers.data:
            customer = customers.data[0]
        else:
            customer = stripe.Customer.create(
                email=user_email,
                metadata={
                    'app': 'QuranCompare',
                    'feature': 'AI Debater Bot'
                }
            )
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=['card'],
            line_items=[{
                'price': DEBATER_BOT_PRICE_ID,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_email': user_email
            }
        )
        
        return session
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

def create_customer_portal_session(customer_id: str, return_url: str):
    """Create a customer portal session for managing subscription"""
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return session
    except Exception as e:
        logger.error(f"Error creating portal session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create portal session")

def handle_subscription_webhook(event):
    """Handle Stripe subscription webhooks"""
    try:
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            # Payment successful, activate subscription
            return {
                'customer_email': session.get('customer_details', {}).get('email'),
                'customer_id': session.get('customer'),
                'subscription_id': session.get('subscription'),
                'status': 'active'
            }
            
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            # Subscription cancelled
            return {
                'customer_id': subscription.get('customer'),
                'subscription_id': subscription.get('id'),
                'status': 'cancelled'
            }
            
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            # Subscription updated (could be renewal, plan change, etc.)
            return {
                'customer_id': subscription.get('customer'),
                'subscription_id': subscription.get('id'),
                'status': subscription.get('status')
            }
            
        return None
        
    except Exception as e:
        logger.error(f"Error handling webhook: {e}")
        raise

# Create the monthly subscription product and price
def setup_stripe_products():
    """One-time setup to create products and prices in Stripe"""
    try:
        # Create product
        product = stripe.Product.create(
            name="AI Debater Bot Premium",
            description="Access to AI Debater Bot with specialized theological debates based on Rashad Khalifa's teachings"
        )
        
        # Create price (£2.99/month)
        price = stripe.Price.create(
            product=product.id,
            unit_amount=299,  # £2.99 in pence
            currency="gbp",
            recurring={"interval": "month"},
            metadata={
                'feature': 'debater_bot'
            }
        )
        
        logger.info(f"Created Stripe product: {product.id}")
        logger.info(f"Created Stripe price: {price.id}")
        logger.info(f"UPDATE YOUR ENVIRONMENT: STRIPE_DEBATER_PRICE_ID={price.id}")
        
        return price.id
        
    except Exception as e:
        logger.error(f"Error setting up Stripe products: {e}")
        raise