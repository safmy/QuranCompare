#!/usr/bin/env python3
"""Test YouTube mapping functionality"""

from youtube_mapper import youtube_mapper

# Test content about "age of 40" at timestamp (46:15)
test_content = """(46:15) I thought Marif was
asking a question. (46:17) Be careful not to scratch your nose. (46:18) You may have to ask a
question. (46:22) Paragraph 5. (46:23) The human being is given 40 years to study, look around, reflect,
and examine all points of view before making this most important decision, to uphold Satan's
point of view or uphold God's absolute authority. (46:36) Anyone who dies before the age of 40
is chosen by God for redemption due to circumstances known only to God."""

print("Testing YouTube mapping for 'age of 40' content...")
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

print("\nChecking index mappings:")
print(f"Total index mappings: {len(youtube_mapper.index_to_title_map)}")
print(f"Total texts loaded: {len(youtube_mapper.rashad_texts) if youtube_mapper.rashad_texts else 0}")

# Show first few mappings
print("\nFirst few index mappings:")
for idx in sorted(youtube_mapper.index_to_title_map.keys())[:5]:
    print(f"  Index {idx}: {youtube_mapper.index_to_title_map[idx]}")