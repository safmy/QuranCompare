import { Capacitor } from '@capacitor/core';
import Purchases, { LOG_LEVEL, PurchasesOffering } from '@revenuecat/purchases-capacitor';

// Platform-specific payment handling
export const PlatformPayments = {
  // Check if we're running on iOS
  isIOS: () => {
    return Capacitor.getPlatform() === 'ios';
  },

  // Check if we're running on Android
  isAndroid: () => {
    return Capacitor.getPlatform() === 'android';
  },

  // Check if we're running on web
  isWeb: () => {
    return Capacitor.getPlatform() === 'web';
  },

  // Initialize payment system based on platform
  async initializePayments() {
    if (this.isIOS()) {
      // Initialize Apple In-App Purchases
      return this.initializeAppleIAP();
    } else if (this.isAndroid()) {
      // Initialize Google Play Billing
      return this.initializeGoogleBilling();
    } else {
      // Web - use Stripe
      return { platform: 'web', ready: true };
    }
  },

  // Apple In-App Purchase initialization
  async initializeAppleIAP() {
    try {
      console.log('Initializing RevenueCat for iOS...');
      
      // Configure RevenueCat
      await Purchases.configure({
        apiKey: process.env.REACT_APP_REVENUECAT_IOS_KEY || 'your_revenuecat_public_ios_key',
        appUserID: localStorage.getItem('userId') || null
      });
      
      // Enable debug logs in development
      if (process.env.NODE_ENV === 'development') {
        await Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE });
      }
      
      // Get available offerings
      const offerings = await Purchases.getOfferings();
      
      return { 
        platform: 'ios', 
        ready: true, 
        offerings: offerings.current,
        products: offerings.current?.availablePackages || []
      };
    } catch (error) {
      console.error('Failed to initialize Apple IAP:', error);
      return { platform: 'ios', ready: false, error };
    }
  },

  // Google Play Billing initialization
  async initializeGoogleBilling() {
    try {
      console.log('Initializing RevenueCat for Android...');
      
      // Configure RevenueCat
      await Purchases.configure({
        apiKey: process.env.REACT_APP_REVENUECAT_ANDROID_KEY || 'your_revenuecat_public_android_key',
        appUserID: localStorage.getItem('userId') || null
      });
      
      // Enable debug logs in development
      if (process.env.NODE_ENV === 'development') {
        await Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE });
      }
      
      // Get available offerings
      const offerings = await Purchases.getOfferings();
      
      return { 
        platform: 'android', 
        ready: true, 
        offerings: offerings.current,
        products: offerings.current?.availablePackages || []
      };
    } catch (error) {
      console.error('Failed to initialize Google Billing:', error);
      return { platform: 'android', ready: false, error };
    }
  },

  // Purchase a subscription
  async purchaseSubscription(productId) {
    if (this.isIOS()) {
      return this.purchaseAppleSubscription(productId);
    } else if (this.isAndroid()) {
      return this.purchaseGoogleSubscription(productId);
    } else {
      // Redirect to Stripe on web
      return this.purchaseStripeSubscription(productId);
    }
  },

  // Apple subscription purchase
  async purchaseAppleSubscription(packageId) {
    try {
      console.log('Purchasing Apple subscription:', packageId);
      
      // Get available packages
      const offerings = await Purchases.getOfferings();
      const packageToPurchase = offerings.current?.availablePackages.find(
        pkg => pkg.identifier === packageId
      );
      
      if (!packageToPurchase) {
        throw new Error('Package not found');
      }
      
      // Make purchase
      const purchaseResult = await Purchases.purchasePackage({ aPackage: packageToPurchase });
      
      // Check if user has active entitlement
      const entitlements = await Purchases.getCustomerInfo();
      const isPremium = entitlements.customerInfo.entitlements.active['premium'] !== undefined;
      
      return { 
        success: true, 
        isPremium,
        customerInfo: entitlements.customerInfo,
        transaction: purchaseResult
      };
    } catch (error) {
      console.error('Purchase error:', error);
      // Check if user cancelled
      if (error.code === '1') {
        return { success: false, cancelled: true };
      }
      return { success: false, error };
    }
  },

  // Google subscription purchase
  async purchaseGoogleSubscription(packageId) {
    try {
      console.log('Purchasing Google subscription:', packageId);
      
      // Get available packages
      const offerings = await Purchases.getOfferings();
      const packageToPurchase = offerings.current?.availablePackages.find(
        pkg => pkg.identifier === packageId
      );
      
      if (!packageToPurchase) {
        throw new Error('Package not found');
      }
      
      // Make purchase
      const purchaseResult = await Purchases.purchasePackage({ aPackage: packageToPurchase });
      
      // Check if user has active entitlement
      const entitlements = await Purchases.getCustomerInfo();
      const isPremium = entitlements.customerInfo.entitlements.active['premium'] !== undefined;
      
      return { 
        success: true, 
        isPremium,
        customerInfo: entitlements.customerInfo,
        transaction: purchaseResult
      };
    } catch (error) {
      console.error('Purchase error:', error);
      // Check if user cancelled
      if (error.code === '1') {
        return { success: false, cancelled: true };
      }
      return { success: false, error };
    }
  },

  // Stripe subscription for web
  async purchaseStripeSubscription(productId) {
    // This is the current implementation - redirect to Stripe
    return { platform: 'web', redirectToStripe: true };
  },

  // Restore purchases (for iOS/Android)
  async restorePurchases() {
    if (this.isIOS() || this.isAndroid()) {
      try {
        console.log('Restoring purchases...');
        const restore = await Purchases.restorePurchases();
        
        // Check if user has active entitlement
        const isPremium = restore.customerInfo.entitlements.active['premium'] !== undefined;
        
        return { 
          success: true, 
          isPremium,
          customerInfo: restore.customerInfo,
          activeSubscriptions: Object.keys(restore.customerInfo.entitlements.active)
        };
      } catch (error) {
        console.error('Restore error:', error);
        return { success: false, error };
      }
    } else {
      // On web, check with your backend
      return { platform: 'web', message: 'Check subscription status with backend' };
    }
  },
  
  // Get current subscription status
  async getSubscriptionStatus() {
    if (this.isIOS() || this.isAndroid()) {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        const isPremium = customerInfo.customerInfo.entitlements.active['premium'] !== undefined;
        
        return {
          isActive: isPremium,
          customerInfo: customerInfo.customerInfo,
          expirationDate: isPremium ? 
            customerInfo.customerInfo.entitlements.active['premium'].expirationDate : null
        };
      } catch (error) {
        console.error('Error getting subscription status:', error);
        return { isActive: false, error };
      }
    } else {
      // Web - check localStorage
      return {
        isActive: localStorage.getItem('subscriptionStatus') === 'active',
        platform: 'web'
      };
    }
  },

  // Validate receipt with your backend
  async validateReceipt(receipt, platform) {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/payment/validate-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receipt,
          platform,
          userId: localStorage.getItem('userId')
        })
      });

      if (!response.ok) {
        throw new Error('Receipt validation failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Receipt validation error:', error);
      return { valid: false, error };
    }
  }
};

// Helper to get subscription status from platform-specific storage
export const getSubscriptionStatus = async () => {
  return await PlatformPayments.getSubscriptionStatus();
};

// RevenueCat product identifiers
export const PRODUCT_IDS = {
  MONTHLY: '$rc_monthly',
  YEARLY: '$rc_yearly'
};