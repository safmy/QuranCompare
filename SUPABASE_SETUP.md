# Supabase Setup for Subscription Management

## Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### 2. Environment Variables
Add to your `.env` file:
```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database Schema
Run this SQL in your Supabase SQL editor:

```sql
-- Create user_subscriptions table
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  tier TEXT NOT NULL DEFAULT 'free',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing public read/write for now - restrict in production)
CREATE POLICY "Allow all operations" ON user_subscriptions FOR ALL USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert test user (safmy@example.com with premium access)
INSERT INTO user_subscriptions (email, status, tier, expires_at)
VALUES ('safmy@example.com', 'active', 'premium', NOW() + INTERVAL '1 year')
ON CONFLICT (email) DO UPDATE SET
  status = 'active',
  tier = 'premium',
  expires_at = NOW() + INTERVAL '1 year';
```

## How It Works

### Authentication Flow
1. User enters email in LoginForm
2. System checks Supabase for subscription status
3. If user doesn't exist, creates them with free tier
4. If user exists, loads their subscription data
5. Only `safmy@example.com` gets premium access by default

### Subscription Check
- Premium features check `user_subscriptions` table
- Must have `status = 'active'` and `expires_at > NOW()`
- Falls back to localStorage if Supabase not configured

### Premium Access
Currently only `safmy@example.com` has premium access. To add more users:

```sql
UPDATE user_subscriptions 
SET status = 'active', tier = 'premium', expires_at = NOW() + INTERVAL '1 month'
WHERE email = 'user@example.com';
```

## Production Security
For production, you should:
1. Restrict RLS policies to only allow users to read their own data
2. Use Supabase Auth for proper authentication
3. Implement Stripe webhooks to update subscription status
4. Use server-side API routes for sensitive operations

## Development Mode
If Supabase environment variables are not set, the system falls back to localStorage-based authentication for development.