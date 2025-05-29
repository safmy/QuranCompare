import React, { useState, useRef, useEffect } from 'react';
import { getAbsoluteVerseNumber, getVerseAudioUrl } from '../utils/verseMapping';

const QuranAudioPlayer = ({ 
  verseReference, 
  arabicText, 
  onMemorizationModeChange = () => {}
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [memorizationMode, setMemorizationMode] = useState(false);
  const [chunkSize, setChunkSize] = useState(3);
  const [repeatCount, setRepeatCount] = useState(3);
  const [pauseDuration, setPauseDuration] = useState(5);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [isMemorizationPlaying, setIsMemorizationPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const memorizationTimeoutRef = useRef(null);
  const memorizationIntervalRef = useRef(null);


  const playAudio = async () => {
    const audioUrl = getVerseAudioUrl(verseReference);
    if (!audioUrl) {
      setError('Invalid verse reference');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onloadstart = () => setIsLoading(true);
      audioRef.current.oncanplay = () => setIsLoading(false);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        if (memorizationMode && isMemorizationPlaying) {
          handleMemorizationEnd();
        }
      };
      audioRef.current.onerror = () => {
        setError('Failed to load audio. Please try again.');
        setIsLoading(false);
        setIsPlaying(false);
      };

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      setError('Failed to play audio. Please try again.');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    stopMemorization();
  };

  const toggleMemorizationMode = () => {
    const newMode = !memorizationMode;
    setMemorizationMode(newMode);
    onMemorizationModeChange(newMode);
    
    if (!newMode) {
      stopMemorization();
    }
  };

  const getArabicChunks = () => {
    if (!arabicText) return [];
    const words = arabicText.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    
    return chunks;
  };

  const startMemorization = async () => {
    const chunks = getArabicChunks();
    if (chunks.length === 0) return;

    setIsMemorizationPlaying(true);
    setCurrentChunk(0);
    
    const playChunk = async (chunkIndex, repetition = 0) => {
      if (!isMemorizationPlaying || chunkIndex >= chunks.length) {
        setIsMemorizationPlaying(false);
        setCurrentChunk(0);
        return;
      }

      setCurrentChunk(chunkIndex);
      
      // Play the full verse audio (in a real implementation, you'd need chunk-specific audio)
      await playAudio();
      
      // Wait for audio to finish, then decide next action
      if (audioRef.current) {
        audioRef.current.onended = () => {
          setIsPlaying(false);
          
          if (repetition < repeatCount - 1) {
            // Repeat the same chunk
            memorizationTimeoutRef.current = setTimeout(() => {
              playChunk(chunkIndex, repetition + 1);
            }, pauseDuration * 1000);
          } else {
            // Move to next chunk
            memorizationTimeoutRef.current = setTimeout(() => {
              playChunk(chunkIndex + 1, 0);
            }, pauseDuration * 1000);
          }
        };
      }
    };

    playChunk(0, 0);
  };

  const stopMemorization = () => {
    setIsMemorizationPlaying(false);
    setCurrentChunk(0);
    
    if (memorizationTimeoutRef.current) {
      clearTimeout(memorizationTimeoutRef.current);
    }
    if (memorizationIntervalRef.current) {
      clearInterval(memorizationIntervalRef.current);
    }
    
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  const handleMemorizationEnd = () => {
    // This will be called when memorization cycle completes
    setIsMemorizationPlaying(false);
    setCurrentChunk(0);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopMemorization();
    };
  }, []);

  const chunks = getArabicChunks();

  return (
    <div className="quran-audio-player" style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '15px',
      marginTop: '10px',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, color: '#333' }}>
          Audio Player {verseReference}
        </h4>
        
        {!memorizationMode ? (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              disabled={isLoading}
              style={{
                padding: '8px 15px',
                backgroundColor: isPlaying ? '#ff9800' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {isLoading ? '⏳' : isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            
            <button
              onClick={stopAudio}
              style={{
                padding: '8px 15px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ⏹️ Stop
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button
              onClick={isMemorizationPlaying ? stopMemorization : startMemorization}
              style={{
                padding: '8px 15px',
                backgroundColor: isMemorizationPlaying ? '#f44336' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isMemorizationPlaying ? '⏹️ Stop Memorization' : '🧠 Start Memorization'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input
            type="checkbox"
            checked={memorizationMode}
            onChange={toggleMemorizationMode}
          />
          Memorization Mode
        </label>
      </div>

      {memorizationMode && (
        <div className="memorization-settings" style={{
          padding: '15px',
          borderRadius: '6px',
          marginTop: '10px'
        }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Memorization Settings</h5>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Words per chunk:
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Repeat each chunk:
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={repeatCount}
                onChange={(e) => setRepeatCount(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Pause duration (seconds):
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={pauseDuration}
                onChange={(e) => setPauseDuration(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
            </div>
          </div>

          {chunks.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h6 style={{ margin: '0 0 10px 0' }}>Preview Chunks ({chunks.length} total):</h6>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {chunks.map((chunk, index) => (
                  <div
                    key={index}
                    className={`memorization-chunk ${currentChunk === index && isMemorizationPlaying ? 'active' : ''}`}
                    style={{
                      padding: '8px',
                      margin: '5px 0',
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      direction: 'rtl',
                      fontSize: '16px'
                    }}
                  >
                    <strong>Chunk {index + 1}:</strong> {chunk}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          color: '#d32f2f',
          marginTop: '10px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default QuranAudioPlayer;