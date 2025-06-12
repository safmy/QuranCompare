import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkUserSubscription, createOrUpdateUser, isSupabaseConfigured, supabase } from '../utils/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on app start and listen to Supabase auth changes
  useEffect(() => {
    const initializeAuth = async () => {
      if (isSupabaseConfigured()) {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Initial Supabase session found:', session.user.email);
          await handleSupabaseUser(session.user);
        } else {
          // Check localStorage fallback
          const savedUser = localStorage.getItem('quranCompareUser');
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser);
              // Verify the user still has active subscription
              const subResult = await checkUserSubscription(userData.email);
              if (subResult.hasSubscription) {
                userData.subscriptionStatus = 'active';
                userData.subscriptionTier = 'premium';
                userData.subscriptionExpiry = subResult.user?.expires_at || null;
              } else {
                userData.subscriptionStatus = 'inactive';
                userData.subscriptionTier = 'free';
                userData.subscriptionExpiry = null;
              }
              setUser(userData);
            } catch (error) {
              console.error('Error parsing saved user data:', error);
              localStorage.removeItem('quranCompareUser');
            }
          }
        }
      } else {
        // Fallback to localStorage
        const savedUser = localStorage.getItem('quranCompareUser');
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            setUser(userData);
          } catch (error) {
            console.error('Error parsing saved user data:', error);
            localStorage.removeItem('quranCompareUser');
          }
        }
      }
      setLoading(false);
    };

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        await handleSupabaseUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('quranCompareUser');
        localStorage.removeItem('subscriptionStatus');
        localStorage.removeItem('subscriptionTier');
        localStorage.removeItem('subscriptionExpiry');
      }
    });

    initializeAuth();
    
    // Listen for custom auth success events
    const handleAuthSuccess = async (event) => {
      if (event.detail?.user) {
        await handleSupabaseUser(event.detail.user);
      }
    };
    
    window.addEventListener('supabase-auth-success', handleAuthSuccess);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('supabase-auth-success', handleAuthSuccess);
    };
  }, []);

  const handleSupabaseUser = async (supabaseUser) => {
    try {
      // Normalize email to lowercase
      const email = supabaseUser.email?.toLowerCase().trim();
      
      if (!email) {
        console.error('No email found in Supabase user');
        return;
      }
      
      // Create/update user in database
      const createResult = await createOrUpdateUser(email);
      if (!createResult.success) {
        console.error('Failed to create/update user:', createResult.error);
        // Check if it's a Supabase error
        if (createResult.isSupabaseError) {
          // Set user data locally for known premium users during outage
          const knownPremiumUsers = ['syedahmadfahmybinsyedsalim@gmail.com', 'safmy@example.com', 'zipkaa@gmail.com'];
          if (knownPremiumUsers.includes(email)) {
            const userData = {
              email: email,
              id: supabaseUser.id,
              loginTime: new Date().toISOString(),
              subscriptionStatus: 'active',
              subscriptionTier: 'premium',
              subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            };
            setUser(userData);
            localStorage.setItem('subscriptionStatus', 'active');
            localStorage.setItem('subscriptionTier', 'premium');
            localStorage.setItem('subscriptionExpiry', userData.subscriptionExpiry);
            return;
          }
        }
        return;
      }
      
      // Check subscription status
      const subResult = await checkUserSubscription(email);
      if (subResult.error) {
        console.error('Failed to check subscription:', subResult.error);
        return;
      }
      
      const userData = {
        email: email,
        id: supabaseUser.id,
        loginTime: new Date().toISOString(),
        subscriptionStatus: subResult.hasSubscription ? 'active' : 'inactive',
        subscriptionTier: subResult.hasSubscription ? 'premium' : 'free',
        subscriptionExpiry: subResult.user?.expires_at || null
      };
      
      setUser(userData);
      
      // Sync with localStorage for premium system compatibility
      if (userData.subscriptionStatus === 'active') {
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('subscriptionTier', userData.subscriptionTier);
        localStorage.setItem('subscriptionExpiry', userData.subscriptionExpiry);
      } else {
        localStorage.removeItem('subscriptionStatus');
        localStorage.removeItem('subscriptionTier');
        localStorage.removeItem('subscriptionExpiry');
      }
    } catch (error) {
      console.error('Error handling Supabase user:', error);
    }
  };

  // Save user to localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('quranCompareUser', JSON.stringify(user));
      // Also ensure subscription data is persisted
      if (user.subscriptionStatus === 'active') {
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('subscriptionTier', user.subscriptionTier || 'premium');
        localStorage.setItem('subscriptionExpiry', user.subscriptionExpiry || '');
      }
    } else {
      localStorage.removeItem('quranCompareUser');
    }
  }, [user]);

  const login = async (email) => {
    try {
      setLoading(true);
      
      // Normalize email to lowercase
      email = email?.toLowerCase().trim();
      
      if (!email) {
        return { success: false, error: 'Invalid email' };
      }
      
      // Use Supabase if configured, otherwise fallback to localStorage
      if (isSupabaseConfigured()) {
        // Check/create user in Supabase
        const createResult = await createOrUpdateUser(email);
        if (!createResult.success) {
          return { success: false, error: createResult.error };
        }
        
        // Check subscription status
        const subResult = await checkUserSubscription(email);
        if (subResult.error) {
          return { success: false, error: subResult.error };
        }
        
        const userData = {
          email: email,
          id: createResult.user.id || Date.now().toString(),
          loginTime: new Date().toISOString(),
          subscriptionStatus: subResult.hasSubscription ? 'active' : 'inactive',
          subscriptionTier: subResult.hasSubscription ? 'premium' : 'free',
          subscriptionExpiry: subResult.user?.expires_at || null
        };
        
        setUser(userData);
        
        // Sync with localStorage for premium system compatibility
        if (userData.subscriptionStatus === 'active') {
          localStorage.setItem('subscriptionStatus', 'active');
          localStorage.setItem('subscriptionTier', userData.subscriptionTier);
          localStorage.setItem('subscriptionExpiry', userData.subscriptionExpiry);
        } else {
          localStorage.removeItem('subscriptionStatus');
          localStorage.removeItem('subscriptionTier');
          localStorage.removeItem('subscriptionExpiry');
        }
        
        return { success: true };
      } else {
        // Fallback: Deny all users except safmy@example.com when Supabase not configured
        if (email !== 'safmy@example.com') {
          return { success: false, error: 'Premium subscription required. Please contact support.' };
        }
        
        const userData = {
          email: email,
          id: Date.now().toString(),
          loginTime: new Date().toISOString(),
          subscriptionStatus: 'active',
          subscriptionTier: 'premium',
          subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        };

        setUser(userData);
        
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('subscriptionTier', userData.subscriptionTier);
        localStorage.setItem('subscriptionExpiry', userData.subscriptionExpiry);

        return { success: true };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('quranCompareUser');
    localStorage.removeItem('subscriptionStatus');
    localStorage.removeItem('subscriptionTier');
    localStorage.removeItem('subscriptionExpiry');
  };

  const upgradeSubscription = async () => {
    if (!user) return { success: false, error: 'Not logged in' };

    try {
      // In production, this would process payment through Stripe
      // For now, redirect to payment flow
      return { success: false, error: 'Please use the subscription link to upgrade' };
    } catch (error) {
      console.error('Subscription upgrade error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    upgradeSubscription,
    isAuthenticated: !!user,
    hasActiveSubscription: user?.subscriptionStatus === 'active' && 
                          user?.subscriptionExpiry && 
                          new Date(user.subscriptionExpiry) > new Date()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};