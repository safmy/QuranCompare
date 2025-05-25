"""
YouTube mapping functionality for RashadAllMedia content
Mirrors the Discord bot's /searchrashad implementation
"""

import json
import os
import re
from typing import Optional, Dict, Tuple

class YouTubeMapper:
    def __init__(self):
        self.video_links = {}
        self.loaded = False
        self.rashad_content = None
        self.rashad_texts = []  # Array of texts from RashadAllMedia.json
        self.index_to_title_map = {}  # Maps array index to video title
        self.index_to_link_map = {}   # Maps array index to video link
        self.content_loaded = False
    
    def load_mappings(self):
        """Load YouTube mappings and RashadAllMedia content"""
        if self.loaded:
            return
            
        try:
            # Load YouTube mappings
            possible_paths = [
                'youtube_search_results_updated.json',
                './youtube_search_results_updated.json',
                '../youtube_search_results_updated.json', 
                '../../youtube_search_results_updated.json',
                os.path.join(os.path.dirname(__file__), 'youtube_search_results_updated.json'),
                os.path.join(os.path.dirname(__file__), '../../youtube_search_results_updated.json')
            ]
            
            youtube_results = []
            youtube_path_found = None
            for path in possible_paths:
                if os.path.exists(path):
                    youtube_path_found = path
                    with open(path, 'r', encoding='utf-8') as f:
                        youtube_results = json.load(f)
                    print(f"✅ Found youtube_search_results_updated.json at: {path}")
                    break
            
            if not youtube_results:
                print(f"⚠️ Could not find youtube_search_results_updated.json in any of these paths:")
                for path in possible_paths:
                    print(f"   - {path}")
            
            # Build direct title->link mapping
            for result in youtube_results:
                if 'search_title' in result and 'video_link' in result:
                    self.video_links[result['search_title'].lower()] = result['video_link']
                if 'video_title' in result and 'video_link' in result:
                    self.video_links[result['video_title'].lower()] = result['video_link']
            
            # Build index-based mappings (text_index refers to array index in RashadAllMedia texts)
            for result in youtube_results:
                if 'text_index' in result and 'video_title' in result and 'video_link' in result:
                    text_idx = result['text_index']  # This is the array index in RashadAllMedia.json
                    self.index_to_title_map[text_idx] = result['video_title']
                    self.index_to_link_map[text_idx] = result['video_link']
            
            self.loaded = True
            print(f"✅ Loaded {len(self.video_links)} YouTube mappings and {len(self.index_to_title_map)} index mappings")
            
        except Exception as e:
            print(f"⚠️ Failed to load YouTube mappings: {e}")
            self.loaded = True
    
    def load_rashad_content(self):
        """Load the full RashadAllMedia content for line-based mapping"""
        if self.content_loaded:
            return
            
        try:
            # Try to find RashadAllMedia.json (from vector cache)
            possible_paths = [
                './vector_cache/RashadAllMedia.json',
                'vector_cache/RashadAllMedia.json',
                '../../data/RashadAllMedia.json',
                '../../../data/RashadAllMedia.json',
                os.path.join(os.path.dirname(__file__), 'vector_cache/RashadAllMedia.json'),
                os.path.join(os.path.dirname(__file__), '../../../data/RashadAllMedia.json')
            ]
            
            content_path_found = None
            for path in possible_paths:
                if os.path.exists(path):
                    content_path_found = path
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if 'texts' in data:
                            # Store the texts array for index-based lookup
                            self.rashad_texts = data['texts']
                            # Also join for backward compatibility
                            self.rashad_content = '\n'.join(data['texts'])
                            self.content_loaded = True
                            print(f"✅ Loaded RashadAllMedia content from {path} ({len(data['texts'])} texts)")
                            return
            
            if not content_path_found:
                print(f"⚠️ Could not find RashadAllMedia.json in any of these paths:")
                for path in possible_paths:
                    print(f"   - {path}")
                            
        except Exception as e:
            print(f"⚠️ Failed to load RashadAllMedia content: {e}")
        
        self.content_loaded = True
    
    def find_title_for_content_simple(self, content_text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Find title and link for content by matching it to the correct video transcript
        in the RashadAllMedia texts array.
        """
        if not self.loaded:
            self.load_mappings()
        if not self.content_loaded:
            self.load_rashad_content()
            
        if not self.rashad_texts or not content_text or len(content_text.strip()) < 20:
            return None, None
        
        # Clean the content text for better matching
        clean_content = ' '.join(content_text.split())
        
        # Method 1: Try to find which text index contains this content
        found_index = None
        for idx, text in enumerate(self.rashad_texts):
            if clean_content[:100] in text or clean_content[-100:] in text:
                # Found the text that contains this content
                found_index = idx
                break
        
        # Method 2: If not found, extract distinctive phrases and search
        if found_index is None:
            words = content_text.split()
            if len(words) >= 4:
                # Create phrases of 4-5 consecutive words
                phrases = []
                for i in range(len(words) - 3):
                    if i + 5 <= len(words):
                        phrases.append(' '.join(words[i:i+5]))
                    else:
                        phrases.append(' '.join(words[i:i+4]))
                
                # Try with phrases from different parts of content
                test_phrases = []
                if len(phrases) >= 1:
                    test_phrases.append(phrases[0])  # First phrase
                if len(phrases) >= 3:
                    test_phrases.append(phrases[len(phrases)//2])  # Middle phrase  
                if len(phrases) >= 2:
                    test_phrases.append(phrases[-1])  # Last phrase
                
                # Search for these phrases in each text
                for phrase in test_phrases:
                    search_phrase = ' '.join(phrase.split())
                    for idx, text in enumerate(self.rashad_texts):
                        if search_phrase in text:
                            # Found the text containing this phrase
                            found_index = idx
                            break
                    if found_index is not None:
                        break
        
        # Method 3: If still not found, try with timestamps
        if found_index is None:
            timestamp_matches = re.findall(r'\((\d+:\d+:\d+|\d+:\d+)\)', content_text)
            if timestamp_matches:
                for timestamp in timestamp_matches[:3]:
                    timestamp_pattern = f"({timestamp})"
                    for idx, text in enumerate(self.rashad_texts):
                        if timestamp_pattern in text:
                            # Found the text containing this timestamp
                            found_index = idx
                            break
                    if found_index is not None:
                        break
        
        # Now that we have found_index, find the appropriate video
        if found_index is not None:
            # First check if this exact index has a mapping
            if found_index in self.index_to_title_map:
                return (self.index_to_title_map[found_index], self.index_to_link_map[found_index])
            
            # Otherwise, find the closest preceding mapped index
            # This handles the sparse mapping issue (only 6.3% coverage)
            closest_mapped_index = None
            for mapped_idx in sorted(self.index_to_title_map.keys(), reverse=True):
                if mapped_idx <= found_index:
                    closest_mapped_index = mapped_idx
                    break
            
            if closest_mapped_index is not None:
                # Check how far away the mapping is
                distance = found_index - closest_mapped_index
                
                # If the mapping is too far away (more than 10 indices), it might be inaccurate
                # but we'll still return it since it's the best we have
                title = self.index_to_title_map[closest_mapped_index]
                link = self.index_to_link_map[closest_mapped_index]
                
                # Log a warning if the mapping distance is large
                if distance > 10:
                    print(f"⚠️  Note: Content at index {found_index} mapped to video at index {closest_mapped_index} (distance: {distance})")
                    print(f"   This mapping may be approximate due to sparse video index coverage.")
                
                return (title, link)
        
        return None, None
    
    def extract_title_from_content(self, content: str) -> str:
        """Extract title from Rashad media content"""
        lines = content.split('\n')
        
        # Look for title in first few lines before timestamps
        for line in lines[:3]:
            line = line.strip()
            if line and not re.search(r'\(\d+:\d+\)', line):
                # Clean up the title
                title = line.replace(',', '').replace('\n', ' ').strip()
                # Remove extra whitespace
                title = ' '.join(title.split())
                return title
        
        return "Rashad Khalifa Media"
    
    def extract_first_timestamp(self, text_content: str) -> Optional[int]:
        """
        Extract the first timestamp from the text content.
        Supports formats like (1:18:12), (0:45), etc.
        Returns timestamp in seconds, or None if no timestamp found.
        """
        timestamp_patterns = [
            r'\((\d+):(\d+):(\d+)\)',  # Hours:Minutes:Seconds
            r'\((\d+):(\d+)\)'          # Minutes:Seconds
        ]
        
        for pattern in timestamp_patterns:
            match = re.search(pattern, text_content)
            if match:
                groups = match.groups()
                if len(groups) == 3:  # Hours:Minutes:Seconds
                    hours, minutes, seconds = map(int, groups)
                    return hours * 3600 + minutes * 60 + seconds
                elif len(groups) == 2:  # Minutes:Seconds
                    minutes, seconds = map(int, groups)
                    return minutes * 60 + seconds
        return None
    
    def add_timestamp_to_youtube_link(self, youtube_link: str, text_content: str) -> str:
        """
        Add timestamp to YouTube link if a timestamp is found in the text content.
        """
        timestamp = self.extract_first_timestamp(text_content)
        
        if timestamp is not None:
            # Check if link already has parameters
            if '?' in youtube_link:
                return f"{youtube_link}&t={timestamp}"
            else:
                return f"{youtube_link}?t={timestamp}"
        
        return youtube_link
    
    def get_youtube_link_for_content(self, content: str) -> Optional[str]:
        """Get YouTube link with timestamp for Rashad media content"""
        # First try the line-based mapping approach (most accurate)
        title, base_link = self.find_title_for_content_simple(content)
        
        if base_link:
            # Add timestamp to the link
            return self.add_timestamp_to_youtube_link(base_link, content)
        
        # Fallback to title matching if line-based approach fails
        extracted_title = self.extract_title_from_content(content)
        base_link = self.match_title_to_youtube(extracted_title)
        
        if base_link:
            return self.add_timestamp_to_youtube_link(base_link, content)
        
        return None
    
    def match_title_to_youtube(self, title: str) -> Optional[str]:
        """Match extracted title to YouTube video link (fallback method)"""
        if not title or not self.loaded:
            self.load_mappings()
        
        if not title:
            return None
            
        normalized_title = title.lower()
        
        # Direct match first
        if normalized_title in self.video_links:
            return self.video_links[normalized_title]
        
        # Try partial matches
        best_match = None
        highest_score = 0
        
        # Extract key words from the title
        title_words = set(normalized_title.split())
        
        for yt_title, link in self.video_links.items():
            yt_words = set(yt_title.split())
            
            # Calculate word overlap
            common_words = title_words.intersection(yt_words)
            if len(common_words) > 0:
                # Score based on common words and title length similarity
                score = len(common_words) / max(len(title_words), len(yt_words))
                
                # Bonus for having significant words
                important_words = {'god', 'quran', 'submission', 'islam', 'prophet', 'abraham', 'moses', 'jesus'}
                if any(word in common_words for word in important_words):
                    score += 0.2
                
                if score > highest_score and score > 0.3:  # Minimum threshold
                    highest_score = score
                    best_match = link
        
        return best_match

# Global instance
youtube_mapper = YouTubeMapper()