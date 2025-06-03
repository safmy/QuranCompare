import React, { useState } from 'react';
import VoiceSearchButtonEnhanced from './VoiceSearchButtonEnhanced';

// API endpoint - change this to your deployed API URL in production
const API_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

const QuranVectorSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [numResults, setNumResults] = useState(10);
  const [includeRashadMedia, setIncludeRashadMedia] = useState(false);
  const [includeFinalTestament, setIncludeFinalTestament] = useState(true);
  const [includeNewsletters, setIncludeNewsletters] = useState(false);
  const [includeArabicVerses, setIncludeArabicVerses] = useState(false); // Disabled by default
  const [useRegex, setUseRegex] = useState(false);
  const [regexResults, setRegexResults] = useState([]);
  const [quranData, setQuranData] = useState(null);
  
  // Long press functionality
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [copiedVerse, setCopiedVerse] = useState(null);
  
  // Long press handlers
  const handleLongPressStart = (result) => {
    const timer = setTimeout(() => {
      copyResultToClipboard(result);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const copyResultToClipboard = async (result) => {
    try {
      let verseText = '';
      
      // Handle different result types
      if (result.collection === 'FinalTestament' || result.collection === 'ArabicVerses') {
        const verseMatch = result.title.match(/\[(\d+:\d+)\]/);
        const verseRef = verseMatch ? verseMatch[1] : '';
        
        if (result.collection === 'ArabicVerses' && result.content.includes('\nEnglish: ')) {
          // For Arabic verses, get the English part
          const englishPart = result.content.split('\nEnglish: ')[1];
          verseText = `[${verseRef}] ${englishPart}`;
        } else if (quranData) {
          // For subtitle/footnote results, get the complete verse
          const completeVerse = getCompleteVerseData(verseRef);
          verseText = completeVerse ? `[${verseRef}] ${completeVerse.english}` : `[${verseRef}] ${result.content}`;
        } else {
          verseText = `[${verseRef}] ${result.content}`;
        }
      } else {
        // For other collections (articles, newsletters, etc.), just copy the content
        verseText = result.content;
      }
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(verseText);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = verseText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      // Show feedback
      const verseMatch = result.title.match(/\[(\d+:\d+)\]/);
      const displayRef = verseMatch ? verseMatch[1] : 'Content';
      setCopiedVerse(displayRef);
      setTimeout(() => {
        setCopiedVerse(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy result:', err);
    }
  };
  
  // Helper function to highlight search terms in text
  const highlightSearchTerms = (text, searchQuery) => {
    if (!searchQuery || !text) return text;
    
    // Split search query into words
    const searchWords = searchQuery.trim().toLowerCase().split(/\s+/);
    
    // Create a regex pattern that matches any of the search words with word boundaries
    const pattern = searchWords
      .map(word => `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) // Escape special chars and add word boundaries
      .join('|');
    
    if (!pattern) return text;
    
    try {
      const regex = new RegExp(`(${pattern})`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, index) => {
        if (regex.test(part)) {
          return <mark key={index} style={{ backgroundColor: '#ffeb3b', padding: '2px' }}>{part}</mark>;
        }
        return part;
      });
    } catch (e) {
      return text;
    }
  };
  
  // Get complete verse data including subtitle and footnote
  const getCompleteVerseData = (suraVerse) => {
    if (!quranData || !suraVerse) return null;
    
    // Find the verse in quranData
    const verse = quranData.find(v => v.sura_verse === suraVerse);
    return verse || null;
  };
  
  // Load Quran data on component mount
  React.useEffect(() => {
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
      }
    };
    loadQuranData();
  }, []);
  
  const handleVerseClick = async (verseRef) => {
    try {
      // Get the subtitle range for this verse
      const response = await fetch(`${API_URL}/verse-range-for-subtitle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verse_ref: verseRef
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Open the verse lookup tab with the subtitle range
        // We'll need to communicate with the parent App component
        window.openVerseRange = data.subtitle_range;
        // Trigger a custom event that the App component can listen to
        window.dispatchEvent(new CustomEvent('openVerseRange', { 
          detail: { range: data.subtitle_range } 
        }));
      }
    } catch (err) {
      console.error('Failed to get verse range:', err);
      // Fallback: trigger event with single verse
      window.dispatchEvent(new CustomEvent('openVerseRange', { 
        detail: { range: verseRef } 
      }));
    }
  };
  
  const renderTitle = (result) => {
    if (result.collection === 'FinalTestament' || result.collection === 'ArabicVerses') {
      // Extract verse reference and make it clickable
      const verseMatch = result.title.match(/\[(\d+:\d+)\]/);
      if (verseMatch) {
        const verseRef = verseMatch[1];
        const beforeVerse = result.title.substring(0, verseMatch.index);
        const afterVerse = result.title.substring(verseMatch.index + verseMatch[0].length);
        
        const bgColor = result.collection === 'ArabicVerses' ? '#7c3aed' : '#2196F3';
        const hoverColor = result.collection === 'ArabicVerses' ? '#6d28d9' : '#1976D2';
        
        return (
          <span>
            {beforeVerse}
            <span 
              style={{
                backgroundColor: bgColor,
                color: 'white',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                transition: 'all 0.2s',
                border: `2px solid ${bgColor}`
              }}
              onClick={() => handleVerseClick(verseRef)}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = hoverColor;
                e.target.style.borderColor = hoverColor;
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = bgColor;
                e.target.style.borderColor = bgColor;
                e.target.style.transform = 'translateY(0)';
              }}
              title={`Click to view subtitle section for ${verseRef}`}
            >
              [{verseRef}]
            </span>
            {afterVerse}
          </span>
        );
      }
    }
    
    // For other collections with URLs
    if ((result.collection === 'QuranTalkArticles' || result.collection === 'Newsletters') && result.source_url) {
      const color = result.collection === 'QuranTalkArticles' ? '#FF9800' : '#9C27B0';
      return (
        <a 
          href={result.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: color,
            textDecoration: 'none'
          }}
          onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
          onMouseOut={(e) => e.target.style.textDecoration = 'none'}
        >
          {result.title}
        </a>
      );
    }
    
    return result.title;
  };


  const getCollectionColor = (collection) => {
    const colors = {
      'RashadAllMedia': '#4CAF50',
      'FinalTestament': '#2196F3',
      'QuranTalkArticles': '#FF9800',
      'Newsletters': '#9C27B0',
      'ArabicVerses': '#7c3aed'
    };
    return colors[collection] || '#666';
  };

  const getCollectionEmoji = (collection) => {
    const emojis = {
      'RashadAllMedia': '🎥',
      'FinalTestament': '📖',
      'QuranTalkArticles': '📄',
      'Newsletters': '📰',
      'ArabicVerses': '🕌'
    };
    return emojis[collection] || '📌';
  };
  
  // Get background color based on source type
  const getSourceBackgroundColor = (source) => {
    if (source?.includes('Footnote')) return '#fff3cd'; // Light yellow for footnotes
    if (source?.includes('Subtitle')) return '#e8f5e9'; // Light green for subtitles
    if (source === 'Final Testament') return '#e3f2fd'; // Light blue for verses
    return '#f9f9f9'; // Default gray
  };
  
  // Get border color based on source type
  const getSourceBorderColor = (source) => {
    if (source?.includes('Footnote')) return '#ffeaa7'; // Yellow for footnotes
    if (source?.includes('Subtitle')) return '#81c784'; // Green for subtitles
    if (source === 'Final Testament') return '#90caf9'; // Blue for verses
    return '#ddd'; // Default gray
  };

  const performRegexSearch = () => {
    if (!quranData || !searchTerm.trim()) return [];
    
    const searchWords = searchTerm.trim().toLowerCase().split(/\s+/);
    
    return quranData.filter(verse => {
      const verseText = verse.english.toLowerCase();
      
      // For regex search, all words must be present but in any order
      return searchWords.every(word => {
        // Escape special regex characters for safety
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}`, 'i');
        return regex.test(verseText);
      });
    }).map(verse => ({
      collection: 'FinalTestament',
      title: `[${verse.sura_verse}] ${verse.english.substring(0, 50)}...`,
      content: verse.english,
      similarity_score: 1.0,
      source: 'Final Testament (Regex Match)',
      source_url: null,
      youtube_link: null
    }));
  };

  // Helper function to detect if text contains Arabic
  const isArabicText = (text) => {
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicPattern.test(text);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    // Check if any collections are selected
    const hasSelections = includeRashadMedia || includeFinalTestament || includeNewsletters || includeArabicVerses;
    if (!hasSelections && !useRegex) {
      setError('Please select at least one source to search');
      return;
    }

    setLoading(true);
    setError('');
    
    // Clear previous results
    setSearchResults([]);
    setRegexResults([]);

    try {
      if (useRegex && quranData) {
        // Perform regex search locally
        const regexMatches = performRegexSearch();
        setRegexResults(regexMatches);
        
        if (regexMatches.length === 0) {
          setError(`No regex matches found for "${searchTerm}"`);
        }
      } else {
        // Perform semantic search via API - trust user selections
        const response = await fetch(`${API_URL}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchTerm,
            num_results: numResults,
            include_rashad_media: includeRashadMedia,
            include_final_testament: includeFinalTestament,
            include_qurantalk: includeNewsletters,
            include_newsletters: includeNewsletters,
            include_arabic_verses: includeArabicVerses
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Search failed');
        }

        const data = await response.json();
        setSearchResults(data.results);
        
        if (data.results.length === 0) {
          setError(`No semantic results found for "${searchTerm}"`);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'An error occurred during search. Please make sure the API server is running.');
      setSearchResults([]);
      setRegexResults([]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleVoiceTranscription = (transcription) => {
    setSearchTerm(transcription);
    // Automatically search after transcription
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Semantic Search</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Search individual collections using AI-powered semantic search. Select checkboxes below to choose sources.
        <br />
        <span style={{ fontSize: '14px', color: '#888' }}>
          ✨ Final Testament (English) • Arabic Verses • Media • Newsletters & Articles
        </span>
      </p>
      
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Search Query:
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              padding: '10px 15px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
              fontSize: '16px'
            }}
            placeholder="Enter your search query (Arabic or English)..."
          />
        </div>
        
        <div style={{ minWidth: '120px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Results:
          </label>
          <select
            value={numResults}
            onChange={(e) => setNumResults(parseInt(e.target.value))}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '16px',
              width: '100%'
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '12px 25px',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        
        <VoiceSearchButtonEnhanced onTranscription={handleVoiceTranscription} />
      </div>

      {/* Collection Filters */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h4 style={{ marginBottom: '10px', color: '#333' }}>Search In:</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeFinalTestament}
              onChange={(e) => setIncludeFinalTestament(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ color: '#2196F3', fontWeight: 'bold' }}>📖 Final Testament</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeArabicVerses}
              onChange={(e) => setIncludeArabicVerses(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>🕌 Arabic Verses</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeRashadMedia}
              onChange={(e) => setIncludeRashadMedia(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>🎥 Rashad Khalifa Media</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={includeNewsletters}
              onChange={(e) => setIncludeNewsletters(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ color: '#9C27B0', fontWeight: 'bold' }}>📰 Newsletters & Articles</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <span style={{ color: '#666', fontWeight: 'bold' }}>🔍 Regex Search</span>
          </label>
        </div>
        {useRegex && (
          <p style={{ fontSize: '13px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
            Regex searches Final Testament for all words in any order
          </p>
        )}
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

      {/* Display results */}
      {(searchResults.length > 0 || regexResults.length > 0) && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
            Found {useRegex ? regexResults.length : searchResults.length} {useRegex ? 'regex' : 'semantic'} result{(useRegex ? regexResults.length : searchResults.length) !== 1 ? 's' : ''} for "{searchTerm}"
          </p>
          
          {/* Display regex results if using regex search */}
          {useRegex && regexResults.length > 0 && (
            <div>
              {regexResults.map((result, index) => (
                <div 
                  key={`regex-${index}`} 
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: '#f9f9f9',
                    marginBottom: '15px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onMouseDown={() => handleLongPressStart(result)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(result)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchCancel={handleLongPressEnd}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '10px'
                  }}>
                    <div>
                      <span style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginRight: '10px'
                      }}>
                        📖 {result.source}
                      </span>
                      <h3 style={{ 
                        color: '#333', 
                        marginTop: '10px',
                        marginBottom: '5px',
                        fontSize: '18px'
                      }}>
                        {renderTitle(result)}
                      </h3>
                    </div>
                  </div>
                  
                  <p style={{
                    fontSize: '15px',
                    lineHeight: '1.6',
                    color: '#555',
                    marginBottom: '10px'
                  }}>
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* Group Arabic Verses separately for semantic search */}
          {!useRegex && searchResults.filter(r => r.collection === 'ArabicVerses').length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ 
                color: '#7c3aed', 
                fontSize: '18px', 
                marginBottom: '15px',
                borderBottom: '2px solid #7c3aed',
                paddingBottom: '8px'
              }}>
                🕌 Quran Arabic Verses
              </h3>
              {searchResults
                .filter(result => result.collection === 'ArabicVerses')
                .map((result, index) => (
                  <div 
                    key={`arabic-${index}`} 
                    style={{
                      border: '1px solid #e0d4f7',
                      borderRadius: '8px',
                      padding: '20px',
                      backgroundColor: '#f9f6ff',
                      marginBottom: '15px',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onMouseDown={() => handleLongPressStart(result)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(result)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchCancel={handleLongPressEnd}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '10px'
                    }}>
                      <div>
                        <h3 style={{ 
                          color: '#333', 
                          marginTop: '10px',
                          marginBottom: '5px',
                          fontSize: '18px'
                        }}>
                          {renderTitle(result)}
                        </h3>
                      </div>
                      <div style={{
                        backgroundColor: '#e8f5e9',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: '#2e7d32'
                      }}>
                        {(result.similarity_score * 100).toFixed(1)}% match
                      </div>
                    </div>
                    
                    <p style={{
                      fontSize: '15px',
                      lineHeight: '1.6',
                      color: '#555',
                      marginBottom: '10px'
                    }}>
                      {result.content.startsWith('Arabic:') ? 
                        highlightSearchTerms(result.content.split('\nEnglish: ')[1], searchTerm) : 
                        highlightSearchTerms(result.content, searchTerm)}
                    </p>
                  </div>
                ))}
            </div>
          )}
          
          {/* Group English/Other results for semantic search */}
          {!useRegex && searchResults.filter(r => r.collection !== 'ArabicVerses').length > 0 && (
            <div>
              {searchResults.filter(r => r.collection === 'ArabicVerses').length > 0 && (
                <h3 style={{ 
                  color: '#2196F3', 
                  fontSize: '18px', 
                  marginBottom: '15px',
                  borderBottom: '2px solid #2196F3',
                  paddingBottom: '8px'
                }}>
                  📚 English Results & Other Sources
                </h3>
              )}
              {searchResults
                .filter(result => result.collection !== 'ArabicVerses')
                .map((result, index) => (
            <div 
              key={index} 
              style={{
                border: `2px solid ${getSourceBorderColor(result.source)}`,
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: getSourceBackgroundColor(result.source),
                marginBottom: '15px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
              onMouseDown={() => handleLongPressStart(result)}
              onMouseUp={handleLongPressEnd}
              onMouseLeave={handleLongPressEnd}
              onTouchStart={() => handleLongPressStart(result)}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '10px'
              }}>
                <div>
                  {/* Only show collection badge for non-subtitle/footnote results */}
                  {!(result.source?.includes('Subtitle') || result.source?.includes('Footnote')) && (
                    <>
                      <span style={{
                        backgroundColor: getCollectionColor(result.collection),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginRight: '10px'
                      }}>
                        {getCollectionEmoji(result.collection)} {result.collection}
                      </span>
                      <h3 style={{ 
                        color: '#333', 
                        marginTop: '10px',
                        marginBottom: '5px',
                        fontSize: '18px'
                      }}>
                        {renderTitle(result)}
                      </h3>
                    </>
                  )}
                  
                  {/* Show simplified collection badge for subtitle/footnote results */}
                  {(result.source?.includes('Subtitle') || result.source?.includes('Footnote')) && (
                    <span style={{
                      backgroundColor: getCollectionColor(result.collection),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      marginBottom: '10px',
                      display: 'inline-block'
                    }}>
                      {getCollectionEmoji(result.collection)} {result.collection}
                    </span>
                  )}
                </div>
                <div style={{
                  backgroundColor: '#e8f5e9',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#2e7d32'
                }}>
                  {(result.similarity_score * 100).toFixed(1)}% match
                </div>
              </div>
              
              {/* Show streamlined subtitle/footnote content */}
              {(result.source?.includes('Subtitle') || result.source?.includes('Footnote')) && quranData ? (
                <div>
                  {(() => {
                    const verseMatch = result.title.match(/\[([\d:]+)\]/);
                    const suraVerse = verseMatch ? verseMatch[1] : null;
                    const completeVerse = suraVerse ? getCompleteVerseData(suraVerse) : null;
                    
                    if (completeVerse) {
                      return (
                        <div>
                          {/* Show subtitle content for subtitle results */}
                          {completeVerse.subtitle && result.source?.includes('Subtitle') && (
                            <div style={{
                              fontSize: '16px',
                              lineHeight: '1.6',
                              color: '#333',
                              marginBottom: '12px',
                              fontWeight: '500'
                            }}>
                              <span 
                                style={{
                                  backgroundColor: '#4caf50',
                                  color: 'white',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '13px',
                                  marginRight: '8px',
                                  transition: 'all 0.2s',
                                  border: '2px solid #4caf50'
                                }}
                                onClick={() => handleVerseClick(suraVerse)}
                                onMouseOver={(e) => {
                                  e.target.style.backgroundColor = '#45a049';
                                  e.target.style.borderColor = '#45a049';
                                  e.target.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.backgroundColor = '#4caf50';
                                  e.target.style.borderColor = '#4caf50';
                                  e.target.style.transform = 'translateY(0)';
                                }}
                                title={`Click to view subtitle section for ${suraVerse}`}
                              >
                                [{suraVerse}]
                              </span>
                              {highlightSearchTerms(completeVerse.subtitle, searchTerm)}
                            </div>
                          )}
                          
                          {/* Show footnote content for footnote results */}
                          {completeVerse.footnote && result.source?.includes('Footnote') && (
                            <div style={{
                              fontSize: '16px',
                              lineHeight: '1.6',
                              color: '#333',
                              marginBottom: '12px',
                              fontWeight: '500'
                            }}>
                              <span 
                                style={{
                                  backgroundColor: '#ffc107',
                                  color: 'white',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '13px',
                                  marginRight: '8px',
                                  transition: 'all 0.2s',
                                  border: '2px solid #ffc107'
                                }}
                                onClick={() => handleVerseClick(suraVerse)}
                                onMouseOver={(e) => {
                                  e.target.style.backgroundColor = '#e0a800';
                                  e.target.style.borderColor = '#e0a800';
                                  e.target.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.backgroundColor = '#ffc107';
                                  e.target.style.borderColor = '#ffc107';
                                  e.target.style.transform = 'translateY(0)';
                                }}
                                title={`Click to view subtitle section for ${suraVerse}`}
                              >
                                [{suraVerse}]
                              </span>
                              {highlightSearchTerms(completeVerse.footnote, searchTerm)}
                            </div>
                          )}
                          
                          {/* Show verse content */}
                          <div style={{
                            fontSize: '15px',
                            lineHeight: '1.6',
                            color: '#555',
                            padding: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '6px',
                            border: '1px solid #e8ecf0'
                          }}>
                            {highlightSearchTerms(completeVerse.english, searchTerm)}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <p style={{
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: '#555',
                        marginBottom: '10px'
                      }}>
                        {highlightSearchTerms(result.content, searchTerm)}
                      </p>
                    );
                  })()}
                </div>
              ) : (
                <p style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#555',
                  marginBottom: '10px'
                }}>
                  {highlightSearchTerms(result.content, searchTerm)}
                </p>
              )}
              
              {result.source && (
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '5px' }}>
                  Source: {result.source_url ? (
                    <a 
                      href={result.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#1976d2',
                        textDecoration: 'underline'
                      }}
                    >
                      {result.source}
                    </a>
                  ) : (
                    result.source
                  )}
                </p>
              )}
              
              {result.youtube_link && (
                <a 
                  href={result.youtube_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '10px',
                    padding: '8px 15px',
                    backgroundColor: '#ff0000',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  🎥 {result.youtube_link.includes('search_query') ? 'Search on YouTube' : 'Watch on YouTube'}
                </a>
              )}
            </div>
          ))}
            </div>
          )}
        </div>
      )}

      {/* Copy feedback */}
      {copiedVerse && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#4caf50',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '6px',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
          📋 Copied [{copiedVerse}] to clipboard
        </div>
      )}

      {!loading && searchResults.length === 0 && !error && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>🔍 Ready to search</p>
          <p style={{ fontSize: '14px' }}>
            This search uses AI embeddings to find semantically similar content across multiple sources
          </p>
        </div>
      )}
    </div>
  );
};

export default QuranVectorSearch;