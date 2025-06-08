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
from datetime import datetime, timedelta, timezone

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
        # Workaround for proxy parameter issue in supabase 2.3.4
        # Create ClientOptions manually without proxy
        from supabase.client import ClientOptions
        
        # Create options without any proxy settings
        options = ClientOptions(
            headers={},
            auto_refresh_token=True,
            persist_session=True
        )
        
        # Initialize Supabase client with explicit options
        supabase = create_client(supabase_url, supabase_key, options)
        logger.info("✅ Supabase client initialized successfully")
                
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
        # Normalize email to lowercase
        email = email.lower().strip()
        
        # Check if user exists and has active subscription
        response = supabase.table('user_subscriptions').select('*').eq('email', email).execute()
        
        if not response.data or len(response.data) == 0:
            # User doesn't exist, just return that info without creating
            logger.info(f"User {email} not found in database")
            return {
                "hasSubscription": False,
                "user": None,
                "error": None
            }
        
        # If multiple entries exist, use the most recent one
        if len(response.data) > 1:
            logger.warning(f"Multiple entries found for {email}, using most recent")
            # Sort by created_at descending and take the first
            users = sorted(response.data, key=lambda x: x.get('created_at', ''), reverse=True)
            user = users[0]
        else:
            user = response.data[0]
            
        # Parse expires_at date properly
        expires_at_str = user.get('expires_at')
        has_subscription = False
        
        if user.get('status') == 'active' and expires_at_str:
            try:
                # Handle different date formats
                if expires_at_str.endswith('Z'):
                    expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                elif '+' in expires_at_str or expires_at_str.endswith('+00:00'):
                    expires_at = datetime.fromisoformat(expires_at_str)
                else:
                    # Assume it's a naive datetime, treat as UTC
                    expires_at = datetime.fromisoformat(expires_at_str).replace(tzinfo=timezone.utc)
                
                # Compare with timezone-aware current time in UTC
                current_time = datetime.now(timezone.utc)
                has_subscription = expires_at > current_time
                
                logger.info(f"Subscription check for {email}: expires_at={expires_at_str}, current_time={current_time}, has_subscription={has_subscription}")
            except Exception as date_error:
                logger.error(f"Error parsing date for {email}: {date_error}")
                has_subscription = False
        
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
        
        # Normalize email to lowercase
        email = email.lower().strip()
        
        logger.info(f"Processing subscription request for email: {email}")
        
        # Check if user exists
        existing_response = supabase.table('user_subscriptions').select('*').eq('email', email).execute()
        
        if existing_response.data and len(existing_response.data) > 0:
            # User already exists, just return the existing user
            logger.info(f"User {email} already exists, returning existing user")
            return {"success": True, "user": existing_response.data[0]}
        
        # Only create new user if they don't exist
        logger.info(f"Creating new user for {email}")
        
        # Create new user with free tier (unless special case)
        user_data = {
            'email': email,
            'status': 'active' if email in ['syedahmadfahmybinsyedsalim@gmail.com', 'safmy@example.com', 'zipkaa@gmail.com'] else 'inactive',
            'tier': 'premium' if email in ['syedahmadfahmybinsyedsalim@gmail.com', 'safmy@example.com', 'zipkaa@gmail.com'] else 'free',
            'expires_at': (datetime.now(timezone.utc) + timedelta(days=365)).isoformat() if email in ['syedahmadfahmybinsyedsalim@gmail.com', 'safmy@example.com', 'zipkaa@gmail.com'] else None,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
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
        # Try to get more info about the create_client function
        import inspect
        from supabase import create_client
        
        create_client_info = {
            "signature": str(inspect.signature(create_client)) if hasattr(inspect, 'signature') else "N/A",
            "doc": create_client.__doc__,
            "module": create_client.__module__
        }
        
        return {
            "status": "error",
            "message": "Supabase not initialized",
            "error": supabase_error,
            "supabase_url": os.getenv('SUPABASE_URL'),
            "service_key_present": bool(os.getenv('SUPABASE_SERVICE_KEY')),
            "service_key_length": len(os.getenv('SUPABASE_SERVICE_KEY', '')),
            "create_client_info": create_client_info
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