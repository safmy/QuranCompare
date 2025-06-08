#!/usr/bin/env python3
"""
One-time script to create Stripe product and price for AI Debater Bot
"""

import os
from stripe_config import setup_stripe_products

if __name__ == "__main__":
    try:
        price_id = setup_stripe_products()
        print(f"\n✅ Stripe product created successfully!")
        print(f"Price ID: {price_id}")
        print(f"\n🔧 Add this to your environment variables:")
        print(f"STRIPE_DEBATER_PRICE_ID={price_id}")
        
    except Exception as e:
        print(f"❌ Error setting up Stripe product: {e}")