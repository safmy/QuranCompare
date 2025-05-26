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
    current_subtitle_start = None
    current_chapter = None
    
    for i, verse in enumerate(verses_data):
        sura_verse = verse['sura_verse']
        chapter, verse_num = map(int, sura_verse.split(':'))
        
        # Check if this verse has a subtitle
        has_subtitle = 'subtitle' in verse and verse['subtitle']
        
        # If we're starting a new chapter, reset
        if current_chapter != chapter:
            current_chapter = chapter
            current_subtitle_start = None
        
        # If this verse has a subtitle, it starts a new section
        if has_subtitle:
            # Close the previous section if it exists
            if current_subtitle_start is not None:
                # Find the end of the previous section (verse before this one)
                prev_verse_idx = i - 1
                while prev_verse_idx >= 0:
                    prev_verse = verses_data[prev_verse_idx]
                    prev_sura_verse = prev_verse['sura_verse']
                    prev_chapter, prev_verse_num = map(int, prev_sura_verse.split(':'))
                    
                    if prev_chapter == current_chapter:
                        # Map all verses in the previous section
                        start_chapter, start_verse = map(int, current_subtitle_start.split(':'))
                        if start_chapter == prev_chapter:
                            if start_verse == prev_verse_num:
                                range_str = current_subtitle_start
                            else:
                                range_str = f"{current_subtitle_start}-{prev_verse_num}"
                            
                            # Map all verses in this range
                            for v in range(start_verse, prev_verse_num + 1):
                                subtitle_ranges[f"{start_chapter}:{v}"] = range_str
                        break
                    prev_verse_idx -= 1
            
            # Start new section
            current_subtitle_start = sura_verse
        
        # If we're at the end of the data, close the last section
        if i == len(verses_data) - 1 and current_subtitle_start is not None:
            start_chapter, start_verse = map(int, current_subtitle_start.split(':'))
            if start_chapter == chapter:
                if start_verse == verse_num:
                    range_str = current_subtitle_start
                else:
                    range_str = f"{current_subtitle_start}-{verse_num}"
                
                # Map all verses in this range
                for v in range(start_verse, verse_num + 1):
                    subtitle_ranges[f"{start_chapter}:{v}"] = range_str
    
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