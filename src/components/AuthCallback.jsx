import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthCallback = () => {
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('AuthCallback: Starting auth callback process');
        console.log('Current URL:', window.location.href);
        
        // Check for auth tokens in URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        console.log('Hash params:', Object.fromEntries(hashParams));
        console.log('Query params:', Object.fromEntries(queryParams));
        
        // Check if we have auth tokens (magic link callback)
        const hasAuthTokens = hashParams.get('access_token') || 
                              hashParams.get('refresh_token') || 
                              queryParams.get('code') ||
                              hashParams.get('type') === 'magiclink';
        
        if (hasAuthTokens) {
          console.log('Auth tokens found, processing magic link...');
          
          // Wait a moment for Supabase to process the tokens
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Now check for session
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Auth callback error:', error);
            setStatus('error');
            return;
          }

          if (data.session) {
            console.log('Session found:', data.session.user?.email);
            setStatus('success');
            
            // Trigger auth state update event for immediate sync
            window.dispatchEvent(new CustomEvent('supabase-auth-success', {
              detail: { user: data.session.user }
            }));
            
            // Redirect to the main app after a short delay
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          } else {
            console.log('No session found, trying to refresh...');
            // Try refreshing the session
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('Refresh error:', refreshError);
              setStatus('error');
              return;
            }
            
            if (refreshData.session) {
              console.log('Session refreshed successfully');
              setStatus('success');
              setTimeout(() => {
                window.location.href = '/';
              }, 2000);
            } else {
              console.log('Still no session after refresh');
              setStatus('error');
            }
          }
        } else {
          console.log('No auth tokens found in URL');
          
          // Check if we already have a session
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session check error:', error);
            setStatus('error');
            return;
          }
          
          if (data.session) {
            console.log('Existing session found');
            setStatus('success');
            setTimeout(() => {
              window.location.href = '/';
            }, 1000);
          } else {
            console.log('No existing session, redirecting to home');
            setStatus('error');
          }
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