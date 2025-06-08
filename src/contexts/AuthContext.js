import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkUserSubscription, createOrUpdateUser, isSupabaseConfigured } from '../utils/supabase';

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

  // Load user from localStorage on app start
  useEffect(() => {
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
    setLoading(false);
  }, []);

  // Save user to localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('quranCompareUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('quranCompareUser');
    }
  }, [user]);

  const login = async (email) => {
    try {
      setLoading(true);
      
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