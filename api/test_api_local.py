#!/usr/bin/env python3
"""
Test the full vector search API locally
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add the current directory to the path
sys.path.append(os.path.dirname(__file__))

from vector_search_api import load_vector_collections, create_embedding, VECTOR_COLLECTIONS, COMBINED_INDEX, COMBINED_METADATA
from arabic_utils import enhance_arabic_search_query
import openai
from openai import OpenAI

async def test_api_locally():
    """Test the API functionality locally"""
    
    print("🧪 Testing Vector Search API Locally")
    print("====================================\n")
    
    # Initialize OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY not set")
        return
    
    client = OpenAI(api_key=api_key)
    
    # Manually set the global client variable
    import vector_search_api
    vector_search_api.client = client
    
    print("✅ OpenAI client initialized")
    
    # Load vector collections
    print("\n📦 Loading vector collections...")
    load_vector_collections()
    
    # Get the current values after loading
    from vector_search_api import VECTOR_COLLECTIONS, COMBINED_INDEX, COMBINED_METADATA
    
    if not VECTOR_COLLECTIONS:
        print("❌ No vector collections loaded")
        return
    
    print(f"✅ Loaded {len(VECTOR_COLLECTIONS)} collections:")
    for name, collection in VECTOR_COLLECTIONS.items():
        print(f"   - {name}: {collection['size']} vectors")
    
    if not COMBINED_INDEX:
        print("❌ Combined index not created")
        return
    
    print(f"✅ Combined index created with {COMBINED_INDEX.ntotal} total vectors")
    
    # Test Arabic search queries
    test_queries = [
        {
            "query": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
            "description": "Full Bismillah in Arabic",
            "expect_verse": "1:1"
        },
        {
            "query": "بسم الله",
            "description": "Simple Bismillah",
            "expect_verse": "1:1"
        },
        {
            "query": "bismillah", 
            "description": "Transliterated Bismillah",
            "expect_verse": "1:1"
        },
        {
            "query": "ٱلْحَمْدُ لِلَّهِ",
            "description": "Alhamdulillah",
            "expect_verse": "1:2"
        }
    ]
    
    print("\n🔍 Testing Arabic search queries...")
    
    for test in test_queries:
        print(f"\n--- Testing: {test['description']} ---")
        print(f"Query: '{test['query']}'")
        
        try:
            # Enhance the query
            enhanced_query = enhance_arabic_search_query(test['query'])
            print(f"Enhanced: '{enhanced_query}'")
            
            # Create embedding
            query_embedding = create_embedding(test['query'])
            query_embedding = query_embedding.reshape(1, -1)
            
            # Search
            distances, indices = COMBINED_INDEX.search(query_embedding, 5)
            
            print("Top 5 results:")
            found_expected = False
            
            for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                if idx < 0 or idx >= len(COMBINED_METADATA):
                    continue
                    
                combined_meta = COMBINED_METADATA[idx]
                collection = combined_meta["collection"]
                metadata = combined_meta["metadata"]
                
                similarity = float(1 / (1 + distance))
                
                if collection == "ArabicVerses":
                    sura_verse = metadata.get('sura_verse', 'Unknown')
                    arabic = metadata.get('arabic', '')[:50]
                    english = metadata.get('english', '')[:100]
                    
                    print(f"  {i+1}. [{collection}] {sura_verse} (sim: {similarity:.3f})")
                    print(f"      Arabic: {arabic}...")
                    print(f"      English: {english}...")
                    
                    if sura_verse == test.get('expect_verse'):
                        found_expected = True
                        print(f"      ✅ Found expected verse!")
                
                elif collection == "FinalTestament":
                    # Handle Final Testament format
                    content = metadata.get('content', '')[:100]
                    print(f"  {i+1}. [{collection}] (sim: {similarity:.3f})")
                    print(f"      Content: {content}...")
                
                else:
                    title = metadata.get('title', 'Unknown')[:50]
                    print(f"  {i+1}. [{collection}] {title} (sim: {similarity:.3f})")
            
            if test.get('expect_verse') and not found_expected:
                print(f"      ❌ Expected verse {test['expect_verse']} not found in top 5")
            
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n✅ API testing completed!")

if __name__ == "__main__":
    asyncio.run(test_api_locally())