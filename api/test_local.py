#!/usr/bin/env python3
"""
Test script to verify API setup locally
"""

import os
import sys
import requests
from openai import OpenAI

def test_openai():
    """Test OpenAI connection"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not set")
        print("   Set it with: export OPENAI_API_KEY='your-key'")
        return False
    
    print(f"✅ OPENAI_API_KEY found: sk-...{api_key[-4:]}")
    
    try:
        client = OpenAI(api_key=api_key)
        # Test with a simple embedding
        response = client.embeddings.create(
            input="test",
            model="text-embedding-ada-002"
        )
        print("✅ OpenAI API connection successful")
        return True
    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        return False

def test_vector_urls():
    """Test if vector files are accessible"""
    urls = {
        "RashadAllMedia.faiss": "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.faiss",
        "RashadAllMedia.json": "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.json",
    }
    
    print("\nTesting vector file accessibility:")
    for name, url in urls.items():
        try:
            response = requests.head(url, allow_redirects=True, timeout=5)
            if response.status_code == 200:
                size_mb = int(response.headers.get('content-length', 0)) / (1024 * 1024)
                print(f"✅ {name}: {size_mb:.1f} MB")
            else:
                print(f"❌ {name}: HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ {name}: {e}")

def test_api_local():
    """Test if API is running locally"""
    try:
        response = requests.get("http://localhost:8001/health", timeout=2)
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ API is running locally")
            print(f"   Collections loaded: {data.get('collections_loaded', 0)}")
            print(f"   Total vectors: {data.get('total_vectors', 0)}")
        else:
            print(f"\n❌ API returned status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("\n❌ API not running locally")
        print("   Start it with: python vector_search_api.py")
    except Exception as e:
        print(f"\n❌ API error: {e}")

if __name__ == "__main__":
    print("🔍 Testing Vector Search API Setup\n")
    
    # Test OpenAI
    openai_ok = test_openai()
    
    # Test vector URLs
    test_vector_urls()
    
    # Test local API
    test_api_local()
    
    print("\n" + "="*50)
    if openai_ok:
        print("✅ Ready to deploy to Render!")
        print("\nNext steps:")
        print("1. Push changes to GitHub")
        print("2. Set OPENAI_API_KEY in Render Environment variables")
        print("3. Redeploy on Render")
    else:
        print("❌ Fix the issues above before deploying")