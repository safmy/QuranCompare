#!/usr/bin/env python3
"""
Test script for Voice Changer with disguise feature
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from voice_changer import VoiceTransformer, load_config

# Load environment variables
load_dotenv()

def test_voice_disguise():
    """Test the voice disguise functionality"""
    
    # Load configuration
    config = load_config()
    
    # Get API key from environment or config
    api_key = os.environ.get('OPENAI_API_KEY') or config.get('openai_api_key')
    
    if not api_key:
        print("Error: OpenAI API key not found in .env file or config.json")
        return
    
    print(f"API Key found: {api_key[:10]}...")
    
    # Initialize transformer
    transformer = VoiceTransformer(api_key, config)
    
    # Test text
    test_text = "Hello, this is a test of the voice disguise system. Each time you generate this text, it should sound slightly different."
    
    print("\nTesting voice disguise feature...")
    print(f"Text: {test_text}")
    
    # Test each voice with disguise
    voices = ["alloy", "echo", "nova"]
    
    for voice in voices:
        print(f"\nTesting voice: {voice}")
        
        # Generate with disguise (default)
        print("  - Generating with disguise...")
        try:
            disguised_file = transformer.transform_with_openai(test_text, voice, speed=1.0, apply_disguise=True)
            print(f"    ✓ Disguised audio saved: {disguised_file}")
        except Exception as e:
            print(f"    ✗ Error: {e}")
        
        # Generate without disguise for comparison
        print("  - Generating without disguise...")
        try:
            normal_file = transformer.transform_with_openai(test_text, voice, speed=1.0, apply_disguise=False)
            print(f"    ✓ Normal audio saved: {normal_file}")
        except Exception as e:
            print(f"    ✗ Error: {e}")
    
    print("\nTest complete! Check the outputs folder for generated audio files.")
    print("The disguised versions should sound subtly different from the normal versions.")

if __name__ == "__main__":
    test_voice_disguise()