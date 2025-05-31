import React, { useState, useRef } from 'react';

const VoiceSearchButton = ({ onTranscription, placeholder = "Recording..." }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            // Try different MIME types for better compatibility
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = ''; // Let browser choose
                    }
                }
            }
            
            const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { 
                    type: mimeType || 'audio/webm' 
                });
                console.log('Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
                await transcribeAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(1000); // Collect data every second
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please check your permissions and try again.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const transcribeAudio = async (audioBlob) => {
        setIsProcessing(true);
        
        try {
            // Create FormData for the audio file
            const formData = new FormData();
            const filename = `recording.${audioBlob.type.includes('webm') ? 'webm' : 'mp4'}`;
            formData.append('audio', audioBlob, filename);

            console.log('Sending audio for transcription:', audioBlob.size, 'bytes');

            // Send to our API endpoint
            const API_URL = process.env.REACT_APP_API_URL || 'https://vector-search-api-production.up.railway.app';
            const response = await fetch(`${API_URL}/transcribe-audio`, {
                method: 'POST',
                body: formData
            });

            console.log('Transcription response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Transcription API error:', errorText);
                throw new Error(`Transcription failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('Transcription response:', data);
            
            if (data.transcription && data.transcription.trim()) {
                onTranscription(data.transcription.trim());
            } else {
                throw new Error('No transcription text received');
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            alert(`Failed to transcribe audio: ${error.message}. Please try speaking more clearly or check your internet connection.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                disabled={isProcessing}
                className="voice-search-btn"
                style={{
                    padding: '12px',
                    background: isRecording ? '#ef4444' : isProcessing ? '#94a3b8' : '#f8fafc',
                    color: isRecording || isProcessing ? 'white' : '#64748b',
                    border: `2px solid ${isRecording ? '#ef4444' : isProcessing ? '#94a3b8' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    width: '48px',
                    height: '48px',
                    position: 'relative',
                    boxShadow: isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.2)' : 
                              isProcessing ? '0 0 0 4px rgba(148, 163, 184, 0.2)' : 
                              '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(8px)'
                }}
                onMouseEnter={(e) => {
                    if (!isProcessing && !isRecording) {
                        e.target.style.background = '#e2e8f0';
                        e.target.style.color = '#475569';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px 0 rgba(0, 0, 0, 0.15)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isProcessing && !isRecording) {
                        e.target.style.background = '#f8fafc';
                        e.target.style.color = '#64748b';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                    }
                }}
                title={isRecording ? 'Click to stop recording' : isProcessing ? 'Processing audio...' : 'Voice search'}
            >
                {isProcessing ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                ) : isRecording ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="6" width="12" height="12" rx="2"/>
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                )}
                {isRecording && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100%',
                        height: '100%',
                        borderRadius: '12px',
                        border: '2px solid rgba(239, 68, 68, 0.6)',
                        animation: 'pulse 1.5s infinite ease-in-out',
                        pointerEvents: 'none'
                    }}></div>
                )}
            </button>
            <style jsx>{`
                @keyframes pulse {
                    0% {
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.4);
                        opacity: 0;
                    }
                }
            `}</style>
        </>
    );
};

export default VoiceSearchButton;