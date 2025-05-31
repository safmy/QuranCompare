# App Store Submission Checklist

## ✅ Development Complete
- [x] iOS project created with Capacitor
- [x] Microphone permissions added
- [x] Build configuration complete
- [x] Web assets copied to iOS

## 📱 What You Need to Do

### 1. Generate App Icons
```bash
# Open this file in a browser
open scripts/create-simple-logo.html

# Download the 1024x1024 logo
# Save as: public/logo1024.png

# Generate all icon sizes (requires npm install sharp first)
npm install sharp
node scripts/generate-app-icons.js
```

### 2. Open in Xcode
```bash
npx cap open ios
```

### 3. In Xcode - Project Settings
- [ ] Click on "App" in the navigator
- [ ] Select "Signing & Capabilities"
- [ ] Enable "Automatically manage signing"
- [ ] Select your Team (requires Apple Developer account)
- [ ] Bundle Identifier: `com.yourcompany.qurancompare`
- [ ] Version: 1.0.0
- [ ] Build: 1

### 4. In Xcode - Add App Icons
- [ ] Click on Assets.xcassets
- [ ] Click on AppIcon
- [ ] Drag your generated icons to each slot
- [ ] Or use a tool like https://appicon.co

### 5. Test Your App
- [ ] Select a simulator (iPhone 14 Pro recommended)
- [ ] Press ▶️ to build and run
- [ ] Test all features:
  - [ ] Search functionality
  - [ ] Voice search (simulator may not support)
  - [ ] Arabic text display
  - [ ] Language switching
  - [ ] Audio playback

### 6. Create Archive for App Store
- [ ] Select "Any iOS Device" as target
- [ ] Menu: Product → Archive
- [ ] Wait for build to complete
- [ ] Window → Organizer will open

### 7. Upload to App Store Connect
- [ ] Click "Distribute App"
- [ ] Select "App Store Connect"
- [ ] Select "Upload"
- [ ] Check all the options
- [ ] Click "Upload"

### 8. In App Store Connect
- [ ] Create new app
- [ ] Fill in metadata from `app-store-listing.md`
- [ ] Upload screenshots
- [ ] Set pricing (Free)
- [ ] Submit for review

## 📸 Screenshot Requirements

### iPhone 6.5" Display (1284 × 2778)
1. Home screen with search
2. Verse comparison view  
3. Arabic root analysis
4. Voice search

### iPad Pro 12.9" (2048 × 2732)
1. Home screen
2. Split view with multiple translations
3. Root analysis modal
4. Search results

## 🚨 Common Issues & Solutions

### CocoaPods not installed
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

### Build fails with signing error
- Make sure you have an Apple Developer account
- Select your team in Xcode signing settings

### App rejected for 4.2 (Minimum Functionality)
- Emphasize unique features: root analysis, voice search
- Show educational value
- Highlight offline functionality

## 📞 Support Contacts
- Apple Developer Support: https://developer.apple.com/contact/
- App Review: https://developer.apple.com/app-store/review/

## 🎉 Final Steps
1. Monitor App Store Connect for review status
2. Respond quickly to any reviewer questions
3. Typical review time: 24-48 hours
4. Once approved, set release date

Good luck with your submission! 🚀