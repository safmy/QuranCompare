import React from 'react';

const PaymentCancel = () => {
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
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>😔</div>
        <h2 style={{ color: '#f44336', marginBottom: '15px' }}>Payment Cancelled</h2>
        <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
          No worries! You can try again anytime or contact our support team for assistance.
        </p>
        <div style={{
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '25px'
        }}>
          <strong>💡 Still interested?</strong>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
            The AI Debater Bot offers unique theological debates you won't find anywhere else. 
            Try the subscription again or contact support for help.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Back to App
          </button>
          <button
            onClick={() => {
              const subject = encodeURIComponent('Need Help with Subscription');
              const body = encodeURIComponent('I had trouble with the payment process and would like assistance subscribing to the AI Debater Bot.');
              window.open(`mailto:support@qurancompare.com?subject=${subject}&body=${body}`, '_blank');
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;