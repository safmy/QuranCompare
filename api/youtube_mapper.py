"""
YouTube mapping functionality for RashadAllMedia content
"""

import json
import os
import re
from typing import Optional, Dict

class YouTubeMapper:
    def __init__(self):
        self.video_links = {}
        self.loaded = False
    
    def load_mappings(self):
        """Load YouTube mappings from JSON file"""
        if self.loaded:
            return
            
        try:
            # Try different possible paths
            possible_paths = [
                'youtube_search_results_updated.json',
                '../youtube_search_results_updated.json', 
                '../../youtube_search_results_updated.json',
                os.path.join(os.path.dirname(__file__), '../../youtube_search_results_updated.json')
            ]
            
            for path in possible_paths:
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8') as f:
                        youtube_results = json.load(f)
                        
                    for result in youtube_results:
                        if 'search_title' in result and 'video_link' in result:
                            self.video_links[result['search_title'].lower()] = result['video_link']
                        if 'video_title' in result and 'video_link' in result:
                            self.video_links[result['video_title'].lower()] = result['video_link']
                    
                    self.loaded = True
                    print(f"✅ Loaded {len(self.video_links)} YouTube mappings")
                    return
                    
        except Exception as e:
            print(f"⚠️ Failed to load YouTube mappings: {e}")
        
        self.loaded = True
    
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
        
        return "Unknown Title"
    
    def match_title_to_youtube(self, title: str) -> Optional[str]:
        """Match extracted title to YouTube video link"""
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
    
    def get_youtube_link_for_content(self, content: str) -> Optional[str]:
        """Get YouTube link for Rashad media content"""
        title = self.extract_title_from_content(content)
        return self.match_title_to_youtube(title)

# Global instance
youtube_mapper = YouTubeMapper()