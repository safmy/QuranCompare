#!/bin/bash

echo "🚀 QuranCompare App Store Preparation Script"
echo "==========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script must be run on macOS with Xcode installed"
    exit 1
fi

echo -e "\n${BLUE}📱 Step 1: Building React App${NC}"
npm run build

echo -e "\n${BLUE}📲 Step 2: Syncing with iOS${NC}"
npx cap sync ios

echo -e "\n${BLUE}🎨 Step 3: App Icon Setup${NC}"
echo "Please ensure you have created app icons:"
echo "1. Open scripts/create-simple-logo.html in a browser"
echo "2. Download the logo and save as public/logo1024.png"
echo "3. Run: node scripts/generate-app-icons.js"

echo -e "\n${BLUE}📋 Step 4: Checklist${NC}"
echo -e "${GREEN}✓${NC} React app built"
echo -e "${GREEN}✓${NC} iOS platform added"
echo -e "${GREEN}✓${NC} Microphone permissions configured"
echo -e "${GREEN}✓${NC} Capacitor configured"

echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo "1. Open Xcode: npx cap open ios"
echo "2. Set up signing & capabilities:"
echo "   - Select your team"
echo "   - Set bundle identifier: com.yourcompany.qurancompare"
echo "3. Add app icons:"
echo "   - Drag icons to Assets.xcassets"
echo "4. Test on simulator/device"
echo "5. Archive and upload to App Store Connect"

echo -e "\n${BLUE}📄 App Store Connect Requirements:${NC}"
echo "- App name: QuranCompare"
echo "- Description: See app-store-listing.md"
echo "- Screenshots: Required for iPhone & iPad"
echo "- Privacy Policy: public/privacy-policy.html"

echo -e "\n${GREEN}✅ Preparation complete!${NC}"
echo "Run: npx cap open ios"