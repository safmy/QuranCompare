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

logger.info(f"Initializing payment endpoints...")
logger.info(f"SUPABASE_URL: {supabase_url}")
logger.info(f"SUPABASE_SERVICE_KEY present: {bool(supabase_key)}")
logger.info(f"SUPABASE_SERVICE_KEY length: {len(supabase_key) if supabase_key else 0}")

# Initialize Supabase client only if service key is provided
supabase = None
supabase_error = None
if supabase_key and supabase_key.strip():
    try:
        # Try different initialization approaches
        try:
            # Method 1: With explicit options to avoid proxy issues
            supabase = create_client(
                supabase_url=supabase_url,
                supabase_key=supabase_key,
                options={}  # Empty options to avoid any default proxy settings
            )
            logger.info("✅ Supabase client initialized successfully (method 1)")
        except Exception as e1:
            logger.warning(f"Method 1 failed: {e1}")
            try:
                # Method 2: Direct Client instantiation
                from supabase import Client
                from supabase.client import ClientOptions
                options = ClientOptions()
                supabase = Client(supabase_url, supabase_key, options)
                logger.info("✅ Supabase client initialized successfully (method 2)")
            except Exception as e2:
                logger.warning(f"Method 2 failed: {e2}")
                try:
                    # Method 3: Minimal initialization
                    supabase = create_client(supabase_url, supabase_key)
                    logger.info("✅ Supabase client initialized successfully (method 3)")
                except Exception as e3:
                    logger.warning(f"Method 3 failed: {e3}")
                    raise e1  # Re-raise the original error
                
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase client: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error args: {e.args}")
        supabase_error = str(e)
        supabase = None
else:
    logger.warning("⚠️ SUPABASE_SERVICE_KEY not provided - database operations will fail")
    supabase_error = "No service key provided"

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

# User subscription management endpoints
@router.get("/user/subscription/{email}")
async def get_user_subscription(email: str):
    """Get user subscription status"""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        # Check if user exists and has active subscription
        response = supabase.table('user_subscriptions').select('*').eq('email', email).execute()
        
        if not response.data:
            # User doesn't exist, create free tier user
            user_data = {
                'email': email,
                'status': 'active' if email == 'syedahmadfahmybinsyedsalim@gmail.com' else 'inactive',
                'tier': 'premium' if email == 'syedahmadfahmybinsyedsalim@gmail.com' else 'free',
                'expires_at': (datetime.now() + timedelta(days=365)).isoformat() if email == 'syedahmadfahmybinsyedsalim@gmail.com' else None,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            create_response = supabase.table('user_subscriptions').insert(user_data).execute()
            
            # Check if this user should have premium access
            has_subscription = (
                user_data.get('status') == 'active' and 
                user_data.get('expires_at') and 
                datetime.fromisoformat(user_data['expires_at']) > datetime.now()
            )
            
            return {
                "hasSubscription": has_subscription,
                "user": create_response.data[0] if create_response.data else user_data,
                "error": None
            }
        
        user = response.data[0]
        has_subscription = (
            user.get('status') == 'active' and 
            user.get('expires_at') and 
            datetime.fromisoformat(user['expires_at'].replace('Z', '+00:00')) > datetime.now()
        )
        
        return {
            "hasSubscription": has_subscription,
            "user": user,
            "error": None
        }
        
    except Exception as e:
        logger.error(f"Error getting user subscription: {e}")
        return {
            "hasSubscription": False,
            "user": None,
            "error": str(e)
        }

@router.post("/user/subscription")
async def create_or_update_user(request: dict):
    """Create or update user subscription"""
    logger.info(f"POST /user/subscription called with: {request}")
    
    if not supabase:
        logger.error("Supabase not configured")
        raise HTTPException(status_code=500, detail="Database not configured")
    
    try:
        email = request.get('email')
        if not email:
            logger.error("No email provided in request")
            raise HTTPException(status_code=400, detail="Email is required")
        
        logger.info(f"Processing subscription request for email: {email}")
        
        # Check if user exists
        existing_response = supabase.table('user_subscriptions').select('*').eq('email', email).execute()
        
        if existing_response.data:
            return {"success": True, "user": existing_response.data[0]}
        
        # Create new user with free tier (unless special case)
        user_data = {
            'email': email,
            'status': 'active' if email == 'syedahmadfahmybinsyedsalim@gmail.com' else 'inactive',
            'tier': 'premium' if email == 'syedahmadfahmybinsyedsalim@gmail.com' else 'free',
            'expires_at': (datetime.now() + timedelta(days=365)).isoformat() if email == 'syedahmadfahmybinsyedsalim@gmail.com' else None,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        response = supabase.table('user_subscriptions').insert(user_data).execute()
        
        if response.data:
            return {"success": True, "user": response.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create user")
            
    except Exception as e:
        logger.error(f"Error creating/updating user: {e}")
        return {"success": False, "error": str(e)}

@router.get("/user/check-subscription/{email}")
async def check_user_subscription_api(email: str):
    """Alternative endpoint for checking subscription (for compatibility)"""
    return await get_user_subscription(email)

@router.get("/test")
async def test_payment_router():
    """Test endpoint to verify payment router is working"""
    import stripe
    
    supabase_status = "configured" if supabase is not None else "not_configured"
    stripe_status = "configured" if stripe.api_key else "not_configured"
    
    env_vars = {
        "SUPABASE_URL": bool(os.getenv('SUPABASE_URL')),
        "SUPABASE_SERVICE_KEY": bool(os.getenv('SUPABASE_SERVICE_KEY')),
        "STRIPE_SECRET_KEY": bool(os.getenv('STRIPE_SECRET_KEY')),
        "STRIPE_PUBLISHABLE_KEY": bool(os.getenv('STRIPE_PUBLISHABLE_KEY')),
        "STRIPE_DEBATER_PRICE_ID": bool(os.getenv('STRIPE_DEBATER_PRICE_ID'))
    }
    
    return {
        "status": "success",
        "message": "Payment router is working",
        "supabase_configured": supabase is not None,
        "supabase_status": supabase_status,
        "supabase_error": supabase_error,
        "stripe_status": stripe_status,
        "environment_variables": env_vars,
        "supabase_url": os.getenv('SUPABASE_URL'),
        "service_key_first_10": os.getenv('SUPABASE_SERVICE_KEY', '')[:10] + "..." if os.getenv('SUPABASE_SERVICE_KEY') else None,
        "endpoints": [
            "/api/payment/create-checkout-session",
            "/api/payment/user/subscription/{email}",
            "/api/payment/user/subscription",
            "/api/payment/webhook",
            "/api/payment/config"
        ]
    }

@router.get("/test-supabase")
async def test_supabase_connection():
    """Test Supabase connection specifically"""
    if not supabase:
        return {
            "status": "error",
            "message": "Supabase not initialized",
            "error": supabase_error,
            "supabase_url": os.getenv('SUPABASE_URL'),
            "service_key_present": bool(os.getenv('SUPABASE_SERVICE_KEY')),
            "service_key_length": len(os.getenv('SUPABASE_SERVICE_KEY', ''))
        }
    
    try:
        # Try a simple query to test the connection
        response = supabase.table('user_subscriptions').select('count').execute()
        return {
            "status": "success",
            "message": "Supabase connection working",
            "table_accessible": True,
            "response_data": response.data if hasattr(response, 'data') else str(response)
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": "Supabase connection failed",
            "error": str(e),
            "error_type": type(e).__name__
        }