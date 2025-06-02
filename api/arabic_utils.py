"""
Arabic text processing utilities for search and matching
"""
import re
import unicodedata

# Common Arabic transliterations and their variations
TRANSLITERATION_MAP = {
    # Qul variations
    'kulhu': ['قل هو', 'قُلْ هُوَ'],
    'qulhu': ['قل هو', 'قُلْ هُوَ'],
    'qul hu': ['قل هو', 'قُلْ هُوَ'],
    'kul hu': ['قل هو', 'قُلْ هُوَ'],
    
    # Allah variations
    'allah': ['الله', 'اللَّه', 'اللَّهُ', 'اللَّهِ', 'ٱللَّه'],
    'allahu': ['الله', 'اللَّه', 'اللَّهُ'],
    'allahi': ['اللَّهِ'],
    
    # Common words
    'rahman': ['رحمن', 'الرحمن', 'رَحْمَٰن'],
    'rahim': ['رحيم', 'الرحيم', 'رَحِيم'],
    'bismillah': ['بسم الله', 'بِسْمِ اللَّه'],
    'alhamdulillah': ['الحمد لله', 'ٱلْحَمْدُ لِلَّه'],
    'inshallah': ['إن شاء الله', 'إِنْ شَاءَ اللَّه'],
    'mashallah': ['ما شاء الله', 'مَا شَاءَ اللَّه'],
    
    # Common Quranic phrases
    'la ilaha illallah': ['لا إله إلا الله', 'لَا إِلَٰهَ إِلَّا اللَّه'],
    'subhanallah': ['سبحان الله', 'سُبْحَانَ اللَّه'],
    'astaghfirullah': ['أستغفر الله', 'أَسْتَغْفِرُ اللَّه'],
}

# Arabic diacritics that can be removed for matching
ARABIC_DIACRITICS = re.compile(r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]')

def normalize_arabic_text(text):
    """
    Normalize Arabic text by removing diacritics and extra spaces
    """
    # Remove diacritics
    text = ARABIC_DIACRITICS.sub('', text)
    
    # Normalize unicode
    text = unicodedata.normalize('NFC', text)
    
    # Remove extra spaces
    text = ' '.join(text.split())
    
    return text

def transliterate_to_arabic(text):
    """
    Convert common transliterations to Arabic text
    """
    text_lower = text.lower().strip()
    
    # Check exact matches first
    if text_lower in TRANSLITERATION_MAP:
        return TRANSLITERATION_MAP[text_lower][0]
    
    # Check if the text contains any transliterated phrases
    for translit, arabic_variations in TRANSLITERATION_MAP.items():
        if translit in text_lower:
            # Replace the transliteration with Arabic
            text_lower = text_lower.replace(translit, arabic_variations[0])
    
    return text_lower

def is_arabic_text(text):
    """
    Check if the text contains Arabic characters
    """
    arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]')
    return bool(arabic_pattern.search(text))

def enhance_arabic_search_query(query):
    """
    Enhance search query to handle both Arabic and transliterated text
    """
    # If query is in Arabic, normalize it
    if is_arabic_text(query):
        normalized = normalize_arabic_text(query)
        return normalized
    
    # If query is transliterated, try to convert to Arabic
    arabic_query = transliterate_to_arabic(query)
    
    # If we found a match, use Arabic; otherwise use original
    if arabic_query != query.lower().strip():
        return arabic_query
    
    return query

def get_phonetic_variations(text):
    """
    Get phonetic variations of Arabic or transliterated text
    """
    variations = [text]
    text_lower = text.lower().strip()
    
    # Add transliteration variations
    for translit, arabic_list in TRANSLITERATION_MAP.items():
        if translit in text_lower or any(arabic in text for arabic in arabic_list):
            variations.extend(arabic_list)
            variations.append(translit)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_variations = []
    for v in variations:
        if v not in seen:
            seen.add(v)
            unique_variations.append(v)
    
    return unique_variations

def fuzzy_arabic_match(text1, text2, threshold=0.8):
    """
    Perform fuzzy matching between two Arabic texts
    """
    # Normalize both texts
    norm1 = normalize_arabic_text(text1)
    norm2 = normalize_arabic_text(text2)
    
    # Check exact match after normalization
    if norm1 == norm2:
        return True
    
    # Check if one contains the other
    if norm1 in norm2 or norm2 in norm1:
        return True
    
    # Check phonetic variations
    variations1 = get_phonetic_variations(text1)
    variations2 = get_phonetic_variations(text2)
    
    for v1 in variations1:
        for v2 in variations2:
            if normalize_arabic_text(v1) == normalize_arabic_text(v2):
                return True
    
    return False