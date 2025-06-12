#!/bin/bash

# Script to add Capacitor Local Notifications plugin

echo "Adding Capacitor Local Notifications plugin..."

# Add the plugin to package.json
npm install @capacitor/local-notifications

# Sync with iOS
npx cap sync ios

echo "Plugin added successfully!"
echo ""
echo "IMPORTANT: After running this script, you need to:"
echo "1. Open the iOS project in Xcode"
echo "2. Enable Push Notifications capability in the project settings"
echo "3. Build and run the app"
echo ""
echo "The app will now support proper local notifications for prayer alarms."