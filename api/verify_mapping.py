#!/usr/bin/env python3
"""Verify the correct text index for age of 40 content"""

import json

# Load RashadAllMedia texts
with open('../../data/RashadAllMedia.json', 'r') as f:
    data = json.load(f)
    texts = data['texts']

# Search for the "age of 40" content
search_phrase = "The human being is given 40 years to study"

for idx, text in enumerate(texts):
    if search_phrase in text:
        print(f"Found at index {idx}")
        print(f"Text snippet: {text[:200]}...")
        
        # Check if this index has a mapping
        with open('youtube_search_results_updated.json', 'r') as f:
            youtube_data = json.load(f)
            
        for item in youtube_data:
            if item.get('text_index') == idx:
                print(f"\nMatched to video:")
                print(f"  Title: {item['video_title']}")
                print(f"  Link: {item['video_link']}")
                break
        break