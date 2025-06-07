from flask import jsonify, request, Response
import openai
import os
import io

def add_tts_routes(app):
    """Add TTS generation endpoint to the Flask app"""
    
    @app.route('/generate-tts', methods=['POST'])
    def generate_tts():
        try:
            data = request.json
            text = data.get('text', '')
            voice = data.get('voice', 'onyx')
            speed = data.get('speed', 0.8)
            
            if not text:
                return jsonify({'error': 'No text provided'}), 400
            
            # Initialize OpenAI client
            client = openai.OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
            
            # Generate speech
            response = client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text,
                speed=speed
            )
            
            # Convert to bytes
            audio_bytes = io.BytesIO()
            for chunk in response.iter_bytes():
                audio_bytes.write(chunk)
            audio_bytes.seek(0)
            
            # Return audio file
            return Response(
                audio_bytes.read(),
                mimetype='audio/mpeg',
                headers={
                    'Content-Disposition': 'inline; filename="chunk.mp3"',
                    'Access-Control-Allow-Origin': '*'
                }
            )
            
        except Exception as e:
            print(f"TTS generation error: {str(e)}")
            return jsonify({'error': str(e)}), 500
    
    @app.route('/generate-tts', methods=['OPTIONS'])
    def tts_options():
        # Handle preflight requests
        return '', 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }