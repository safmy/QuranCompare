import React, { useState, useRef, useCallback } from 'react';
import { checkPremiumAccess, PREMIUM_FEATURES } from '../config/premium';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

const ChunkAudioPlayerBackend = ({ arabicText, chunkIndex, onUnauthorized, repeatCount = 3, pauseBetweenRepeats = 1 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [isRepeating, setIsRepeating] = useState(false);
  const repeatCountRef = useRef(0);
  const isRepeatingRef = useRef(false);

  const generateAndPlayAudio = useCallback(async () => {
    // Temporarily disable premium gating due to low user count
    // if (!checkPremiumAccess(PREMIUM_FEATURES.CHUNK_AUDIO)) {
    //   if (onUnauthorized) {
    //     onUnauthorized();
    //   }
    //   setError('Premium feature - Upgrade to access chunk audio');
    //   return;
    // }

    setIsLoading(true);
    setError(null);

    try {
      // Call backend API to generate TTS
      console.log('Calling TTS API:', `${API_BASE_URL}/generate-tts`);
      console.log('Text to generate:', arabicText);
      console.log('API_BASE_URL:', API_BASE_URL);
      
      const requestBody = {
        text: arabicText,
        voice: 'onyx',
        speed: 0.8
      };
      console.log('Request body:', requestBody);
      
      const response = await fetch(`${API_BASE_URL}/generate-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('TTS Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS Error response:', errorText);
        console.error('Response headers:', response.headers);
        throw new Error(`Failed to generate audio: ${response.status} - ${errorText}`);
      }

      // Check if response is actually audio content
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      if (!contentType || !contentType.includes('audio')) {
        console.error('Unexpected content type:', contentType);
        const responseText = await response.text();
        console.error('Response body:', responseText);
        throw new Error('Expected audio response but got: ' + contentType);
      }

      // Get audio blob from response
      console.log('Creating audio blob from response...');
      const audioBlob = await response.blob();
      console.log('Audio blob created, size:', audioBlob.size, 'type:', audioBlob.type);
      
      const url = URL.createObjectURL(audioBlob);
      console.log('Audio URL created:', url);
      setAudioUrl(url);

      // Create and play audio
      const audio = new Audio();
      audioRef.current = audio;

      audio.addEventListener('loadeddata', () => {
        console.log('Audio data loaded, duration:', audio.duration);
      });

      audio.addEventListener('ended', () => {
        console.log('Audio playback ended');
        if (isRepeatingRef.current && repeatCountRef.current < repeatCount) {
          // Continue repeating
          setTimeout(() => {
            repeatCountRef.current++;
            setCurrentRepeat(repeatCountRef.current);
            console.log(`Starting repeat ${repeatCountRef.current} of ${repeatCount}`);
            audio.currentTime = 0;
            audio.play().catch((err) => {
              console.error('Error playing repeat:', err);
              stopRepeating();
            });
          }, pauseBetweenRepeats * 1000);
        } else {
          // Finished all repeats or not repeating
          console.log('All repeats completed or single play finished');
          stopRepeating();
        }
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        console.error('Audio error code:', audio.error?.code);
        console.error('Audio error message:', audio.error?.message);
        setError('Failed to play audio');
        setIsPlaying(false);
        setIsLoading(false);
      });

      audio.addEventListener('canplay', async () => {
        console.log('Audio can play, attempting to start playback...');
        try {
          await audio.play();
          console.log('Audio playback started successfully');
          setIsPlaying(true);
          setIsLoading(false);
          
          // If this was triggered by generateAndPlayAudio and we want to repeat
          if (isRepeatingRef.current && repeatCountRef.current === 0) {
            repeatCountRef.current = 1;
            setCurrentRepeat(1);
          }
        } catch (playError) {
          console.error('Play error:', playError);
          setError('Failed to start playback: ' + playError.message);
          setIsLoading(false);
        }
      });

      // Set the audio source
      console.log('Setting audio source...');
      audio.src = url;
      audio.load();
    } catch (err) {
      console.error('TTS generation error:', err);
      console.error('Error details:', err.message);
      setError(err.message || 'Failed to generate audio');
      setIsLoading(false);
    }
  }, [arabicText, onUnauthorized]);

  const startRepeating = async () => {
    console.log(`Starting chunk repeat: ${repeatCount} repeats with ${pauseBetweenRepeats}s pause`);
    setIsRepeating(true);
    isRepeatingRef.current = true;
    setCurrentRepeat(1);
    repeatCountRef.current = 1;
    
    if (audioUrl && audioRef.current) {
      // Use existing audio
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Repeat playback error:', err);
        setError('Failed to start repeat');
        stopRepeating();
      }
    } else {
      // Generate new audio and start repeating
      await generateAndPlayAudio();
    }
  };

  const stopRepeating = () => {
    console.log('Stopping chunk repeat');
    setIsRepeating(false);
    isRepeatingRef.current = false;
    setCurrentRepeat(0);
    repeatCountRef.current = 0;
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const togglePlayback = async () => {
    if (isRepeating) {
      // Stop repeating
      stopRepeating();
    } else if (isPlaying && audioRef.current) {
      // Pause current playback
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (audioUrl && audioRef.current) {
      // Resume existing audio (single play)
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback error:', err);
        setError('Failed to play audio');
      }
    } else {
      // Generate new audio (single play)
      await generateAndPlayAudio();
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  return (
    <div 
      style={{
        display: 'inline-block',
        padding: '8px 12px',
        margin: '4px',
        backgroundColor: isPlaying ? '#e8f4fd' : '#f8f9fa',
        border: `2px solid ${error ? '#f44336' : isPlaying ? '#1976d2' : '#e0e0e0'}`,
        borderRadius: '8px',
        cursor: isLoading ? 'wait' : 'pointer',
        transition: 'all 0.3s ease',
        userSelect: 'none',
        position: 'relative'
      }}
      onClick={!isLoading && !error ? togglePlayback : undefined}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        direction: 'rtl'
      }}>
        <strong style={{ 
          fontSize: '14px', 
          color: '#666',
          position: 'absolute',
          left: '8px',
          top: '6px'
        }}>
          {chunkIndex}.
        </strong>
        
        <span style={{ 
          fontSize: '18px', 
          fontFamily: 'Arial, sans-serif',
          marginRight: '24px'
        }}>
          {arabicText}
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: isLoading ? 'wait' : 'pointer',
              padding: '0 2px',
              minWidth: '20px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isLoading && !error) {
                togglePlayback();
              }
            }}
            disabled={isLoading || !!error}
            title={isRepeating ? `Stop repeat (${currentRepeat}/${repeatCount})` : isPlaying ? 'Pause' : 'Play once'}
          >
            {isLoading ? '⏳' : error ? '❌' : (isRepeating ? '⏹️' : isPlaying ? '⏸️' : '🔊')}
          </button>
          
          <button
            style={{
              background: 'none',
              border: 'none',
              fontSize: '14px',
              cursor: isLoading ? 'wait' : 'pointer',
              padding: '0 2px',
              minWidth: '20px',
              opacity: isRepeating ? 1 : 0.7
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isLoading && !error && !isRepeating) {
                startRepeating();
              }
            }}
            disabled={isLoading || !!error || isRepeating}
            title={`Repeat ${repeatCount} times`}
          >
            🔁
          </button>
          
          {isRepeating && (
            <span style={{
              fontSize: '10px',
              color: '#2196F3',
              fontWeight: 'bold',
              minWidth: '20px'
            }}>
              {currentRepeat}/{repeatCount}
            </span>
          )}
        </div>
      </div>
      
      {error && (
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '11px',
          color: '#f44336',
          whiteSpace: 'nowrap',
          background: 'white',
          padding: '2px 6px',
          borderRadius: '3px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ChunkAudioPlayerBackend;