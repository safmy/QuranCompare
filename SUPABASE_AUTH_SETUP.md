# Supabase Authentication Setup

## OAuth Provider Configuration

To enable Google and Microsoft OAuth login, you need to configure these providers in your Supabase dashboard:

### 1. Access Supabase Dashboard
- Go to https://supabase.com/dashboard
- Select your project: `fsubmqjevlfpcirgsbhi`
- Navigate to **Authentication → Providers**

### 2. Configure Google OAuth

**Enable Google Provider:**
1. Click on **Google** in the providers list
2. Toggle **Enable sign in with Google** to ON
3. Add these settings:

**Client ID:** (You need to create this in Google Cloud Console)
**Client Secret:** (From Google Cloud Console)
**Redirect URL:** `https://fsubmqjevlfpcirgsbhi.supabase.co/auth/v1/callback`

**Google Cloud Console Setup:**
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `https://fsubmqjevlfpcirgsbhi.supabase.co/auth/v1/callback`
6. Copy Client ID and Secret to Supabase

### 3. Configure Microsoft OAuth

**Enable Azure Provider:**
1. Click on **Azure** in the providers list  
2. Toggle **Enable sign in with Azure** to ON
3. Add these settings:

**Client ID:** (From Azure App Registration)
**Client Secret:** (From Azure App Registration)
**Redirect URL:** `https://fsubmqjevlfpcirgsbhi.supabase.co/auth/v1/callback`

**Azure Portal Setup:**
1. Go to https://portal.azure.com
2. Navigate to Azure Active Directory → App registrations
3. Click **New registration**
4. Add redirect URI: `https://fsubmqjevlfpcirgsbhi.supabase.co/auth/v1/callback`
5. Generate client secret in Certificates & secrets
6. Copy Application (client) ID and secret to Supabase

### 4. Configure Site URL

In Supabase Authentication settings:
- **Site URL:** `https://qurancompare.onrender.com` (or your Netlify URL)
- **Additional Redirect URLs:** Add your local development URL: `http://localhost:3000`

## Email Templates (Optional)

You can customize the email templates in Authentication → Email Templates:
- **Confirm signup**
- **Magic Link**
- **Change email address**
- **Reset password**

## Testing

After configuration:
1. Users can sign in with Google/Microsoft
2. They'll be redirected to your app after authentication
3. Magic link emails will be sent for email-based auth

## Current Status

- ✅ Database schema ready
- ✅ Auth components created
- ⏳ OAuth providers need configuration (requires your setup)
- ⏳ Payment system integration pending

## Next Steps

1. Configure OAuth providers in Supabase dashboard
2. Test authentication flow
3. Set up Stripe for payment processing
4. Deploy updated authentication system