import React, { useState, useEffect } from 'react';

const QuranCompare = () => {
  const [verses, setVerses] = useState([]);
  const [verseInputs, setVerseInputs] = useState(['']);
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
        <div>
          <h3 style={{ color: '#333', marginBottom: '20px' }}>
            Comparison Results ({verses.length} verses)
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: verses.length === 2 ? '1fr 1fr' : '1fr',
            gap: '20px'
          }}>
            {verses.map((verse, index) => (
              <div key={`${verse.sura_verse}-${index}`} style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '20px',
                backgroundColor: '#f9f9f9'
              }}>
                <h4 style={{ 
                  color: '#4CAF50', 
                  marginBottom: '15px',
                  fontSize: '18px',
                  textAlign: 'center'
                }}>
                  {verse.reference}
                </h4>
                
                {verse.arabic && (
                  <div style={{ marginBottom: '15px' }}>
                    <h5 style={{ color: '#666', marginBottom: '8px' }}>Arabic:</h5>
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
                      {verse.arabic}
                    </p>
                  </div>
                )}
                
                {verse.english && (
                  <div style={{ marginBottom: '15px' }}>
                    <h5 style={{ color: '#666', marginBottom: '8px' }}>English:</h5>
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
                    <h5 style={{ color: '#2e7d32', marginBottom: '8px' }}>Footnote:</h5>
                    <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#2e7d32' }}>
                      {verse.footnote}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
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