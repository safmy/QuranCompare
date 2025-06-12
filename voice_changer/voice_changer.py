"""
Voice Changer Application - Backend
Comprehensive voice transformation using OpenAI's TTS API
"""

import os
import sys
import wave
import json
import time
import base64
import asyncio
import threading
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Tuple

import pyaudio
import numpy as np
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from openai import OpenAI
from pydub import AudioSegment
from pydub.effects import speedup, normalize
from scipy import signal
import soundfile as sf

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = Path("uploads")
OUTPUT_FOLDER = Path("outputs")
STATIC_FOLDER = Path("static")

# Create necessary directories
for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER, STATIC_FOLDER]:
    folder.mkdir(exist_ok=True)

# Audio recording configuration
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 44100

class VoiceRecorder:
    """Handle audio recording from microphone"""
    
    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self.stream = None
        self.frames = []
        self.is_recording = False
        self.recording_thread = None
        
    def start_recording(self):
        """Start recording audio from microphone"""
        self.frames = []
        self.is_recording = True
        
        self.stream = self.audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK
        )
        
        self.recording_thread = threading.Thread(target=self._record)
        self.recording_thread.start()
        
    def _record(self):
        """Record audio in a separate thread"""
        while self.is_recording:
            try:
                data = self.stream.read(CHUNK, exception_on_overflow=False)
                self.frames.append(data)
            except Exception as e:
                print(f"Recording error: {e}")
                break
                
    def stop_recording(self):
        """Stop recording and save the audio"""
        self.is_recording = False
        
        if self.recording_thread:
            self.recording_thread.join()
            
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
            
        # Save recording
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"recording_{timestamp}.wav"
        filepath = UPLOAD_FOLDER / filename
        
        wf = wave.open(str(filepath), 'wb')
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(self.audio.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b''.join(self.frames))
        wf.close()
        
        return str(filepath)
        
    def __del__(self):
        if hasattr(self, 'audio'):
            self.audio.terminate()

class VoiceTransformer:
    """Handle voice transformations using various methods"""
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_client = None
        if openai_api_key:
            self.openai_client = OpenAI(api_key=openai_api_key)
            
        # Available OpenAI voices
        self.openai_voices = {
            "alloy": "Neutral, balanced",
            "echo": "Male, conversational",
            "fable": "Male, British accent",
            "onyx": "Male, deep and authoritative",
            "nova": "Female, friendly and warm",
            "shimmer": "Female, soft and gentle"
        }
        
    def transform_with_openai(self, text: str, voice: str = "alloy", 
                            speed: float = 1.0) -> str:
        """Transform text to speech using OpenAI TTS"""
        if not self.openai_client:
            raise ValueError("OpenAI API key not configured")
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = OUTPUT_FOLDER / f"openai_{voice}_{timestamp}.mp3"
        
        response = self.openai_client.audio.speech.create(
            model="tts-1-hd",  # Using HD model for better quality
            voice=voice,
            input=text,
            speed=speed
        )
        
        response.stream_to_file(str(output_file))
        return str(output_file)
        
    def apply_effect(self, input_file: str, effect: str, 
                    params: Dict = None) -> str:
        """Apply various audio effects to the input file"""
        audio = AudioSegment.from_file(input_file)
        params = params or {}
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = OUTPUT_FOLDER / f"{effect}_{timestamp}.wav"
        
        if effect == "pitch_shift":
            # Shift pitch up or down
            semitones = params.get("semitones", 5)
            audio = audio._spawn(audio.raw_data, overrides={
                "frame_rate": int(audio.frame_rate * (2.0 ** (semitones / 12.0)))
            }).set_frame_rate(audio.frame_rate)
            
        elif effect == "robot":
            # Robot effect using vocoder-like processing
            samples = np.array(audio.get_array_of_samples())
            # Apply ring modulation
            carrier = np.sin(2 * np.pi * 200 * np.arange(len(samples)) / audio.frame_rate)
            modulated = samples * carrier
            audio = audio._spawn(modulated.astype(np.int16).tobytes(), 
                               overrides={"frame_rate": audio.frame_rate})
            
        elif effect == "echo":
            # Add echo effect
            delay = params.get("delay", 500)  # milliseconds
            decay = params.get("decay", 0.5)
            delayed = AudioSegment.silent(duration=delay) + audio * decay
            audio = audio.overlay(delayed)
            
        elif effect == "reverse":
            # Reverse the audio
            audio = audio.reverse()
            
        elif effect == "speed":
            # Change playback speed
            speed_factor = params.get("factor", 1.5)
            audio = speedup(audio, playback_speed=speed_factor)
            
        elif effect == "whisper":
            # Whisper effect - high-pass filter and reduced amplitude
            samples = np.array(audio.get_array_of_samples())
            # High-pass filter
            b, a = signal.butter(4, 2000 / (audio.frame_rate / 2), 'high')
            filtered = signal.filtfilt(b, a, samples)
            # Reduce amplitude
            whispered = filtered * 0.3
            audio = audio._spawn(whispered.astype(np.int16).tobytes(),
                               overrides={"frame_rate": audio.frame_rate})
            
        elif effect == "deep":
            # Deep voice - low-pass filter and pitch down
            audio = audio.low_pass_filter(800)
            audio = audio._spawn(audio.raw_data, overrides={
                "frame_rate": int(audio.frame_rate * 0.8)
            }).set_frame_rate(audio.frame_rate)
            
        elif effect == "alien":
            # Alien effect - frequency modulation
            samples = np.array(audio.get_array_of_samples())
            modulator = np.sin(2 * np.pi * 10 * np.arange(len(samples)) / audio.frame_rate)
            modulated = samples * (1 + 0.5 * modulator)
            audio = audio._spawn(modulated.astype(np.int16).tobytes(),
                               overrides={"frame_rate": audio.frame_rate})
            
        # Normalize audio
        audio = normalize(audio)
        
        # Export
        audio.export(str(output_file), format="wav")
        return str(output_file)
        
    def transcribe_audio(self, audio_file: str) -> str:
        """Transcribe audio to text using OpenAI Whisper"""
        if not self.openai_client:
            raise ValueError("OpenAI API key not configured")
            
        with open(audio_file, "rb") as f:
            transcript = self.openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="text"
            )
            
        return transcript

