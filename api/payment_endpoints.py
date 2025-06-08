from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import stripe
import logging
from stripe_config import (
    create_checkout_session, 
    create_customer_portal_session,
    handle_subscription_webhook,
    STRIPE_WEBHOOK_SECRET
)
from supabase import create_client, Client
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/payment", tags=["payment"])

# Supabase client
supabase_url = os.getenv('SUPABASE_URL', 'https://fsubmqjevlfpcirgsbhi.supabase.co')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY', '')  # Need service key for server-side ops
supabase: Client = create_client(supabase_url, supabase_key) if supabase_key else None

# Request models
class CreateCheckoutRequest(BaseModel):
    email: str
    success_url: str = "https://quranonlystudies.netlify.app/payment/success"
    cancel_url: str = "https://quranonlystudies.netlify.app/payment/cancel"

class CreatePortalRequest(BaseModel):
    customer_id: str
    return_url: str = "https://quranonlystudies.netlify.app"

@router.post("/create-checkout-session")
async def create_checkout_endpoint(request: CreateCheckoutRequest):
    """Create Stripe checkout session for subscription"""
    try:
        session = create_checkout_session(
            user_email=request.email,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )
        
        return {
            "checkout_url": session.url,
            "session_id": session.id
        }
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-portal-session") 
async def create_portal_endpoint(request: CreatePortalRequest):
    """Create customer portal session for subscription management"""
    try:
        session = create_customer_portal_session(
            customer_id=request.customer_id,
            return_url=request.return_url
        )
        
        return {
            "portal_url": session.url
        }
        
    except Exception as e:
        logger.error(f"Error creating portal session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        # Get the webhook data
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Handle the webhook
        result = handle_subscription_webhook(event)
        
        if result and supabase:
            # Update user subscription in database
            if event['type'] == 'checkout.session.completed':
                # Activate subscription
                supabase.table('user_subscriptions').upsert({
                    'email': result['customer_email'],
                    'status': 'active',
                    'tier': 'premium',
                    'stripe_customer_id': result['customer_id'],
                    'stripe_subscription_id': result['subscription_id'],
                    'expires_at': (datetime.now() + timedelta(days=30)).isoformat(),
                    'updated_at': datetime.now().isoformat()
                }).execute()
                
            elif event['type'] == 'customer.subscription.deleted':
                # Cancel subscription
                supabase.table('user_subscriptions').update({
                    'status': 'inactive',
                    'tier': 'free',
                    'expires_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }).eq('stripe_subscription_id', result['subscription_id']).execute()
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_stripe_config():
    """Get Stripe publishable key for frontend"""
    return {
        "publishable_key": os.getenv('STRIPE_PUBLISHABLE_KEY')
    }