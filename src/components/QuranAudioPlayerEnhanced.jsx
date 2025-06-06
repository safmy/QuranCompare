import React, { useState, useRef, useEffect } from 'react';
import { getAbsoluteVerseNumber, getVerseAudioUrl, getAllVerseAudioUrls } from '../utils/verseMapping';

const QuranAudioPlayerEnhanced = ({ 
  verseReferences = [], // Array of verse references like ["2:255", "2:256", "2:257"]
  arabicTexts = [], // Array of Arabic texts corresponding to each verse
  defaultMemorizationMode = false,
  onMemorizationModeChange = () => {}
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [memorizationMode, setMemorizationMode] = useState(defaultMemorizationMode);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [loopCount, setLoopCount] = useState(5);
  const [pauseBetweenLoops, setPauseBetweenLoops] = useState(3);
  const [pauseBetweenVerses, setPauseBetweenVerses] = useState(2);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedVerses, setSelectedVerses] = useState(new Set());
  const [playMode, setPlayMode] = useState('sequential'); // 'sequential' or 'selected'
  
  const audioRef = useRef(null);
  const audioQueue = useRef([]);
  const loopCountRef = useRef(0);
  const isLoopingRef = useRef(false);
  const currentVerseIndexRef = useRef(0);

  // Initialize audio queue when verse references change
  useEffect(() => {
    if (verseReferences.length > 0) {
      // Reset audio queue
      audioQueue.current = verseReferences.map(ref => ({
        reference: ref,
        audio: null
      }));
      
      // Reset states
      setAudioLoaded(false);
      setIsLoading(false);
      setIsPlaying(false);
      setError('');
      
      console.log(`Audio queue initialized with ${verseReferences.length} verses:`, verseReferences);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [verseReferences]);

  const loadAudio = async (index, providerIndex = 0) => {
    if (index >= audioQueue.current.length) return false;
    
    const audioData = audioQueue.current[index];
    const audioUrls = getAllVerseAudioUrls(audioData.reference, 64);
    
    if (!audioUrls.length) {
      setError(`Invalid verse reference: ${audioData.reference}`);
      return false;
    }

    const tryLoadFromProvider = async (urlIndex) => {
      if (urlIndex >= audioUrls.length) {
        setError(`Failed to load audio for verse ${audioData.reference} - all sources failed`);
        return false;
      }

      const audioUrl = audioUrls[urlIndex];
      console.log(`Trying to load ${audioData.reference} from provider ${urlIndex + 1}: ${audioUrl}`);

      return new Promise((resolve) => {
        const audio = new Audio(audioUrl);
        let resolved = false;
        
        const handleLoadSuccess = () => {
          if (resolved) return;
          resolved = true;
          
          console.log(`Successfully loaded audio for ${audioData.reference} from provider ${urlIndex + 1}`);
          
          // Clean up listeners
          audio.removeEventListener('loadeddata', handleLoadSuccess);
          audio.removeEventListener('error', handleLoadError);
          
          // Store the audio
          audioQueue.current[index].audio = audio;
          
          // Set up event listeners
          audio.addEventListener('loadedmetadata', () => {
            setAudioLoaded(true);
            setDuration(audio.duration);
          });

          audio.addEventListener('timeupdate', () => {
            setCurrentTime(audio.currentTime);
          });

          audio.addEventListener('ended', handleAudioEnded);
          
          resolve(true);
        };
        
        const handleLoadError = async () => {
          if (resolved) return;
          resolved = true;
          
          console.log(`Failed to load audio for ${audioData.reference} from provider ${urlIndex + 1}`);
          
          // Clean up listeners
          audio.removeEventListener('loadeddata', handleLoadSuccess);
          audio.removeEventListener('error', handleLoadError);
          
          // Try next provider
          const success = await tryLoadFromProvider(urlIndex + 1);
          resolve(success);
        };
        
        // Set up loading timeout
        const timeout = setTimeout(() => {
          if (!resolved) {
            console.log(`Timeout loading audio for ${audioData.reference} from provider ${urlIndex + 1}`);
            handleLoadError();
          }
        }, 5000); // 5 second timeout
        
        audio.addEventListener('loadeddata', handleLoadSuccess);
        audio.addEventListener('error', handleLoadError);
        
        // Clear timeout on success
        audio.addEventListener('loadeddata', () => clearTimeout(timeout));
        
        // Start loading
        audio.load();
      });
    };

    return await tryLoadFromProvider(providerIndex);
  };

  const handleAudioEnded = () => {
    const versesToPlay = playMode === 'selected' && selectedVerses.size > 0 
      ? Array.from(selectedVerses).sort((a, b) => a - b)
      : [...Array(verseReferences.length).keys()];

    if (isLoopingRef.current) {
      // In memorization mode
      if (currentVerseIndexRef.current < versesToPlay.length - 1) {
        // Move to next verse after pause
        setTimeout(() => {
          currentVerseIndexRef.current++;
          setCurrentVerseIndex(currentVerseIndexRef.current);
          const nextIndex = versesToPlay[currentVerseIndexRef.current];
          console.log(`Playing next verse in chain: index ${nextIndex}, verse ${verseReferences[nextIndex]}`);
          playVerseAtIndex(nextIndex);
        }, pauseBetweenVerses * 1000);
      } else {
        // All verses played, check if we need to loop
        if (loopCountRef.current < loopCount) {
          setTimeout(() => {
            loopCountRef.current++;
            setCurrentLoop(loopCountRef.current);
            currentVerseIndexRef.current = 0;
            setCurrentVerseIndex(0);
            const firstIndex = versesToPlay[0];
            console.log(`Starting new loop ${loopCountRef.current}, playing verse ${verseReferences[firstIndex]}`);
            playVerseAtIndex(firstIndex);
          }, pauseBetweenLoops * 1000);
        } else {
          // All loops completed
          console.log('All loops completed');
          stopLooping();
        }
      }
    } else {
      // Normal playback mode
      if (currentVerseIndexRef.current < versesToPlay.length - 1) {
        // Play next verse after pause
        setTimeout(() => {
          currentVerseIndexRef.current++;
          setCurrentVerseIndex(currentVerseIndexRef.current);
          const nextIndex = versesToPlay[currentVerseIndexRef.current];
          console.log(`Playing next verse: index ${nextIndex}, verse ${verseReferences[nextIndex]}`);
          playVerseAtIndex(nextIndex);
        }, pauseBetweenVerses * 1000);
      } else {
        // All verses played
        setIsPlaying(false);
        currentVerseIndexRef.current = 0;
        setCurrentVerseIndex(0);
      }
    }
  };

  const playVerseAtIndex = async (index) => {
    if (index >= verseReferences.length) {
      console.error(`Invalid verse index: ${index}, total verses: ${verseReferences.length}`);
      setError(`Invalid verse index: ${index}`);
      return;
    }
    
    console.log(`Playing verse at index ${index}: ${verseReferences[index]}`);
    setIsLoading(true);
    setError('');
    
    // Simple direct audio creation
    const verseRef = verseReferences[index];
    const audioUrls = getAllVerseAudioUrls(verseRef, 64);
    
    if (!audioUrls.length) {
      setError(`No audio URLs found for ${verseRef}`);
      setIsLoading(false);
      return;
    }
    
    // Try each audio URL until one works
    for (let i = 0; i < audioUrls.length; i++) {
      try {
        const audio = new Audio(audioUrls[i]);
        console.log(`Trying audio URL ${i + 1} for ${verseRef}: ${audioUrls[i]}`);
        
        // Wait for audio to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          
          audio.addEventListener('loadeddata', () => {
            clearTimeout(timeout);
            resolve();
          });
          
          audio.addEventListener('error', () => {
            clearTimeout(timeout);
            reject(new Error('Audio load error'));
          });
          
          audio.load();
        });
        
        // Audio loaded successfully
        audioRef.current = audio;
        audioQueue.current[index].audio = audio;
        audio.playbackRate = playbackSpeed;
        
        // Set up event listeners
        audio.addEventListener('loadedmetadata', () => {
          setAudioLoaded(true);
          setDuration(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });

        audio.addEventListener('ended', handleAudioEnded);
        
        setIsLoading(false);
        await audio.play();
        setIsPlaying(true);
        setError('');
        console.log(`Successfully playing verse ${verseReferences[index]}`);
        return; // Success - exit the loop
        
      } catch (error) {
        console.log(`Failed to load audio from source ${i + 1}: ${error.message}`);
        // Continue to next URL
      }
    }
    
    // If we get here, all URLs failed
    setError(`Failed to load audio for ${verseRef} from all sources`);
    setIsLoading(false);
  };

  const playAudio = async () => {
    const versesToPlay = playMode === 'selected' && selectedVerses.size > 0 
      ? Array.from(selectedVerses).sort((a, b) => a - b)
      : [...Array(verseReferences.length).keys()];
    
    if (versesToPlay.length === 0) {
      setError('No verses selected to play');
      return;
    }
    
    currentVerseIndexRef.current = 0;
    setCurrentVerseIndex(0);
    const firstIndex = versesToPlay[0];
    console.log(`Starting playback with verse ${verseReferences[firstIndex]}`);
    await playVerseAtIndex(firstIndex);
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
      setCurrentTime(0);
    }
    stopLooping();
    currentVerseIndexRef.current = 0;
    setCurrentVerseIndex(0);
  };

  const toggleMemorizationMode = () => {
    const newMode = !memorizationMode;
    setMemorizationMode(newMode);
    onMemorizationModeChange(newMode);
    
    if (!newMode) {
      stopLooping();
    }
  };

  const startLooping = async () => {
    const versesToPlay = playMode === 'selected' && selectedVerses.size > 0 
      ? Array.from(selectedVerses).sort((a, b) => a - b)
      : [...Array(verseReferences.length).keys()];
    
    if (versesToPlay.length === 0) {
      setError('No verses selected for memorization');
      return;
    }
    
    console.log(`Starting memorization mode: ${loopCount} loops with ${pauseBetweenLoops}s pause between loops, ${pauseBetweenVerses}s between verses`);
    
    // Initialize loop state
    setIsLooping(true);
    isLoopingRef.current = true;
    setCurrentLoop(1);
    loopCountRef.current = 1;
    currentVerseIndexRef.current = 0;
    setCurrentVerseIndex(0);
    
    // Start playing first verse
    await playVerseAtIndex(versesToPlay[0]);
  };

  const stopLooping = () => {
    console.log('Stopping memorization mode');
    setIsLooping(false);
    isLoopingRef.current = false;
    setCurrentLoop(0);
    loopCountRef.current = 0;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const toggleVerseSelection = (index) => {
    const newSelected = new Set(selectedVerses);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVerses(newSelected);
  };

  const selectAllVerses = () => {
    setSelectedVerses(new Set([...Array(verseReferences.length).keys()]));
  };

  const deselectAllVerses = () => {
    setSelectedVerses(new Set());
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getArabicWordGroups = (arabicText) => {
    if (!arabicText) return [];
    const words = arabicText.split(/\s+/);
    const groups = [];
    const groupSize = 3; // 3-4 words per group
    
    for (let i = 0; i < words.length; i += groupSize) {
      groups.push(words.slice(i, i + groupSize).join(' '));
    }
    
    return groups;
  };

  const getVersesToPlay = () => {
    if (playMode === 'selected' && selectedVerses.size > 0) {
      return Array.from(selectedVerses).sort((a, b) => a - b);
    }
    return [...Array(verseReferences.length).keys()];
  };

  const currentPlayingVerseIndex = playMode === 'selected' && selectedVerses.size > 0
    ? Array.from(selectedVerses).sort((a, b) => a - b)[currentVerseIndex]
    : currentVerseIndex;

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
          Enhanced Audio Player
        </h4>
        
        {verseReferences.length > 1 && (
          <div style={{ 
            marginLeft: 'auto',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="radio"
                name="playMode"
                value="sequential"
                checked={playMode === 'sequential'}
                onChange={(e) => setPlayMode(e.target.value)}
              />
              Play All
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="radio"
                name="playMode"
                value="selected"
                checked={playMode === 'selected'}
                onChange={(e) => setPlayMode(e.target.value)}
              />
              Play Selected
            </label>
          </div>
        )}
      </div>

      {/* Verse Selection UI */}
      {verseReferences.length > 1 && (
        <div style={{
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '6px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h5 style={{ margin: 0 }}>Select Verses to Play</h5>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={selectAllVerses}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Select All
              </button>
              <button
                onClick={deselectAllVerses}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '5px'
          }}>
            {verseReferences.map((ref, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px',
                  backgroundColor: currentPlayingVerseIndex === index ? '#e3f2fd' : 
                                 selectedVerses.has(index) ? '#c8e6c9' : 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedVerses.has(index)}
                  onChange={() => toggleVerseSelection(index)}
                  style={{ marginRight: '5px' }}
                />
                <span style={{ 
                  fontSize: '14px',
                  fontWeight: currentPlayingVerseIndex === index ? 'bold' : 'normal'
                }}>
                  {ref}
                </span>
              </label>
            ))}
          </div>
          
          {playMode === 'selected' && selectedVerses.size === 0 && (
            <p style={{ 
              color: '#ff9800', 
              fontSize: '12px', 
              marginTop: '10px',
              textAlign: 'center'
            }}>
              Please select at least one verse to play
            </p>
          )}
        </div>
      )}

      {/* Currently Playing Indicator */}
      {isPlaying && verseReferences.length > 0 && (
        <div style={{
          padding: '10px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, color: '#1976d2', fontWeight: 'bold' }}>
            Now Playing: {verseReferences[currentPlayingVerseIndex]}
            {isLooping && ` (Loop ${currentLoop}/${loopCount})`}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginBottom: '10px' }}>
        {!memorizationMode ? (
          <>
            <button
              onClick={() => isPlaying ? pauseAudio() : playAudio()}
              disabled={!audioLoaded || (playMode === 'selected' && selectedVerses.size === 0)}
              style={{
                padding: '8px 15px',
                backgroundColor: !audioLoaded || (playMode === 'selected' && selectedVerses.size === 0) ? '#ccc' : (isPlaying ? '#ff9800' : '#7c3aed'),
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !audioLoaded || (playMode === 'selected' && selectedVerses.size === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {!audioLoaded ? '⏳ Loading...' : (isPlaying ? '⏸️ Pause' : '▶️ Play')}
            </button>
            
            <button
              onClick={stopAudio}
              disabled={!audioLoaded}
              style={{
                padding: '8px 15px',
                backgroundColor: !audioLoaded ? '#ccc' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !audioLoaded ? 'not-allowed' : 'pointer'
              }}
            >
              ⏹️ Stop
            </button>
          </>
        ) : (
          <button
            onClick={isLooping ? stopLooping : startLooping}
            disabled={!audioLoaded || (playMode === 'selected' && selectedVerses.size === 0)}
            style={{
              padding: '8px 15px',
              backgroundColor: !audioLoaded || (playMode === 'selected' && selectedVerses.size === 0) ? '#ccc' : (isLooping ? '#f44336' : '#2196F3'),
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !audioLoaded || (playMode === 'selected' && selectedVerses.size === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            {!audioLoaded ? '⏳ Loading...' : (isLooping ? '⏹️ Stop Loop' : '🔁 Start Loop')}
          </button>
        )}
      </div>

      {audioLoaded && duration > 0 && (
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginBottom: '10px' 
        }}>
          Duration: {formatTime(duration)} | Current: {formatTime(currentTime)}
        </div>
      )}

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
                Playback Speed:
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                disabled={isLooping}
                style={{
                  width: '100%',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              >
                <option value="0.5">0.5x (Very Slow)</option>
                <option value="0.75">0.75x (Slow)</option>
                <option value="1.0">1.0x (Normal)</option>
                <option value="1.25">1.25x (Fast)</option>
                <option value="1.5">1.5x (Very Fast)</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Repeat Count:
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={loopCount}
                onChange={(e) => setLoopCount(parseInt(e.target.value) || 1)}
                disabled={isLooping}
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
                Pause between loops (seconds):
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={pauseBetweenLoops}
                onChange={(e) => setPauseBetweenLoops(parseInt(e.target.value) || 0)}
                disabled={isLooping}
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
                Pause between verses (seconds):
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={pauseBetweenVerses}
                onChange={(e) => setPauseBetweenVerses(parseInt(e.target.value) || 0)}
                disabled={isLooping}
                style={{
                  width: '100%',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
            </div>
          </div>
          
          {isLooping && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e3f2fd',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, color: '#1976d2', fontWeight: 'bold' }}>
                🔄 Memorization Mode: Loop {currentLoop} of {loopCount}
              </p>
              <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '12px' }}>
                Playing verse {currentVerseIndexRef.current + 1} of {getVersesToPlay().length} selected verses
                {pauseBetweenLoops > 0 && ` • ${pauseBetweenLoops}s pause between loops`}
                {pauseBetweenVerses > 0 && ` • ${pauseBetweenVerses}s pause between verses`}
              </p>
              <div style={{
                marginTop: '10px',
                height: '4px',
                backgroundColor: '#e0e0e0',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: '#2196F3',
                  width: `${(currentLoop / loopCount) * 100}%`,
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          )}
          
          {/* Arabic Text Display for Current Verse */}
          {arabicTexts[currentPlayingVerseIndex] && (
            <div style={{
              marginTop: '15px',
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}>
              <h6 style={{ margin: '0 0 10px 0', color: '#333' }}>
                Current Verse ({verseReferences[currentPlayingVerseIndex]}):
              </h6>
              <div style={{ 
                direction: 'rtl', 
                fontSize: '24px', 
                lineHeight: '1.8',
                textAlign: 'center',
                marginBottom: '15px'
              }}>
                {arabicTexts[currentPlayingVerseIndex]}
              </div>
              
              <h6 style={{ margin: '15px 0 10px 0', color: '#333' }}>Word Groups:</h6>
              <div style={{ direction: 'rtl', fontSize: '16px', lineHeight: '1.8' }}>
                {getArabicWordGroups(arabicTexts[currentPlayingVerseIndex]).map((group, index) => (
                  <div key={index} style={{
                    display: 'inline-block',
                    padding: '5px 10px',
                    margin: '3px',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}>
                    <strong style={{ fontSize: '12px', color: '#666' }}>{index + 1}.</strong> {group}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: 0 }}>
                Practice by repeating these word groups along with the audio
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

export default QuranAudioPlayerEnhanced;