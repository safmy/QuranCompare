import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth event listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session?.user?.email);
  
  if (event === 'SIGNED_IN' && session?.user) {
    // User signed in successfully
    window.dispatchEvent(new CustomEvent('supabase-auth-success', {
      detail: { user: session.user }
    }));
  }
  
  if (event === 'SIGNED_OUT') {
    // User signed out
    window.dispatchEvent(new CustomEvent('supabase-auth-signout'));
  }
});

// User and subscription management via API
export const checkUserSubscription = async (email) => {
  try {
    const response = await fetch(`https://qurancompare.onrender.com/api/payment/user/subscription/${encodeURIComponent(email)}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error checking subscription via API:', err);
    // Fallback to direct Supabase if API fails
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase fallback error:', error);
        return { hasSubscription: false, error: error.message };
      }

      return {
        hasSubscription: !!data,
        user: data,
        error: null
      };
    } catch (fallbackErr) {
      console.error('Fallback error:', fallbackErr);
      return { hasSubscription: false, error: fallbackErr.message };
    }
  }
};

export const createOrUpdateUser = async (email) => {
  try {
    const response = await fetch('https://qurancompare.onrender.com/api/payment/user/subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error creating user via API:', err);
    // Fallback to direct Supabase if API fails
    try {
      const { data: existingUser } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        return { success: true, user: existingUser };
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .insert([
          {
            email: email,
            status: email === 'safmy@example.com' ? 'active' : 'inactive',
            tier: email === 'safmy@example.com' ? 'premium' : 'free',
            expires_at: email === 'safmy@example.com' 
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              : null,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase fallback error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, user: data };
    } catch (fallbackErr) {
      console.error('Fallback error:', fallbackErr);
      return { success: false, error: fallbackErr.message };
    }
  }
};

// Get current user from Supabase
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Sign out user
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
};

// Fallback to localStorage if Supabase is not configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://your-project.supabase.co' && 
         supabaseAnonKey !== 'your-anon-key' &&
         supabaseUrl && supabaseAnonKey;
};