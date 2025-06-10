import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getLanguageConfig, getTranslationText } from '../config/languages';
import VoiceSearchButton from './VoiceSearchButton';
import { initializeWordToRootMap, processArabicTranscription } from '../utils/arabicRootConverter';
import './RootSearch.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

const RootSearch = () => {
  const { currentLanguage } = useLanguage();
  
  // Check for incoming query from session storage or saved state
  const savedSearchQuery = sessionStorage.getItem('rootSearchSavedQuery') || '';
  const savedSearchMode = sessionStorage.getItem('rootSearchSavedMode') || 'english';
  const initialQuery = sessionStorage.getItem('rootSearchQuery') || savedSearchQuery;
  const initialMode = sessionStorage.getItem('rootSearchMode') || savedSearchMode;
  
  const [searchMode, setSearchMode] = useState(initialMode);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState(null);
  const [rootMapping, setRootMapping] = useState(null);
  const [verses, setVerses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [hoveredArabicWord, setHoveredArabicWord] = useState(null);
  const [expandedVerses, setExpandedVerses] = useState(new Set());
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [highlightedRoot, setHighlightedRoot] = useState(null);
  const [lockedRoot, setLockedRoot] = useState(null);
  
  // Load root mapping data and initialize word-to-root map
  useEffect(() => {
    const loadRootMapping = async () => {
      try {
        const response = await fetch('/rootMapping.json');
        if (response.ok) {
          const data = await response.json();
          setRootMapping(data);
        }
      } catch (err) {
        console.error('Failed to load root mapping:', err);
      }
    };
    loadRootMapping();
    
    // Initialize word-to-root mapping
    initializeWordToRootMap();
  }, []);
  
  // Perform search if there's an initial query
  useEffect(() => {
    if (initialQuery && rootMapping) {
      performSearch();
      // Clear the session storage
      sessionStorage.removeItem('rootSearchQuery');
      sessionStorage.removeItem('rootSearchMode');
    }
  }, [rootMapping]); // Only trigger when rootMapping is loaded

  // Save search state when it changes
  useEffect(() => {
    if (searchQuery) {
      sessionStorage.setItem('rootSearchSavedQuery', searchQuery);
    }
    sessionStorage.setItem('rootSearchSavedMode', searchMode);
  }, [searchQuery, searchMode]);

  // Search functionality
  const performSearch = async () => {
    if (!searchQuery.trim() || !rootMapping) return;
    
    setIsLoading(true);
    setError(null);
    setResults(null);
    setVerses([]);
    
    try {
      let query = searchQuery.trim();
      
      // If in Arabic mode and the query contains Arabic words (not roots), convert them
      if (searchMode === 'arabic' && /[\u0600-\u06FF]/.test(query)) {
        // Check if it looks like a word rather than a root (roots typically have spaces between letters)
        const hasNoSpaces = !query.includes(' ') || query.split(' ').every(part => part.length > 1);
        if (hasNoSpaces) {
          // This looks like Arabic words, not roots - convert them
          const processedQuery = await processArabicTranscription(query);
          if (processedQuery && processedQuery !== query) {
            query = processedQuery;
            setSearchQuery(processedQuery); // Update the input field
          }
        }
      }
      
      query = query.toLowerCase();
      let foundRoots = [];
      let searchResults = {
        mode: searchMode,
        query: searchQuery,
        roots: [],
        relatedWords: [],
        verses: []
      };
      
      if (searchMode === 'english') {
        // Search English to Arabic
        if (rootMapping.englishToArabic[query]) {
          foundRoots = rootMapping.englishToArabic[query];
          searchResults.roots = foundRoots;
          
          // Find related English words
          const relatedWords = new Set();
          foundRoots.forEach(root => {
            if (rootMapping.arabicToEnglish[root]) {
              rootMapping.arabicToEnglish[root].meanings.forEach(meaning => {
                meaning.split(/\s+/).forEach(word => {
                  if (word.length > 2) relatedWords.add(word);
                });
              });
            }
          });
          searchResults.relatedWords = Array.from(relatedWords);
        }
      } else if (searchMode === 'arabic') {
        // Search Arabic root
        if (rootMapping.arabicToEnglish[query]) {
          foundRoots = [query];
          searchResults.roots = foundRoots;
          searchResults.meanings = rootMapping.arabicToEnglish[query].meanings;
          searchResults.relatedWords = rootMapping.arabicToEnglish[query].meanings;
        }
      } else if (searchMode === 'smart') {
        // Smart search - try both directions
        // First try as English
        if (rootMapping.englishToArabic[query]) {
          foundRoots = rootMapping.englishToArabic[query];
          searchResults.searchType = 'english';
        } 
        // Then try as Arabic
        else if (rootMapping.arabicToEnglish[query]) {
          foundRoots = [query];
          searchResults.searchType = 'arabic';
          searchResults.meanings = rootMapping.arabicToEnglish[query].meanings;
        }
        // Try partial matches
        else {
          // Search for partial English matches
          const partialMatches = Object.keys(rootMapping.englishToArabic)
            .filter(word => word.includes(query))
            .slice(0, 10);
          
          if (partialMatches.length > 0) {
            searchResults.partialMatches = partialMatches;
            partialMatches.forEach(match => {
              foundRoots.push(...rootMapping.englishToArabic[match]);
            });
            foundRoots = [...new Set(foundRoots)]; // Remove duplicates
          }
        }
        searchResults.roots = foundRoots;
      }
      
      // If we found roots, fetch verses containing them
      if (foundRoots.length > 0) {
        const rootQuery = foundRoots.map(root => `rt:${root}`).join(' OR ');
        const response = await fetch(`${API_BASE_URL}/verses/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query: rootQuery,
            search_type: 'root',
            limit: 100
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          searchResults.verses = data.verses || [];
          setVerses(data.verses || []);
        }
      }
      
      setResults(searchResults);
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voice search
  const handleVoiceSearch = async (transcript) => {
    // Auto-detect if it's Arabic
    const isArabic = /[\u0600-\u06FF]/.test(transcript);
    
    if (isArabic) {
      // Convert Arabic words to roots
      const processedQuery = await processArabicTranscription(transcript);
      setSearchQuery(processedQuery);
      setSearchMode('arabic');
    } else {
      setSearchQuery(transcript);
      setSearchMode('english');
    }
    
    // Trigger search automatically after voice input
    setTimeout(() => {
      performSearch();
    }, 100);
  };

  // Toggle verse expansion
  const toggleVerseExpansion = (verseRef) => {
    const newExpanded = new Set(expandedVerses);
    if (newExpanded.has(verseRef)) {
      newExpanded.delete(verseRef);
    } else {
      newExpanded.add(verseRef);
    }
    setExpandedVerses(newExpanded);
  };

  // Highlight matching words in text
  const highlightText = (text, words, isArabic = false) => {
    if (!words || words.length === 0) return text;
    
    let highlightedText = text;
    words.forEach(word => {
      const regex = new RegExp(`(${word})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  // Get Arabic words for highlighting
  const getArabicWordsInVerse = (verse, roots) => {
    if (!verse.arabic || !roots) return [];
    
    const arabicWords = [];
    const verseRoots = verse.roots ? verse.roots.split(',').map(r => r.trim()) : [];
    
    roots.forEach(searchRoot => {
      if (verseRoots.includes(searchRoot)) {
        // This is a simplified approach - in reality, we'd need morphological analysis
        // to identify which words contain the root
        arabicWords.push(searchRoot);
      }
    });
    
    return arabicWords;
  };

  // Parse Arabic text with word-by-word hover and highlighting
  const parseArabicText = (verse, searchRoots) => {
    if (!verse.arabic || !verse.roots) return verse.arabic;
    
    const arabicWords = verse.arabic.split(/\s+/);
    const roots = verse.roots.split(',').map(r => r.trim());
    const meanings = verse.meanings ? verse.meanings.split(',').map(m => m.trim()) : [];
    
    return arabicWords.map((word, index) => {
      const root = roots[index] || '';
      const meaning = meanings[index] || '';
      const isClickable = root && root !== '-';
      
      // Check if this word's root matches any of the search roots
      const isHighlighted = searchRoots && searchRoots.includes(root);
      // Check if this root is currently hovered or locked
      const isRootHighlighted = (lockedRoot && root === lockedRoot) || 
                               (!lockedRoot && highlightedRoot === root);
      
      return (
        <span
          key={index}
          className={`arabic-word ${isClickable ? 'clickable' : ''} ${isHighlighted ? 'search-highlighted' : ''} ${isRootHighlighted ? 'root-highlighted' : ''}`}
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
              if (root && root !== '-' && !lockedRoot) {
                setHighlightedRoot(root);
              }
            }
          }}
          onMouseLeave={() => {
            setHoveredWord(null);
            if (!lockedRoot) {
              setHighlightedRoot(null);
            }
          }}
          onClick={() => {
            if (isClickable) {
              if (lockedRoot === root) {
                setLockedRoot(null);
                setHighlightedRoot(null);
              } else {
                setLockedRoot(root);
                setHighlightedRoot(root);
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

  // Handle clicking on a root to show its verses
  const handleRootClick = async (root) => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/verses/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: `rt:${root}`,
          search_type: 'root',
          limit: 100
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setVerses(data.verses || []);
        setResults({
          query: root,
          roots: [root],
          meanings: rootMapping.arabicToEnglish[root]?.meanings || [],
          verses: data.verses || []
        });
      }
    } catch (err) {
      console.error('Error fetching verses for root:', err);
      setError('Failed to fetch verses for root.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add verses to compare
  const addToCompare = (verses) => {
    const versesToAdd = verses.map(v => v.sura_verse);
    sessionStorage.setItem('compareVerses', JSON.stringify(versesToAdd));
    
    // Dispatch event to navigate to compare tab
    window.dispatchEvent(new CustomEvent('navigateToCompare', {
      detail: { verses: versesToAdd }
    }));
  };

  return (
    <div className="root-search-container">
      <div className="root-search-header">
        <h2>🌳 Root Search</h2>
        <p className="subtitle">Search Quranic roots bidirectionally - English to Arabic or Arabic to English</p>
      </div>

      <div className="search-controls">
        <div className="search-mode-selector">
          <button 
            className={searchMode === 'english' ? 'active' : ''}
            onClick={() => setSearchMode('english')}
          >
            English → Arabic
          </button>
          <button 
            className={searchMode === 'arabic' ? 'active' : ''}
            onClick={() => setSearchMode('arabic')}
          >
            Arabic → English
          </button>
          <button 
            className={searchMode === 'smart' ? 'active' : ''}
            onClick={() => setSearchMode('smart')}
          >
            🔍 Smart Search
          </button>
        </div>

        <div className="search-input-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && performSearch()}
            placeholder={
              searchMode === 'english' 
                ? "Enter English word (e.g., 'mercy', 'praise', 'lord')"
                : searchMode === 'arabic'
                ? "Enter Arabic root (e.g., 'ر ح م', 'ح م د', 'ر ب ب')"
                : "Enter any word in English or Arabic"
            }
            className="search-input"
            dir={searchMode === 'arabic' ? 'rtl' : 'ltr'}
          />
          <button 
            onClick={performSearch} 
            disabled={isLoading || !searchQuery.trim()}
            className="search-button"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          <VoiceSearchButton 
            onTranscription={handleVoiceSearch}
            isArabic={searchMode === 'arabic'}
          />
        </div>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {results && (
        <div className="search-results">
          <div className="results-summary">
            <h3>Search Results for "{results.query}"</h3>
            
            {results.roots.length > 0 && (
              <div className="found-roots">
                <h4>Found Roots:</h4>
                <div className="root-list">
                  {results.roots.map((root, index) => (
                    <span 
                      key={index} 
                      className="root-tag clickable"
                      onClick={() => handleRootClick(root)}
                      title="Click to see all verses with this root"
                    >
                      {root}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {results.meanings && results.meanings.length > 0 && (
              <div className="meanings-section">
                <h4>Meanings:</h4>
                <div className="meanings-list">
                  {results.meanings.map((meaning, index) => (
                    <span key={index} className="meaning-tag">{meaning}</span>
                  ))}
                </div>
              </div>
            )}
            
            {results.relatedWords && results.relatedWords.length > 0 && (
              <div className="related-words">
                <h4>Related Words:</h4>
                <div className="word-cloud">
                  {results.relatedWords.slice(0, 20).map((word, index) => (
                    <span 
                      key={index} 
                      className="related-word"
                      onClick={() => {
                        setSearchQuery(word);
                        setSearchMode('english');
                      }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {results.partialMatches && (
              <div className="partial-matches">
                <h4>Did you mean:</h4>
                <div className="suggestions">
                  {results.partialMatches.map((match, index) => (
                    <button
                      key={index}
                      className="suggestion-btn"
                      onClick={() => {
                        setSearchQuery(match);
                        performSearch();
                      }}
                    >
                      {match}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {verses.length > 0 && (
            <div className="verses-section">
              <div className="verses-header">
                <h3>Verses containing these roots ({verses.length} found)</h3>
                <button 
                  className="add-all-to-compare-btn"
                  onClick={() => addToCompare(verses)}
                  title="Add all verses to compare"
                >
                  Add All to Compare
                </button>
              </div>
              <div className="verses-list">
                {verses.map((verse, index) => {
                  const isExpanded = expandedVerses.has(verse.sura_verse);
                  const arabicWords = getArabicWordsInVerse(verse, results.roots);
                  
                  return (
                    <div key={index} className="verse-result">
                      <div className="verse-header">
                        <span className="verse-ref">{verse.sura_verse}</span>
                        <div className="verse-actions">
                          <button 
                            className="add-to-compare-btn"
                            onClick={() => addToCompare([verse])}
                            title="Add to compare"
                          >
                            + Compare
                          </button>
                          <button 
                            className="expand-btn"
                            onClick={() => toggleVerseExpansion(verse.sura_verse)}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="verse-content">
                        <div 
                          className="arabic-text"
                          dir="rtl"
                        >
                          {parseArabicText(verse, results.roots)}
                        </div>
                        
                        <div className="translation-text">
                          {getTranslationText(verse, currentLanguage)}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="expanded-content">
                          <div className="verse-details">
                            <div className="detail-row">
                              <strong>Roots:</strong> {verse.roots}
                            </div>
                            <div className="detail-row">
                              <strong>Word Meanings:</strong> {verse.meanings}
                            </div>
                            {verse.transliteration && (
                              <div className="detail-row">
                                <strong>Transliteration:</strong> {verse.transliteration}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Word hover tooltip */}
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
            {hoveredWord.root && hoveredWord.root !== '-' && (
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
      
      {/* Locked root indicator */}
      {lockedRoot && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '10px 15px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
          zIndex: 999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 'bold' }}>Locked Root:</span>
            <span style={{
              fontFamily: 'Traditional Arabic, serif',
              fontSize: '20px',
              direction: 'rtl'
            }}>{lockedRoot}</span>
            <button
              onClick={() => {
                setLockedRoot(null);
                setHighlightedRoot(null);
              }}
              style={{
                background: 'none',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Unlock
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RootSearch;