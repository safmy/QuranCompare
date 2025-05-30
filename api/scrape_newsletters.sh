#!/bin/bash

# Script to scrape newsletters and create embeddings
# Usage: ./scrape_newsletters.sh [start_year] [end_year] [max_pages]

# Default values
START_YEAR=${1:-1985}
END_YEAR=${2:-1990}
MAX_PAGES=${3:-50}

# Check if OpenAI API key is provided
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable not set"
    echo "Please set it with: export OPENAI_API_KEY=your_api_key_here"
    exit 1
fi

echo "Starting newsletter scraping..."
echo "Year range: $START_YEAR to $END_YEAR"
echo "Max pages: $MAX_PAGES"

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

# Run scraper
echo "Running newsletter scraper..."
python newsletter_scraper_simple.py \
    --api-key "$OPENAI_API_KEY" \
    --start-year "$START_YEAR" \
    --end-year "$END_YEAR" \
    --max-pages "$MAX_PAGES" \
    --output-dir ./newsletter_data

echo "Newsletter scraping completed!"
echo "Files created:"
echo "- newsletter_data/newsletters.json (metadata)"
echo "- newsletter_data/newsletters.faiss (embeddings)"

if [ -f "newsletter_data/failed_urls.txt" ]; then
    echo "- newsletter_data/failed_urls.txt (failed URLs for debugging)"
fi

echo ""
echo "The newsletter collection is now ready for semantic search!"