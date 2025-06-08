#!/bin/bash

echo "🚀 Stripe Live Product Setup Script"
echo "=================================="
echo ""
echo "This script will create a live Stripe product for the AI Debater Bot."
echo ""

# Prompt for the live secret key
read -p "Enter your Stripe LIVE secret key (starts with sk_live_): " STRIPE_SECRET_KEY

# Validate the key format
if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_live_ ]]; then
    echo "❌ Error: The key must start with 'sk_live_' for live mode"
    exit 1
fi

echo ""
echo "Creating product with:"
echo "- Name: AI Debater Bot Premium"
echo "- Price: £2.99/month"
echo "- Mode: LIVE (real payments)"
echo ""

# Export the key for the Python script
export STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"

# Run the setup script
cd "$(dirname "$0")"
python3 setup_stripe_product.py

echo ""
echo "✅ Done! Don't forget to update the STRIPE_DEBATER_PRICE_ID in Render!"