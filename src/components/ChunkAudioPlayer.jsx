import React, { useState, useRef, useCallback } from 'react';
import OpenAI from 'openai';
import { checkPremiumAccess, PREMIUM_FEATURES, getOpenAIKey } from '../config/premium';

const ChunkAudioPlayer = ({ arabicText, chunkIndex, onUnauthorized }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const generateAndPlayAudio = useCallback(async () => {
    // Check premium access
    if (!checkPremiumAccess(PREMIUM_FEATURES.CHUNK_AUDIO)) {
      if (onUnauthorized) {
        onUnauthorized();
      }
      setError('Premium feature - Upgrade to access chunk audio');
      return;
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) {
      setError('OpenAI API key not configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Only for development
      });

      // Generate audio using OpenAI TTS
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "onyx", // Good for Arabic
        input: arabicText,
        speed: 0.8 // Slower for memorization
      });

      // Convert to blob and create URL
      const buffer = await mp3.arrayBuffer();
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Create and play audio
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setError('Failed to play audio');
        setIsPlaying(false);
        setIsLoading(false);
      });

      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err) {
      console.error('TTS generation error:', err);
      setError('Failed to generate audio');
      setIsLoading(false);
    }
  }, [arabicText, onUnauthorized]);

  const togglePlayback = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (audioUrl && audioRef.current) {
      // Resume existing audio
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback error:', err);
        setError('Failed to play audio');
      }
    } else {
      // Generate new audio
      await generateAndPlayAudio();
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
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
        backgroundColor: isPlaying ? '#e3f2fd' : '#fff',
        border: `2px solid ${error ? '#f44336' : isPlaying ? '#2196F3' : '#ddd'}`,
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
        
        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: isLoading ? 'wait' : 'pointer',
            padding: '0 4px',
            minWidth: '24px'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!isLoading && !error) {
              togglePlayback();
            }
          }}
          disabled={isLoading || !!error}
        >
          {isLoading ? '⏳' : error ? '❌' : isPlaying ? '⏸️' : '🔊'}
        </button>
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

export default ChunkAudioPlayer;