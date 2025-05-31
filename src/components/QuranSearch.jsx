import React, { useState, useEffect } from 'react';

const QuranSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quranData, setQuranData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage] = useState(10);

  useEffect(() => {
    // Load Quran data
    const loadQuranData = async () => {
      try {
        // For iOS/Capacitor apps, we need to use the full URL
        const isCapacitor = window.Capacitor !== undefined;
        console.log('Is Capacitor app:', isCapacitor);
        
        let url = '/verses_final.json';
        if (isCapacitor) {
          // Use the capacitor URL scheme
          url = window.location.origin + '/verses_final.json';
        }
        
        console.log('Loading from URL:', url);
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to load verses - Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Loaded verses count:', data?.length);
        setQuranData(data);
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Error loading Quran data:', err);
        console.error('Full error details:', err.stack);
        setError(`Load failed`); // Keep the original error message
      }
    };

    loadQuranData();
  }, []);

  const formatVerse = (verseData) => {
    if (!verseData) return null;

    const verseRef = verseData.sura_verse;
    return {
      reference: `[${verseRef}]`,
      sura_verse: verseRef,
      english: verseData.english || '',
      arabic: verseData.arabic || '',
      footnote: verseData.footnote || null
    };
  };

  const highlightSearchTerm = (text, term) => {
    if (!term || !text) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} style={{ backgroundColor: '#ffeb3b', padding: '2px' }}>
          {part}
        </mark>
      ) : part
    );
  };

  const handleSearch = () => {
    if (!quranData) {
      setError('Quran data not loaded yet. Please wait.');
      return;
    }

    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentPage(1);

    try {
      const term = searchTerm.toLowerCase().trim();
      const results = quranData.filter(verse => {
        const englishMatch = verse.english && verse.english.toLowerCase().includes(term);
        const arabicMatch = verse.arabic && verse.arabic.includes(term);
        const footnoteMatch = verse.footnote && verse.footnote.toLowerCase().includes(term);
        
        return englishMatch || arabicMatch || footnoteMatch;
      }).map(formatVerse);

      setSearchResults(results);
      
      if (results.length === 0) {
        setError(`No verses found containing "${searchTerm}"`);
      }
    } catch (err) {
      setError('An error occurred during search');
      setSearchResults([]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Pagination logic
  const indexOfLastResult = currentPage * resultsPerPage;
  const indexOfFirstResult = indexOfLastResult - resultsPerPage;
  const currentResults = searchResults.slice(indexOfFirstResult, indexOfLastResult);
  const totalPages = Math.ceil(searchResults.length / resultsPerPage);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Search Quran</h2>
      
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Search Term:
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
            placeholder="Enter word or phrase to search..."
          />
        </div>
        
        <button
          onClick={handleSearch}
          disabled={loading || !quranData}
          style={{
            padding: '12px 25px',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            marginTop: '20px'
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
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
        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
          </p>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '5px',
              marginTop: '10px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '5px 10px',
                  backgroundColor: currentPage === 1 ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              
              <span style={{ 
                padding: '5px 15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '3px',
                fontSize: '14px'
              }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '5px 10px',
                  backgroundColor: currentPage === totalPages ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {currentResults.map((verse, index) => (
        <div key={`${verse.sura_verse}-${index}`} style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#f9f9f9',
          marginBottom: '15px'
        }}>
          <h3 style={{ 
            color: '#4CAF50', 
            marginBottom: '15px',
            fontSize: '18px'
          }}>
            {verse.reference}
          </h3>
          
          {verse.arabic && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#666', marginBottom: '8px' }}>Arabic:</h4>
              <p style={{
                fontSize: '18px',
                lineHeight: '1.8',
                direction: 'rtl',
                textAlign: 'right',
                fontFamily: 'Arial, sans-serif',
                padding: '10px',
                backgroundColor: 'white',
                border: '1px solid #eee',
                borderRadius: '4px'
              }}>
                {highlightSearchTerm(verse.arabic, searchTerm)}
              </p>
            </div>
          )}
          
          {verse.english && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ color: '#666', marginBottom: '8px' }}>English:</h4>
              <p style={{
                fontSize: '16px',
                lineHeight: '1.6',
                padding: '10px',
                backgroundColor: 'white',
                border: '1px solid #eee',
                borderRadius: '4px'
              }}>
                {highlightSearchTerm(verse.english, searchTerm)}
              </p>
            </div>
          )}
          
          {verse.footnote && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e8f5e8',
              border: '1px solid #4CAF50',
              borderRadius: '4px'
            }}>
              <h4 style={{ color: '#2e7d32', marginBottom: '8px' }}>Footnote:</h4>
              <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#2e7d32' }}>
                {highlightSearchTerm(verse.footnote, searchTerm)}
              </p>
            </div>
          )}
        </div>
      ))}

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

export default QuranSearch;