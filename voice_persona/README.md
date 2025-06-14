# Voice Persona API

This is the voice transformation API for the QuranCompare Domain Control Panel.

## Deployment to Render

1. **Create a new Render account** at https://render.com if you don't have one

2. **Deploy from GitHub:**
   - Push the voice_persona folder to your GitHub repository
   - In Render, create a new Web Service
   - Connect your GitHub repository
   - Set the root directory to `voice_persona`
   - Render will automatically detect it's a Python app

3. **Manual deployment alternative:**
   - Create a new Web Service in Render
   - Choose "Deploy from Git" 
   - Set the following:
     - **Name**: quran-voice-persona (or your preferred name)
     - **Root Directory**: voice_persona
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn voice_persona_web:app`
     - **Plan**: Free

4. **After deployment:**
   - Copy your Render URL (e.g., https://quran-voice-persona.onrender.com)
   - Add it to Netlify environment variables:
     - Go to Netlify > Site Settings > Environment Variables
     - Add: `REACT_APP_VOICE_API_URL` = `https://your-app.onrender.com`
   - Redeploy your Netlify site

## Local Development

For local testing with PyAudio support:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pyaudio  # For local testing only
python voice_persona_simple.py  # For local real-time processing
# OR
python voice_persona_web.py  # For file-based processing
```

## API Endpoints

- `GET /` - API status
- `GET /api/personas` - List available voice personas
- `POST /api/transform_voice` - Transform audio file
  - Form data: `audio` (file), `persona` (string)
  - Returns: Transformed audio file (WAV)

## Available Personas

- british_woman - Sophisticated British accent
- indian_man - Warm Indian accent  
- american_woman - Clear American accent
- australian_man - Relaxed Australian accent
- french_woman - Elegant French accent
- spanish_woman - Passionate Spanish accent
- japanese_woman - Gentle Japanese accent
- german_man - Precise German accent
- irish_woman - Lyrical Irish accent
- canadian_man - Friendly Canadian accent