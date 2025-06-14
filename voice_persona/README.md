# Voice Persona API

This is the voice transformation API for the QuranCompare Domain Control Panel.

## Deployment to Render

### Option 1: Deploy from Render Dashboard (Recommended)

1. **Create a new Render account** at https://render.com if you don't have one

2. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub account if not already connected
   - Select your repository: `safmy/QuranCompare`
   
3. **Configure the service:**
   - **Name**: `quran-voice-persona`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `voice_persona`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn voice_persona_web:app`
   - **Instance Type**: Free
   
4. **Environment Variables:**
   - Add `PYTHON_VERSION` = `3.11.0`

### Option 2: Manual Deployment via Render YAML

The repository includes a `render.yaml` file for automatic configuration.

### Troubleshooting

If Render tries to build as Node.js instead of Python:
1. Make sure "Root Directory" is set to `voice_persona`
2. Ensure "Runtime" is set to "Python 3" not "Node"
3. The presence of `requirements.txt` and `runtime.txt` should help Render detect Python

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