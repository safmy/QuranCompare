#!/usr/bin/env python3
"""
Example usage of the Voice Changer with disguise feature
This demonstrates how to use the voice changer programmatically
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from voice_changer import VoiceTransformer, load_config

# Load environment variables
load_dotenv()

def main():
    """Example usage of voice changer"""
    
    # Load configuration
    config = load_config()
    
    # Get API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        print("Error: Please set OPENAI_API_KEY in .env file")
        return
    
    # Initialize transformer
    transformer = VoiceTransformer(api_key, config)
    
    # Example 1: Simple text-to-speech with disguise
    print("Example 1: Simple TTS with automatic disguise")
    text = "Welcome to the voice changer system. This voice has been automatically disguised."
    output_file = transformer.transform_with_openai(text, voice="nova")
    print(f"Generated: {output_file}")
    
    # Example 2: Generate multiple variations of the same text
    print("\nExample 2: Multiple variations of the same text")
    text = "This is a test message."
    for i in range(3):
        output_file = transformer.transform_with_openai(text, voice="alloy")
        print(f"Variation {i+1}: {output_file}")
    
    # Example 3: Compare disguised vs non-disguised
    print("\nExample 3: Disguised vs Non-disguised comparison")
    text = "Compare this voice with and without disguise."
    
    # With disguise
    disguised = transformer.transform_with_openai(text, voice="echo", apply_disguise=True)
    print(f"With disguise: {disguised}")
    
    # Without disguise
    normal = transformer.transform_with_openai(text, voice="echo", apply_disguise=False)
    print(f"Without disguise: {normal}")
    
    # Example 4: Apply additional effects to disguised voice
    print("\nExample 4: Apply additional effects")
    text = "This voice has been disguised and then modified with effects."
    
    # Generate disguised voice
    disguised_file = transformer.transform_with_openai(text, voice="onyx")
    
    # Apply echo effect
    echo_file = transformer.apply_effect(disguised_file, "echo", {"delay": 300, "decay": 0.4})
    print(f"With echo effect: {echo_file}")
    
    # Apply subtle reverb
    reverb_file = transformer.apply_effect(disguised_file, "subtle_reverb", {"decay": 0.25})
    print(f"With reverb: {reverb_file}")
    
    print("\nAll examples completed! Check the outputs folder for generated files.")

if __name__ == "__main__":
    main()