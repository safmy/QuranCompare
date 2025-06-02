#!/usr/bin/env python3
"""
Test script for Arabic search functionality
"""

import json
import faiss
import numpy as np
import sys
import os
from pathlib import Path

# Add the current directory to the path so we can import modules
sys.path.append(os.path.dirname(__file__))

from arabic_utils import normalize_arabic_text, enhance_arabic_search_query, is_arabic_text

def test_arabic_search():
    """Test Arabic search with local embeddings"""
    
    # Load the Arabic embeddings
    embeddings_dir = Path(__file__).parent / "arabic_embeddings"
    faiss_path = embeddings_dir / "arabic_verses.faiss"
    json_path = embeddings_dir / "arabic_verses.json"
    
    if not faiss_path.exists() or not json_path.exists():
        print("❌ Arabic embeddings not found")
        return
    
    print("✅ Loading Arabic embeddings...")
    
    # Load FAISS index
    index = faiss.read_index(str(faiss_path))
    
    # Load metadata
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    metadata = data.get('metadata', [])
    texts = data.get('texts', [])
    
    print(f"Loaded {index.ntotal} vectors, {len(metadata)} metadata entries")
    
    # Test queries
    test_queries = [
        "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",  # Full Bismillah
        "بسم الله",  # Simple Bismillah
        "bismillah",  # Transliterated
        "ٱلْحَمْدُ لِلَّهِ",  # Alhamdulillah
        "قل هو",  # Qul hu
    ]
    
    # Test without OpenAI (using pre-existing embeddings)
    print("\n🔍 Testing search functionality...")
    
    for query in test_queries:
        print(f"\n--- Testing query: '{query}' ---")
        
        # Normalize the query
        enhanced_query = enhance_arabic_search_query(query)
        print(f"Enhanced query: '{enhanced_query}'")
        
        # Find matches in texts by text similarity
        matches = []
        for i, text in enumerate(texts):
            normalized_text = normalize_arabic_text(text)
            normalized_query = normalize_arabic_text(enhanced_query)
            
            # Check for exact or partial matches
            if normalized_query in normalized_text or normalized_text.startswith(normalized_query):
                if i < len(metadata):
                    verse_meta = metadata[i]
                    matches.append((i, verse_meta, 1.0))  # Perfect match score
                else:
                    matches.append((i, {"arabic": text, "sura_verse": f"Unknown:{i}"}, 1.0))
        
        # Show results
        if matches:
            print(f"Found {len(matches)} matches:")
            for i, (idx, meta, score) in enumerate(matches[:5]):
                sura_verse = meta.get('sura_verse', f'Index {idx}')
                arabic = meta.get('arabic', texts[idx] if idx < len(texts) else 'Unknown')
                english = meta.get('english', 'No English translation')[:100]
                print(f"  {i+1}. {sura_verse}: {arabic}")
                print(f"     English: {english}...")
        else:
            print("No matches found")
    
    # Test verse 1:1 specifically
    print(f"\n--- Checking verse 1:1 specifically ---")
    verse_1_1 = None
    for i, meta in enumerate(metadata):
        if meta.get('sura_verse') == '1:1':
            verse_1_1 = meta
            print(f"✅ Found verse 1:1 at index {i}")
            print(f"   Arabic: {verse_1_1.get('arabic', 'No Arabic')}")
            print(f"   English: {verse_1_1.get('english', 'No English')}")
            break
    
    if not verse_1_1:
        print("❌ Verse 1:1 not found in metadata")

if __name__ == "__main__":
    test_arabic_search()