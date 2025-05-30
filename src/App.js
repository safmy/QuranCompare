import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import QuranSearch from './components/QuranSearch';
import QuranVectorSearch from './components/QuranVectorSearch';
import QuranVerseLookup from './components/QuranVerseLookup';
import QuranCompare from './components/QuranCompare';
import QuranManuscriptAnalysis from './components/QuranManuscriptAnalysis';
import { LanguageProvider } from './contexts/LanguageContext';

function App() {
  const [activeTab, setActiveTab] = useState('lookup');
  const [verseRangeForLookup, setVerseRangeForLookup] = useState('');
  const [compareVerses, setCompareVerses] = useState([]);
  const verseLookupRef = useRef(null);
  const compareRef = useRef(null);
  
  useEffect(() => {
    // Listen for verse range events from other components
    const handleOpenVerseRange = (event) => {
      setVerseRangeForLookup(event.detail.range);
      setActiveTab('lookup');
    };
    
    // Listen for navigate to compare events
    const handleNavigateToCompare = (event) => {
      const verses = event.detail.verses || JSON.parse(sessionStorage.getItem('compareVerses') || '[]');
      setCompareVerses(verses);
      setActiveTab('compare');
    };
    
    window.addEventListener('openVerseRange', handleOpenVerseRange);
    window.addEventListener('navigateToCompare', handleNavigateToCompare);
    
    return () => {
      window.removeEventListener('openVerseRange', handleOpenVerseRange);
      window.removeEventListener('navigateToCompare', handleNavigateToCompare);
    };
  }, []);

  const tabs = [
    { id: 'lookup', label: 'Verse Lookup', component: <QuranVerseLookup key={verseRangeForLookup} initialRange={verseRangeForLookup} /> },
    { id: 'vectorsearch', label: 'Semantic Search', component: <QuranVectorSearch /> },
    { id: 'compare', label: 'Compare', component: <QuranCompare key={compareVerses.join(',')} initialVerses={compareVerses} /> },
    { id: 'manuscript', label: 'Manuscript Analysis', component: <QuranManuscriptAnalysis /> }
  ];

  return (
    <LanguageProvider>
      <div className="App">
        <header style={{backgroundColor: "#282c34", padding: "20px", color: "white"}}>
          <h1 style={{fontSize: "24px", fontWeight: "bold"}}>Quran Analysis & Comparison Tool</h1>
          <nav style={{marginTop: "15px"}}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "10px 20px",
                  margin: "0 5px",
                  backgroundColor: activeTab === tab.id ? "#4CAF50" : "#555",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer"
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
        <footer style={{padding: "20px", backgroundColor: "#282c34", color: "white", textAlign: "center"}}>
          <p>© 2025 Quran Analysis & Comparison Tool</p>
        </footer>
      </div>
    </LanguageProvider>
  );
}

export default App;
