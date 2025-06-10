#!/usr/bin/env python3
"""Test the enhanced debate endpoint"""

import requests
import json

API_URL = "http://localhost:8001"  # Change to your API URL

def test_enhanced_debate():
    """Test the enhanced debate endpoint"""
    
    # Test question about imam/leadership
    test_request = {
        "message": "Give me an in depth understanding of what it takes to be the imam of the religion.",
        "isNewTopic": True,
        "conversationHistory": [],
        "currentTab": "debater",
        "currentVerses": [],
        "searchContext": None,
        "userLanguage": "en"
    }
    
    try:
        response = requests.post(
            f"{API_URL}/debate/enhanced",
            json=test_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print("=== RESPONSE ===")
            print(data['response'])
            print("\n=== RELATED VERSES ===")
            for verse in data.get('relatedVerses', []):
                print(f"[{verse['sura_verse']}] {verse['english'][:100]}...")
            print("\n=== SEARCH RESULTS ===")
            for result in data.get('searchResults', []):
                print(f"- {result['title']} ({result['source']})")
            print("\n=== ROOT ANALYSIS ===")
            for root in data.get('rootAnalysis', []):
                print(f"- {root['root']}: {root['meaning']} (in {root['frequency']} verses)")
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_enhanced_debate()