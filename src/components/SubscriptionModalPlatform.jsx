import React, { useState, useEffect } from 'react';
import { PlatformPayments } from '../utils/platformPayments';
import { appConfig } from '../config/app';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

const SubscriptionModalPlatform = ({ user, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('web');
  const [showWebPaymentInfo, setShowWebPaymentInfo] = useState(false);

  useEffect(() => {
    // Detect platform on mount
    setPlatform(PlatformPayments.isIOS() ? 'ios' : 
                 PlatformPayments.isAndroid() ? 'android' : 'web');
  }, []);

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (platform === 'ios' || platform === 'android') {
        // Use native IAP
        const result = await PlatformPayments.purchaseSubscription('premium_monthly');
        
        if (result.success) {
          // Validate receipt with backend
          const validation = await PlatformPayments.validateReceipt(result.receipt, platform);
          
          if (validation.valid) {
            onSuccess();
          } else {
            setError('Subscription validation failed. Please try again.');
          }
        } else {
          setError(result.message || 'Purchase failed');
        }
      } else {
        // Web - use Stripe
        handleStripeCheckout();
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError('Failed to process subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeCheckout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          success_url: `${window.location.origin}/payment/success`,
          cancel_url: `${window.location.origin}/payment/cancel`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      window.location.href = data.checkout_url;
      
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to start payment process. Please try again.');
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsLoading(true);
      const result = await PlatformPayments.restorePurchases();
      
      if (result.success && result.purchases.length > 0) {
        // Validate restored purchases
        for (const purchase of result.purchases) {
          const validation = await PlatformPayments.validateReceipt(purchase.receipt, platform);
          if (validation.valid) {
            onSuccess();
            return;
          }
        }
        setError('No active subscriptions found');
      } else {
        setError('No purchases to restore');
      }
    } catch (err) {
      setError('Failed to restore purchases');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>
            {appConfig.appName} Premium
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c00',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px', color: '#444' }}>Premium Features</h3>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0,
            margin: 0
          }}>
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#4CAF50', marginRight: '10px', fontSize: '20px' }}>✓</span>
              <span>AI Debater Bot - Engage in deep Quranic discussions</span>
            </li>
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#4CAF50', marginRight: '10px', fontSize: '20px' }}>✓</span>
              <span>Advanced Search Features</span>
            </li>
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#4CAF50', marginRight: '10px', fontSize: '20px' }}>✓</span>
              <span>Unlimited Audio Downloads</span>
            </li>
            <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#4CAF50', marginRight: '10px', fontSize: '20px' }}>✓</span>
              <span>Priority Support</span>
            </li>
          </ul>
        </div>

        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
            Monthly Subscription
          </h3>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#4CAF50' }}>
            {platform === 'ios' ? '$4.99' : '$3.99'}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            per month
          </div>
          {platform === 'ios' && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
              Billed through Apple App Store
            </div>
          )}
          {platform === 'android' && (
            <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
              Billed through Google Play
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            style={{
              padding: '15px',
              backgroundColor: isLoading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {isLoading ? 'Processing...' : 'Subscribe Now'}
          </button>

          {(platform === 'ios' || platform === 'android') && (
            <button
              onClick={handleRestorePurchases}
              disabled={isLoading}
              style={{
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#4CAF50',
                border: '1px solid #4CAF50',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Restore Purchases
            </button>
          )}

          {platform === 'ios' && (
            <button
              onClick={() => setShowWebPaymentInfo(!showWebPaymentInfo)}
              style={{
                padding: '10px',
                backgroundColor: 'transparent',
                color: '#666',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Want to pay with card instead?
            </button>
          )}
        </div>

        {showWebPaymentInfo && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#f9f9f9',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#666'
          }}>
            <p style={{ margin: '0 0 10px 0' }}>
              To subscribe with a credit card and save 20%, please visit our website:
            </p>
            <a 
              href={appConfig.baseUrl} 
              style={{ color: '#4CAF50', textDecoration: 'none' }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {appConfig.baseUrl}
            </a>
          </div>
        )}

        <div style={{
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #eee',
          fontSize: '12px',
          color: '#999',
          textAlign: 'center'
        }}>
          {platform === 'ios' && (
            <>
              <p>Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.</p>
              <p>
                <a href="/privacy-policy" style={{ color: '#4CAF50' }}>Privacy Policy</a>
                {' • '}
                <a href="/terms" style={{ color: '#4CAF50' }}>Terms of Service</a>
              </p>
            </>
          )}
          {platform === 'web' && (
            <p>Secure payment processing by Stripe</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModalPlatform;