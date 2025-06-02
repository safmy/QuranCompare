#!/usr/bin/env python3
"""Test script for Arabic utilities"""

from arabic_utils import (
    normalize_arabic_text,
    transliterate_to_arabic,
    is_arabic_text,
    enhance_arabic_search_query,
    get_phonetic_variations,
    fuzzy_arabic_match
)

def test_arabic_utils():
    print("Testing Arabic Utilities\n")
    
    # Test 1: Arabic text detection
    print("1. Testing Arabic text detection:")
    test_texts = ["Hello", "قل هو الله أحد", "Kulhu", "مرحبا Hello"]
    for text in test_texts:
        print(f"   '{text}' is Arabic: {is_arabic_text(text)}")
    
    # Test 2: Transliteration
    print("\n2. Testing transliteration:")
    transliterations = ["kulhu", "allah", "bismillah", "alhamdulillah", "rahman"]
    for text in transliterations:
        result = transliterate_to_arabic(text)
        print(f"   '{text}' → '{result}'")
    
    # Test 3: Normalization
    print("\n3. Testing normalization:")
    arabic_texts = ["قُلْ هُوَ", "اللَّهُ", "الرَّحْمَٰنِ"]
    for text in arabic_texts:
        normalized = normalize_arabic_text(text)
        print(f"   '{text}' → '{normalized}'")
    
    # Test 4: Enhanced search query
    print("\n4. Testing enhanced search query:")
    queries = ["kulhu", "قُلْ هُوَ", "say he is", "الله أحد"]
    for query in queries:
        enhanced = enhance_arabic_search_query(query)
        print(f"   '{query}' → '{enhanced}'")
    
    # Test 5: Phonetic variations
    print("\n5. Testing phonetic variations:")
    test_words = ["kulhu", "allah", "قل هو"]
    for word in test_words:
        variations = get_phonetic_variations(word)
        print(f"   '{word}' variations: {variations}")
    
    # Test 6: Fuzzy matching
    print("\n6. Testing fuzzy matching:")
    match_pairs = [
        ("قُلْ هُوَ", "قل هو"),
        ("kulhu", "قل هو"),
        ("اللَّهُ", "الله"),
        ("rahman", "رحمن")
    ]
    for text1, text2 in match_pairs:
        match = fuzzy_arabic_match(text1, text2)
        print(f"   '{text1}' matches '{text2}': {match}")

if __name__ == "__main__":
    test_arabic_utils()