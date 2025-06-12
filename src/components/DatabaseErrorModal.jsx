import React from 'react';

const DatabaseErrorModal = ({ show, onClose }) => {
  if (!show) return null;

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
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ marginTop: 0, color: '#d32f2f' }}>⚠️ Database Service Unavailable</h2>
        
        <p style={{ marginBottom: '20px' }}>
          We're experiencing technical difficulties with our database service provider (Supabase). 
          This is affecting user authentication and subscription verification.
        </p>
        
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <strong>Current Status:</strong>
          <ul style={{ marginBottom: 0 }}>
            <li>Supabase is reporting platform-wide technical issues</li>
            <li>Authentication may fail or be slow</li>
            <li>Subscription verification is temporarily unavailable</li>
          </ul>
        </div>
        
        <p style={{ marginBottom: '20px' }}>
          <strong>What you can do:</strong>
        </p>
        <ul>
          <li>Try again in a few minutes</li>
          <li>Check Supabase status at: <a href="https://status.supabase.com" target="_blank" rel="noopener noreferrer">status.supabase.com</a></li>
          <li>If you're a premium user and cannot access features, please contact support with your email address</li>
        </ul>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          marginTop: '20px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseErrorModal;