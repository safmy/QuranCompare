import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User and subscription management
export const checkUserSubscription = async (email) => {
  try {
    // Check if user exists and has active subscription
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Supabase error:', error);
      return { hasSubscription: false, error: error.message };
    }

    return {
      hasSubscription: !!data,
      user: data,
      error: null
    };
  } catch (err) {
    console.error('Error checking subscription:', err);
    return { hasSubscription: false, error: err.message };
  }
};

export const createOrUpdateUser = async (email) => {
  try {
    // First check if user exists
    const { data: existingUser } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return { success: true, user: existingUser };
    }

    // Create new user with free tier
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert([
        {
          email: email,
          status: email === 'safmy@example.com' ? 'active' : 'inactive',
          tier: email === 'safmy@example.com' ? 'premium' : 'free',
          expires_at: email === 'safmy@example.com' 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
            : null,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data };
  } catch (err) {
    console.error('Error in createOrUpdateUser:', err);
    return { success: false, error: err.message };
  }
};

// Fallback to localStorage if Supabase is not configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://your-project.supabase.co' && 
         supabaseAnonKey !== 'your-anon-key' &&
         supabaseUrl && supabaseAnonKey;
};