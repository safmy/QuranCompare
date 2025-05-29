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
  const [currentRepetition, setCurrentRepetition] = useState(0);
  const [isMemorizationPlaying, setIsMemorizationPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const memorizationTimeoutRef = useRef(null);
  const memorizationStateRef = useRef({ isPlaying: false, currentChunk: 0, currentRep: 0 });

  const playAudio = async (options = {}) => {
    const { onEnded } = options;
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
        if (onEnded) onEnded();
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

  const startMemorization = () => {
    const chunks = getArabicChunks();
    if (chunks.length === 0) return;

    setIsMemorizationPlaying(true);
    setCurrentChunk(0);
    setCurrentRepetition(1);
    memorizationStateRef.current = { isPlaying: true, currentChunk: 0, currentRep: 0 };
    
    const playNextSegment = () => {
      const state = memorizationStateRef.current;
      
      if (!state.isPlaying || state.currentChunk >= chunks.length) {
        stopMemorization();
        return;
      }

      setCurrentChunk(state.currentChunk);
      setCurrentRepetition(state.currentRep + 1);
      
      // Play the audio with custom onEnded handler
      playAudio({
        onEnded: () => {
          if (!memorizationStateRef.current.isPlaying) return;
          
          if (state.currentRep < repeatCount - 1) {
            // More repetitions for this chunk
            memorizationStateRef.current.currentRep = state.currentRep + 1;
            memorizationTimeoutRef.current = setTimeout(() => {
              playNextSegment();
            }, pauseDuration * 1000);
          } else {
            // Move to next chunk
            memorizationStateRef.current.currentChunk = state.currentChunk + 1;
            memorizationStateRef.current.currentRep = 0;
            memorizationTimeoutRef.current = setTimeout(() => {
              playNextSegment();
            }, pauseDuration * 1000);
          }
        }
      });
    };

    // Start playing immediately
    playNextSegment();
  };

  const stopMemorization = () => {
    memorizationStateRef.current.isPlaying = false;
    setIsMemorizationPlaying(false);
    setCurrentChunk(0);
    setCurrentRepetition(0);
    
    if (memorizationTimeoutRef.current) {
      clearTimeout(memorizationTimeoutRef.current);
      memorizationTimeoutRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
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
              onClick={() => isPlaying ? pauseAudio() : playAudio()}
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
                onChange={(e) => setChunkSize(parseInt(e.target.value) || 1)}
                disabled={isMemorizationPlaying}
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
                onChange={(e) => setRepeatCount(parseInt(e.target.value) || 1)}
                disabled={isMemorizationPlaying}
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
                onChange={(e) => setPauseDuration(parseInt(e.target.value) || 1)}
                disabled={isMemorizationPlaying}
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
                      fontSize: '16px',
                      position: 'relative'
                    }}
                  >
                    <strong>Chunk {index + 1}:</strong> {chunk}
                    {currentChunk === index && isMemorizationPlaying && (
                      <span style={{ 
                        position: 'absolute',
                        left: '10px',
                        top: '8px',
                        fontSize: '12px',
                        color: '#1976d2',
                        fontWeight: 'bold'
                      }}>
                        Rep {currentRepetition}/{repeatCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isMemorizationPlaying && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e3f2fd',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, color: '#1976d2', fontWeight: 'bold' }}>
                Memorization in progress... Chunk {currentChunk + 1} of {chunks.length}
              </p>
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