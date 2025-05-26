#!/usr/bin/env python3
"""
Utility to determine verse ranges based on subtitles
"""

import json
import os

def load_subtitle_ranges():
    """
    Load verse data and create a mapping of verses to their subtitle ranges
    Returns: dict mapping verse_ref (e.g., "2:3") to range (e.g., "2:3-5")
    """
    from verses_loader import load_verses_data
    
    verses_data = load_verses_data()
    if not verses_data:
        return {}
    
    subtitle_ranges = {}
    
    # Group verses by chapter
    chapters = {}
    for verse in verses_data:
        sura_verse = verse['sura_verse']
        chapter, verse_num = map(int, sura_verse.split(':'))
        
        if chapter not in chapters:
            chapters[chapter] = []
        chapters[chapter].append((verse_num, verse))
    
    # Process each chapter
    for chapter, verses_list in chapters.items():
        # Sort by verse number
        verses_list.sort(key=lambda x: x[0])
        
        # Find all verses with subtitles
        subtitle_verses = []
        for verse_num, verse in verses_list:
            if 'subtitle' in verse and verse['subtitle']:
                subtitle_verses.append(verse_num)
        
        if not subtitle_verses:
            # No subtitles in this chapter - map all verses to full chapter range
            if verses_list:
                first_verse = max(1, verses_list[0][0])  # Start from verse 1, not verse 0
                last_verse = verses_list[-1][0]
                if first_verse == last_verse:
                    range_str = f"{chapter}:{first_verse}"
                else:
                    range_str = f"{chapter}:{first_verse}-{last_verse}"
                
                for verse_num, _ in verses_list:
                    if verse_num >= 1:  # Only map numbered verses, not verse 0
                        subtitle_ranges[f"{chapter}:{verse_num}"] = range_str
        else:
            # Process subtitle sections
            for i, subtitle_start in enumerate(subtitle_verses):
                # Determine the end of this subtitle section
                if i + 1 < len(subtitle_verses):
                    # Next subtitle exists - end is the verse before it
                    subtitle_end = subtitle_verses[i + 1] - 1
                else:
                    # Last subtitle - goes to end of chapter
                    subtitle_end = verses_list[-1][0]
                
                # Create range string
                if subtitle_start == subtitle_end:
                    range_str = f"{chapter}:{subtitle_start}"
                else:
                    range_str = f"{chapter}:{subtitle_start}-{subtitle_end}"
                
                # Map all verses in this subtitle section
                for verse_num, _ in verses_list:
                    if subtitle_start <= verse_num <= subtitle_end:
                        subtitle_ranges[f"{chapter}:{verse_num}"] = range_str
            
            # Handle verses before the first subtitle (if first subtitle is not verse 1)
            if subtitle_verses[0] > 1:
                first_verse = max(1, verses_list[0][0])  # Start from verse 1, not verse 0
                last_before_subtitle = subtitle_verses[0] - 1
                
                if first_verse == last_before_subtitle:
                    range_str = f"{chapter}:{first_verse}"
                else:
                    range_str = f"{chapter}:{first_verse}-{last_before_subtitle}"
                
                # Map verses before first subtitle
                for verse_num, _ in verses_list:
                    if first_verse <= verse_num <= last_before_subtitle:
                        subtitle_ranges[f"{chapter}:{verse_num}"] = range_str
    
    return subtitle_ranges

def get_verse_range_for_subtitle(verse_ref):
    """
    Get the subtitle range for a given verse reference
    Args: verse_ref (str): e.g., "2:3"
    Returns: str: e.g., "2:3-5" or "2:3" if single verse
    """
    subtitle_ranges = load_subtitle_ranges()
    return subtitle_ranges.get(verse_ref, verse_ref)

# Pre-compute and cache the ranges for faster access
_SUBTITLE_RANGES_CACHE = None

def get_cached_verse_range(verse_ref):
    """
    Get verse range using cached subtitle data for better performance
    """
    global _SUBTITLE_RANGES_CACHE
    
    if _SUBTITLE_RANGES_CACHE is None:
        _SUBTITLE_RANGES_CACHE = load_subtitle_ranges()
    
    return _SUBTITLE_RANGES_CACHE.get(verse_ref, verse_ref)

def get_subtitle_for_range(verse_range):
    """
    Get the subtitle text for a given verse range
    Returns: subtitle text or None
    """
    from verses_loader import load_verses_data
    
    verses_data = load_verses_data()
    if not verses_data:
        return None
    
    # Parse the range to find the first verse with a subtitle
    if '-' in verse_range:
        start_ref = verse_range.split('-')[0]
    else:
        start_ref = verse_range
    
    try:
        start_chapter, start_verse = map(int, start_ref.split(':'))
        
        # Find verses in this range and look for subtitle
        for verse in verses_data:
            sura_verse = verse['sura_verse']
            chapter, verse_num = map(int, sura_verse.split(':'))
            
            if chapter == start_chapter and verse_num >= start_verse:
                if 'subtitle' in verse and verse['subtitle']:
                    return verse['subtitle']
                    
        return None
    except:
        return None