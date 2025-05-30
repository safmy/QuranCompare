#!/bin/bash

# Script to scrape ALL newsletters comprehensively
# This will take a while but will get all content

# Check if OpenAI API key is provided
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable not set"
    echo "Please set it with: export OPENAI_API_KEY=your_api_key_here"
    exit 1
fi

echo "Starting comprehensive newsletter scraping..."
echo "This will scrape ALL newsletters from 1985 to current year"
echo "This may take several hours to complete..."

# Create virtual environment if it doesn't exist
if [ ! -d "newsletter_env" ]; then
    echo "Creating virtual environment..."
    python3 -m venv newsletter_env
fi

# Activate virtual environment
source newsletter_env/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install requests beautifulsoup4 openai faiss-cpu numpy

# Get current year
CURRENT_YEAR=$(date +%Y)

# Run comprehensive scraper
echo "Running comprehensive newsletter scraper..."
echo "Years: 1985 to $CURRENT_YEAR"

python newsletter_scraper_comprehensive.py \
    --api-key "$OPENAI_API_KEY" \
    --start-year 1985 \
    --end-year "$CURRENT_YEAR" \
    --output-dir ./newsletter_data

echo ""
echo "Newsletter scraping completed!"
echo ""
echo "Files created:"
echo "- newsletter_data/newsletters_comprehensive.json (full content metadata)"
echo "- newsletter_data/newsletters_comprehensive.faiss (embeddings)"
echo "- newsletter_data/scraping_stats.json (statistics)"

if [ -f "newsletter_data/failed_urls_comprehensive.txt" ]; then
    echo "- newsletter_data/failed_urls_comprehensive.txt (failed URLs for debugging)"
fi

echo ""
echo "The comprehensive newsletter collection is now ready for semantic search!"
echo "Note: The old files (newsletters.json/faiss) can be deleted."