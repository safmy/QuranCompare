#!/usr/bin/env python3
import os
import stripe

# Set the API key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

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
    
    print(f"✅ Created Stripe product successfully!")
    print(f"Product ID: {product.id}")
    print(f"Price ID: {price.id}")
    print(f"\n🔧 UPDATE YOUR ENVIRONMENT IN RENDER:")
    print(f"STRIPE_DEBATER_PRICE_ID={price.id}")
    
except Exception as e:
    print(f"❌ Error: {e}")