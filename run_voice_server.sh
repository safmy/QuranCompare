#!/bin/bash

echo "Setting up Voice Persona Server..."

# Navigate to voice_persona directory
cd voice_persona

# Check if virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install pyaudio numpy scipy flask flask-cors

# Start the server
echo "Starting Voice Persona Server on port 8888..."
echo "The server will be available at http://localhost:8888"
echo "Use Ctrl+C to stop the server"
python voice_persona_simple.py