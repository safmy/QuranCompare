#!/usr/bin/env python3
"""
Loader for verses data with roots and meanings
Downloads from GitHub releases if not found locally
"""

import os
import json
import requests
import logging

logger = logging.getLogger(__name__)

def load_verses_data():
    """
    Load verses data from local file or download from GitHub releases
    Returns: List of verse objects or None if failed
    """
    
    # Try local paths first - prioritize verses_final.json with all translations
    local_paths = [
        'verses_final.json',
        '../verses_final.json', 
        '../../verses_final.json',
        '../public/verses_final.json',
        '../../public/verses_final.json',
        os.path.join(os.path.dirname(__file__), '../verses_final.json'),
        os.path.join(os.path.dirname(__file__), '../../verses_final.json'),
        os.path.join(os.path.dirname(__file__), '../public/verses_final.json'),
        os.path.join(os.path.dirname(__file__), '../../public/verses_final.json'),
        # Fallback to old file
        'verses_array_roots_meanings_subtitles_footnotes.json',
        '../verses_array_roots_meanings_subtitles_footnotes.json',
        '../../verses_array_roots_meanings_subtitles_footnotes.json',
        os.path.join(os.path.dirname(__file__), '../verses_array_roots_meanings_subtitles_footnotes.json'),
        os.path.join(os.path.dirname(__file__), '../../verses_array_roots_meanings_subtitles_footnotes.json')
    ]
    
    for path in local_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    logger.info(f"Loaded verses data with {len(data)} verses from {path}")
                    return data
            except Exception as e:
                logger.warning(f"Failed to load verses from {path}: {e}")
                continue
    
    # If not found locally, try to download from GitHub releases
    logger.info("Verses data not found locally, attempting to download from GitHub releases...")
    
    try:
        # GitHub release URL for the verses file with all translations
        release_url = os.getenv("VERSES_JSON_URL", "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/verses_final.json")
        
        response = requests.get(release_url, timeout=60)
        if response.status_code == 200:
            data = response.json()
            
            # Save to local file for future use
            local_file = "verses_final.json"
            try:
                with open(local_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                logger.info(f"Downloaded and saved verses data to {local_file}")
            except Exception as e:
                logger.warning(f"Failed to save downloaded verses data: {e}")
            
            logger.info(f"Loaded verses data with {len(data)} verses from GitHub releases")
            return data
        else:
            logger.warning(f"Failed to download verses data: HTTP {response.status_code}")
    
    except Exception as e:
        logger.warning(f"Failed to download verses data from GitHub: {e}")
    
    logger.error("Could not load verses data from any source")
    return None