import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import QuranSearch from './components/QuranSearch';
import QuranVectorSearch from './components/QuranVectorSearch';
import QuranVerseLookup from './components/QuranVerseLookup';
import QuranCompare from './components/QuranCompare';
import QuranManuscriptAnalysis from './components/QuranManuscriptAnalysis';

function App() {
  const [activeTab, setActiveTab] = useState('lookup');
  const [verseRangeForLookup, setVerseRangeForLookup] = useState('');
  const verseLookupRef = useRef(null);
  
  useEffect(() => {
    // Listen for verse range events from other components
    const handleOpenVerseRange = (event) => {
      setVerseRangeForLookup(event.detail.range);
      setActiveTab('lookup');
    };
    
    window.addEventListener('openVerseRange', handleOpenVerseRange);
    
    return () => {
      window.removeEventListener('openVerseRange', handleOpenVerseRange);
    };
  }, []);

  const tabs = [
    { id: 'lookup', label: 'Verse Lookup', component: <QuranVerseLookup key={verseRangeForLookup} initialRange={verseRangeForLookup} /> },
    { id: 'vectorsearch', label: 'Semantic Search', component: <QuranVectorSearch /> },
    { id: 'compare', label: 'Compare', component: <QuranCompare /> },
    { id: 'manuscript', label: 'Manuscript Analysis', component: <QuranManuscriptAnalysis /> }
  ];

  return (
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
  );
}

export default App;