# Global instances
recorder = VoiceRecorder()
transformer = None  # Will be initialized with API key

def load_config():
    """Load configuration from config file"""
    config_path = Path("config.json")
    if config_path.exists():
        with open(config_path, "r") as f:
            return json.load(f)
    return {}

# API Routes

@app.route('/')
def index():
    """Serve the main HTML page"""
    return send_from_directory('.', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)

@app.route('/api/start_recording', methods=['POST'])
def start_recording():
    """Start audio recording"""
    try:
        recorder.start_recording()
        return jsonify({"status": "recording_started"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stop_recording', methods=['POST'])
def stop_recording():
    """Stop audio recording and save file"""
    try:
        filepath = recorder.stop_recording()
        return jsonify({
            "status": "recording_stopped",
            "file": filepath,
            "filename": os.path.basename(filepath)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload_audio', methods=['POST'])
def upload_audio():
    """Upload audio file"""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
            
        file = request.files['audio']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"upload_{timestamp}_{file.filename}"
        filepath = UPLOAD_FOLDER / filename
        file.save(str(filepath))
        
        return jsonify({
            "status": "uploaded",
            "file": str(filepath),
            "filename": filename
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio to text"""
    try:
        data = request.json
        audio_file = data.get('audio_file')
        
        if not audio_file or not Path(audio_file).exists():
            return jsonify({"error": "Audio file not found"}), 400
            
        text = transformer.transcribe_audio(audio_file)
        
        return jsonify({
            "status": "transcribed",
            "text": text
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/transform_tts', methods=['POST'])
def transform_tts():
    """Transform text to speech with selected voice"""
    try:
        data = request.json
        text = data.get('text', '')
        voice = data.get('voice', 'alloy')
        speed = data.get('speed', 1.0)
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        output_file = transformer.transform_with_openai(text, voice, speed)
        
        return jsonify({
            "status": "transformed",
            "file": output_file,
            "filename": os.path.basename(output_file)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/apply_effect', methods=['POST'])
def apply_effect():
    """Apply audio effect to file"""
    try:
        data = request.json
        input_file = data.get('input_file')
        effect = data.get('effect')
        params = data.get('params', {})
        
        if not input_file or not Path(input_file).exists():
            return jsonify({"error": "Input file not found"}), 400
            
        if not effect:
            return jsonify({"error": "No effect specified"}), 400
            
        output_file = transformer.apply_effect(input_file, effect, params)
        
        return jsonify({
            "status": "effect_applied",
            "file": output_file,
            "filename": os.path.basename(output_file),
            "effect": effect
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/download/<path:filename>')
def download_file(filename):
    """Download transformed audio file"""
    try:
        # Check in both uploads and outputs folders
        for folder in [OUTPUT_FOLDER, UPLOAD_FOLDER]:
            filepath = folder / filename
            if filepath.exists():
                return send_file(str(filepath), as_attachment=True)
                
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/get_voices', methods=['GET'])
def get_voices():
    """Get available OpenAI voices"""
    return jsonify({
        "voices": transformer.openai_voices if transformer else {}
    })

@app.route('/api/get_effects', methods=['GET'])
def get_effects():
    """Get available audio effects"""
    effects = {
        "pitch_shift": {"name": "Pitch Shift", "params": {"semitones": {"min": -12, "max": 12, "default": 5}}},
        "robot": {"name": "Robot", "params": {}},
        "echo": {"name": "Echo", "params": {"delay": {"min": 100, "max": 1000, "default": 500}, "decay": {"min": 0.1, "max": 0.9, "default": 0.5}}},
        "reverse": {"name": "Reverse", "params": {}},
        "speed": {"name": "Speed Change", "params": {"factor": {"min": 0.5, "max": 2.0, "default": 1.5}}},
        "whisper": {"name": "Whisper", "params": {}},
        "deep": {"name": "Deep Voice", "params": {}},
        "alien": {"name": "Alien", "params": {}}
    }
    return jsonify({"effects": effects})

if __name__ == '__main__':
    # Load configuration
    config = load_config()
    
    # Initialize transformer with API key
    api_key = config.get('openai_api_key', os.environ.get('OPENAI_API_KEY'))
    if api_key:
        transformer = VoiceTransformer(api_key)
    else:
        print("Warning: OpenAI API key not found. TTS features will be disabled.")
        transformer = VoiceTransformer()
    
    # Run the Flask app
    app.run(debug=True, port=5000)