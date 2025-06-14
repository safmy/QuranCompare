import React, { useState, useEffect, useRef } from 'react';
import './Domain.css';

const Domain = ({ onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  // Voice changer state
  const [isActive, setIsActive] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('british_woman');
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [volume, setVolume] = useState(70);
  const [status, setStatus] = useState('Ready');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [transformedAudio, setTransformedAudio] = useState(null);
  const [isTransforming, setIsTransforming] = useState(false);
  
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  // Check stored auth on mount
  useEffect(() => {
    const storedAuth = sessionStorage.getItem('domainAuth');
    if (storedAuth === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === 'SubmissionMovement' && 
        loginForm.password === 'NoCompromise') {
      setIsAuthenticated(true);
      sessionStorage.setItem('domainAuth', 'authenticated');
      setError('');
    } else {
      setError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('domainAuth');
    stopRecording();
    if (onClose) onClose();
  };

  const startRecording = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        } 
      });
      streamRef.current = stream;

      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create analyser for visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start media recorder
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const processedBlob = await processAudioBlob(blob);
        setRecordedAudio(processedBlob);
        setStatus('Recording complete - Click play to hear transformed voice');
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus('Recording... Speak now!');
      
      // Start visualization
      visualize();
      
    } catch (err) {
      console.error('Recording error:', err);
      setStatus('Error: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const visualize = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setInputLevel(Math.min((average / 255) * 100, 100));
    };
    
    draw();
  };

  const processAudioBlob = async (blob) => {
    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get audio data
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Process based on effect
    let processedData = new Float32Array(channelData.length);
    
    switch (currentEffect) {
      case 'deep':
        // Deep voice - pitch down by stretching
        for (let i = 0; i < channelData.length; i++) {
          const sourceIndex = Math.floor(i * 0.7);
          processedData[i] = sourceIndex < channelData.length ? channelData[sourceIndex] : 0;
        }
        break;
        
      case 'high':
        // High voice - pitch up by compressing
        for (let i = 0; i < channelData.length; i++) {
          const sourceIndex = Math.floor(i * 1.5);
          processedData[i] = sourceIndex < channelData.length ? channelData[sourceIndex] : 0;
        }
        break;
        
      case 'robot':
        // Robot voice - ring modulation
        for (let i = 0; i < channelData.length; i++) {
          const carrier = Math.sin(2 * Math.PI * 200 * i / sampleRate);
          processedData[i] = channelData[i] * carrier * 0.8;
        }
        break;
        
      case 'echo':
        // Echo effect
        const delayFrames = Math.floor(sampleRate * 0.3);
        for (let i = 0; i < channelData.length; i++) {
          processedData[i] = channelData[i];
          if (i >= delayFrames) {
            processedData[i] += channelData[i - delayFrames] * 0.4;
          }
        }
        break;
        
      case 'alien':
        // Alien effect - modulation
        for (let i = 0; i < channelData.length; i++) {
          const mod = Math.sin(2 * Math.PI * 10 * i / sampleRate);
          processedData[i] = channelData[i] * (0.5 + 0.5 * mod);
        }
        break;
        
      default:
        processedData = channelData;
    }
    
    // Create new audio buffer with processed data
    const processedBuffer = audioContext.createBuffer(1, processedData.length, sampleRate);
    processedBuffer.copyToChannel(processedData, 0);
    
    // Convert back to blob
    const offlineContext = new OfflineAudioContext(1, processedBuffer.length, sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = processedBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    const wav = audioBufferToWav(renderedBuffer);
    return new Blob([wav], { type: 'audio/wav' });
  };

  const audioBufferToWav = (buffer) => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // Write WAVE header
    const setUint16 = (data) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };
    const setUint32 = (data) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // RIFF identifier
    setUint32(0x46464952);
    // file length
    setUint32(length - 8);
    // RIFF type
    setUint32(0x45564157);
    // format chunk identifier
    setUint32(0x20746d66);
    // format chunk length
    setUint32(16);
    // sample format (raw)
    setUint16(1);
    // channel count
    setUint16(buffer.numberOfChannels);
    // sample rate
    setUint32(buffer.sampleRate);
    // byte rate (sample rate * block align)
    setUint32(buffer.sampleRate * 4);
    // block align (channel count * bytes per sample)
    setUint16(buffer.numberOfChannels * 2);
    // bits per sample
    setUint16(16);
    // data chunk identifier
    setUint32(0x61746164);
    // data chunk length
    setUint32(length - pos - 4);

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < buffer.numberOfChannels; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return arrayBuffer;
  };

  const transformVoice = async () => {
    if (!recordedAudio || isTransforming) return;
    
    setIsTransforming(true);
    setStatus('Connecting to voice transformation server...');
    
    try {
      // Create FormData for audio upload
      const formData = new FormData();
      formData.append('audio', recordedAudio, 'recording.webm');
      formData.append('persona', selectedPersona);
      
      // Send to voice transformation API
      const response = await fetch('http://localhost:8888/api/transform_voice', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Voice transformation failed');
      }
      
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      setTransformedAudio(audioUrl);
      setStatus(`Voice transformed to ${selectedPersona.replace('_', ' ')}!`);
      
    } catch (error) {
      console.error('Transformation error:', error);
      setStatus('Error: Could not transform voice. Make sure the voice server is running.');
    } finally {
      setIsTransforming(false);
    }
  };
  
  const playTransformed = () => {
    if (!transformedAudio) return;
    
    const audio = new Audio(transformedAudio);
    audio.volume = volume / 100;
    audio.play();
    setStatus('Playing transformed voice...');
    
    audio.onended = () => {
      setStatus('Playback complete');
    };
  };
  
  const playRecording = () => {
    if (recordedAudio) {
      const audio = new Audio(URL.createObjectURL(recordedAudio));
      audio.volume = volume / 100;
      audio.play();
      
      audio.addEventListener('playing', () => {
        setStatus('Playing transformed voice...');
      });
      
      audio.addEventListener('ended', () => {
        setStatus('Playback complete');
      });
    }
  };

  const testSpeakers = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 440;
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
    
    setStatus('Playing test tone...');
    setTimeout(() => setStatus('Test complete'), 1000);
  };

  if (!isAuthenticated) {
    return (
      <div className="domain-container">
        <div className="domain-login">
          <h2>Domain Access</h2>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              required
            />
            {error && <div className="error-message">{error}</div>}
            <button type="submit">Access Domain</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="domain-container">
      <div className="domain-header">
        <h1>Domain Control Panel</h1>
        <div className="header-buttons">
          <button className="close-btn" onClick={onClose} title="Close Panel">
            ×
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>
      
      <div className="domain-content">
        <div className="status-panel">
          <div className={`status-indicator ${isRecording ? 'active' : ''}`}>
            {isRecording ? '🔴' : '⚫'} {status}
          </div>
        </div>
        
        <div className="control-buttons">
          <button 
            className={`main-button ${isRecording ? 'stop' : 'start'}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={recordedAudio && !isRecording}
          >
            {isRecording ? '⏹️ STOP RECORDING' : '🎤 START RECORDING'}
          </button>
          {recordedAudio && !isRecording && (
            <>
              <button className="transform-button" onClick={transformVoice}>
                🎤 TRANSFORM VOICE
              </button>
              {transformedAudio && (
                <button className="play-button" onClick={playTransformed}>
                  ▶️ PLAY AS {selectedPersona.replace('_', ' ').toUpperCase()}
                </button>
              )}
            </>
          )}
          <button className="test-button" onClick={testSpeakers}>
            🔊 Test Speakers
          </button>
        </div>
        
        <div className="level-meters">
          <div className="meter">
            <label>Recording Level</label>
            <div className="meter-bar">
              <div 
                className="meter-fill input" 
                style={{width: `${inputLevel}%`}}
              />
            </div>
          </div>
        </div>
        
        <div className="effects-panel">
          <h3>Voice Personas - Transform into different people</h3>
          <div className="effects-grid">
            <div 
              className={`effect-card ${selectedPersona === 'british_woman' ? 'active' : ''}`}
              onClick={() => !isRecording && setSelectedPersona('british_woman')}
            >
              <div className="effect-icon">🇬🇧</div>
              <div className="effect-name">British Woman</div>
            </div>
            <div 
              className={`effect-card ${selectedPersona === 'indian_man' ? 'active' : ''}`}
              onClick={() => !isRecording && setSelectedPersona('indian_man')}
            >
              <div className="effect-icon">🇮🇳</div>
              <div className="effect-name">Indian Man</div>
            </div>
            <div 
              className={`effect-card ${selectedPersona === 'american_woman' ? 'active' : ''}`}
              onClick={() => !isRecording && setSelectedPersona('american_woman')}
            >
              <div className="effect-icon">🇺🇸</div>
              <div className="effect-name">American Woman</div>
            </div>
            <div 
              className={`effect-card ${selectedPersona === 'australian_man' ? 'active' : ''}`}
              onClick={() => !isRecording && setSelectedPersona('australian_man')}
            >
              <div className="effect-icon">🇦🇺</div>
              <div className="effect-name">Australian Man</div>
            </div>
            <div 
              className={`effect-card ${selectedPersona === 'french_woman' ? 'active' : ''}`}
              onClick={() => !isRecording && setSelectedPersona('french_woman')}
            >
              <div className="effect-icon">🇫🇷</div>
              <div className="effect-name">French Woman</div>
            </div>
            <div 
              className={`effect-card ${selectedPersona === 'spanish_woman' ? 'active' : ''}`}
              onClick={() => !isRecording && setSelectedPersona('spanish_woman')}
            >
              <div className="effect-icon">🇪🇸</div>
              <div className="effect-name">Spanish Woman</div>
            </div>
          </div>
        </div>
        
        <div className="instructions">
          <h3>How to use:</h3>
          <ol>
            <li>Select a voice persona (British Woman, Indian Man, etc.)</li>
            <li>Click "START RECORDING"</li>
            <li>Speak naturally into your microphone</li>
            <li>Click "STOP RECORDING"</li>
            <li>Click "TRANSFORM VOICE" to hear yourself as that persona</li>
            <li>Your voice will be completely transformed with the selected accent and gender</li>
          </ol>
        </div>
        
        <div className="volume-control">
          <label>Playback Volume: {volume}%</label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default Domain;