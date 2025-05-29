import React, { useState, useRef, useEffect } from 'react';

const QuranAudioPlayerV2 = ({ 
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
  const [pauseDuration, setPauseDuration] = useState(2);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [currentRepetition, setCurrentRepetition] = useState(0);
  const [isMemorizationPlaying, setIsMemorizationPlaying] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState(null);
  
  const audioRef = useRef(null);
  const wordAudiosRef = useRef([]);
  const memorizationTimeoutRef = useRef(null);
  const memorizationStateRef = useRef({ isPlaying: false, currentChunk: 0, currentRep: 0 });

  // Parse verse reference
  const parseReference = (ref) => {
    if (!ref) return null;
    const cleaned = ref.replace(/[[\]]/g, '');
    const parts = cleaned.split(':');
    if (parts.length !== 2) return null;
    return {
      surah: parseInt(parts[0]),
      ayah: parseInt(parts[1])
    };
  };

  // Get word-by-word audio URLs from Everyayah
  const getWordAudioUrls = (surah, ayah, wordCount) => {
    // Everyayah format: http://www.everyayah.com/data/Alafasy_128kbps/001002001.mp3
    // Format: SSSAAAWWW (Surah-Ayah-Word)
    const urls = [];
    const surahPadded = String(surah).padStart(3, '0');
    const ayahPadded = String(ayah).padStart(3, '0');
    
    for (let word = 1; word <= wordCount; word++) {
      const wordPadded = String(word).padStart(3, '0');
      const filename = `${surahPadded}${ayahPadded}${wordPadded}.mp3`;
      urls.push(`https://everyayah.com/data/Alafasy_128kbps/${filename}`);
    }
    
    return urls;
  };

  // Get full verse audio URL
  const getVerseAudioUrl = (surah, ayah) => {
    const surahPadded = String(surah).padStart(3, '0');
    const ayahPadded = String(ayah).padStart(3, '0');
    return `https://everyayah.com/data/Alafasy_128kbps/${surahPadded}${ayahPadded}.mp3`;
  };

  const playFullVerse = async () => {
    const parsed = parseReference(verseReference);
    if (!parsed) {
      setError('Invalid verse reference');
      return;
    }

    const audioUrl = getVerseAudioUrl(parsed.surah, parsed.ayah);
    
    setIsLoading(true);
    setError('');

    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onloadstart = () => setIsLoading(true);
      audioRef.current.oncanplay = () => setIsLoading(false);
      audioRef.current.onended = () => setIsPlaying(false);
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
    // Also pause word audios
    wordAudiosRef.current.forEach(audio => {
      if (audio) audio.pause();
    });
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
    wordAudiosRef.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    stopMemorization();
  };

  const toggleMemorizationMode = () => {
    const newMode = !memorizationMode;
    setMemorizationMode(newMode);
    onMemorizationModeChange(newMode);
    
    if (!newMode) {
      stopMemorization();
      setSelectedChunk(null);
    }
  };

  const getArabicChunks = () => {
    if (!arabicText) return [];
    const words = arabicText.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push({
        words: words.slice(i, i + chunkSize),
        startIndex: i,
        endIndex: Math.min(i + chunkSize - 1, words.length - 1)
      });
    }
    
    return chunks;
  };

  const playWordSequence = async (words, startIndex) => {
    const parsed = parseReference(verseReference);
    if (!parsed) return;

    // Clear previous word audios
    wordAudiosRef.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.remove();
      }
    });
    wordAudiosRef.current = [];

    for (let i = 0; i < words.length; i++) {
      const wordIndex = startIndex + i + 1; // 1-based index
      const audio = new Audio();
      
      // Try word-by-word first
      const surahPadded = String(parsed.surah).padStart(3, '0');
      const ayahPadded = String(parsed.ayah).padStart(3, '0');
      const wordPadded = String(wordIndex).padStart(3, '0');
      audio.src = `https://everyayah.com/data/Alafasy_128kbps/${surahPadded}${ayahPadded}${wordPadded}.mp3`;
      
      wordAudiosRef.current.push(audio);
    }

    // Play words sequentially
    for (let i = 0; i < wordAudiosRef.current.length; i++) {
      if (!memorizationStateRef.current.isPlaying && memorizationMode) break;
      
      const audio = wordAudiosRef.current[i];
      try {
        await new Promise((resolve, reject) => {
          audio.onended = resolve;
          audio.onerror = () => {
            console.warn(`Word audio not available for word ${i + 1}`);
            resolve(); // Continue even if word audio fails
          };
          audio.play().catch(reject);
        });
        
        // Small pause between words
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error('Error playing word:', err);
      }
    }
  };

  const playChunk = async (chunkIndex) => {
    const chunks = getArabicChunks();
    if (chunkIndex >= chunks.length) return;

    const chunk = chunks[chunkIndex];
    setCurrentChunk(chunkIndex);
    
    try {
      await playWordSequence(chunk.words, chunk.startIndex);
    } catch (err) {
      console.error('Error playing chunk:', err);
      // Fallback to full verse
      await playFullVerse();
    }
  };

  const startMemorization = () => {
    const chunks = getArabicChunks();
    if (chunks.length === 0) return;

    const startChunk = selectedChunk !== null ? selectedChunk : 0;
    
    setIsMemorizationPlaying(true);
    setCurrentChunk(startChunk);
    setCurrentRepetition(1);
    memorizationStateRef.current = { isPlaying: true, currentChunk: startChunk, currentRep: 0 };
    
    const playNextSegment = async () => {
      const state = memorizationStateRef.current;
      
      if (!state.isPlaying || (selectedChunk === null && state.currentChunk >= chunks.length)) {
        stopMemorization();
        return;
      }

      setCurrentChunk(state.currentChunk);
      setCurrentRepetition(state.currentRep + 1);
      
      await playChunk(state.currentChunk);
      
      // Wait and decide next action
      memorizationTimeoutRef.current = setTimeout(() => {
        if (!memorizationStateRef.current.isPlaying) return;
        
        if (state.currentRep < repeatCount - 1) {
          // More repetitions for this chunk
          memorizationStateRef.current.currentRep = state.currentRep + 1;
          playNextSegment();
        } else if (selectedChunk === null) {
          // Move to next chunk only if not in single chunk mode
          memorizationStateRef.current.currentChunk = state.currentChunk + 1;
          memorizationStateRef.current.currentRep = 0;
          playNextSegment();
        } else {
          // Single chunk mode - restart
          memorizationStateRef.current.currentRep = 0;
          playNextSegment();
        }
      }, pauseDuration * 1000);
    };

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
    
    pauseAudio();
  };

  const selectChunk = (index) => {
    if (isMemorizationPlaying) {
      stopMemorization();
    }
    setSelectedChunk(index === selectedChunk ? null : index);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      wordAudiosRef.current.forEach(audio => {
        if (audio) audio.pause();
      });
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
              onClick={() => isPlaying ? pauseAudio() : playFullVerse()}
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
              {isMemorizationPlaying ? '⏹️ Stop' : '🧠 Start'} 
              {selectedChunk !== null ? ` Chunk ${selectedChunk + 1}` : ' All Chunks'}
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
          <h5 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
            Memorization Settings 
            {selectedChunk !== null && (
              <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
                {' '}— Selected: Chunk {selectedChunk + 1}
              </span>
            )}
          </h5>
          
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 15px 0' }}>
            Click on any chunk below to practice it individually, or leave unselected to practice all chunks.
          </p>
          
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
                onChange={(e) => {
                  setChunkSize(parseInt(e.target.value) || 1);
                  setSelectedChunk(null);
                }}
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
                max="10"
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
              <h6 style={{ margin: '0 0 10px 0' }}>
                Chunks ({chunks.length} total) - Click to select:
              </h6>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {chunks.map((chunk, index) => (
                  <div
                    key={index}
                    onClick={() => !isMemorizationPlaying && selectChunk(index)}
                    className={`memorization-chunk ${currentChunk === index && isMemorizationPlaying ? 'active' : ''}`}
                    style={{
                      padding: '10px',
                      margin: '5px 0',
                      backgroundColor: selectedChunk === index ? '#e3f2fd' : '#fff',
                      border: `2px solid ${selectedChunk === index ? '#2196F3' : '#ddd'}`,
                      borderRadius: '4px',
                      direction: 'rtl',
                      fontSize: '16px',
                      position: 'relative',
                      cursor: isMemorizationPlaying ? 'default' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <strong>Chunk {index + 1}:</strong> {chunk.words.join(' ')}
                    {currentChunk === index && isMemorizationPlaying && (
                      <span style={{ 
                        position: 'absolute',
                        left: '10px',
                        top: '10px',
                        fontSize: '12px',
                        color: '#1976d2',
                        fontWeight: 'bold'
                      }}>
                        Rep {currentRepetition}/{repeatCount}
                      </span>
                    )}
                    {selectedChunk === index && !isMemorizationPlaying && (
                      <span style={{ 
                        position: 'absolute',
                        left: '10px',
                        top: '10px',
                        fontSize: '12px',
                        color: '#2196F3',
                        fontWeight: 'bold'
                      }}>
                        ✓ Selected
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
                Memorization in progress... 
                {selectedChunk !== null 
                  ? `Chunk ${selectedChunk + 1} (Rep ${currentRepetition}/${repeatCount})`
                  : `Chunk ${currentChunk + 1} of ${chunks.length}`
                }
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
      
      <div style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        <strong>Note:</strong> This player attempts to use word-by-word audio when available. 
        If individual word audio is not available, it will play the full verse instead.
      </div>
    </div>
  );
};

export default QuranAudioPlayerV2;