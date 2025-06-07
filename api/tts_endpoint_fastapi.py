from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openai
import os
import io
import logging

logger = logging.getLogger("TTS_API")

class TTSRequest(BaseModel):
    text: str
    voice: str = "onyx"
    speed: float = 0.8

def add_tts_routes(app):
    """Add TTS generation endpoint to the FastAPI app"""
    
    @app.post("/generate-tts")
    async def generate_tts(request: TTSRequest):
        try:
            if not request.text:
                raise HTTPException(status_code=400, detail="No text provided")
            
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
            
            logger.info(f"Generating TTS for text: {request.text[:50]}...")
            
            # Generate speech
            response = client.audio.speech.create(
                model="tts-1",
                voice=request.voice,
                input=request.text,
                speed=request.speed
            )
            
            # Convert to bytes
            audio_bytes = io.BytesIO()
            for chunk in response.iter_bytes():
                audio_bytes.write(chunk)
            audio_bytes.seek(0)
            
            # Return audio file as streaming response
            return StreamingResponse(
                audio_bytes,
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": 'inline; filename="chunk.mp3"',
                    "Cache-Control": "public, max-age=3600"
                }
            )
            
        except Exception as e:
            logger.error(f"TTS generation error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))