import React, { useState, useRef, useEffect } from 'react';
import { getAbsoluteVerseNumber, getVerseAudioUrl } from '../utils/verseMapping';

const QuranAudioPlayerV3 = ({ 
  verseReference, 
  arabicText, 
  onMemorizationModeChange = () => {}
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [memorizationMode, setMemorizationMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [loopCount, setLoopCount] = useState(3);
  const [pauseBetweenLoops, setPauseBetweenLoops] = useState(2);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [segmentMode, setSegmentMode] = useState(false);
  
  const audioRef = useRef(null);
  const loopTimeoutRef = useRef(null);
  const loopCountRef = useRef(0);

  const playAudio = async (options = {}) => {
    const { onEnded, segment = false } = options;
    const audioUrl = getVerseAudioUrl(verseReference);
    if (!audioUrl) {
      setError('Invalid verse reference');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!audioRef.current || audioRef.current.src !== audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(audioUrl);
      }

      audioRef.current.playbackRate = playbackSpeed;
      
      if (segment && startTime < endTime) {
        audioRef.current.currentTime = startTime;
      } else {
        audioRef.current.currentTime = 0;
      }
      
      audioRef.current.onloadstart = () => setIsLoading(true);
      audioRef.current.oncanplay = () => setIsLoading(false);
      
      audioRef.current.ontimeupdate = () => {
        if (segment && endTime > 0 && audioRef.current.currentTime >= endTime) {
          audioRef.current.pause();
          if (onEnded) onEnded();
        }
      };
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
        if (!segment && onEnded) onEnded();
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
    stopLooping();
  };

  const toggleMemorizationMode = () => {
    const newMode = !memorizationMode;
    setMemorizationMode(newMode);
    onMemorizationModeChange(newMode);
    
    if (!newMode) {
      stopLooping();
      setSegmentMode(false);
    }
  };

  const startLooping = () => {
    setIsLooping(true);
    setCurrentLoop(1);
    loopCountRef.current = 0;
    
    const playLoop = () => {
      if (!loopCountRef.current || loopCountRef.current >= loopCount) {
        stopLooping();
        return;
      }

      setCurrentLoop(loopCountRef.current + 1);
      
      playAudio({
        segment: segmentMode,
        onEnded: () => {
          loopCountRef.current++;
          
          if (loopCountRef.current < loopCount) {
            loopTimeoutRef.current = setTimeout(() => {
              playLoop();
            }, pauseBetweenLoops * 1000);
          } else {
            stopLooping();
          }
        }
      });
    };

    loopCountRef.current = 0;
    playLoop();
  };

  const stopLooping = () => {
    setIsLooping(false);
    setCurrentLoop(0);
    loopCountRef.current = 0;
    
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const setSegment = () => {
    if (audioRef.current && audioRef.current.duration) {
      const duration = audioRef.current.duration;
      const currentPos = audioRef.current.currentTime;
      
      if (!segmentMode) {
        // Set start time
        setStartTime(currentPos);
        setEndTime(duration);
        setSegmentMode(true);
      } else if (startTime >= 0 && endTime === audioRef.current.duration) {
        // Set end time
        setEndTime(currentPos > startTime ? currentPos : startTime + 1);
      } else {
        // Reset
        setStartTime(0);
        setEndTime(0);
        setSegmentMode(false);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      stopLooping();
    };
  }, []);

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
              onClick={isLooping ? stopLooping : startLooping}
              style={{
                padding: '8px 15px',
                backgroundColor: isLooping ? '#f44336' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {isLooping ? '⏹️ Stop Loop' : '🔁 Start Loop'}
            </button>
            
            {audioRef.current && (
              <button
                onClick={setSegment}
                style={{
                  padding: '8px 15px',
                  backgroundColor: segmentMode ? '#ff9800' : '#9c27b0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {!segmentMode ? '✂️ Set Start' : 
                 endTime === audioRef.current?.duration ? '✂️ Set End' : '❌ Clear'}
              </button>
            )}
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
                Playback Speed:
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
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
                Loop Count:
              </label>
              <input
                type="number"
                min="1"
                max="20"
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
                max="10"
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

          {segmentMode && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#f3e5f5',
              borderRadius: '4px'
            }}>
              <strong>Segment Selected:</strong> {formatTime(startTime)} - {formatTime(endTime)}
              <br />
              <small>Play the audio and click "Set Start" at the beginning of the phrase you want to memorize, 
              then click "Set End" at the end. The loop will only play this segment.</small>
            </div>
          )}
          
          {isLooping && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#e3f2fd',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, color: '#1976d2', fontWeight: 'bold' }}>
                Loop {currentLoop} of {loopCount}
              </p>
            </div>
          )}
          
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#e8f5e9',
            borderRadius: '4px'
          }}>
            <h6 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>How to use:</h6>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
              <li>Adjust playback speed to your comfort level</li>
              <li>Set loop count for repetitions</li>
              <li>For specific phrases: Play audio, click "Set Start" at beginning, "Set End" at end</li>
              <li>Click "Start Loop" to begin memorization</li>
            </ol>
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

export default QuranAudioPlayerV3;