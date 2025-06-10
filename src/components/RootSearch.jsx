import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getLanguageConfig, getTranslationText } from '../config/languages';
import VoiceSearchButton from './VoiceSearchButton';
import './RootSearch.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

const RootSearch = () => {
  const { currentLanguage } = useLanguage();
  const [searchMode, setSearchMode] = useState('english'); // 'english', 'arabic', 'smart'
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);
  const [rootMapping, setRootMapping] = useState(null);
  const [verses, setVerses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [hoveredWord, setHoveredWord] = useState(null);
  const [hoveredArabicWord, setHoveredArabicWord] = useState(null);
  const [expandedVerses, setExpandedVerses] = useState(new Set());
  
  // Load root mapping data
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
  }, []);

  // Search functionality
  const performSearch = async () => {
    if (!searchQuery.trim() || !rootMapping) return;
    
    setIsLoading(true);
    setError(null);
    setResults(null);
    setVerses([]);
    
    try {
      const query = searchQuery.trim().toLowerCase();
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
  const handleVoiceSearch = (transcript) => {
    setSearchQuery(transcript);
    // Auto-detect if it's Arabic
    const isArabic = /[\u0600-\u06FF]/.test(transcript);
    setSearchMode(isArabic ? 'arabic' : 'english');
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
            onTranscript={handleVoiceSearch}
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
                      className="root-tag"
                      onClick={() => setSelectedWord(root)}
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
              <h3>Verses containing these roots ({verses.length} found)</h3>
              <div className="verses-list">
                {verses.map((verse, index) => {
                  const isExpanded = expandedVerses.has(verse.sura_verse);
                  const arabicWords = getArabicWordsInVerse(verse, results.roots);
                  
                  return (
                    <div key={index} className="verse-result">
                      <div className="verse-header">
                        <span className="verse-ref">{verse.sura_verse}</span>
                        <button 
                          className="expand-btn"
                          onClick={() => toggleVerseExpansion(verse.sura_verse)}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </div>
                      
                      <div className="verse-content">
                        <div 
                          className="arabic-text"
                          dir="rtl"
                          onMouseEnter={() => setHoveredArabicWord(verse.roots)}
                          onMouseLeave={() => setHoveredArabicWord(null)}
                        >
                          {verse.arabic}
                        </div>
                        
                        <div className="translation-text">
                          {getTranslationText(verse, currentLanguage)}
                        </div>
                        
                        {hoveredArabicWord && (
                          <div className="hover-info">
                            Roots: {verse.roots}
                          </div>
                        )}
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
    </div>
  );
};

export default RootSearch;