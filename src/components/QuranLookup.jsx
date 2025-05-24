import React, { useState, useEffect } from 'react';

const QuranLookup = () => {
  const [verse, setVerse] = useState(null);
  const [suraNumber, setSuraNumber] = useState('');
  const [verseNumber, setVerseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quranData, setQuranData] = useState(null);

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

  const handleLookup = () => {
    if (!quranData) {
      setError('Quran data not loaded yet. Please wait.');
      return;
    }

    if (!suraNumber || !verseNumber) {
      setError('Please enter both sura and verse numbers');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const sura = parseInt(suraNumber);
      const verse = parseInt(verseNumber);
      
      if (sura < 1 || sura > 114) {
        setError('Sura number must be between 1 and 114');
        setLoading(false);
        return;
      }

      const verseKey = `${sura}:${verse}`;
      const verseData = quranData.find(v => v.sura_verse === verseKey);

      if (verseData) {
        setVerse(formatVerse(verseData));
      } else {
        setError(`Verse ${verseKey} not found`);
        setVerse(null);
      }
    } catch (err) {
      setError('Invalid input. Please enter valid numbers.');
      setVerse(null);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>Quran Verse Lookup</h2>
      
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Sura Number:
          </label>
          <input
            type="number"
            min="1"
            max="114"
            value={suraNumber}
            onChange={(e) => setSuraNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100px'
            }}
            placeholder="1-114"
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Verse Number:
          </label>
          <input
            type="number"
            min="1"
            value={verseNumber}
            onChange={(e) => setVerseNumber(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100px'
            }}
            placeholder="1+"
          />
        </div>
        
        <button
          onClick={handleLookup}
          disabled={loading || !quranData}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '20px'
          }}
        >
          {loading ? 'Looking up...' : 'Lookup Verse'}
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

      {verse && (
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#f9f9f9'
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
                fontSize: '20px',
                lineHeight: '1.8',
                direction: 'rtl',
                textAlign: 'right',
                fontFamily: 'Arial, sans-serif',
                padding: '10px',
                backgroundColor: 'white',
                border: '1px solid #eee',
                borderRadius: '4px'
              }}>
                {verse.arabic}
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
                {verse.english}
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
                {verse.footnote}
              </p>
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

export default QuranLookup;