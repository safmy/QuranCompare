import React, { useState, useRef } from 'react';

const VoiceSearchButton = ({ onTranscription, placeholder = "Recording..." }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await transcribeAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please check your permissions.');
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
            formData.append('audio', audioBlob, 'recording.webm');

            // Send to our API endpoint
            const API_URL = process.env.REACT_APP_API_URL || 'https://vector-search-api-production.up.railway.app';
            const response = await fetch(`${API_URL}/transcribe-audio`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Transcription failed');
            }

            const data = await response.json();
            if (data.transcription) {
                onTranscription(data.transcription);
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            alert('Failed to transcribe audio. Please try again.');
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
        <button
            type="button"
            onClick={handleClick}
            disabled={isProcessing}
            className="voice-search-btn"
            style={{
                padding: '12px',
                background: isRecording ? '#dc3545' : isProcessing ? '#6c757d' : '#2c5aa0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                width: '48px',
                height: '48px',
                position: 'relative'
            }}
            title={isRecording ? 'Stop recording' : isProcessing ? 'Processing...' : 'Start voice search'}
        >
            {isProcessing ? (
                <span style={{ fontSize: '16px' }}>⏳</span>
            ) : isRecording ? (
                <>
                    <span>⏹️</span>
                    <span style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100%',
                        height: '100%',
                        borderRadius: '8px',
                        border: '3px solid white',
                        animation: 'pulse 1.5s infinite',
                        pointerEvents: 'none'
                    }}></span>
                </>
            ) : (
                <span>🎤</span>
            )}
            <style jsx>{`
                @keyframes pulse {
                    0% {
                        transform: translate(-50%, -50%) scale(0.8);
                        opacity: 1;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.2);
                        opacity: 0;
                    }
                }
            `}</style>
        </button>
    );
};

export default VoiceSearchButton;