import React, { useState } from 'react';
import { appConfig } from '../config/app';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

const SubscriptionModal = ({ user, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStripeCheckout = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Create Stripe checkout session
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
      
      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
      
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to start payment process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPalCheckout = async () => {
    try {
      setIsLoading(true);
      setError('');

      // TODO: Implement PayPal checkout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('PayPal integration coming soon. For now, contact support to activate your subscription.');
      
      onClose();
    } catch (err) {
      console.error('PayPal error:', err);
      setError('PayPal checkout failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Premium Subscription Request');
    const body = encodeURIComponent(
      `Hi,

I would like to subscribe to the AI Debater Bot premium feature for £2.99/month.

My account details:
- Email: ${user?.email || 'Not provided'}
- User ID: ${user?.id || 'Not provided'}

Please contact me to set up my subscription and provide payment instructions.

Thank you!`
    );
    
    window.open(`mailto:${appConfig.supportEmail}?subject=${subject}&body=${body}`, '_blank');
    onClose();
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
      zIndex: 10000,
      overflowY: 'auto',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        margin: 'auto'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center', color: '#1976d2' }}>
          🤖 Subscribe to AI Debater Bot
        </h2>
        
        <div style={{
          backgroundColor: '#e8f5e8',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <strong>✅ Signed in as:</strong> {user?.email}
        </div>

        <div style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333', textAlign: 'center' }}>
            AI Debater Bot Premium - £2.99/month
          </h3>
          <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '20px' }}>
            <li><strong>Specialized Knowledge:</strong> Trained on Rashad Khalifa's complete teachings</li>
            <li><strong>Authentic Perspective:</strong> Responds as a true submitter, not neutral AI</li>
            <li><strong>Integrated Research:</strong> Instant access to 60+ debate rules and audio references</li>
            <li><strong>Final Testament Focus:</strong> All responses backed by Quranic verses</li>
            <li><strong>Community Wisdom:</strong> Incorporates years of submission community discussions</li>
          </ul>
        </div>

        <h4 style={{ marginBottom: '15px', color: '#333' }}>Payment Options:</h4>

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleStripeCheckout}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '15px',
              backgroundColor: '#6772e5',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Creating checkout...' : '💳 Pay with Stripe - £2.99/month'}
          </button>

          <div style={{
            textAlign: 'center',
            margin: '15px 0',
            color: '#666',
            fontSize: '12px'
          }}>
            OR
          </div>

          <button
            onClick={handleContactSupport}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'background-color 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1976d2';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2196F3';
            }}
          >
            <span>📧</span>
            <span>Contact Support</span>
          </button>
        </div>

        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: '#ffebee',
            color: '#d32f2f',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {isLoading && (
          <div style={{
            textAlign: 'center',
            color: '#666',
            marginBottom: '20px'
          }}>
            Processing payment...
          </div>
        )}

        <div style={{
          backgroundColor: '#fff3e0',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          fontSize: '13px',
          lineHeight: '1.4'
        }}>
          <strong>Note:</strong> Payment processing is currently being set up. 
          For immediate access, please contact support who will manually activate your subscription.
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '12px 20px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Maybe Later
          </button>
        </div>

        {/* Technical Support Section */}
        <div style={{
          borderTop: '1px solid #e0e0e0',
          paddingTop: '15px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 0' }}>
            Having technical issues?
          </p>
          <button
            onClick={() => {
              const subject = encodeURIComponent('Technical Support Request');
              const body = encodeURIComponent(
                `Hi,

I'm experiencing technical issues with the QuranCompare app.

Issue description:
[Please describe your technical issue here]

Account details:
- Email: ${user?.email}
- User ID: ${user?.id}

Browser/Device info:
- User Agent: ${navigator.userAgent}

Thank you!`
              );
              
              window.open(`mailto:${appConfig.supportEmail}?subject=${subject}&body=${body}`, '_blank');
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#1976d2',
              border: '1px solid #1976d2',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1976d2';
              e.target.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#1976d2';
            }}
          >
            🔧 Get Technical Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;