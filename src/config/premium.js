// Premium feature configuration
export const PREMIUM_FEATURES = {
  CHUNK_AUDIO: 'chunk_audio',
  ADVANCED_SEARCH: 'advanced_search',
  UNLIMITED_EXPORTS: 'unlimited_exports',
  DEBATER_BOT: 'debater_bot' // New subscription-only feature
};

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium'
};

// Features that require active subscription (not just one-time purchase)
export const SUBSCRIPTION_ONLY_FEATURES = [
  PREMIUM_FEATURES.DEBATER_BOT
];

// Check if user has access to premium features
export const checkPremiumAccess = async (feature) => {
  // Check if this feature requires active subscription
  if (SUBSCRIPTION_ONLY_FEATURES.includes(feature)) {
    return await hasActiveSubscription();
  }
  
  // Check if feature is purchased (will implement payment later)
  const purchasedFeatures = JSON.parse(localStorage.getItem('purchasedFeatures') || '[]');
  
  // Check if user has active subscription (covers all features)
  return purchasedFeatures.includes(feature) || await hasActiveSubscription();
};

// Check if user has active subscription
export const hasActiveSubscription = async () => {
  // Import platform payments utils
  const { PlatformPayments } = await import('../utils/platformPayments');
  
  // Check platform-specific subscription status
  const status = await PlatformPayments.getSubscriptionStatus();
  
  if (status.isActive) {
    return true;
  }
  
  // Fallback to localStorage for web
  const subscriptionExpiry = localStorage.getItem('subscriptionExpiry');
  const subscriptionStatus = localStorage.getItem('subscriptionStatus');
  
  return subscriptionStatus === 'active' && 
         subscriptionExpiry && 
         new Date(subscriptionExpiry) > new Date();
};

// Get subscription info
export const getSubscriptionInfo = () => {
  return {
    status: localStorage.getItem('subscriptionStatus') || 'inactive',
    tier: localStorage.getItem('subscriptionTier') || SUBSCRIPTION_TIERS.FREE,
    expiry: localStorage.getItem('subscriptionExpiry'),
    isActive: hasActiveSubscription()
  };
};

// Set subscription status
export const setSubscriptionStatus = (status, tier, expiryDate) => {
  localStorage.setItem('subscriptionStatus', status);
  localStorage.setItem('subscriptionTier', tier);
  if (expiryDate) {
    localStorage.setItem('subscriptionExpiry', expiryDate);
  }
};

// Simulate feature purchase (for testing)
export const purchaseFeature = (feature) => {
  const purchasedFeatures = JSON.parse(localStorage.getItem('purchasedFeatures') || '[]');
  if (!purchasedFeatures.includes(feature)) {
    purchasedFeatures.push(feature);
    localStorage.setItem('purchasedFeatures', JSON.stringify(purchasedFeatures));
  }
};

// Get OpenAI API key (secure handling needed for production)
export const getOpenAIKey = () => {
  // For development, use environment variable
  if (process.env.REACT_APP_OPENAI_API_KEY) {
    return process.env.REACT_APP_OPENAI_API_KEY;
  }
  
  // For production, this should come from a secure backend
  // Never expose API keys in client-side code
  return null;
};