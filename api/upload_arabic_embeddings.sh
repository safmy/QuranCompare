#!/bin/bash
echo "Uploading Arabic embeddings to GitHub release..."

# Check if gh CLI is authenticated
if ! gh auth status >/dev/null 2>&1; then
    echo "Please authenticate with GitHub CLI first:"
    echo "gh auth login"
    exit 1
fi

# Upload the Arabic embeddings files
echo "Uploading arabic_verses.faiss..."
gh release upload v1.0-vectors vector_cache/arabic_verses.faiss --repo safmy/QuranCompare

echo "Uploading arabic_verses.json..."
gh release upload v1.0-vectors vector_cache/arabic_verses.json --repo safmy/QuranCompare

echo "Upload complete!"
echo ""
echo "The API should now be able to load Arabic verses from:"
echo "- https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/arabic_verses.faiss"
echo "- https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/arabic_verses.json"