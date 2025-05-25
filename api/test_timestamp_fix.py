#!/usr/bin/env python3
"""Test that timestamps are only added for exact matches"""

from youtube_mapper import youtube_mapper

# Test content about "age of 40" at timestamp (46:15)
test_content = """(46:15) I thought Marif was
asking a question. (46:17) Be careful not to scratch your nose. (46:18) You may have to ask a
question. (46:22) Paragraph 5. (46:23) The human being is given 40 years to study, look around, reflect,
and examine all points of view before making this most important decision, to uphold Satan's
point of view or uphold God's absolute authority. (46:36) Anyone who dies before the age of 40
is chosen by God for redemption due to circumstances known only to God."""

print("Testing timestamp handling for approximate matches...")
print("-" * 60)

# Load mappings
youtube_mapper.load_mappings()
youtube_mapper.load_rashad_content()

# Test the mapping
title, link, is_exact = youtube_mapper.find_title_for_content_simple(test_content)

print(f"Content snippet: {test_content[:100]}...")
print(f"Found video title: {title}")
print(f"Is exact match: {is_exact}")
print(f"Base video link: {link}")

# Test the full get_youtube_link_for_content method
full_link = youtube_mapper.get_youtube_link_for_content(test_content)
print(f"\nFull link returned: {full_link}")

# Check if timestamp was added
if link and full_link:
    if "t=" in full_link and "t=" not in link:
        print("\n❌ ERROR: Timestamp was added to approximate match!")
    elif "t=" not in full_link and is_exact:
        print("\n❌ ERROR: Timestamp was NOT added to exact match!")
    else:
        print("\n✅ Timestamp handling is correct!")
        if not is_exact:
            print("   - No timestamp added for approximate match")
        else:
            print("   - Timestamp added for exact match")