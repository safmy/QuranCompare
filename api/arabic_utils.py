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
    'allah': ['الله', 'اللَّه', 'اللَّهُ', 'اللَّهِ', 'ٱللَّه', 'ٱللَّهِ'],
    'allahu': ['الله', 'اللَّه', 'اللَّهُ', 'ٱللَّهُ'],
    'allahi': ['اللَّهِ', 'ٱللَّهِ'],
    
    # Common words
    'rahman': ['رحمن', 'الرحمن', 'رَحْمَٰن', 'ٱلرَّحْمَٰن'],
    'rahim': ['رحيم', 'الرحيم', 'رَحِيم', 'ٱلرَّحِيم'],
    'bismillah': ['بسم الله', 'بِسْمِ اللَّه', 'بِسْمِ ٱللَّهِ', 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'],
    'alhamdulillah': ['الحمد لله', 'ٱلْحَمْدُ لِلَّه'],
    'inshallah': ['إن شاء الله', 'إِنْ شَاءَ اللَّه'],
    'mashallah': ['ما شاء الله', 'مَا شَاءَ اللَّه'],
    
    # Common Quranic phrases
    'la ilaha illallah': ['لا إله إلا الله', 'لَا إِلَٰهَ إِلَّا اللَّه'],
    'subhanallah': ['سبحان الله', 'سُبْحَانَ اللَّه'],
    'astaghfirullah': ['أستغفر الله', 'أَسْتَغْفِرُ اللَّه'],
    
    # Surah Al-Ikhlas (112) variations
    'kul huwallahu ahad': ['قل هو الله أحد', 'قُلْ هُوَ اللَّهُ أَحَدٌ'],
    'qul huwallahu ahad': ['قل هو الله أحد', 'قُلْ هُوَ اللَّهُ أَحَدٌ'],
    'kulhuwallahu ahad': ['قل هو الله أحد', 'قُلْ هُوَ اللَّهُ أَحَدٌ'],
    'qulhuwallahu ahad': ['قل هو الله أحد', 'قُلْ هُوَ اللَّهُ أَحَدٌ'],
    'kul huwallah ahad': ['قل هو الله أحد', 'قُلْ هُوَ اللَّهُ أَحَدٌ'],
    'qul huwallah ahad': ['قل هو الله أحد', 'قُلْ هُوَ اللَّهُ أَحَدٌ'],
    
    # Common phrase variations
    'wahdahu': ['وحده', 'وَحْدَهُ', 'وَحْدَهُۥ'],  # alone/only
    'dhukira allah wahdahu': ['ذُكِرَ اللَّهُ وَحْدَهُ', 'ذكر الله وحده'],  # Allah alone is mentioned
}

# Arabic diacritics that can be removed for matching
ARABIC_DIACRITICS = re.compile(r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]')

def normalize_arabic_text(text):
    """
    Normalize Arabic text by removing diacritics and extra spaces
    """
    # Remove diacritics
    text = ARABIC_DIACRITICS.sub('', text)
    
    # Normalize unicode - use NFKC for compatibility
    text = unicodedata.normalize('NFKC', text)
    
    # Normalize different forms of the same letter
    # Alif variations
    text = text.replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ٱ', 'ا')
    # Ta marbouta variations
    text = text.replace('ة', 'ه')
    # Yaa variations  
    text = text.replace('ي', 'ى').replace('ئ', 'ى')
    
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
    result = text_lower
    for translit, arabic_variations in TRANSLITERATION_MAP.items():
        if translit in text_lower:
            # Replace the transliteration with Arabic
            result = result.replace(translit, arabic_variations[0])
    
    # If we made any replacements, return the result
    if result != text_lower:
        return result
    
    return text_lower

def is_arabic_text(text):
    """
    Check if the text contains Arabic characters
    """
    arabic_pattern = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]')
    return bool(arabic_pattern.search(text))

def fix_common_arabic_typos(text):
    """
    Fix common Arabic typos and variants
    """
    # Common typos
    typo_fixes = {
        'وَهْدَهُ': 'وَحْدَهُ',  # Fix wahdahu typo
        'وهده': 'وحده',        # Without diacritics
        'الهه': 'الله',         # Allah typo
    }
    
    result = text
    for typo, correct in typo_fixes.items():
        result = result.replace(typo, correct)
    
    return result

def enhance_arabic_search_query(query):
    """
    Enhance search query to handle both Arabic and transliterated text
    """
    # If query is in Arabic, normalize it and fix typos
    if is_arabic_text(query):
        # First fix common typos
        fixed_query = fix_common_arabic_typos(query)
        # Then normalize
        normalized = normalize_arabic_text(fixed_query)
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