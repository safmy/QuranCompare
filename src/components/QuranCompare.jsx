import React, { useState, useEffect } from 'react';
import './QuranCompare.css';

const QuranCompare = ({ initialVerses = [] }) => {
  const [verses, setVerses] = useState([]);
  const [verseInputs, setVerseInputs] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quranData, setQuranData] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [highlightedRoots, setHighlightedRoots] = useState({}); // Changed to object to track per verse

  useEffect(() => {
    // Load Quran data
    const loadQuranData = async () => {
      try {
        const response = await fetch('/verses_final.json');
        if (!response.ok) {
          throw new Error('Failed to load Quran data');
        }
        const data = await response.json();
        setQuranData(data);
      } catch (err) {
        console.error('Error loading Quran data:', err);
        setError('Failed to load Quran data. Please refresh the page.');
      }
    };

    loadQuranData();
  }, []);
  
  useEffect(() => {
    // Handle initial verses from navigation
    if (initialVerses.length > 0 && quranData) {
      setVerseInputs(initialVerses);
      // Auto-load these verses
      setTimeout(() => {
        handleCompare();
      }, 100);
    }
  }, [initialVerses, quranData]);

  const formatVerse = (verseData) => {
    if (!verseData) return null;

    const verseRef = verseData.sura_verse;
    return {
      reference: `[${verseRef}]`,
      sura_verse: verseRef,
      english: verseData.english || '',
      arabic: verseData.arabic || '',
      roots: verseData.roots || '',
      meanings: verseData.meanings || '',
      footnote: verseData.footnote || null,
      subtitle: verseData.subtitle || null
    };
  };

  const parseVerseReference = (input) => {
    // Support formats: "2:255", "2.255", "2 255"
    const cleaned = input.trim().replace(/[.,\s]+/g, ':');
    const parts = cleaned.split(':');
    
    if (parts.length === 2) {
      const sura = parseInt(parts[0]);
      const verse = parseInt(parts[1]);
      
      if (!isNaN(sura) && !isNaN(verse) && sura >= 1 && sura <= 114 && verse >= 1) {
        return `${sura}:${verse}`;
      }
    }
    
    return null;
  };

  const addVerseInput = () => {
    setVerseInputs([...verseInputs, '']);
  };

  const removeVerseInput = (index) => {
    if (verseInputs.length > 1) {
      const newInputs = verseInputs.filter((_, i) => i !== index);
      setVerseInputs(newInputs);
    }
  };

  const updateVerseInput = (index, value) => {
    const newInputs = [...verseInputs];
    newInputs[index] = value;
    setVerseInputs(newInputs);
  };

  const handleCompare = () => {
    if (!quranData) {
      setError('Quran data not loaded yet. Please wait.');
      return;
    }

    const nonEmptyInputs = verseInputs.filter(input => input.trim());
    
    if (nonEmptyInputs.length < 2) {
      setError('Please enter at least 2 verse references to compare');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const foundVerses = [];
      const notFound = [];

      nonEmptyInputs.forEach(input => {
        const verseRef = parseVerseReference(input);
        
        if (verseRef) {
          const verseData = quranData.find(v => v.sura_verse === verseRef);
          if (verseData) {
            foundVerses.push(formatVerse(verseData));
          } else {
            notFound.push(verseRef);
          }
        } else {
          notFound.push(input);
        }
      });

      if (notFound.length > 0) {
        setError(`Could not find verses: ${notFound.join(', ')}`);
      }

      if (foundVerses.length >= 2) {
        setVerses(foundVerses);
        if (notFound.length === 0) {
          setError('');
        }
      } else {
        setVerses([]);
        if (!error) {
          setError('Need at least 2 valid verses to compare');
        }
      }
    } catch (err) {
      setError('An error occurred while comparing verses');
      setVerses([]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCompare();
    }
  };

  // Parse Arabic text with roots and meanings for hover functionality
  const parseArabicText = (arabic, roots, meanings, verseIndex) => {
    if (!arabic || !roots || !meanings) return arabic;

    const arabicWords = arabic.split(/\s+/);
    const rootsArray = roots.split(',').map(r => r.trim());
    const meaningsArray = meanings.split(',').map(m => m.trim());

    return arabicWords.map((word, index) => {
      const root = rootsArray[index] || '';
      const meaning = meaningsArray[index] || '';
      const highlightedRoot = highlightedRoots[verseIndex];
      const isHighlighted = highlightedRoot && root === highlightedRoot;
      
      return (
        <span
          key={`${verseIndex}-${index}`}
          className={`arabic-word ${isHighlighted ? 'highlighted' : ''} ${root && root !== '-' ? 'clickable' : ''}`}
          onMouseEnter={(e) => {
            if (root || meaning) {
              const rect = e.target.getBoundingClientRect();
              setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10
              });
              setHoveredWord({
                word: word,
                root: root,
                meaning: meaning
              });
            }
          }}
          onMouseLeave={() => {
            setHoveredWord(null);
          }}
          onClick={() => {
            if (root && root !== '-') {
              // Toggle highlighting for this verse
              setHighlightedRoots(prev => ({
                ...prev,
                [verseIndex]: prev[verseIndex] === root ? null : root
              }));
            }
          }}
        >
          {word}
          {index < arabicWords.length - 1 && ' '}
        </span>
      );
    });
  };

  // Calculate grid layout based on number of verses
  const getGridLayout = (count) => {
    if (count === 2) return 'repeat(2, 1fr)';
    if (count === 3) return 'repeat(2, 1fr)';
    if (count === 4) return 'repeat(2, 1fr)';
    if (count <= 6) return 'repeat(3, 1fr)';
    return 'repeat(4, 1fr)';
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Compare Quran Verses</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Enter verse references to compare side by side. Use format: sura:verse (e.g., 2:255, 112:1)
        </p>
        
        {verseInputs.map((input, index) => (
          <div key={index} style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '10px',
            alignItems: 'center'
          }}>
            <label style={{ minWidth: '80px', fontWeight: 'bold' }}>
              Verse {index + 1}:
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => updateVerseInput(index, e.target.value)}
              onKeyPress={handleKeyPress}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '16px'
              }}
              placeholder="e.g., 2:255"
            />
            {verseInputs.length > 1 && (
              <button
                onClick={() => removeVerseInput(index)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button
            onClick={addVerseInput}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add Another Verse
          </button>
          
          <button
            onClick={handleCompare}
            disabled={loading || !quranData}
            style={{
              padding: '10px 25px',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Comparing...' : 'Compare Verses'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          color: '#d32f2f',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {verses.length > 0 && (
        <div className="comparison-results">
          <h3 className="results-header">
            Comparison Results ({verses.length} verses)
          </h3>
          
          <div className="verses-grid" style={{
            display: 'grid',
            gridTemplateColumns: getGridLayout(verses.length),
            gap: '20px'
          }}>
            {verses.map((verse, index) => (
              <div key={`${verse.sura_verse}-${index}`} className="verse-comparison-wrapper">
                <div className="verse-card">
                  {verse.subtitle && (
                    <div className="subtitle-header">
                      <h3 className="subtitle-text">{verse.subtitle}</h3>
                    </div>
                  )}
                  
                  <h4 className="verse-reference">
                    {verse.reference}
                  </h4>
                  
                  <div className="verse-main-content">
                    {verse.arabic && (
                      <div className="arabic-section">
                        <div className="arabic-text" dir="rtl">
                          {parseArabicText(verse.arabic, verse.roots, verse.meanings, index)}
                        </div>
                      </div>
                    )}
                    
                    {verse.english && (
                      <div className="english-section">
                        <p className="english-text">
                          {verse.english}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {verse.footnote && (
                  <div className="footnote-section">
                    <p className="footnote-text">
                      {verse.footnote}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Tooltip for word hover */}
          {hoveredWord && (
            <div 
              className="word-tooltip"
              style={{
                position: 'fixed',
                left: tooltipPosition.x,
                top: tooltipPosition.y,
                transform: 'translateX(-50%) translateY(-100%)',
                zIndex: 1000
              }}
            >
              <div className="tooltip-content">
                <div className="tooltip-word">{hoveredWord.word}</div>
                {hoveredWord.root && (
                  <div className="tooltip-root">
                    <strong>Root:</strong> {hoveredWord.root}
                  </div>
                )}
                {hoveredWord.meaning && (
                  <div className="tooltip-meaning">
                    <strong>Meaning:</strong> {hoveredWord.meaning}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!quranData && !error && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666'
        }}>
          Loading Quran data...
        </div>
      )}
    </div>
  );
};

export default QuranCompare;