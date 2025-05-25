#!/usr/bin/env python3
"""Check the coverage of text index mappings"""

import json

# Load YouTube mappings
with open('youtube_search_results_updated.json', 'r') as f:
    youtube_data = json.load(f)

# Extract all text indices
text_indices = [item['text_index'] for item in youtube_data if 'text_index' in item]
text_indices.sort()

print(f"Total mappings: {len(text_indices)}")
print(f"Min index: {min(text_indices)}")
print(f"Max index: {max(text_indices)}")
print(f"\nGaps in mapping (missing indices):")

# Check for gaps
prev = -1
gaps = []
for idx in text_indices:
    if idx > prev + 1:
        gaps.append((prev + 1, idx - 1))
    prev = idx

for start, end in gaps[:10]:  # Show first 10 gaps
    if start == end:
        print(f"  Missing: {start}")
    else:
        print(f"  Missing: {start}-{end}")

# Check specifically around index 2172
print(f"\nChecking around index 2172:")
nearby = [idx for idx in text_indices if 2150 <= idx <= 2190]
print(f"Nearby mapped indices: {nearby}")

# Load RashadAllMedia to check total texts
with open('../../data/RashadAllMedia.json', 'r') as f:
    data = json.load(f)
    total_texts = len(data['texts'])
    print(f"\nTotal texts in RashadAllMedia: {total_texts}")
    
# The issue: we have 2227 texts but only 140 mappings!
print(f"\nCoverage: {len(text_indices)}/{total_texts} = {len(text_indices)/total_texts*100:.1f}%")