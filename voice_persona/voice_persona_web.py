#!/usr/bin/env python3
"""
Voice Persona Changer (Web Version) - Transform voice recordings into different personas
This version works with file uploads for cloud deployment
"""
import numpy as np
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from scipy import signal
from scipy.io import wavfile
import io
import os
import tempfile
from pydub import AudioSegment

app = Flask(__name__)
CORS(app, origins=["https://quranonlystudies.app", "https://qurancompare.netlify.app", "http://localhost:3000"])

class WebVoicePersonaChanger:
    def __init__(self):
        # Voice personas with audio processing parameters
        self.personas = {
            "british_woman": {
                "name": "British Woman",
                "pitch_shift": 1.15,
                "formant_shift": 0.9,
                "texture": "smooth",
                "description": "Sophisticated British accent"
            },
            "indian_man": {
                "name": "Indian Man", 
                "pitch_shift": 0.85,
                "formant_shift": 1.1,
                "texture": "warm",
                "description": "Warm Indian accent"
            },
            "american_woman": {
                "name": "American Woman",
                "pitch_shift": 1.1,
                "formant_shift": 0.95,
                "texture": "clear",
                "description": "Clear American accent"
            },
            "australian_man": {
                "name": "Australian Man",
                "pitch_shift": 0.9,
                "formant_shift": 1.05,
                "texture": "relaxed",
                "description": "Relaxed Australian accent"
            },
            "french_woman": {
                "name": "French Woman",
                "pitch_shift": 1.12,
                "formant_shift": 0.92,
                "texture": "melodic",
                "description": "Elegant French accent"
            },
            "spanish_woman": {
                "name": "Spanish Woman",
                "pitch_shift": 1.08,
                "formant_shift": 0.98,
                "texture": "passionate",
                "description": "Passionate Spanish accent"
            },
            "japanese_woman": {
                "name": "Japanese Woman",
                "pitch_shift": 1.2,
                "formant_shift": 0.88,
                "texture": "gentle",
                "description": "Gentle Japanese accent"
            },
            "german_man": {
                "name": "German Man",
                "pitch_shift": 0.88,
                "formant_shift": 1.08,
                "texture": "precise",
                "description": "Precise German accent"
            },
            "irish_woman": {
                "name": "Irish Woman",
                "pitch_shift": 1.05,
                "formant_shift": 0.97,
                "texture": "lyrical",
                "description": "Lyrical Irish accent"
            },
            "canadian_man": {
                "name": "Canadian Man",
                "pitch_shift": 0.92,
                "formant_shift": 1.02,
                "texture": "friendly",
                "description": "Friendly Canadian accent"
            }
        }
    
    def pitch_shift(self, audio_data, sample_rate, shift_factor):
        """Simple pitch shifting using interpolation"""
        # Calculate the new length
        new_length = int(len(audio_data) / shift_factor)
        
        # Create indices for interpolation
        old_indices = np.arange(0, len(audio_data))
        new_indices = np.linspace(0, len(audio_data) - 1, new_length)
        
        # Interpolate
        shifted_data = np.interp(new_indices, old_indices, audio_data)
        
        return shifted_data.astype(np.int16)
    
    def add_texture(self, audio_data, texture_type):
        """Add texture effects to the audio"""
        if texture_type == "smooth":
            # Low-pass filter for smoothness
            b, a = signal.butter(3, 0.8, 'low')
            return signal.filtfilt(b, a, audio_data)
        elif texture_type == "warm":
            # Add slight harmonic distortion
            return audio_data * 0.9 + audio_data ** 2 * 0.0001
        elif texture_type == "clear":
            # Slight high-frequency boost
            b, a = signal.butter(2, 0.3, 'high')
            high_freq = signal.filtfilt(b, a, audio_data)
            return audio_data + high_freq * 0.1
        elif texture_type == "melodic":
            # Add subtle vibrato
            t = np.arange(len(audio_data))
            vibrato = np.sin(2 * np.pi * 5 * t / 44100) * 50
            indices = np.clip(t + vibrato, 0, len(audio_data) - 1).astype(int)
            return audio_data[indices]
        else:
            return audio_data
    
    def transform_audio(self, audio_file, persona_name):
        """Transform audio file with selected persona"""
        try:
            # Convert uploaded file to WAV using pydub
            audio = AudioSegment.from_file(audio_file)
            
            # Convert to mono and set sample rate
            audio = audio.set_channels(1)
            audio = audio.set_frame_rate(44100)
            
            # Export to WAV format in memory
            wav_buffer = io.BytesIO()
            audio.export(wav_buffer, format='wav')
            wav_buffer.seek(0)
            
            # Read WAV data
            sample_rate, audio_data = wavfile.read(wav_buffer)
            
            # Get persona parameters
            persona = self.personas.get(persona_name, self.personas["british_woman"])
            
            # Apply pitch shift
            transformed_data = self.pitch_shift(
                audio_data, 
                sample_rate, 
                persona["pitch_shift"]
            )
            
            # Apply texture
            transformed_data = self.add_texture(
                transformed_data,
                persona["texture"]
            )
            
            # Normalize audio
            max_val = np.max(np.abs(transformed_data))
            if max_val > 0:
                transformed_data = (transformed_data / max_val * 32767).astype(np.int16)
            
            # Create output buffer
            output_buffer = io.BytesIO()
            wavfile.write(output_buffer, sample_rate, transformed_data)
            output_buffer.seek(0)
            
            return output_buffer
            
        except Exception as e:
            print(f"Error transforming audio: {e}")
            raise

voice_changer = WebVoicePersonaChanger()

@app.route('/')
def index():
    return jsonify({
        "status": "Voice Persona API is running",
        "endpoints": {
            "/api/transform_voice": "POST - Transform voice with persona",
            "/api/personas": "GET - List available personas"
        }
    })

@app.route('/api/personas', methods=['GET'])
def get_personas():
    """Get list of available personas"""
    return jsonify({
        "personas": voice_changer.personas
    })

@app.route('/api/transform_voice', methods=['POST'])
def transform_voice():
    """Transform uploaded voice with selected persona"""
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        persona = request.form.get('persona', 'british_woman')
        
        # Transform the audio
        transformed_audio = voice_changer.transform_audio(audio_file, persona)
        
        # Return the transformed audio
        return send_file(
            transformed_audio,
            mimetype='audio/wav',
            as_attachment=True,
            download_name=f'transformed_{persona}.wav'
        )
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8888))
    app.run(host='0.0.0.0', port=port, debug=False)