import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appConfig } from '../config/app';

const UserProfileIOS = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  
  if (!isAuthenticated || !user) {
    return null;
  }
  
  return (
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
            
            {/* Actions */}
            <div style={{ padding: '12px' }}>
              {/* Contact Support Button */}
              <button
                onClick={() => {
                  const subject = encodeURIComponent('Support Request - QuranCompare iOS');
                  const body = encodeURIComponent(
                    `Hi,

I need help with QuranCompare iOS app.

Account details:
- Email: ${user?.email}
- User ID: ${user?.id}

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
  );
};

export default UserProfileIOS;