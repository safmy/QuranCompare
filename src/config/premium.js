// Premium feature configuration
export const PREMIUM_FEATURES = {
  CHUNK_AUDIO: 'chunk_audio',
  ADVANCED_SEARCH: 'advanced_search',
  UNLIMITED_EXPORTS: 'unlimited_exports'
};

// Check if user has access to premium features
export const checkPremiumAccess = (feature) => {
  // For development, check if user is developer
  const isDeveloper = localStorage.getItem('isDeveloper') === 'true';
  
  // Check if feature is purchased (will implement payment later)
  const purchasedFeatures = JSON.parse(localStorage.getItem('purchasedFeatures') || '[]');
  
  // Check if user has active subscription
  const subscriptionExpiry = localStorage.getItem('subscriptionExpiry');
  const hasActiveSubscription = subscriptionExpiry && new Date(subscriptionExpiry) > new Date();
  
  return isDeveloper || purchasedFeatures.includes(feature) || hasActiveSubscription;
};

// Set developer access (for testing)
export const setDeveloperAccess = (enabled) => {
  localStorage.setItem('isDeveloper', enabled ? 'true' : 'false');
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