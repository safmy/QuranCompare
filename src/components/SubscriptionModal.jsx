import React, { useState } from 'react';

const SubscriptionModal = ({ user, onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStripeCheckout = async () => {
    try {
      setIsLoading(true);
      setError('');

      // TODO: Implement Stripe checkout
      // For now, simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Update user subscription in Supabase after successful payment
      alert('Payment processing would happen here. For demo purposes, contact support to activate your subscription.');
      
      onClose();
    } catch (err) {
      console.error('Payment error:', err);
      setError('Payment failed. Please try again.');
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
    
    window.open(`mailto:support@qurancompare.com?subject=${subject}&body=${body}`, '_blank');
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
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
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

        <div style={{
          backgroundColor: '#fff3e0',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          fontSize: '14px',
          lineHeight: '1.6',
          textAlign: 'center'
        }}>
          <strong>⚠️ Payment System Under Development</strong>
          <p style={{ margin: '10px 0 0 0' }}>
            Automated payment processing is coming soon. For now, please contact support 
            to arrange manual payment and activation of your subscription.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>

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
              fontWeight: 'bold'
            }}
          >
            📧 Contact Support for Manual Setup
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

        <div style={{ display: 'flex', justifyContent: 'center' }}>
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
      </div>
    </div>
  );
};

export default SubscriptionModal;