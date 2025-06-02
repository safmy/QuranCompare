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
  const [includeFinalTestament, setIncludeFinalTestament] = useState(false);
  const [includeNewsletters, setIncludeNewsletters] = useState(false);
  
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
    if (result.collection === 'FinalTestament') {
      // Extract verse reference and make it clickable
      const verseMatch = result.title.match(/\[(\d+:\d+)\]/);
      if (verseMatch) {
        const verseRef = verseMatch[1];
        const beforeVerse = result.title.substring(0, verseMatch.index);
        const afterVerse = result.title.substring(verseMatch.index + verseMatch[0].length);
        
        return (
          <span>
            {beforeVerse}
            <span 
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                transition: 'all 0.2s',
                border: '2px solid #2196F3'
              }}
              onClick={() => handleVerseClick(verseRef)}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#1976D2';
                e.target.style.borderColor = '#1976D2';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#2196F3';
                e.target.style.borderColor = '#2196F3';
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

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');

    try {
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
          include_arabic_verses: includeFinalTestament
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Search failed');
      }

      const data = await response.json();
      setSearchResults(data.results);
      
      if (data.results.length === 0) {
        setError(`No results found for "${searchTerm}"`);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'An error occurred during search. Please make sure the API server is running.');
      setSearchResults([]);
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
        Search across Rashad Khalifa Media, Final Testament (English & Arabic), and Newsletters/Articles using AI-powered semantic search.
        <br />
        <span style={{ fontSize: '14px', color: '#888' }}>
          ✨ Supports Arabic text search and phonetic matching (e.g., "Kulhu" → "قل هو")
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

      {searchResults.length > 0 && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
          </p>
          
          {/* Group Arabic Verses separately */}
          {searchResults.filter(r => r.collection === 'ArabicVerses').length > 0 && (
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
                  <div key={`arabic-${index}`} style={{
                    border: '1px solid #e0d4f7',
                    borderRadius: '8px',
                    padding: '20px',
                    backgroundColor: '#f9f6ff',
                    marginBottom: '15px'
                  }}>
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
                        result.content.split('\nEnglish: ')[1] : 
                        result.content}
                    </p>
                  </div>
                ))}
            </div>
          )}
          
          {/* Group English/Other results */}
          {searchResults.filter(r => r.collection !== 'ArabicVerses').length > 0 && (
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
            <div key={index} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: '#f9f9f9',
              marginBottom: '15px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '10px'
              }}>
                <div>
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
                {result.content}
              </p>
              
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