// Voice API Configuration
// Update VOICE_API_URL when you deploy to Render

const VOICE_API_URL = process.env.REACT_APP_VOICE_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://quran-voice-persona.onrender.com' // Update this with your Render URL
    : 'http://localhost:8888');

export default VOICE_API_URL;