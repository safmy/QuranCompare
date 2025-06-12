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
  const [selectedRootData, setSelectedRootData] = useState(null); // Selected root from verse lookup
  const [hoveredEnglishIndex, setHoveredEnglishIndex] = useState(null); // For English word hover
  const [hoveredArabicIndex, setHoveredArabicIndex] = useState(null); // For Arabic word hover
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Handle scroll event to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        const parsedData = JSON.parse(storedMeaningData);
        setMeaningData(parsedData);
        
        // Check if this is root-specific data
        if (parsedData && parsedData.selectedRoot) {
          setSelectedRootData(parsedData);
          // Only set meaningData if it has variations
          if (parsedData.variations || parsedData.meaningVariations) {
            setMeaningData(parsedData);
          }
        } else {
          sessionStorage.removeItem('compareMeaningData'); // Clean up only if not root data
        }
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
  
  // Clean up sessionStorage after successful render
  useEffect(() => {
    if (verses.length > 0 && selectedRootData) {
      // Clean up after a delay to ensure everything is rendered
      const timer = setTimeout(() => {
        sessionStorage.removeItem('compareMeaningData');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [verses, selectedRootData]);

  const analyzeRoots = (versesData, focusedRoot = null) => {
    const rootAnalysis = {};
    
    versesData.forEach(verse => {
      if (!verse.roots || !verse.meanings) return;
      
      const roots = verse.roots.split(',').map(r => r.trim());
      const meanings = verse.meanings.split(',').map(m => m.trim());
      const arabicWords = verse.arabic ? verse.arabic.split(/\s+/) : [];
      
      roots.forEach((root, idx) => {
        if (root && root !== '-') {
          // If focusedRoot is provided, only analyze that specific root
          if (focusedRoot && root !== focusedRoot) return;
          
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
        
        // Analyze roots - if selectedRootData exists, only analyze that specific root
        const focusedRoot = selectedRootData?.selectedRoot || null;
        console.log('QuranCompare handleCompare - selectedRootData:', selectedRootData);
        console.log('QuranCompare handleCompare - focusedRoot:', focusedRoot);
        const summary = analyzeRoots(foundVerses, focusedRoot);
        console.log('QuranCompare handleCompare - summary:', summary);
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
    
    // Don't clean up sessionStorage immediately - wait for successful render
    // This prevents the blank screen issue on first load
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCompare();
    }
  };

  // Helper function to get synonyms for a word
  const getSynonyms = (word) => {
    const synonymMap = {
      'worship': ['serve', 'obey', 'adore', 'revere'],
      'serve': ['worship', 'obey', 'submit'],
      'obey': ['worship', 'serve', 'follow', 'submit'],
      'path': ['way', 'road', 'route'],
      'way': ['path', 'road', 'route'],
      'guide': ['lead', 'direct', 'show'],
      'lead': ['guide', 'direct'],
      'straight': ['right', 'direct', 'correct'],
      'right': ['straight', 'correct'],
      'ally': ['friend', 'allies', 'protector', 'guardian', 'helper', 'supporter'],
      'allies': ['ally', 'friends', 'protectors', 'guardians', 'helpers', 'supporters'],
      'friend': ['ally', 'allies', 'companion'],
      'friends': ['ally', 'allies', 'companions'],
      'protector': ['ally', 'guardian', 'defender', 'helper'],
      'guardian': ['ally', 'protector', 'keeper', 'helper'],
      'helper': ['ally', 'allies', 'supporter', 'supporters', 'assistant', 'aid', 'protector', 'protectors'],
      'helpers': ['ally', 'allies', 'supporter', 'supporters', 'assistants', 'aids', 'protector', 'protectors'],
      'supporter': ['helper', 'ally', 'backer'],
      'aid': ['help', 'helper', 'assist', 'support'],
      'assist': ['help', 'aid', 'support'],
      'help': ['aid', 'assist', 'support'],
    };
    return synonymMap[word.toLowerCase()] || [];
  };

  // Parse English text to make words hoverable
  const parseEnglishText = (englishText, roots, meanings, verse) => {
    if (!englishText || !roots || !meanings) return englishText;
    
    const rootsArray = roots.split(',').map(r => r.trim());
    const meaningsArray = meanings.split(',').map(m => m.trim());
    const words = englishText.split(/\s+/);
    
    return words.map((word, idx) => {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/gi, '');
      let isHighlighted = false;
      
      // Check if this English word corresponds to the hovered Arabic word
      if (hoveredArabicIndex !== null) {
        const hoveredMeaning = meaningsArray[hoveredArabicIndex];
        if (hoveredMeaning && hoveredMeaning !== '-') {
          const cleanedMeaning = hoveredMeaning.toLowerCase().replace(/^(a|an|the)\s+/i, '');
          const meaningWords = cleanedMeaning.split(/\s+/);
          const allRelatedWords = new Set();
          
          meaningWords.forEach(mw => {
            const cleanMw = mw.replace(/[^a-z]/gi, '');
            if (cleanMw && cleanMw.length > 2) {
              allRelatedWords.add(cleanMw);
              if (cleanMw.endsWith('s')) {
                allRelatedWords.add(cleanMw.slice(0, -1));
              } else {
                allRelatedWords.add(cleanMw + 's');
              }
              getSynonyms(cleanMw).forEach(syn => {
                allRelatedWords.add(syn);
                if (syn.endsWith('s')) {
                  allRelatedWords.add(syn.slice(0, -1));
                } else {
                  allRelatedWords.add(syn + 's');
                }
              });
            }
          });
          
          isHighlighted = Array.from(allRelatedWords).some(rw => {
            if (cleanWord === rw) return true;
            if (cleanWord === rw + 's' || cleanWord + 's' === rw) return true;
            if (cleanWord.length <= 3 || rw.length <= 3) return false;
            if (rw.length >= 4 && cleanWord.length >= 4) {
              if (cleanWord.includes(rw)) {
                const index = cleanWord.indexOf(rw);
                const beforeChar = index > 0 ? cleanWord[index - 1] : ' ';
                const afterChar = index + rw.length < cleanWord.length ? cleanWord[index + rw.length] : ' ';
                return /[^a-z]/i.test(beforeChar) && /[^a-z]/i.test(afterChar);
              }
              return rw.includes(cleanWord);
            }
            return false;
          });
        }
      }
      
      return (
        <span 
          key={idx} 
          className={`english-word ${isHighlighted ? 'english-word-highlighted' : ''} clickable`}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => {
            meaningsArray.forEach((meaning, index) => {
              if (meaning && meaning !== '-') {
                const cleanedMeaning = meaning.toLowerCase().replace(/^(a|an|the)\s+/i, '');
                const meaningWords = cleanedMeaning.split(/\s+/);
                const allRelatedWords = new Set();
                
                meaningWords.forEach(mw => {
                  const cleanMw = mw.replace(/[^a-z]/gi, '');
                  if (cleanMw && cleanMw.length > 2) {
                    allRelatedWords.add(cleanMw);
                    if (cleanMw.endsWith('s')) {
                      allRelatedWords.add(cleanMw.slice(0, -1));
                    } else {
                      allRelatedWords.add(cleanMw + 's');
                    }
                    getSynonyms(cleanMw).forEach(syn => {
                      allRelatedWords.add(syn);
                      if (syn.endsWith('s')) {
                        allRelatedWords.add(syn.slice(0, -1));
                      } else {
                        allRelatedWords.add(syn + 's');
                      }
                    });
                  }
                });
                
                if (Array.from(allRelatedWords).some(rw => {
                  if (cleanWord === rw) return true;
                  if (cleanWord === rw + 's' || cleanWord + 's' === rw) return true;
                  if (cleanWord.length <= 3 || rw.length <= 3) return false;
                  if (rw.length >= 4 && cleanWord.length >= 4) {
                    if (cleanWord.includes(rw)) {
                      const index = cleanWord.indexOf(rw);
                      const beforeChar = index > 0 ? cleanWord[index - 1] : ' ';
                      const afterChar = index + rw.length < cleanWord.length ? cleanWord[index + rw.length] : ' ';
                      return /[^a-z]/i.test(beforeChar) && /[^a-z]/i.test(afterChar);
                    }
                    return rw.includes(cleanWord);
                  }
                  return false;
                })) {
                  setHoveredEnglishIndex(index);
                }
              }
            });
          }}
          onMouseLeave={() => {
            setHoveredEnglishIndex(null);
          }}
        >
          {word}{idx < words.length - 1 ? ' ' : ''}
        </span>
      );
    });
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
      const isHighlightedFromEnglish = hoveredEnglishIndex === index;
      
      return (
        <span
          key={`${verseIndex}-${index}`}
          className={`arabic-word ${isHighlighted ? 'highlighted' : ''} ${isHighlightedFromEnglish ? 'highlighted' : ''} ${root && root !== '-' ? 'clickable' : ''}`}
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
            setHoveredArabicIndex(index);
          }}
          onMouseLeave={() => {
            setHoveredWord(null);
            if (!lockedRoot) {
              setHoveredRoot(null);
            }
            setHoveredArabicIndex(null);
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
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: showRootSummary ? '15px' : '0',
                  cursor: 'pointer',
                  padding: '10px',
                  marginLeft: '-10px',
                  marginRight: '-10px',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => setShowRootSummary(!showRootSummary)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <h4 style={{ margin: 0, color: '#1976d2' }}>
                  🌳 Root Analysis Summary {selectedRootData ? `for "${selectedRootData.selectedRoot}"` : `(${rootSummary.length} unique root${rootSummary.length !== 1 ? 's' : ''})`}
                </h4>
                <button
                  style={{
                    background: 'none',
                    border: '1px solid #1976d2',
                    color: '#1976d2',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    pointerEvents: 'none'
                  }}
                >
                  {showRootSummary ? '▼ Collapse' : '▶ Expand'}
                </button>
              </div>
              
              {selectedRootData && showRootSummary && (
                <div style={{
                  marginBottom: '15px',
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  border: '1px solid #ffc107'
                }}>
                  <strong>Source:</strong> Clicked "{selectedRootData.clickedWord}" in [{selectedRootData.sourceVerse?.sura_verse || 'N/A'}]<br/>
                  <strong>Root meaning there:</strong> {selectedRootData.clickedWordMeaning || 'N/A'}<br/>
                  <strong>Total occurrences in Quran:</strong> {selectedRootData.totalCount || 'N/A'} verses
                </div>
              )}
              
              {showRootSummary && rootSummary && rootSummary.length > 0 && (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {rootSummary.map((rootData, idx) => (
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
                            // Navigate to Root Search with this root
                            sessionStorage.setItem('rootSearchQuery', rootData.root);
                            sessionStorage.setItem('rootSearchMode', 'arabic-english');
                            const event = new CustomEvent('openRootSearch', { 
                              detail: { query: rootData.root, mode: 'arabic-english' } 
                            });
                            window.dispatchEvent(event);
                          }}
                          >
                            {rootData.root}
                          </span>
                        </div>
                        <span style={{
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}>
                          {rootData.totalCount} occurrence{rootData.totalCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {rootData.meanings.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <strong style={{ color: '#666', fontSize: '14px' }}>Meanings found:</strong>
                          <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {rootData.meanings.map((meaning, midx) => (
                              <span key={midx} style={{
                                backgroundColor: '#f0f0f0',
                                color: '#333',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '13px'
                              }}>
                                {meaning}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
                    {verse.roots && verse.meanings && currentLanguage === 'english' 
                      ? parseEnglishText(getTranslationText(verse, currentLanguage), verse.roots, verse.meanings, verse)
                      : getTranslationText(verse, currentLanguage)
                    }
                  </div>
                )}
                
                {getFootnoteText(verse, currentLanguage) && (
                  <div className="footnote" style={{ direction: getLanguageConfig(currentLanguage).direction, fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
                    <small>{getFootnoteText(verse, currentLanguage)}</small>
                  </div>
                )}
                
                {/* Show meaning variation for this verse if available */}
                {meaningData && meaningData.variations && meaningData.variations[verse.sura_verse] && (
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
      
      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          className="scroll-to-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Scroll to top"
        >
          ↑
        </button>
      )}
    </div>
  );
};

export default QuranCompare;