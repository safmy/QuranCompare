import React, { useState, useEffect, useRef } from 'react';
import { AVAILABLE_LANGUAGES, LANGUAGE_GROUPS, DEFAULT_LANGUAGE } from '../config/languages';

const LanguageSwitcher = ({ currentLanguage, onLanguageChange, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const currentLangConfig = AVAILABLE_LANGUAGES[currentLanguage] || AVAILABLE_LANGUAGES[DEFAULT_LANGUAGE];

  if (compact) {
    // Compact dropdown for smaller spaces
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: '120px',
            justifyContent: 'space-between'
          }}
        >
          <span>
            {currentLangConfig.flag} {currentLangConfig.name}
          </span>
          <span style={{ fontSize: '12px' }}>▼</span>
        </button>
        
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '6px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              zIndex: 1000,
              maxHeight: '300px',
              overflowY: 'auto'
            }}
          >
            {Object.entries(AVAILABLE_LANGUAGES).map(([code, config]) => (
              <button
                key={code}
                onClick={() => {
                  onLanguageChange(code);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  backgroundColor: currentLanguage === code ? '#f0f8ff' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid #f0f0f0'
                }}
                onMouseOver={(e) => {
                  if (currentLanguage !== code) {
                    e.target.style.backgroundColor = '#f8f9fa';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentLanguage !== code) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span>{config.flag}</span>
                <span>{config.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Collapsible language selector
  return (
    <div ref={dropdownRef} style={{
      marginBottom: '20px'
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '10px 16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <span>🌐</span>
        <span style={{ fontWeight: '500' }}>
          {currentLangConfig.flag} {currentLangConfig.name}
        </span>
        <span style={{ 
          fontSize: '12px', 
          marginLeft: '8px',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </button>
      
      {isOpen && (
        <div
          style={{
            marginTop: '10px',
            padding: '15px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            position: 'relative',
            zIndex: 100
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(LANGUAGE_GROUPS).map(([groupName, langCodes]) => (
              <div key={groupName}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#666',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {groupName}
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {langCodes.map(code => {
                    const config = AVAILABLE_LANGUAGES[code];
                    const isSelected = currentLanguage === code;
                    
                    return (
                      <button
                        key={code}
                        onClick={() => {
                          onLanguageChange(code);
                          setIsOpen(false);
                        }}
                        style={{
                          padding: '6px 12px',
                          border: `1px solid ${isSelected ? '#007bff' : '#ddd'}`,
                          borderRadius: '16px',
                          backgroundColor: isSelected ? '#007bff' : 'white',
                          color: isSelected ? 'white' : '#333',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: isSelected ? '500' : '400',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.target.style.borderColor = '#007bff';
                            e.target.style.backgroundColor = '#f8f9fa';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.target.style.borderColor = '#ddd';
                            e.target.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        <span>{config.flag}</span>
                        <span>{config.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;