#!/bin/bash

# Voice Changer Application Startup Script

echo "Starting Voice Changer Application..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "WARNING: FFmpeg is not installed. Some audio features may not work."
    echo "Please install FFmpeg:"
    echo "  macOS: brew install ffmpeg"
    echo "  Ubuntu: sudo apt-get install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
fi

# Create necessary directories
mkdir -p uploads outputs static

# Check for OpenAI API key
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo "WARNING: OpenAI API key not found."
    echo "Please set OPENAI_API_KEY in .env file or environment variables."
    echo "TTS features will be disabled without an API key."
fi

# Start the application
echo "Starting server on http://localhost:5000"
python voice_changer.py