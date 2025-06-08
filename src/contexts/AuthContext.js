import React, { createContext, useContext, useState, useEffect } from 'react';

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
      
      // For now, simulate a simple login process
      // In production, this would verify the email with your backend
      const userData = {
        email: email,
        id: Date.now().toString(),
        loginTime: new Date().toISOString(),
        subscriptionStatus: email === 'safmy@example.com' ? 'active' : 'inactive', // Demo: make your email premium
        subscriptionTier: email === 'safmy@example.com' ? 'premium' : 'free',
        subscriptionExpiry: email === 'safmy@example.com' ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : // 30 days from now
          null
      };

      setUser(userData);
      
      // Update subscription status in premium system
      if (userData.subscriptionStatus === 'active') {
        localStorage.setItem('subscriptionStatus', 'active');
        localStorage.setItem('subscriptionTier', userData.subscriptionTier);
        localStorage.setItem('subscriptionExpiry', userData.subscriptionExpiry);
      }

      return { success: true };
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
      const updatedUser = {
        ...user,
        subscriptionStatus: 'active',
        subscriptionTier: 'premium',
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      setUser(updatedUser);
      
      // Update subscription status
      localStorage.setItem('subscriptionStatus', 'active');
      localStorage.setItem('subscriptionTier', 'premium');
      localStorage.setItem('subscriptionExpiry', updatedUser.subscriptionExpiry);

      return { success: true };
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