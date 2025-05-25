#!/usr/bin/env python3
"""Test the improved YouTube mapping"""

from youtube_mapper import youtube_mapper

# Test content about "age of 40" at timestamp (46:15) 
test_content = """(46:15) I thought Marif was
asking a question. (46:17) Be careful not to scratch your nose. (46:18) You may have to ask a
question. (46:22) Paragraph 5. (46:23) The human being is given 40 years to study, look around, reflect,
and examine all points of view before making this most important decision, to uphold Satan's
point of view or uphold God's absolute authority. (46:36) Anyone who dies before the age of 40
is chosen by God for redemption due to circumstances known only to God."""

print("Testing improved YouTube mapping for 'age of 40' content...")
print("-" * 60)

# Load mappings
youtube_mapper.load_mappings()
youtube_mapper.load_rashad_content()

# Test the mapping
title, link = youtube_mapper.find_title_for_content_simple(test_content)

print(f"Content snippet: {test_content[:100]}...")
print(f"Found video title: {title}")
print(f"Found video link: {link}")

# Also test adding timestamp to the link
if link:
    timestamped_link = youtube_mapper.add_timestamp_to_youtube_link(link, test_content)
    print(f"Link with timestamp: {timestamped_link}")
    
# Let's also manually check what the correct video should be
import json
with open('../../data/RashadAllMedia.json', 'r') as f:
    data = json.load(f)
    
# Find the index of this content
for idx, text in enumerate(data['texts']):
    if "The human being is given 40 years to study" in text:
        print(f"\nContent found at index: {idx}")
        # Check what video this should map to based on closest preceding mapping
        with open('youtube_search_results_updated.json', 'r') as f2:
            yt_data = json.load(f2)
        
        # Find all mapped indices
        mapped_indices = [(item['text_index'], item['video_title']) 
                         for item in yt_data if 'text_index' in item]
        mapped_indices.sort()
        
        # Find closest preceding
        closest = None
        for mapped_idx, title in mapped_indices:
            if mapped_idx <= idx:
                closest = (mapped_idx, title)
            else:
                break
                
        if closest:
            print(f"Closest preceding mapping: Index {closest[0]} -> {closest[1]}")
        
        # Also check following mapping
        for mapped_idx, title in mapped_indices:
            if mapped_idx > idx:
                print(f"Next following mapping: Index {mapped_idx} -> {title}")
                break
        
        break