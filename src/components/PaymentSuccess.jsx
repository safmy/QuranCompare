import React, { useEffect } from 'react';

const PaymentSuccess = () => {
  useEffect(() => {
    // Redirect to main app after 3 seconds
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ color: '#4caf50', marginBottom: '15px' }}>Payment Successful!</h2>
        <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
          Thank you for subscribing to the AI Debater Bot! Your subscription is now active.
        </p>
        <div style={{
          backgroundColor: '#e8f5e8',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '25px',
          textAlign: 'left'
        }}>
          <strong>✅ What's included:</strong>
          <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
            <li>Unlimited AI debate conversations</li>
            <li>Specialized theological discussions</li>
            <li>Access to 60+ debate rules and audio references</li>
            <li>Responses based on Rashad Khalifa's teachings</li>
          </ul>
        </div>
        <p style={{ fontSize: '14px', color: '#888' }}>
          Redirecting you to the app in a few seconds...
        </p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: '15px',
            padding: '12px 24px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Go to AI Debater Bot
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;