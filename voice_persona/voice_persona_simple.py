#!/usr/bin/env python3
"""
Voice Persona Changer (Simple Version) - Transform your voice into different personas
This version works without OpenAI API for testing
"""
import pyaudio
import numpy as np
import threading
import time
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from scipy import signal
import os

app = Flask(__name__)
CORS(app)

class SimpleVoicePersonaChanger:
    def __init__(self):
        self.p = pyaudio.PyAudio()
        self.chunk = 2048
        self.format = pyaudio.paInt16
        self.channels = 1
        self.rate = 44100
        
        # State
        self.is_active = False
        self.current_persona = "british_woman"
        self.input_level = 0
        self.output_level = 0
        self.volume = 70
        
        # Simplified voice personas (without OpenAI)
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
                "pitch_shift": 1.2,
                "formant_shift": 0.85,
                "texture": "melodic",
                "description": "Elegant French accent"
            },
            "scottish_man": {
                "name": "Scottish Man",
                "pitch_shift": 0.8,
                "formant_shift": 1.15,
                "texture": "rough",
                "description": "Strong Scottish accent"
            },
            "japanese_woman": {
                "name": "Japanese Woman",
                "pitch_shift": 1.25,
                "formant_shift": 0.8,
                "texture": "soft",
                "description": "Soft Japanese accent"
            },
            "german_man": {
                "name": "German Man",
                "pitch_shift": 0.75,
                "formant_shift": 1.2,
                "texture": "firm",
                "description": "Precise German accent"
            },
            "spanish_woman": {
                "name": "Spanish Woman",
                "pitch_shift": 1.18,
                "formant_shift": 0.88,
                "texture": "vibrant",
                "description": "Vibrant Spanish accent"
            },
            "russian_man": {
                "name": "Russian Man",
                "pitch_shift": 0.7,
                "formant_shift": 1.25,
                "texture": "deep",
                "description": "Deep Russian accent"
            }
        }
        
        # Detect devices
        self.input_device = None
        self.output_device = None
        self.detect_devices()
        
        # Processing thread
        self.processing_thread = None
        
    def detect_devices(self):
        """Auto-detect audio devices"""
        self.devices = []
        for i in range(self.p.get_device_count()):
            info = self.p.get_device_info_by_index(i)
            self.devices.append({
                'index': i,
                'name': info['name'],
                'input': info['maxInputChannels'] > 0,
                'output': info['maxOutputChannels'] > 0
            })
            
            # Auto-select devices
            if info['maxInputChannels'] > 0 and self.input_device is None:
                self.input_device = i
                    
            if info['maxOutputChannels'] > 0 and self.output_device is None:
                self.output_device = i
    
    def pitch_shift(self, audio, factor):
        """Simple pitch shifting using interpolation"""
        if factor == 1.0:
            return audio
            
        # Resample to change pitch
        indices = np.arange(0, len(audio), factor)
        indices = indices[indices < len(audio)].astype(int)
        
        if len(indices) < 10:
            return audio
            
        shifted = audio[indices]
        
        # Resample back to original length
        x_old = np.arange(len(shifted))
        x_new = np.linspace(0, len(shifted)-1, len(audio))
        
        return np.interp(x_new, x_old, shifted)
    
    def apply_texture(self, audio, texture_type):
        """Apply texture characteristics to voice"""
        if texture_type == "smooth":
            # Low-pass filter for smoothness
            b, a = signal.butter(4, 3000, fs=self.rate)
            return signal.filtfilt(b, a, audio)
        elif texture_type == "warm":
            # Add subtle warmth
            return audio * 1.1
        elif texture_type == "clear":
            # Enhance clarity
            return audio * 1.15
        elif texture_type == "rough":
            # Add slight distortion
            return np.tanh(audio * 1.5) * 0.8
        elif texture_type == "melodic":
            # Add subtle vibrato
            t = np.arange(len(audio)) / self.rate
            vibrato = 1 + 0.02 * np.sin(2 * np.pi * 5 * t)
            return audio * vibrato
        elif texture_type == "soft":
            # Compress dynamics
            return np.tanh(audio * 0.5) * 2
        elif texture_type == "firm":
            # Enhance presence
            return audio * 1.2
        elif texture_type == "vibrant":
            # Add energy
            return audio * 1.25
        elif texture_type == "deep":
            # Enhance low frequencies
            b, a = signal.butter(3, 300, fs=self.rate)
            low_freq = signal.filtfilt(b, a, audio)
            return audio + low_freq * 0.3
        elif texture_type == "relaxed":
            # Smooth dynamics
            return audio * 0.9
        else:
            return audio
    
    def transform_with_persona(self, audio_data, persona_key):
        """Transform audio using persona settings"""
        persona = self.personas[persona_key]
        
        # Convert to float for processing
        audio = audio_data.astype(np.float32) / 32768.0
        
        # Apply pitch shifting
        transformed = self.pitch_shift(audio, persona["pitch_shift"])
        
        # Apply formant-like effect (simplified)
        if persona["formant_shift"] != 1.0:
            # Simple formant approximation using filtering
            if persona["formant_shift"] > 1.0:
                # Higher formants - enhance high frequencies
                b, a = signal.butter(2, 2000, btype='high', fs=self.rate)
                high = signal.filtfilt(b, a, transformed)
                transformed = transformed + high * (persona["formant_shift"] - 1)
            else:
                # Lower formants - enhance low frequencies  
                b, a = signal.butter(2, 1000, fs=self.rate)
                low = signal.filtfilt(b, a, transformed)
                transformed = transformed * persona["formant_shift"] + low * (1 - persona["formant_shift"])
        
        # Apply texture
        transformed = self.apply_texture(transformed, persona["texture"])
        
        # Normalize and convert back
        max_val = np.max(np.abs(transformed))
        if max_val > 0:
            transformed = transformed / max_val * 0.9
        
        return (transformed * 32767).astype(np.int16)
    
    def process_audio_thread(self):
        """Audio processing thread for real-time transformation"""
        try:
            stream_in = self.p.open(format=self.format,
                                  channels=self.channels,
                                  rate=self.rate,
                                  input=True,
                                  input_device_index=self.input_device,
                                  frames_per_buffer=self.chunk)
            
            stream_out = self.p.open(format=self.format,
                                   channels=self.channels,
                                   rate=self.rate,
                                   output=True,
                                   output_device_index=self.output_device,
                                   frames_per_buffer=self.chunk)
            
            print(f"Audio streams opened - Input: {self.input_device}, Output: {self.output_device}")
            
            while self.is_active:
                try:
                    # Read audio
                    data = stream_in.read(self.chunk, exception_on_overflow=False)
                    audio = np.frombuffer(data, dtype=np.int16)
                    
                    # Update input level
                    self.input_level = float(np.sqrt(np.mean(audio.astype(np.float32)**2)))
                    
                    # Transform audio
                    transformed = self.transform_with_persona(audio, self.current_persona)
                    
                    # Update output level
                    self.output_level = float(np.sqrt(np.mean(transformed.astype(np.float32)**2)))
                    
                    # Play transformed audio
                    stream_out.write(transformed.tobytes(), exception_on_underflow=False)
                    
                except Exception as e:
                    print(f"Audio processing error: {e}")
                    
            stream_in.stop_stream()
            stream_out.stop_stream()
            stream_in.close()
            stream_out.close()
            
        except Exception as e:
            print(f"Stream error: {e}")
            self.is_active = False
    
    def start(self):
        """Start processing"""
        if not self.is_active:
            self.is_active = True
            self.processing_thread = threading.Thread(target=self.process_audio_thread, daemon=True)
            self.processing_thread.start()
            return True
        return False
    
    def stop(self):
        """Stop processing"""
        self.is_active = False
        if self.processing_thread:
            self.processing_thread.join(timeout=1)
        return True
    
    def set_persona(self, persona):
        """Change voice persona"""
        if persona in self.personas:
            self.current_persona = persona
            print(f"Switched to persona: {self.personas[persona]['name']}")
            return True
        return False
    
    def get_status(self):
        """Get current status"""
        # Add simplified OpenAI voice info for compatibility
        for key, persona in self.personas.items():
            persona['openai_voice'] = 'nova'  # Dummy value
            persona['speed'] = 1.0  # Dummy value
            persona['accent_filter'] = key.split('_')[0]  # Extract accent from key
            
        return {
            'active': self.is_active,
            'persona': self.current_persona,
            'persona_info': self.personas[self.current_persona],
            'input_level': self.input_level,
            'output_level': self.output_level,
            'volume': self.volume,
            'devices': self.devices,
            'input_device': self.input_device,
            'output_device': self.output_device,
            'all_personas': self.personas
        }

