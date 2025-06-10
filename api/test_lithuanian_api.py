#!/usr/bin/env python3
"""Test script to verify Lithuanian translations are returned by the API"""

import requests
import json

# Test the local API
API_URL = "http://localhost:8001"

def test_verse_endpoint():
    """Test if /verses endpoint returns Lithuanian translations"""
    
    # Test verse 1:1
    payload = {
        "verse_range": "1:1"
    }
    
    try:
        response = requests.post(f"{API_URL}/verses", json=payload)
        if response.status_code == 200:
            data = response.json()
            if data["verses"]:
                verse = data["verses"][0]
                print(f"Testing verse {verse['sura_verse']}:")
                print(f"- English: {verse.get('english', 'NOT FOUND')[:50]}...")
                print(f"- Lithuanian: {verse.get('lithuanian', 'NOT FOUND')[:50]}...")
                print(f"- Bengali: {verse.get('bengali', 'NOT FOUND')[:50]}...")
                print(f"- Has Lithuanian field: {'lithuanian' in verse}")
                print(f"- Has Bengali field: {'bengali' in verse}")
                print("\nAll fields in response:")
                for key in sorted(verse.keys()):
                    if key not in ['roots', 'meanings']:  # Skip these long fields
                        value = verse[key]
                        if value and isinstance(value, str):
                            print(f"  {key}: {value[:50]}...")
                        else:
                            print(f"  {key}: {value}")
            else:
                print("No verses returned")
        else:
            print(f"API returned status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error calling API: {e}")

if __name__ == "__main__":
    test_verse_endpoint()