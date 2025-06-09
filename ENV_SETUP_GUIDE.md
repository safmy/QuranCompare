# Environment Variables Setup Guide

## ⚠️ SECURITY NOTICE
Your Supabase keys were exposed in the git repository. While the anon key is meant to be public (used in frontend), it's still better practice to keep it in environment variables.

## Setup Instructions

### 1. For Local Development (React App)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual values in `.env`

3. The React app will automatically load these variables

### 2. For Python Scripts

1. Install python-dotenv:
   ```bash
   pip install python-dotenv
   ```

2. Create a `.env` file with your keys (already done)

3. The scripts now load environment variables automatically

### 3. For Netlify Deployment

1. Go to your Netlify dashboard
2. Navigate to Site Settings → Environment Variables
3. Add these variables:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_API_URL`
   - Any other needed variables

### 4. Version Control

The following files are in `.gitignore` and won't be committed:
- `.env`
- `.env.local`
- `.env.development.local`
- `.env.test.local`
- `.env.production.local`

Only `.env.example` should be committed to show others what variables are needed.

## Required Environment Variables

### React App
- `REACT_APP_SUPABASE_URL` - Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `REACT_APP_API_URL` - Backend API URL (default: https://qurancompare.onrender.com)

### Python Scripts (if using)
- `SUPABASE_URL` - Supabase URL for data upload scripts
- `SUPABASE_ANON_KEY` - Supabase key for data upload scripts

## Security Best Practices

1. **Never commit `.env` files** with real keys
2. **Rotate keys** if they've been exposed
3. **Use different keys** for development and production
4. **Limit key permissions** in Supabase dashboard
5. **Monitor usage** in Supabase dashboard for unusual activity

## Next Steps

Since your keys were exposed:
1. Consider rotating your Supabase anon key in the dashboard
2. Update the new key in all your environments
3. Monitor for any unauthorized usage