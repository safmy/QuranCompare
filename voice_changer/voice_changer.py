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
import random
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Tuple

import pyaudio
import numpy as np
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from openai import OpenAI
from pydub import AudioSegment
from pydub.effects import speedup, normalize, low_pass_filter, high_pass_filter
from pydub.generators import WhiteNoise
from scipy import signal
from scipy.signal import butter, filtfilt, hilbert
import soundfile as sf
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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
    
    def __init__(self, openai_api_key: Optional[str] = None, config: Dict = None):
        self.openai_client = None
        if openai_api_key:
            self.openai_client = OpenAI(api_key=openai_api_key)
            
        # Store configuration
        self.config = config or {}
        self.disguise_settings = self.config.get('tts', {}).get('disguise_settings', {
            "pitch_variation_range": [-1.5, 1.5],
            "formant_shift_range": [0.95, 1.05],
            "vibrato_freq_range": [4.0, 6.0],
            "vibrato_depth_range": [0.02, 0.04],
            "ambience_level": -55,
            "reverb_decay": 0.15
        })
            
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
                            speed: float = 1.0, apply_disguise: bool = True) -> str:
        """Transform text to speech using OpenAI TTS with optional voice disguise"""
        if not self.openai_client:
            raise ValueError("OpenAI API key not configured")
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_file = OUTPUT_FOLDER / f"temp_openai_{voice}_{timestamp}.mp3"
        
        # Randomize speed slightly for variation
        if apply_disguise:
            speed = speed * random.uniform(0.95, 1.05)
        
        response = self.openai_client.audio.speech.create(
            model="tts-1-hd",  # Using HD model for better quality
            voice=voice,
            input=text,
            speed=speed
        )
        
        response.stream_to_file(str(temp_file))
        
        # Apply voice disguise effects if requested
        if apply_disguise:
            output_file = self.apply_voice_disguise(str(temp_file), voice)
            os.remove(temp_file)  # Clean up temp file
            return output_file
        else:
            return str(temp_file)
        
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
                               
        elif effect == "formant_shift":
            # Formant shifting for voice character modification
            shift_factor = params.get("shift_factor", 1.2)
            samples = np.array(audio.get_array_of_samples())
            
            # Apply formant shifting using phase vocoder technique
            analytic_signal = hilbert(samples)
            amplitude_envelope = np.abs(analytic_signal)
            instantaneous_phase = np.unwrap(np.angle(analytic_signal))
            
            # Shift formants
            shifted_phase = instantaneous_phase * shift_factor
            shifted_signal = amplitude_envelope * np.cos(shifted_phase)
            
            audio = audio._spawn(shifted_signal.astype(np.int16).tobytes(),
                               overrides={"frame_rate": audio.frame_rate})
                               
        elif effect == "add_ambience":
            # Add subtle background ambience
            ambience_level = params.get("level", 0.03)
            
            # Generate pink noise for ambience
            noise = WhiteNoise().to_audio_segment(duration=len(audio))
            noise = noise - 40  # Reduce noise level
            noise = noise.low_pass_filter(2000)  # Make it sound more like room tone
            
            # Mix with original
            audio = audio.overlay(noise)
            
        elif effect == "subtle_reverb":
            # Add subtle reverb for room acoustics
            decay = params.get("decay", 0.3)
            delays = [50, 100, 150, 200]  # Multiple delays for richer reverb
            
            reverbed = audio
            for delay in delays:
                delayed = AudioSegment.silent(duration=delay) + audio * (decay / len(delays))
                reverbed = reverbed.overlay(delayed)
            
            audio = reverbed
            
        elif effect == "vocal_texture":
            # Add subtle texture variations
            samples = np.array(audio.get_array_of_samples())
            
            # Add very subtle tremolo
            tremolo_freq = 4.5  # Hz
            tremolo_depth = 0.05  # Very subtle
            tremolo = 1 + tremolo_depth * np.sin(2 * np.pi * tremolo_freq * np.arange(len(samples)) / audio.frame_rate)
            
            textured = samples * tremolo
            audio = audio._spawn(textured.astype(np.int16).tobytes(),
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
    
    def apply_voice_disguise(self, input_file: str, voice_name: str) -> str:
        """Apply multiple subtle effects to disguise OpenAI TTS voice"""
        
        # Load the audio
        audio = AudioSegment.from_file(input_file)
        
        # 1. Apply subtle pitch variation
        pitch_range = self.disguise_settings.get('pitch_variation_range', [-1.5, 1.5])
        pitch_shift = random.uniform(pitch_range[0], pitch_range[1])  # Subtle pitch shift in semitones
        audio = audio._spawn(audio.raw_data, overrides={
            "frame_rate": int(audio.frame_rate * (2.0 ** (pitch_shift / 12.0)))
        }).set_frame_rate(audio.frame_rate)
        
        # 2. Apply formant shifting
        samples = np.array(audio.get_array_of_samples())
        formant_range = self.disguise_settings.get('formant_shift_range', [0.95, 1.05])
        formant_shift = random.uniform(formant_range[0], formant_range[1])  # Subtle formant shift
        
        # Simple formant shifting using resampling
        resampled_length = int(len(samples) / formant_shift)
        resampled = signal.resample(samples, resampled_length)
        
        # Stretch back to original length with pitch preservation
        stretched = signal.resample(resampled, len(samples))
        
        audio = audio._spawn(stretched.astype(np.int16).tobytes(),
                           overrides={"frame_rate": audio.frame_rate})
        
        # 3. Add subtle texture variations
        samples = np.array(audio.get_array_of_samples())
        
        # Add very subtle vibrato
        freq_range = self.disguise_settings.get('vibrato_freq_range', [4.0, 6.0])
        depth_range = self.disguise_settings.get('vibrato_depth_range', [0.02, 0.04])
        vibrato_freq = random.uniform(freq_range[0], freq_range[1])  # Hz
        vibrato_depth = random.uniform(depth_range[0], depth_range[1])  # Very subtle
        vibrato = 1 + vibrato_depth * np.sin(2 * np.pi * vibrato_freq * np.arange(len(samples)) / audio.frame_rate)
        
        textured = samples * vibrato
        audio = audio._spawn(textured.astype(np.int16).tobytes(),
                           overrides={"frame_rate": audio.frame_rate})
        
        # 4. Apply subtle filtering
        # Random subtle EQ to change voice character
        if random.random() > 0.5:
            # Slightly boost low frequencies
            audio = audio.low_pass_filter(8000) + 1
        else:
            # Slightly boost high frequencies  
            audio = audio.high_pass_filter(200) + 1
            
        # 5. Add subtle room acoustics
        # Very light reverb
        reverb_audio = audio
        delays = [30, 60, 90]  # Short delays for subtle effect
        reverb_decay = self.disguise_settings.get('reverb_decay', 0.15)
        for delay in delays:
            delayed = AudioSegment.silent(duration=delay) + audio * reverb_decay
            reverb_audio = reverb_audio.overlay(delayed)
        
        audio = reverb_audio
        
        # 6. Add very subtle background ambience
        # Generate subtle room tone
        noise_duration = len(audio)
        noise = WhiteNoise().to_audio_segment(duration=noise_duration)
        ambience_level = self.disguise_settings.get('ambience_level', -55)
        noise = noise + ambience_level  # Very quiet
        noise = noise.low_pass_filter(1000)  # Room tone character
        
        # Mix with original
        audio = audio.overlay(noise)
        
        # 7. Apply subtle dynamic processing
        # Soft compression to change voice dynamics
        samples = np.array(audio.get_array_of_samples())
        
        # Simple soft knee compression
        threshold = np.percentile(np.abs(samples), 85)
        ratio = 2.0  # Gentle compression
        
        compressed = samples.copy()
        mask = np.abs(samples) > threshold
        compressed[mask] = np.sign(samples[mask]) * (threshold + (np.abs(samples[mask]) - threshold) / ratio)
        
        audio = audio._spawn(compressed.astype(np.int16).tobytes(),
                           overrides={"frame_rate": audio.frame_rate})
        
        # Normalize to maintain consistent volume
        audio = normalize(audio)
        
        # Save with a new filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = OUTPUT_FOLDER / f"disguised_{voice_name}_{timestamp}.mp3"
        audio.export(str(output_file), format="mp3", bitrate="192k")
        
        return str(output_file)

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
        # Use config default or True if not specified
        default_disguise = transformer.config.get('tts', {}).get('apply_disguise_by_default', True)
        apply_disguise = data.get('apply_disguise', default_disguise)
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
            
        output_file = transformer.transform_with_openai(text, voice, speed, apply_disguise)
        
        return jsonify({
            "status": "transformed",
            "file": output_file,
            "filename": os.path.basename(output_file),
            "disguised": apply_disguise
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
        "alien": {"name": "Alien", "params": {}},
        "formant_shift": {"name": "Formant Shift", "params": {"shift_factor": {"min": 0.8, "max": 1.3, "default": 1.1}}},
        "add_ambience": {"name": "Add Ambience", "params": {"level": {"min": 0.01, "max": 0.1, "default": 0.03}}},
        "subtle_reverb": {"name": "Subtle Reverb", "params": {"decay": {"min": 0.1, "max": 0.5, "default": 0.3}}},
        "vocal_texture": {"name": "Vocal Texture", "params": {}}
    }
    return jsonify({"effects": effects})

if __name__ == '__main__':
    # Load configuration
    config = load_config()
    
    # Initialize transformer with API key
    # Prioritize environment variable over config file
    api_key = os.environ.get('OPENAI_API_KEY') or config.get('openai_api_key')
    if api_key:
        transformer = VoiceTransformer(api_key, config)
        print("Voice Changer initialized with OpenAI API key")
        print("Voice disguise is enabled by default to make OpenAI voices less recognizable")
    else:
        print("Warning: OpenAI API key not found. TTS features will be disabled.")
        transformer = VoiceTransformer(config=config)
    
    # Run the Flask app
    app.run(debug=True, port=5000)