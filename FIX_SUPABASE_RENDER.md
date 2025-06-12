# Fix Supabase "Project not specified" Error on Render

## Issue
The error "Project not specified" occurs when the API backend cannot properly initialize the Supabase client due to missing or incorrect configuration.

## Quick Diagnosis
1. Open `check_api_config.html` in your browser
2. Click "Check API Status" to see the current configuration
3. Click "Check Supabase Status" to see specific Supabase issues

## Solution Steps

### 1. Get Your Supabase Service Key
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to Settings → API
3. Find the "service_role" key (NOT the anon key)
4. Copy this key - it starts with `eyJ...`

### 2. Update Render Environment Variables
1. Go to your Render dashboard: https://dashboard.render.com
2. Select your `qurancompare` web service
3. Click on "Environment" in the left sidebar
4. Check/Update these variables:

```
SUPABASE_URL=https://fsubmqjevlfpcirgsbhi.supabase.co
SUPABASE_SERVICE_KEY=[paste your service role key here]
```

### 3. Trigger a New Deploy
After updating the environment variables:
1. Click "Manual Deploy" → "Deploy latest commit"
2. Wait for the deployment to complete
3. Check the logs for any initialization errors

### 4. Verify the Fix
1. Use the `check_api_config.html` file again
2. Both endpoints should now show Supabase as configured
3. Try logging in to the AI Debater again

## Alternative: Temporary Frontend Fix

If you can't update the Render deployment immediately, you can temporarily bypass the API by modifying the frontend to use Supabase directly:

1. In `src/utils/supabase.js`, update the `createOrUpdateUser` function to skip the API call:

```javascript
export const createOrUpdateUser = async (email) => {
  try {
    // Skip API and use Supabase directly
    const normalizedEmail = email.toLowerCase().trim();
    
    // Special users with permanent premium access
    const premiumUsers = [
      'syedahmadfahmybinsyedsalim@gmail.com',
      'safmy@example.com',
      'zipkaa@gmail.com'
    ];
    
    const isPremium = premiumUsers.includes(normalizedEmail);
    
    return {
      success: true,
      user: {
        email: normalizedEmail,
        status: isPremium ? 'active' : 'inactive',
        tier: isPremium ? 'premium' : 'free',
        expires_at: isPremium 
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      }
    };
  } catch (err) {
    console.error('Error in createOrUpdateUser:', err);
    return { success: false, error: err.message };
  }
};
```

## Root Cause
The issue occurs because:
1. The Render deployment is missing the SUPABASE_SERVICE_KEY environment variable
2. Without this key, the Supabase client cannot authenticate to perform database operations
3. The error "Project not specified" is Supabase's way of saying it can't identify which project to connect to without proper authentication

## Prevention
1. Always verify environment variables after deployment
2. Use the test endpoints to validate configuration
3. Keep a backup of your service keys in a secure password manager
4. Monitor deployment logs for initialization errors