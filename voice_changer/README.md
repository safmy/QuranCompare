# Domain Voice Changer

A comprehensive voice changing application with AI-powered text-to-speech and audio effects.

## Features

- **Voice Recording**: Record audio directly from your microphone with real-time visualization
- **File Upload**: Upload existing audio files (MP3, WAV, M4A, OGG)
- **Speech-to-Text**: Transcribe audio to text using OpenAI's Whisper
- **Text-to-Speech**: Generate natural speech with multiple voice options
- **Audio Effects**: Apply various effects including:
  - Pitch shifting
  - Robot voice
  - Echo/Reverb
  - Reverse
  - Speed change
  - Whisper effect
  - Deep voice
  - Alien voice

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
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to the `.env` file
   - Or update `config.json` with your API key

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