#!/usr/bin/env python3
"""
Verify Stripe configuration is correct
"""
import os

print("🔍 Checking Stripe Configuration...")
print("="*50)

# Check environment variables
env_vars = {
    "STRIPE_SECRET_KEY": os.getenv('STRIPE_SECRET_KEY'),
    "STRIPE_PUBLISHABLE_KEY": os.getenv('STRIPE_PUBLISHABLE_KEY'),
    "STRIPE_DEBATER_PRICE_ID": os.getenv('STRIPE_DEBATER_PRICE_ID', 'price_1RXeD5ImvcH9DSE1KcvO2Iy9')
}

print("\n📋 Environment Variables:")
for key, value in env_vars.items():
    if value:
        if "SECRET" in key:
            print(f"✅ {key}: {value[:10]}... (hidden)")
        else:
            print(f"✅ {key}: {value}")
    else:
        print(f"❌ {key}: NOT SET")

print("\n📝 Current Configuration:")
print(f"- Default Price ID: price_1RXeD5ImvcH9DSE1KcvO2Iy9")
print(f"- Live Price ID: price_1RXiaxImvcH9DSE1RHJJioZb")

print("\n⚠️  IMPORTANT:")
print("Make sure to update STRIPE_DEBATER_PRICE_ID in Render to:")
print("price_1RXiaxImvcH9DSE1RHJJioZb")
print("\nThis is the LIVE mode price for £2.99/month subscription")