# Create voice changer instance
vc = SimpleVoicePersonaChanger()

# Routes
@app.route('/')
def index():
    return render_template('voice_persona.html')

@app.route('/status')
def status():
    return jsonify(vc.get_status())

@app.route('/start', methods=['POST'])
def start():
    success = vc.start()
    return jsonify({'success': success})

@app.route('/stop', methods=['POST'])
def stop():
    success = vc.stop()
    return jsonify({'success': success})

@app.route('/persona', methods=['POST'])
def set_persona():
    persona = request.json.get('persona', 'british_woman')
    success = vc.set_persona(persona)
    return jsonify({'success': success})

@app.route('/sample', methods=['POST'])
def generate_sample():
    # Return a dummy response for the simple version
    return jsonify({'error': 'Sample generation not available in simple mode'}), 501

@app.route('/test', methods=['POST'])
def test_speakers():
    # Play test tone
    try:
        duration = 0.5
        freq = 440
        rate = 44100
        samples = int(duration * rate)
        t = np.linspace(0, duration, samples, False)
        tone = np.sin(2 * np.pi * freq * t) * 0.3
        tone_int = (tone * 32767).astype(np.int16)
        
        p = pyaudio.PyAudio()
        stream = p.open(format=pyaudio.paInt16,
                       channels=1,
                       rate=rate,
                       output=True,
                       output_device_index=vc.output_device)
        stream.write(tone_int.tobytes())
        stream.stop_stream()
        stream.close()
        p.terminate()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🎭 VOICE PERSONA CHANGER (Simple Version)")
    print("="*60)
    print("\n✅ Starting web server...")
    print("\n📱 Open your browser and go to:")
    print("   http://localhost:8888")
    print("\n💡 Features:")
    print("   - 10 unique voice personas")
    print("   - Real-time voice transformation")
    print("   - Simple pitch and texture effects")
    print("   - No OpenAI API required")
    print("\n⚠️  Make sure to allow microphone access in your browser!")
    print("\nPress Ctrl+C to stop the server")
    print("="*60 + "\n")
    
    # Create directories if they don't exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    app.run(host='0.0.0.0', port=8888, debug=False)