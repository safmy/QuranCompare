# Domain Voice Changer

A comprehensive voice changing application with AI-powered text-to-speech and audio effects.

## Features

- **Voice Recording**: Record audio directly from your microphone with real-time visualization
- **File Upload**: Upload existing audio files (MP3, WAV, M4A, OGG)
- **Speech-to-Text**: Transcribe audio to text using OpenAI's Whisper
- **Text-to-Speech**: Generate natural speech with multiple voice options
- **Voice Disguise**: Automatically applies subtle modifications to OpenAI TTS voices to make them less recognizable:
  - Subtle pitch variations
  - Formant shifting for voice character modification
  - Light distortion and filtering
  - Background ambience mixing
  - Subtle reverb for room acoustics
  - Dynamic processing for natural variation
- **Audio Effects**: Apply various effects including:
  - Pitch shifting
  - Robot voice
  - Echo/Reverb
  - Reverse
  - Speed change
  - Whisper effect
  - Deep voice
  - Alien voice
  - Formant shifting
  - Vocal texture
  - Subtle reverb
  - Background ambience

## Setup

### Prerequisites

- Python 3.8 or higher
- FFmpeg (for audio processing)
- OpenAI API key

### Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install FFmpeg:
- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

3. Configure the application:
   - Create a `.env` file in the voice_changer directory
   - Add your OpenAI API key: `OPENAI_API_KEY=your-api-key-here`
   - Or update `config.json` with your API key (`.env` takes precedence)

### Running the Application

1. Start the server:
```bash
python voice_changer.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage

### Recording Audio
1. Click "Start Recording" to begin recording from your microphone
2. Speak or make sounds
3. Click "Stop Recording" when finished
4. Your recording will be automatically saved

### Uploading Audio
1. Click the upload area or drag and drop an audio file
2. Supported formats: MP3, WAV, M4A, OGG

### Text-to-Speech
1. Enter or paste text in the text area
2. Select a voice from the available options:
   - **Alloy**: Neutral, balanced voice
   - **Echo**: Male, conversational
   - **Fable**: Male with British accent
   - **Onyx**: Male, deep and authoritative
   - **Nova**: Female, friendly and warm
   - **Shimmer**: Female, soft and gentle
3. Adjust speech speed if desired
4. Click "Generate Speech"

**Note**: Voice disguise is enabled by default to make OpenAI voices sound less recognizable. Each generation will have subtle variations in pitch, tone, and acoustic properties.

### Applying Effects
1. Upload or record audio first
2. Switch to the "Audio Effects" tab
3. Select an effect
4. Adjust parameters if available
5. Click "Apply Effect"

### Downloading Results
- All transformed audio files can be played directly in the browser
- Click the "Download" button to save files locally

## API Endpoints

- `POST /api/start_recording` - Start audio recording
- `POST /api/stop_recording` - Stop recording and save
- `POST /api/upload_audio` - Upload audio file
- `POST /api/transcribe` - Transcribe audio to text
- `POST /api/transform_tts` - Generate speech from text
- `POST /api/apply_effect` - Apply audio effect
- `GET /api/download/<filename>` - Download audio file
- `GET /api/get_voices` - Get available TTS voices
- `GET /api/get_effects` - Get available audio effects

## Configuration

Edit `config.json` to customize:
- API keys
- Server settings
- Audio parameters
- File size limits
- Storage settings

### Voice Disguise Settings

The voice disguise feature can be configured in `config.json`:

```json
"tts": {
    "apply_disguise_by_default": true,
    "disguise_settings": {
        "pitch_variation_range": [-1.5, 1.5],
        "formant_shift_range": [0.95, 1.05],
        "vibrato_freq_range": [4.0, 6.0],
        "vibrato_depth_range": [0.02, 0.04],
        "ambience_level": -55,
        "reverb_decay": 0.15
    }
}
```

- **apply_disguise_by_default**: Whether to automatically disguise OpenAI voices
- **pitch_variation_range**: Random pitch shift in semitones
- **formant_shift_range**: Voice character modification range
- **vibrato_freq_range**: Subtle vibrato frequency in Hz
- **vibrato_depth_range**: Vibrato intensity
- **ambience_level**: Background room tone level in dB
- **reverb_decay**: Room acoustics intensity

## Troubleshooting

### PyAudio Installation Issues
If you encounter issues installing PyAudio:

**macOS**:
```bash
brew install portaudio
pip install pyaudio
```

**Windows**:
```bash
pip install pipwin
pipwin install pyaudio
```

**Linux**:
```bash
sudo apt-get install portaudio19-dev
pip install pyaudio
```

### Microphone Access
- Ensure your browser has permission to access the microphone
- Check system settings for microphone permissions

### FFmpeg Not Found
- Ensure FFmpeg is installed and in your system PATH
- Restart your terminal/command prompt after installation

## Security Notes

- Never commit your API keys to version control
- Use environment variables for sensitive configuration
- The application includes CORS support for development

## License

This project is part of the QuranCompare application suite.