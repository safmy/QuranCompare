#!/usr/bin/env python3
"""
Test script for Arabic embeddings functionality
"""

import os
import sys
import json
from pathlib import Path

# Add current directory to path for imports
sys.path.append(os.path.dirname(__file__))

def test_create_embeddings():
    """Test creating Arabic embeddings"""
    print("Testing Arabic embeddings creation...")
    
    # Check if verses file exists
    verses_file = Path(__file__).parent.parent / "public" / "verses_final.json"
    if not verses_file.exists():
        print(f"❌ Verses file not found: {verses_file}")
        return False
    
    print(f"✅ Found verses file: {verses_file}")
    
    # Check for OpenAI API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable not set")
        print("Set it with: export OPENAI_API_KEY='your-api-key'")
        return False
    
    print("✅ OpenAI API key found")
    
    # Try importing the create script
    try:
        from create_arabic_embeddings import load_verses, create_arabic_embeddings
        print("✅ Successfully imported Arabic embeddings module")
    except ImportError as e:
        print(f"❌ Failed to import create_arabic_embeddings: {e}")
        return False
    
    # Load a small sample of verses for testing
    print("\nLoading verses...")
    try:
        verses = load_verses(verses_file)
        print(f"✅ Loaded {len(verses)} verses")
        
        # Test with just first 5 verses
        test_verses = verses[:5]
        print(f"Testing with {len(test_verses)} verses...")
        
        # Create embeddings
        embeddings, verse_texts, verse_metadata = create_arabic_embeddings(test_verses, batch_size=5)
        
        print(f"✅ Created {len(embeddings)} embeddings")
        print(f"✅ Arabic texts: {len(verse_texts)}")
        print(f"✅ Metadata entries: {len(verse_metadata)}")
        
        # Show sample
        if verse_texts:
            print(f"\nSample Arabic text: {verse_texts[0]}")
            print(f"Sample metadata: {json.dumps(verse_metadata[0], ensure_ascii=False, indent=2)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False

def test_arabic_utils():
    """Test Arabic utilities"""
    print("\nTesting Arabic utilities...")
    
    try:
        from arabic_utils import is_arabic_text, enhance_arabic_search_query, normalize_arabic_text
        
        # Test Arabic detection
        test_cases = [
            ("بِسْمِ ٱللَّهِ", True),
            ("Bismillah", False),
            ("Hello world", False),
            ("الحمد لله", True)
        ]
        
        for text, expected in test_cases:
            result = is_arabic_text(text)
            status = "✅" if result == expected else "❌"
            print(f"{status} is_arabic_text('{text}') = {result} (expected {expected})")
        
        # Test query enhancement
        queries = ["Bismillah", "بِسْمِ ٱللَّهِ", "Allah"]
        for query in queries:
            enhanced = enhance_arabic_search_query(query)
            print(f"✅ enhance_arabic_search_query('{query}') = '{enhanced}'")
        
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import arabic_utils: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing Arabic utilities: {e}")
        return False

def test_vector_loader():
    """Test vector loader configuration"""
    print("\nTesting vector loader configuration...")
    
    try:
        from vector_loader import get_vector_urls
        
        urls = get_vector_urls()
        
        if "ArabicVerses" in urls:
            print("✅ ArabicVerses collection configured in vector loader")
            print(f"  FAISS URL: {urls['ArabicVerses']['faiss']}")
            print(f"  JSON URL: {urls['ArabicVerses']['json']}")
        else:
            print("❌ ArabicVerses collection not found in vector loader")
            return False
        
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import vector_loader: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing vector loader: {e}")
        return False

def main():
    """Run all tests"""
    print("🔍 Testing Arabic Embeddings Setup\n")
    
    tests = [
        ("Arabic Utilities", test_arabic_utils),
        ("Vector Loader Config", test_vector_loader),
        ("Create Embeddings", test_create_embeddings)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Testing: {test_name}")
        print('='*50)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test '{test_name}' failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*50}")
    print("TEST SUMMARY")
    print('='*50)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    total_passed = sum(1 for _, passed in results if passed)
    total_tests = len(results)
    
    print(f"\nResults: {total_passed}/{total_tests} tests passed")
    
    if total_passed == total_tests:
        print("\n🎉 All tests passed! Ready to create Arabic embeddings.")
        print("\nNext steps:")
        print("1. Run: python create_arabic_embeddings.py")
        print("2. Upload embeddings: python upload_vectors.py --provider github --github-repo safmy/QuranCompare --source-dir api/arabic_embeddings")
        print("3. Deploy API with Arabic embeddings support")
    else:
        print(f"\n⚠️  {total_tests - total_passed} test(s) failed. Please fix issues before proceeding.")

if __name__ == "__main__":
    main()