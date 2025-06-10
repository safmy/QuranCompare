import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import QuranSearch from './components/QuranSearch';
import QuranVectorSearch from './components/QuranVectorSearch';
import QuranVerseLookup from './components/QuranVerseLookup';
import QuranCompare from './components/QuranCompare';
import DebaterBot from './components/DebaterBot';
import RootSearch from './components/RootSearch';
import AuthCallback from './components/AuthCallback';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import LanguageSwitcher from './components/LanguageSwitcher';
import UserProfile from './components/UserProfile';
import SidebarMenu from './components/SidebarMenu';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { checkPremiumAccess, PREMIUM_FEATURES } from './config/premium';

function AppContent() {
  const { currentLanguage, changeLanguage } = useLanguage();
  
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('activeTab') || 'lookup';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) return savedMode === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [verseRangeForLookup, setVerseRangeForLookup] = useState(() => {
    return sessionStorage.getItem('verseRangeForLookup') || '';
  });
  const [compareVerses, setCompareVerses] = useState(() => {
    const saved = sessionStorage.getItem('compareVerses');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Component state persistence
  const [lookupState, setLookupState] = useState(() => {
    const saved = sessionStorage.getItem('lookupState');
    return saved ? JSON.parse(saved) : {};
  });
  const [vectorSearchState, setVectorSearchState] = useState(() => {
    const saved = sessionStorage.getItem('vectorSearchState');
    return saved ? JSON.parse(saved) : {};
  });
  
  const verseLookupRef = useRef(null);
  const compareRef = useRef(null);
  
  // Save state to sessionStorage when values change
  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  
  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode);
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);
  
  useEffect(() => {
    sessionStorage.setItem('verseRangeForLookup', verseRangeForLookup);
  }, [verseRangeForLookup]);
  
  useEffect(() => {
    sessionStorage.setItem('compareVerses', JSON.stringify(compareVerses));
  }, [compareVerses]);
  
  useEffect(() => {
    sessionStorage.setItem('lookupState', JSON.stringify(lookupState));
  }, [lookupState]);
  
  useEffect(() => {
    sessionStorage.setItem('vectorSearchState', JSON.stringify(vectorSearchState));
  }, [vectorSearchState]);

  useEffect(() => {
    // Listen for verse range events from other components
    const handleOpenVerseRange = (event) => {
      setVerseRangeForLookup(event.detail.range);
      setActiveTab('lookup');
      // Scroll to top when switching to lookup tab
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    };
    
    // Listen for navigate to compare events
    const handleNavigateToCompare = (event) => {
      const verses = event.detail.verses || JSON.parse(sessionStorage.getItem('compareVerses') || '[]');
      setCompareVerses(verses);
      
      // Store memorization mode if enabled
      if (event.detail.enableMemorization) {
        sessionStorage.setItem('enableMemorization', 'true');
      }
      
      setActiveTab('compare');
    };
    
    // Listen for navigate to root search events
    const handleOpenRootSearch = (event) => {
      const { query, mode } = event.detail;
      // Store the query in session storage for the root search component
      sessionStorage.setItem('rootSearchQuery', query);
      sessionStorage.setItem('rootSearchMode', mode);
      setActiveTab('roots');
    };
    
    // Listen for state updates from child components
    const handleStateUpdate = (event) => {
      const { component, state } = event.detail;
      if (component === 'lookup') {
        setLookupState(state);
      } else if (component === 'vectorSearch') {
        setVectorSearchState(state);
      }
    };
    
    window.addEventListener('openVerseRange', handleOpenVerseRange);
    window.addEventListener('navigateToCompare', handleNavigateToCompare);
    window.addEventListener('openRootSearch', handleOpenRootSearch);
    window.addEventListener('updateComponentState', handleStateUpdate);
    
    return () => {
      window.removeEventListener('openVerseRange', handleOpenVerseRange);
      window.removeEventListener('navigateToCompare', handleNavigateToCompare);
      window.removeEventListener('openRootSearch', handleOpenRootSearch);
      window.removeEventListener('updateComponentState', handleStateUpdate);
    };
  }, []);

  const tabs = [
    { 
      id: 'lookup', 
      label: 'Verse Lookup', 
      component: <QuranVerseLookup 
        key={verseRangeForLookup} 
        initialRange={verseRangeForLookup}
        savedState={lookupState}
      /> 
    },
    { 
      id: 'vectorsearch', 
      label: 'Semantic Search', 
      component: <QuranVectorSearch
        savedState={vectorSearchState}
      /> 
    },
    { id: 'compare', label: 'Compare', component: <QuranCompare key={compareVerses.join(',')} initialVerses={compareVerses} /> },
    { id: 'roots', label: '🌳 Root Search', component: <RootSearch /> },
    { id: 'debater', label: '🤖 AI Debater', component: <DebaterBot /> },
    {
      id: 'discord',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          Discord
        </span>
      ),
      component: (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px'
        }}>
          <h2 style={{ color: '#6b46c1', marginBottom: '10px' }}>Join Our Discord Community</h2>
          <p style={{ fontSize: '18px', color: '#666', textAlign: 'center', maxWidth: '600px' }}>
            Connect with other users, ask questions, share insights, and discuss the Quran with our community.
          </p>
          <a 
            href="https://discord.gg/submission" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '15px 30px',
              background: '#5865F2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(88, 101, 242, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#4752C4';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(88, 101, 242, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#5865F2';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(88, 101, 242, 0.3)';
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Join Discord Server
          </a>
          <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
            Free to join • Active community • Daily discussions
          </p>
        </div>
      )
    }
  ];

  // Check for special routes after all hooks are declared
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }
  if (window.location.pathname === '/payment/success') {
    return <PaymentSuccess />;
  }
  if (window.location.pathname === '/payment/cancel') {
    return <PaymentCancel />;
  }

  return (
    <div className="App">
      <header style={{
        backgroundColor: "#6b46c1",
        padding: "20px",
        color: "white",
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        position: "sticky",
        top: 0,
        zIndex: 999
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
          position: "relative"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            flex: 1
          }}>
            <SidebarMenu />
            <h1 style={{
              fontSize: "24px", 
              fontWeight: "bold", 
              margin: 0,
              flex: 1,
              textAlign: "center"
            }}>
              Quran Analysis & Comparison Tool
            </h1>
            <span style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.7)",
              position: "absolute",
              top: "-8px",
              right: "0"
            }}>
              v1.4.14
            </span>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "15px"
          }}>
            <LanguageSwitcher 
              currentLanguage={currentLanguage}
              onLanguageChange={changeLanguage}
              compact={true}
            />
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                padding: '8px 12px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
              }}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <UserProfile />
          </div>
        </div>
        <nav style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 20px",
                backgroundColor: activeTab === tab.id ? "#8b5cf6" : "rgba(255,255,255,0.1)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "5px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontWeight: activeTab === tab.id ? "600" : "400"
              }}
              onMouseOver={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.2)";
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab.id) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main style={{padding: "20px", minHeight: "80vh"}}>
        {tabs.find(tab => tab.id === activeTab)?.component}
      </main>
      <footer style={{padding: "20px", backgroundColor: "#6b46c1", color: "white", textAlign: "center"}}>
        <p>© 2025 Quran Analysis & Comparison Tool</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
// Trigger Netlify deployment - Mon 10 Jun 2025 16:23:00 BST - English highlighting and root focus
