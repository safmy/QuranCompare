import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import QuranSearch from './components/QuranSearch';
import QuranVectorSearch from './components/QuranVectorSearch';
import QuranVerseLookup from './components/QuranVerseLookup';
import QuranCompare from './components/QuranCompare';
import QuranManuscriptAnalysis from './components/QuranManuscriptAnalysis';
import DebaterBot from './components/DebaterBot';
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
    window.addEventListener('updateComponentState', handleStateUpdate);
    
    return () => {
      window.removeEventListener('openVerseRange', handleOpenVerseRange);
      window.removeEventListener('navigateToCompare', handleNavigateToCompare);
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
    { id: 'manuscript', label: 'Manuscript Analysis', component: <QuranManuscriptAnalysis /> },
    { 
      id: 'debater', 
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          AI Debater
          {checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT) ? (
            <span style={{ fontSize: '10px', backgroundColor: 'rgba(76, 175, 80, 0.8)', padding: '2px 6px', borderRadius: '10px' }}>PRO</span>
          ) : (
            <span style={{ fontSize: '10px', backgroundColor: 'rgba(255, 152, 0, 0.8)', padding: '2px 6px', borderRadius: '10px' }}>SUB</span>
          )}
        </span>
      ), 
      component: <DebaterBot />
    },
    {
      id: 'discord',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          Discord
          <span style={{ fontSize: '16px' }}>💬</span>
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
            href="https://discord.gg/wikisubmission" 
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
            <span style={{ fontSize: '24px' }}>💬</span>
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
