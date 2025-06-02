#!/bin/bash

# Check if required files exist
if [ ! -f "vector_cache/arabic_verses.faiss" ] || [ ! -f "vector_cache/arabic_verses.json" ]; then
    echo "Error: Arabic embeddings files not found in vector_cache/"
    exit 1
fi

echo "Files to upload:"
ls -lh vector_cache/arabic_verses.*

echo ""
echo "To upload these files to GitHub release v1.0-vectors, you need to:"
echo "1. Go to: https://github.com/safmy/QuranCompare/releases/tag/v1.0-vectors"
echo "2. Click 'Edit release'"
echo "3. Drag and drop these files:"
echo "   - vector_cache/arabic_verses.faiss"
echo "   - vector_cache/arabic_verses.json"
echo "4. Click 'Update release'"
echo ""
echo "Or run:"
echo "gh auth login"
echo "./upload_arabic_embeddings.sh"