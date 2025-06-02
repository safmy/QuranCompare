import React, { useState, useRef, useEffect } from 'react';
import { getAbsoluteVerseNumber, getVerseAudioUrl } from '../utils/verseMapping';

const QuranAudioPlayerSimple = ({ 
  verseReference, 
  arabicText, 
  onMemorizationModeChange = () => {}
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [memorizationMode, setMemorizationMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [loopCount, setLoopCount] = useState(5);
  const [pauseBetweenLoops, setPauseBetweenLoops] = useState(3);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef(null);
  const loopIntervalRef = useRef(null);
  const loopCountRef = useRef(0);
  const isLoopingRef = useRef(false);

  // Initialize audio on component mount
  useEffect(() => {
    const audioUrl = getVerseAudioUrl(verseReference);
    if (!audioUrl) {
      setError('Invalid verse reference');
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setAudioLoaded(true);
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    // Handle audio ended event
    const handleAudioEnded = () => {
      if (isLoopingRef.current) {
        // Handle looping mode
        if (loopCountRef.current < loopCount) {
          setTimeout(() => {
            loopCountRef.current++;
            setCurrentLoop(loopCountRef.current);
            console.log(`Starting loop ${loopCountRef.current} of ${loopCount}`);
            audio.currentTime = 0;
            audio.play().catch((err) => {
              console.error('Error playing loop:', err);
              stopLooping();
            });
          }, pauseBetweenLoops * 1000);
        } else {
          console.log('All loops completed');
          stopLooping();
        }
      } else {
        // Normal playback mode
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleAudioEnded);

    audio.addEventListener('error', () => {
      setError('Failed to load audio');
      setIsLoading(false);
      setAudioLoaded(false);
    });

    // Preload the audio
    audio.load();

    return () => {
      if (loopIntervalRef.current) {
        clearInterval(loopIntervalRef.current);
      }
      audio.removeEventListener('ended', handleAudioEnded);
      audio.pause();
      audio.remove();
    };
  }, [verseReference, loopCount, pauseBetweenLoops]);

  const playAudio = async () => {
    if (!audioRef.current || !audioLoaded) {
      setError('Audio not loaded yet. Please wait...');
      return;
    }

    try {
      audioRef.current.playbackRate = playbackSpeed;
      await audioRef.current.play();
      setIsPlaying(true);
      setError('');
    } catch (err) {
      setError('Failed to play audio');
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
      setCurrentTime(0);
    }
    stopLooping();
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
    if (!audioRef.current || !audioLoaded) {
      setError('Audio not loaded yet. Please wait...');
      return;
    }

    console.log(`Starting memorization mode: ${loopCount} loops with ${pauseBetweenLoops}s pause`);
    
    // Initialize loop state
    setIsLooping(true);
    isLoopingRef.current = true;
    setCurrentLoop(1);
    loopCountRef.current = 1;
    
    // Reset and start playing
    audioRef.current.currentTime = 0;
    audioRef.current.playbackRate = playbackSpeed;
    
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setError('');
    } catch (err) {
      console.error('Failed to start looping:', err);
      setError('Failed to start loop');
      stopLooping();
    }
  };

  const stopLooping = () => {
    console.log('Stopping memorization mode');
    setIsLooping(false);
    isLoopingRef.current = false;
    setCurrentLoop(0);
    loopCountRef.current = 0;
    
    if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
    
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getArabicWordGroups = () => {
    if (!arabicText) return [];
    const words = arabicText.split(/\s+/);
    const groups = [];
    const groupSize = 3; // 3-4 words per group
    
    for (let i = 0; i < words.length; i += groupSize) {
      groups.push(words.slice(i, i + groupSize).join(' '));
    }
    
    return groups;
  };

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
        
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {!memorizationMode ? (
            <>
              <button
                onClick={() => isPlaying ? pauseAudio() : playAudio()}
                disabled={!audioLoaded}
                style={{
                  padding: '8px 15px',
                  backgroundColor: !audioLoaded ? '#ccc' : (isPlaying ? '#ff9800' : '#7c3aed'),
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: !audioLoaded ? 'not-allowed' : 'pointer'
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
              disabled={!audioLoaded}
              style={{
                padding: '8px 15px',
                backgroundColor: !audioLoaded ? '#ccc' : (isLooping ? '#f44336' : '#2196F3'),
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: !audioLoaded ? 'not-allowed' : 'pointer'
              }}
            >
              {!audioLoaded ? '⏳ Loading...' : (isLooping ? '⏹️ Stop Loop' : '🔁 Start Loop')}
            </button>
          )}
        </div>
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
              {loopCount > 50 && (
                <div style={{ fontSize: '11px', color: '#ff9800', marginTop: '3px' }}>
                  ⚠️ High repeat count: {loopCount} loops will take approximately {Math.round(loopCount * (duration + pauseBetweenLoops) / 60)} minutes
                </div>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Pause between repeats (seconds):
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
                {loopCount - currentLoop} repetitions remaining 
                {pauseBetweenLoops > 0 && ` • ${pauseBetweenLoops}s pause between loops`}
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
          
          <div style={{
            marginTop: '15px',
            padding: '15px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px'
          }}>
            <h6 style={{ margin: '0 0 10px 0', color: '#333' }}>Verse Word Groups:</h6>
            <div style={{ direction: 'rtl', fontSize: '16px', lineHeight: '1.8' }}>
              {getArabicWordGroups().map((group, index) => (
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

export default QuranAudioPlayerSimple;