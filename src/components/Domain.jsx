import React, { useState, useEffect, useRef } from 'react';
import './Domain.css';

const Domain = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  // Voice changer state
  const [isActive, setIsActive] = useState(false);
  const [currentEffect, setCurrentEffect] = useState('normal');
  const [inputLevel, setInputLevel] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);
  const [volume, setVolume] = useState(70);
  const [status, setStatus] = useState('Ready');
  
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const processorRef = useRef(null);

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
    stopVoiceChanger();
  };

  const initializeAudio = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      streamRef.current = stream;

      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create source from stream
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create script processor for real-time processing
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      // Process audio
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const outputData = e.outputBuffer.getChannelData(0);
        
        // Calculate input level
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        setInputLevel(Math.min(rms * 500, 100));
        
        // Apply effect
        for (let i = 0; i < inputData.length; i++) {
          let sample = inputData[i];
          
          switch (currentEffect) {
            case 'deep':
              // Deep voice - simple pitch down
              outputData[i] = sample * 0.8;
              if (i > 0) outputData[i] = (outputData[i] + inputData[i-1]) * 0.5;
              break;
              
            case 'high':
              // High voice - simple pitch up
              outputData[i] = sample * 1.2;
              if (i % 2 === 0 && i < inputData.length - 1) {
                outputData[i] = (sample + inputData[i+1]) * 0.5;
              }
              break;
              
            case 'robot':
              // Robot voice - ring modulation
              const carrier = Math.sin(2 * Math.PI * 200 * i / audioContextRef.current.sampleRate);
              outputData[i] = sample * carrier * 0.8;
              break;
              
            case 'echo':
              // Simple echo
              outputData[i] = sample;
              if (i > 8000) outputData[i] += inputData[i - 8000] * 0.3;
              break;
              
            case 'alien':
              // Alien effect
              const mod = Math.sin(2 * Math.PI * 10 * i / audioContextRef.current.sampleRate);
              outputData[i] = sample * (0.5 + 0.5 * mod);
              break;
              
            default:
              outputData[i] = sample;
          }
        }
        
        // Calculate output level
        sum = 0;
        for (let i = 0; i < outputData.length; i++) {
          sum += outputData[i] * outputData[i];
        }
        const outputRms = Math.sqrt(sum / outputData.length);
        setOutputLevel(Math.min(outputRms * 500, 100));
      };
      
      // Connect nodes
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      setStatus('Active - Speak into your microphone!');
      
    } catch (err) {
      console.error('Audio initialization error:', err);
      setStatus('Error: ' + err.message);
    }
  };

  const startVoiceChanger = async () => {
    setIsActive(true);
    await initializeAudio();
  };

  const stopVoiceChanger = () => {
    setIsActive(false);
    setStatus('Stopped');
    
    // Cleanup
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setInputLevel(0);
    setOutputLevel(0);
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
    setTimeout(() => setStatus(isActive ? 'Active' : 'Ready'), 1000);
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
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
      
      <div className="domain-content">
        <div className="status-panel">
          <div className={`status-indicator ${isActive ? 'active' : ''}`}>
            {isActive ? '🔴' : '⚫'} {status}
          </div>
        </div>
        
        <div className="control-buttons">
          <button 
            className={`main-button ${isActive ? 'stop' : 'start'}`}
            onClick={isActive ? stopVoiceChanger : startVoiceChanger}
          >
            {isActive ? '⏹️ STOP' : '▶️ START'}
          </button>
          <button className="test-button" onClick={testSpeakers}>
            🔊 Test Speakers
          </button>
        </div>
        
        <div className="level-meters">
          <div className="meter">
            <label>Input Level</label>
            <div className="meter-bar">
              <div 
                className="meter-fill input" 
                style={{width: `${inputLevel}%`}}
              />
            </div>
          </div>
          <div className="meter">
            <label>Output Level</label>
            <div className="meter-bar">
              <div 
                className="meter-fill output" 
                style={{width: `${outputLevel}%`}}
              />
            </div>
          </div>
        </div>
        
        <div className="effects-panel">
          <h3>Voice Effects</h3>
          <div className="effects-grid">
            <div 
              className={`effect-card ${currentEffect === 'normal' ? 'active' : ''}`}
              onClick={() => setCurrentEffect('normal')}
            >
              <div className="effect-icon">👤</div>
              <div className="effect-name">Normal</div>
            </div>
            <div 
              className={`effect-card ${currentEffect === 'deep' ? 'active' : ''}`}
              onClick={() => setCurrentEffect('deep')}
            >
              <div className="effect-icon">👹</div>
              <div className="effect-name">Deep</div>
            </div>
            <div 
              className={`effect-card ${currentEffect === 'high' ? 'active' : ''}`}
              onClick={() => setCurrentEffect('high')}
            >
              <div className="effect-icon">🐿️</div>
              <div className="effect-name">High</div>
            </div>
            <div 
              className={`effect-card ${currentEffect === 'robot' ? 'active' : ''}`}
              onClick={() => setCurrentEffect('robot')}
            >
              <div className="effect-icon">🤖</div>
              <div className="effect-name">Robot</div>
            </div>
            <div 
              className={`effect-card ${currentEffect === 'echo' ? 'active' : ''}`}
              onClick={() => setCurrentEffect('echo')}
            >
              <div className="effect-icon">🏔️</div>
              <div className="effect-name">Echo</div>
            </div>
            <div 
              className={`effect-card ${currentEffect === 'alien' ? 'active' : ''}`}
              onClick={() => setCurrentEffect('alien')}
            >
              <div className="effect-icon">👽</div>
              <div className="effect-name">Alien</div>
            </div>
          </div>
        </div>
        
        <div className="volume-control">
          <label>Volume: {volume}%</label>
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