# iOS App Store Deployment Guide for QuranCompare

## Overview
This guide will help you convert your React web app into an iOS app and deploy it to the App Store.

## Prerequisites
- [ ] Apple Developer Account ($99/year)
- [ ] Mac computer with Xcode installed
- [ ] App icons and screenshots
- [ ] Privacy policy and terms of service

## Option 1: Using Capacitor (Recommended)

### 1. Install Capacitor
```bash
npm install @capacitor/core @capacitor/ios @capacitor/cli
npx cap init QuranCompare com.yourcompany.qurancompare --web-dir=build
```

### 2. Configure Capacitor
Edit `capacitor.config.json`:
```json
{
  "appId": "com.yourcompany.qurancompare",
  "appName": "QuranCompare",
  "webDir": "build",
  "bundledWebRuntime": false,
  "ios": {
    "contentInset": "automatic"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "backgroundColor": "#2c5aa0"
    }
  }
}
```

### 3. Build and Add iOS Platform
```bash
npm run build
npx cap add ios
npx cap sync ios
```

### 4. Add Required Permissions
Add to `ios/App/App/Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>QuranCompare uses your microphone for voice search to find verses using speech recognition.</string>
```

### 5. Open in Xcode
```bash
npx cap open ios
```

## Option 2: Using React Native WebView

### 1. Create React Native Project
```bash
npx react-native init QuranCompareApp
cd QuranCompareApp
npm install react-native-webview
```

### 2. Create WebView Wrapper
```javascript
// App.js
import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import WebView from 'react-native-webview';

const App = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#2c5aa0" />
      <WebView
        source={{ uri: 'https://your-app-url.com' }}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
    </SafeAreaView>
  );
};

export default App;
```

## App Store Submission Process

### 1. Prepare App Store Connect
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "+" and select "New App"
3. Fill in:
   - Platform: iOS
   - Name: QuranCompare
   - Primary Language: English (U.S.)
   - Bundle ID: Select from dropdown
   - SKU: qurancompare2024

### 2. App Information
- Category: Education
- Content Rights: Yes (for Quran translations)
- Age Rating: Complete questionnaire (will be 4+)

### 3. Pricing and Availability
- Price: Free
- Availability: All countries where possible

### 4. App Privacy
- Data Types: None collected
- Required disclosure for microphone usage

### 5. Prepare for Submission
Upload:
- [ ] App icons (use generated icons)
- [ ] Screenshots for each device size
- [ ] Description and keywords
- [ ] Support and marketing URLs
- [ ] Build from Xcode

### 6. Submit for Review
- Answer review questions
- Provide demo account if needed
- Submit and wait 24-48 hours

## Screenshot Requirements
Create screenshots showing:
1. Home screen with search
2. Verse comparison view
3. Arabic root analysis
4. Voice search in action

### Required Sizes:
- iPhone 6.5" (1284 x 2778)
- iPhone 5.5" (1242 x 2208)
- iPad Pro 12.9" (2048 x 2732)

## Testing Checklist
- [ ] All features work offline
- [ ] Voice search works correctly
- [ ] Arabic text displays properly
- [ ] Audio playback functions
- [ ] All languages load correctly
- [ ] App doesn't crash
- [ ] Performance is smooth

## Common Rejection Reasons to Avoid
1. **Guideline 4.2** - Ensure app provides functionality beyond a website
2. **Guideline 5.1.1** - Include proper privacy policy
3. **Performance** - Test thoroughly on real devices
4. **Content Rights** - Clarify Quran translation sources

## Next Steps
1. Generate app icons from logo
2. Create screenshots
3. Build with Capacitor
4. Test on real devices
5. Submit to App Store

## Support Resources
- [Apple Developer Documentation](https://developer.apple.com)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)