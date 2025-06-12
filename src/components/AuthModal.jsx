import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import DatabaseErrorModal from './DatabaseErrorModal';

const AuthModal = ({ onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showDatabaseError, setShowDatabaseError] = useState(false);

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      
    } catch (err) {
      console.error('Google auth error:', err);
      if (err.message?.includes('Project not specified') || err.message?.includes('Database service')) {
        setShowDatabaseError(true);
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Microsoft OAuth removed - no Azure permissions available

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsLoading(true);
      setError('');

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: 'temp-password-' + Date.now(), // Temporary password for magic link
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (error) throw error;
        
        setError('Check your email for a verification link!');
      } else {
        const { data, error } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (error) throw error;
        
        setError('Check your email for a login link!');
      }
    } catch (err) {
      console.error('Email auth error:', err);
      if (err.message?.includes('Project not specified') || err.message?.includes('Database service')) {
        setShowDatabaseError(true);
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
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
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', textAlign: 'center', color: '#1976d2' }}>
          🔐 Sign In / Sign Up
        </h2>
        
        <p style={{ marginBottom: '30px', color: '#666', textAlign: 'center', lineHeight: '1.6' }}>
          Sign in with Google for instant access, or use email magic link for any email provider
        </p>

        {/* Social Auth Buttons */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleGoogleAuth}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            📧 Continue with Google
          </button>

        </div>

        {/* Divider */}
        <div style={{
          textAlign: 'center',
          margin: '20px 0',
          position: 'relative'
        }}>
          <div style={{
            height: '1px',
            backgroundColor: '#e0e0e0',
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0
          }}></div>
          <span style={{
            backgroundColor: 'white',
            padding: '0 15px',
            color: '#666',
            fontSize: '12px'
          }}>
            OR
          </span>
        </div>

        {/* Email Auth */}
        <form onSubmit={handleEmailAuth}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Email Address:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isLoading || !email.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '10px',
              opacity: (isLoading || !email.trim()) ? 0.5 : 1
            }}
          >
            {isLoading ? 'Sending...' : (isSignUp ? 'Send Sign Up Link' : 'Send Login Link')}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          style={{
            background: 'none',
            border: 'none',
            color: '#2196F3',
            cursor: 'pointer',
            fontSize: '12px',
            textDecoration: 'underline',
            marginBottom: '20px'
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'New user? Create account'}
        </button>

        {error && (
          <div style={{
            padding: '10px',
            backgroundColor: error.includes('Check your email') ? '#e8f5e8' : '#ffebee',
            color: error.includes('Check your email') ? '#2e7d32' : '#d32f2f',
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <div style={{
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          fontSize: '13px',
          lineHeight: '1.4'
        }}>
          <strong>After signing in:</strong> You'll be able to purchase the AI Debater Bot 
          subscription for £2.99/month through our secure payment system.
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
            Cancel
          </button>
        </div>
      </div>
      
      <DatabaseErrorModal 
        show={showDatabaseError} 
        onClose={() => setShowDatabaseError(false)} 
      />
    </div>
  );
};

export default AuthModal;