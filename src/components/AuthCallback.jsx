import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthCallback = () => {
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          return;
        }

        if (data.session) {
          // User successfully authenticated
          setStatus('success');
          
          // Redirect to the main app after a short delay
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          setStatus('error');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
      }
    };

    handleAuthCallback();
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
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        {status === 'processing' && (
          <>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #2196F3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2>Signing you in...</h2>
            <p>Please wait while we complete your authentication.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ color: '#4caf50' }}>Authentication Successful!</h2>
            <p>You're being redirected to the app...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
            <h2 style={{ color: '#f44336' }}>Authentication Failed</h2>
            <p>There was an issue with your authentication. Please try again.</p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Return to App
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default AuthCallback;