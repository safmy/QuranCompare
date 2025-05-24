import React, { useState } from 'react';

const QuranVectorSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [numResults, setNumResults] = useState(5);

  // API endpoint - change this to your deployed API URL in production
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001';

  const getCollectionColor = (collection) => {
    const colors = {
      'RashadAllMedia': '#4CAF50',
      'FinalTestament': '#2196F3',
      'QuranTalkArticles': '#FF9800'
    };
    return colors[collection] || '#666';
  };

  const getCollectionEmoji = (collection) => {
    const emojis = {
      'RashadAllMedia': '🎥',
      'FinalTestament': '📖',
      'QuranTalkArticles': '📄'
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
          num_results: numResults
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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Semantic Search</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Search across Rashad Khalifa Media, Final Testament, and QuranTalk articles using AI-powered semantic search
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
            placeholder="Enter your search query..."
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
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
        <div>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
            Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
          </p>
          
          {searchResults.map((result, index) => (
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
                    {result.title}
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
                  Source: {result.source}
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
                  🎥 Watch on YouTube
                </a>
              )}
            </div>
          ))}
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