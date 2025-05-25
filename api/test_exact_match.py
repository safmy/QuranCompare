#!/usr/bin/env python3
"""Test that timestamps ARE added for exact matches"""

from youtube_mapper import youtube_mapper
import json

# Load mappings
youtube_mapper.load_mappings()
youtube_mapper.load_rashad_content()

# Load RashadAllMedia to get content that has exact mapping
with open('../../data/RashadAllMedia.json', 'r') as f:
    data = json.load(f)

# Test with index 0 which should have exact mapping
test_content = data['texts'][0][:500]  # First 500 chars of first text

print("Testing timestamp handling for EXACT matches...")
print("-" * 60)

# Test the mapping
title, link, is_exact = youtube_mapper.find_title_for_content_simple(test_content)

print(f"Content snippet: {test_content[:100]}...")
print(f"Found video title: {title}")
print(f"Is exact match: {is_exact}")
print(f"Base video link: {link}")

# Test the full get_youtube_link_for_content method
full_link = youtube_mapper.get_youtube_link_for_content(test_content)
print(f"\nFull link returned: {full_link}")

# Check if timestamp was added (if content has timestamps)
import re
has_timestamp_in_content = bool(re.search(r'\(\d+:\d+', test_content))
print(f"\nContent has timestamps: {has_timestamp_in_content}")

if has_timestamp_in_content and is_exact:
    if "t=" in full_link:
        print("✅ Timestamp correctly added for exact match!")
    else:
        print("❌ ERROR: Timestamp NOT added for exact match with timestamps!")
elif is_exact and not has_timestamp_in_content:
    print("✅ No timestamp to add (content has no timestamps)")
else:
    print("✅ Correctly handled non-exact match")