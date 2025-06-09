import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasActiveSubscription, getSubscriptionInfo } from '../config/premium';
import { appConfig } from '../config/app';
import SubscriptionModal from './SubscriptionModal';
import { cancelSubscription } from '../utils/subscriptionManager';

const UserProfile = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const subscriptionInfo = getSubscriptionInfo();
  
  if (!isAuthenticated || !user) {
    return null;
  }
  
  const handleManageSubscription = async () => {
    // If user has active subscription, redirect to Stripe customer portal
    if (hasActiveSubscription() && user.stripe_customer_id) {
      try {
        const response = await fetch('https://qurancompare.onrender.com/api/payment/create-portal-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_id: user.stripe_customer_id,
            return_url: window.location.href
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          window.location.href = data.portal_url;
        }
      } catch (error) {
        console.error('Error creating portal session:', error);
        // If Stripe portal fails, show contact info
        alert(`To manage your subscription, please contact ${appConfig.supportEmail}`);
      }
    } else {
      // Show subscription modal for new subscriptions
      setShowSubscriptionModal(true);
    }
    setShowDropdown(false);
  };
  
  const handleCancelSubscription = async () => {
    if (window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
      try {
        const result = await cancelSubscription(user.id);
        
        if (result.success) {
          alert('Your subscription has been cancelled successfully. You will continue to have access until the end of your current billing period.');
          // Refresh the page to update subscription status
          window.location.reload();
        } else {
          throw new Error(result.error || 'Failed to cancel subscription');
        }
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        // Fallback to email if automatic cancellation fails
        const subject = encodeURIComponent('Subscription Cancellation Request');
        const body = encodeURIComponent(
          `Hi,

I would like to cancel my AI Debater Bot subscription.

Account details:
- Email: ${user?.email}
- User ID: ${user?.id}

Please cancel my subscription and confirm when complete.

Error details: ${error.message}

Thank you!`
        );
        
        window.open(`mailto:${appConfig.supportEmail}?subject=${subject}&body=${body}`, '_blank');
        alert('We encountered an issue cancelling your subscription automatically. An email has been prepared for you to send to our support team.');
      }
    }
    setShowDropdown(false);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          <span style={{ fontSize: '18px' }}>👤</span>
          <span>{user.email}</span>
          <span style={{ fontSize: '12px' }}>▼</span>
        </button>
        
        {showDropdown && (
          <>
            {/* Backdrop to close dropdown when clicking outside */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 999
              }}
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown menu */}
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              minWidth: '280px',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              {/* User info section */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e0e0e0'
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                  Signed in as
                </div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
                  {user.email}
                </div>
              </div>
              
              {/* Subscription status section */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e0e0e0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>Status</span>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: hasActiveSubscription() ? '#e8f5e9' : '#fff3e0',
                    color: hasActiveSubscription() ? '#2e7d32' : '#f57c00'
                  }}>
                    {hasActiveSubscription() ? '✅ Premium' : '🔓 Free'}
                  </span>
                </div>
                
                {hasActiveSubscription() && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '14px', color: '#666' }}>Expires</span>
                    <span style={{ fontSize: '14px', color: '#333' }}>
                      {formatDate(subscriptionInfo.expiry)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div style={{ padding: '12px' }}>
                {hasActiveSubscription() ? (
                  <>
                    <button
                      onClick={handleManageSubscription}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        marginBottom: '8px',
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#45a049';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#4CAF50';
                      }}
                    >
                      🔄 Renew Subscription
                    </button>
                    
                    <button
                      onClick={handleCancelSubscription}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        marginBottom: '8px',
                        transition: 'background-color 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#ff5252';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ff6b6b';
                      }}
                    >
                      ❌ Cancel Subscription
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleManageSubscription}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      marginBottom: '8px',
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#1976d2';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#2196F3';
                    }}
                  >
                    ⭐ Upgrade to Premium
                  </button>
                )}
                
                {/* Contact Support Button */}
                <button
                  onClick={() => {
                    const subject = encodeURIComponent('Support Request - QuranCompare');
                    const body = encodeURIComponent(
                      `Hi,

I need help with QuranCompare.

Account details:
- Email: ${user?.email}
- User ID: ${user?.id}
- Subscription Status: ${hasActiveSubscription() ? 'Premium' : 'Free'}

Please describe your issue here:
[Your message]

Thank you!`
                    );
                    
                    window.open(`mailto:${appConfig.supportEmail}?subject=${subject}&body=${body}`, '_blank');
                    setShowDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginBottom: '8px',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e0e0e0';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f5f5f5';
                  }}
                >
                  💬 Contact Support
                </button>
                
                <button
                  onClick={() => {
                    logout();
                    setShowDropdown(false);
                    window.location.reload();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e0e0e0';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f5f5f5';
                  }}
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal
          user={user}
          onClose={() => setShowSubscriptionModal(false)}
          onSuccess={() => {
            setShowSubscriptionModal(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
};

export default UserProfile;