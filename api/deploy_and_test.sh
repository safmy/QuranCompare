#!/bin/bash
echo "🚀 Deploying API changes to Render..."
echo ""

# First, let's test locally if the cleanup script works
echo "📋 Would you like to clean up duplicate users first? (recommended)"
echo "This will keep the most recent entry for each email and remove duplicates."
read -p "Clean up duplicates? (y/n): " cleanup_choice

if [ "$cleanup_choice" = "y" ]; then
    echo ""
    echo "Running cleanup script..."
    python3 cleanup_duplicate_users.py
fi

echo ""
echo "✅ API code has been updated with the following fixes:"
echo "1. Fixed duplicate user creation in payment_endpoints.py"
echo "2. Added proper handling for existing users"
echo "3. Updated subscription modal to fit screen better"
echo ""
echo "To deploy to production:"
echo "1. Commit and push these changes to GitHub"
echo "2. Render will automatically deploy the new version"
echo ""
echo "After deployment, test with:"
echo "python3 test_subscription_flow.py"