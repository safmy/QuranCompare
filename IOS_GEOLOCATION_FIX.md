# iOS Geolocation Fix for Prayer Times

## Problem
The iOS simulator has known issues with geolocation services. When running the app in the simulator, the prayer times component would get stuck "determining your location" indefinitely.

## Root Cause
1. iOS simulators often fail to provide geolocation data
2. The original code had no fallback mechanism
3. Long timeouts (10-15 seconds) made the issue worse
4. No clear error messages for users

## Solution Implemented

### 1. Simulator Detection
```javascript
const isSimulator = () => {
  return navigator.userAgent.includes('Simulator') || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};
```

### 2. Default Location Fallback
When running in simulator or when geolocation fails:
- Defaults to Mecca (21.4225°N, 39.8262°E)
- Shows appropriate error message
- Still allows manual city search

### 3. Improved Error Handling
- Specific error messages for different failure scenarios
- Shorter timeout (5 seconds instead of 10-15)
- Clear instructions for users

### 4. Location Persistence
- Saves last used location to localStorage
- Automatically loads saved location on app start
- No more blank state on return visits

## Testing on Real Device vs Simulator

### Simulator Behavior
- Location button (📍) will show "Location not available in simulator"
- Defaults to Mecca for prayer times
- Manual city search works normally

### Real Device Behavior
- Location button (📍) will request actual GPS location
- Shows proper error if permission denied
- Falls back gracefully if location unavailable

## Manual Testing Steps

1. **In Simulator:**
   - Open Prayer Times
   - Tap 📍 button
   - Should see "Location not available in simulator" and default to Mecca
   - Type a city name and search - should work

2. **On Real Device:**
   - Open Prayer Times
   - Tap 📍 button
   - Should prompt for location permission
   - If allowed, shows actual location
   - If denied, shows helpful error message

## Files Changed
- `src/components/PrayerTimesWithAlarmsIOSFixed.jsx` - New fixed version
- `src/components/SidebarMenu.jsx` - Updated to use fixed version

## Future Improvements
- Add more default city options
- Cache prayer times for offline use
- Add manual coordinate input option