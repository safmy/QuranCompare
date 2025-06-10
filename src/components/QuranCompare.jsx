import React, { useState, useEffect } from 'react';
import './QuranCompare.css';
import QuranAudioPlayerSimple from './QuranAudioPlayerSimple';
import QuranAudioPlayerEnhanced from './QuranAudioPlayerEnhanced';
import { useLanguage } from '../contexts/LanguageContext';
import { getLanguageConfig, getTranslationText, getFootnoteText } from '../config/languages';


const QuranCompare = ({ initialVerses = [] }) => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const [verses, setVerses] = useState([]);
  const [verseInputs, setVerseInputs] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quranData, setQuranData] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [highlightedRoot, setHighlightedRoot] = useState(null); // Root to highlight
  const [lockedRoot, setLockedRoot] = useState(null); // Locked root (click mode)
  const [hoveredRoot, setHoveredRoot] = useState(null); // Hovered root (hover mode)
  const [meaningData, setMeaningData] = useState(null); // Meaning variations data
  const [memorizationMode, setMemorizationMode] = useState(false); // Enable memorization mode
  const [showEnhancedPlayer, setShowEnhancedPlayer] = useState(false); // Show enhanced player for single verses
  const [showRootSummary, setShowRootSummary] = useState(true); // Show root summary
  const [rootSummary, setRootSummary] = useState(null); // Root analysis data

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
      // Convert verse objects to sura:verse format strings
      const verseStrings = initialVerses.map(v => {
        if (typeof v === 'string') return v;
        if (v && v.sura_verse) return v.sura_verse;
        return '';
      }).filter(v => v);
      
      setVerseInputs(verseStrings);
      
      // Check for meaning data in sessionStorage
      const storedMeaningData = sessionStorage.getItem('compareMeaningData');
      if (storedMeaningData) {
        setMeaningData(JSON.parse(storedMeaningData));
        sessionStorage.removeItem('compareMeaningData'); // Clean up
      }
      
      // Check for memorization mode
      const enableMemorization = sessionStorage.getItem('enableMemorization');
      if (enableMemorization === 'true') {
        setMemorizationMode(true);
        sessionStorage.removeItem('enableMemorization'); // Clean up
      }
      
      // Auto-load these verses
      setTimeout(() => {
        handleCompare();
      }, 100);
    }
  }, [initialVerses, quranData]);
  
  useEffect(() => {
    // Determine which root to highlight
    if (lockedRoot) {
      setHighlightedRoot(lockedRoot);
    } else {
      setHighlightedRoot(hoveredRoot);
    }
  }, [lockedRoot, hoveredRoot]);

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

  // Analyze roots across all compared verses
  const analyzeRoots = (versesData) => {
    const rootAnalysis = {};
    
    versesData.forEach(verse => {
      if (!verse.roots || !verse.meanings) return;
      
      const roots = verse.roots.split(',').map(r => r.trim());
      const meanings = verse.meanings.split(',').map(m => m.trim());
      const arabicWords = verse.arabic ? verse.arabic.split(/\s+/) : [];
      
      roots.forEach((root, idx) => {
        if (root && root !== '-') {
          if (!rootAnalysis[root]) {
            rootAnalysis[root] = {
              root: root,
              occurrences: [],
              meanings: new Set(),
              totalCount: 0
            };
          }
          
          const meaning = meanings[idx] || '';
          const arabicWord = arabicWords[idx] || '';
          
          rootAnalysis[root].occurrences.push({
            verse: verse.sura_verse,
            arabicWord: arabicWord,
            meaning: meaning,
            englishContext: verse.english
          });
          
          if (meaning && meaning !== '-') {
            rootAnalysis[root].meanings.add(meaning);
          }
          
          rootAnalysis[root].totalCount++;
        }
      });
    });
    
    // Convert to array and sort by frequency
    const sortedRoots = Object.values(rootAnalysis)
      .map(data => ({
        ...data,
        meanings: Array.from(data.meanings)
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
    
    return sortedRoots;
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
    
    if (nonEmptyInputs.length < 1) {
      setError('Please enter at least 1 verse reference');
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

      if (foundVerses.length >= 1) {
        setVerses(foundVerses);
        
        // Analyze roots across all verses
        const summary = analyzeRoots(foundVerses);
        setRootSummary(summary);
        
        if (notFound.length === 0) {
          setError('');
        }
      } else {
        setVerses([]);
        setRootSummary(null);
        if (!error) {
          setError('No valid verses found');
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
      const isHighlighted = highlightedRoot && root === highlightedRoot;
      
      return (
        <span
          key={`${verseIndex}-${index}`}
          className={`arabic-word ${isHighlighted ? 'highlighted' : ''} ${root && root !== '-' ? 'clickable' : ''}`}
          onMouseEnter={(e) => {
            // Only allow hover if no root is locked
            if (!lockedRoot) {
              if (root && root !== '-') {
                setHoveredRoot(root);
              }
            }
            
            // Always show tooltip
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
            if (!lockedRoot) {
              setHoveredRoot(null);
            }
          }}
          onClick={() => {
            if (root && root !== '-') {
              // Toggle lock mode
              if (lockedRoot === root) {
                // Unlock - go back to hover mode
                setLockedRoot(null);
                setHoveredRoot(null);
              } else {
                // Lock this root
                setLockedRoot(root);
                setHoveredRoot(null);
              }
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
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
              backgroundColor: loading ? '#ccc' : '#7c3aed',
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
            {lockedRoot && (
              <span className="locked-indicator">
                {' '}— Locked on root: "{lockedRoot}" (click any word with this root to unlock)
              </span>
            )}
          </h3>
          
          {/* Root Analysis Summary */}
          {rootSummary && rootSummary.length > 0 && (
            <div style={{
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: '#f0f8ff',
              borderRadius: '8px',
              border: '1px solid #1976d2'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: showRootSummary ? '15px' : '0'
              }}>
                <h4 style={{ margin: 0, color: '#1976d2' }}>
                  🌳 Root Analysis Summary ({rootSummary.length} unique roots)
                </h4>
                <button
                  onClick={() => setShowRootSummary(!showRootSummary)}
                  style={{
                    background: 'none',
                    border: '1px solid #1976d2',
                    color: '#1976d2',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {showRootSummary ? '▼ Collapse' : '▶ Expand'}
                </button>
              </div>
              
              {showRootSummary && (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {rootSummary.slice(0, 10).map((rootData, idx) => (
                    <div key={idx} style={{
                      padding: '15px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <div>
                          <span style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: '#333',
                            fontFamily: 'Traditional Arabic, serif',
                            direction: 'rtl',
                            display: 'inline-block',
                            padding: '2px 8px',
                            backgroundColor: '#fff3cd',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            if (lockedRoot === rootData.root) {
                              setLockedRoot(null);
                            } else {
                              setLockedRoot(rootData.root);
                            }
                          }}
                          onMouseEnter={() => !lockedRoot && setHoveredRoot(rootData.root)}
                          onMouseLeave={() => !lockedRoot && setHoveredRoot(null)}
                          >
                            {rootData.root}
                          </span>
                          <span style={{
                            marginLeft: '10px',
                            fontSize: '14px',
                            color: '#666'
                          }}>
                            ({rootData.totalCount} occurrence{rootData.totalCount !== 1 ? 's' : ''})
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '10px' }}>
                        <strong style={{ color: '#555' }}>Meanings:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                          {rootData.meanings.map((meaning, mIdx) => (
                            <span key={mIdx} style={{
                              padding: '3px 10px',
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              borderRadius: '15px',
                              fontSize: '13px'
                            }}>
                              {meaning}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <strong style={{ color: '#555' }}>Appears in:</strong>
                        <div style={{ marginTop: '5px', fontSize: '13px', color: '#666' }}>
                          {rootData.occurrences.map((occ, oIdx) => (
                            <span key={oIdx}>
                              [{occ.verse}] <span style={{ 
                                fontFamily: 'Traditional Arabic, serif',
                                fontSize: '16px',
                                color: '#333'
                              }}>{occ.arabicWord}</span> → {occ.meaning}
                              {oIdx < rootData.occurrences.length - 1 && ' • '}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {rootSummary.length > 10 && (
                    <div style={{
                      padding: '10px',
                      textAlign: 'center',
                      color: '#666',
                      fontSize: '14px',
                      fontStyle: 'italic'
                    }}>
                      Showing top 10 roots. Total: {rootSummary.length} unique roots found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Meaning Variations Summary */}
          {meaningData && (
            <div style={{
              marginBottom: '30px',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>
                📚 Root Analysis Summary: "{meaningData.root}"
              </h4>
              <p style={{ marginBottom: '15px', color: '#666' }}>
                {meaningData.selectedMeaning ? 
                  `Showing verses where the root "${meaningData.root}" means "${meaningData.selectedMeaning}" (${meaningData.totalWithThisMeaning} occurrences):` :
                  `The following verses demonstrate different meanings of the root "${meaningData.root}" in the Quran:`
                }
              </p>
              {meaningData.selectedMeaning ? (
                // Similar meaning comparison view
                <div style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '0.9em' }}>
                    All verses below contain the root "{meaningData.root}" with the meaning: <strong>"{meaningData.selectedMeaning}"</strong>
                  </p>
                  <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: '#666' }}>
                    Total verses with this meaning: {meaningData.totalWithThisMeaning || verses.length}
                  </p>
                </div>
              ) : (
                // Different meanings comparison view
                <div style={{ display: 'grid', gap: '10px' }}>
                  {meaningData.variations && Object.entries(meaningData.variations).map(([verseRef, data]) => (
                    <div key={verseRef} style={{
                      padding: '10px',
                      backgroundColor: verseRef === meaningData.sourceVerse ? '#e3f2fd' : 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}>
                      <strong>[{verseRef}]</strong>
                      {verseRef === meaningData.sourceVerse && (
                        <span style={{ 
                          marginLeft: '10px', 
                          fontSize: '0.8em', 
                          color: '#1976d2',
                          fontWeight: 'normal'
                        }}>
                          (Source verse)
                        </span>
                      )}
                      <br />
                      <span style={{ color: '#2e7d32' }}>"{data.arabicWord}"</span> → 
                      <strong style={{ marginLeft: '5px' }}>{data.meaning}</strong>
                      <br />
                      <small style={{ color: '#666' }}>
                        This meaning appears in {data.occurrences} verse{data.occurrences !== 1 ? 's' : ''} total
                      </small>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ 
                marginTop: '15px', 
                padding: '10px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                fontSize: '0.9em'
              }}>
                💡 <strong>Tip:</strong> {meaningData.selectedMeaning ? 
                  `These verses all share the same meaning for the root "${meaningData.root}". To see different meanings, go back and select "Compare One from Each Meaning".` :
                  `Each verse below shows one example of how the root "${meaningData.root}" is used with different meanings. This helps understand the semantic range and contextual flexibility of Arabic roots in the Quran.`
                }
                {meaningData.totalOccurrences && !meaningData.selectedMeaning && (
                  <span style={{ display: 'block', marginTop: '5px', fontSize: '0.85em', color: '#666' }}>
                    Note: The root "{meaningData.root}" appears in {meaningData.totalOccurrences} verses total. 
                    Only representative examples are shown above.
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div className="verses-grid" style={{
            display: 'grid',
            gridTemplateColumns: getGridLayout(verses.length),
            gap: '20px'
          }}>
            {verses.map((verse, index) => (
              <div key={`${verse.sura_verse}-${index}`} className="verse-card compact">
                <div className="verse-header" style={{ marginBottom: '15px' }}>
                  <h4 className="verse-reference" style={{ margin: 0 }}>
                    {verse.reference}
                  </h4>
                </div>
                
                {verse.arabic && (
                  <div className="arabic-text" dir="rtl">
                    {parseArabicText(verse.arabic, verse.roots, verse.meanings, index)}
                  </div>
                )}
                
                {getTranslationText(verse, currentLanguage) && (
                  <div className="translation-text" style={{ direction: getLanguageConfig(currentLanguage).direction }}>
                    {getTranslationText(verse, currentLanguage)}
                  </div>
                )}
                
                {getFootnoteText(verse, currentLanguage) && (
                  <div className="footnote" style={{ direction: getLanguageConfig(currentLanguage).direction, fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
                    <small>{getFootnoteText(verse, currentLanguage)}</small>
                  </div>
                )}
                
                {/* Show meaning variation for this verse if available */}
                {meaningData && meaningData.variations[verse.sura_verse] && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    backgroundColor: '#f0f7ff',
                    borderRadius: '4px',
                    fontSize: '0.85em'
                  }}>
                    <strong>Root "{meaningData.root}" meaning:</strong> {meaningData.variations[verse.sura_verse].meaning}
                    <br />
                    <small style={{ color: '#666' }}>
                      ({meaningData.variations[verse.sura_verse].occurrences} occurrences in Quran)
                    </small>
                  </div>
                )}
                
                {/* Individual verse audio player - positioned below content */}
                <div style={{ marginTop: '15px' }}>
                  <QuranAudioPlayerSimple 
                    verseReference={verse.sura_verse}
                    arabicText={verse.arabic || ''}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Enhanced Audio Player Controls */}
          {verses.length === 1 && !memorizationMode && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => setShowEnhancedPlayer(!showEnhancedPlayer)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: showEnhancedPlayer ? '#ff9800' : '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {showEnhancedPlayer ? '🎵 Hide Advanced Player' : '🎵 Show Advanced Player'}
              </button>
            </div>
          )}

          {/* Enhanced Audio Player - Show when memorization mode is enabled, for multiple verses, or explicitly requested */}
          {verses.length > 0 && (memorizationMode || verses.length > 1 || showEnhancedPlayer) && (
            <div style={{ marginTop: '30px' }}>
              <QuranAudioPlayerEnhanced
                verseReferences={verses.map(v => v.sura_verse)}
                arabicTexts={verses.map(v => v.arabic || '')}
                defaultMemorizationMode={memorizationMode}
                onMemorizationModeChange={(mode) => setMemorizationMode(mode)}
              />
            </div>
          )}
          
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