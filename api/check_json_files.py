#!/usr/bin/env python3
"""
Check the JSON files to see their structure
"""

import json
import requests

urls = {
    "RashadAllMedia": "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.json",
    "FinalTestament": "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/FinalTestament.json",
    "QuranTalkArticles": "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/qurantalk_articles_1744655632.json"
}

for name, url in urls.items():
    print(f"\n{name}:")
    print("-" * 50)
    
    try:
        response = requests.get(url)
        data = response.json()
        
        print(f"Type: {type(data)}")
        
        if isinstance(data, list):
            print(f"Number of items: {len(data)}")
            if len(data) > 0:
                print(f"First item: {json.dumps(data[0], indent=2)[:200]}...")
                print(f"Keys in first item: {list(data[0].keys()) if isinstance(data[0], dict) else 'Not a dict'}")
        elif isinstance(data, dict):
            print(f"Keys: {list(data.keys())}")
            print(f"Sample: {json.dumps(data, indent=2)[:200]}...")
    except Exception as e:
        print(f"Error: {e}")