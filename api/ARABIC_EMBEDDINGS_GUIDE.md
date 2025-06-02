# Arabic Embeddings Guide

This guide explains how to create and deploy Arabic text embeddings for the QuranCompare API to enable semantic search in Arabic.

## Overview

The Arabic embeddings system allows users to search Quran verses using Arabic text, transliterated text, or English queries. The system:

1. Extracts Arabic text from `verses_final.json`
2. Creates embeddings using OpenAI's `text-embedding-3-small` model
3. Stores embeddings in FAISS format for fast similarity search
4. Integrates with the existing vector search API

## Files Created

- `create_arabic_embeddings.py` - Main script to generate embeddings
- `test_arabic_embeddings.py` - Test script to verify setup
- `arabic_utils.py` - Arabic text processing utilities (already exists)
- `ARABIC_EMBEDDINGS_GUIDE.md` - This documentation

## Prerequisites

1. **OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable
```bash
export OPENAI_API_KEY="your-api-key-here"
```

2. **Python Dependencies**: Ensure you have all required packages:
```bash
pip install openai faiss-cpu numpy tqdm
```

3. **Verses Data**: The `verses_final.json` file should be in the `../public/` directory

## Usage

### Step 1: Test the Setup

Run the test script to verify everything is configured correctly:

```bash
cd api
python test_arabic_embeddings.py
```

This will test:
- Arabic text processing utilities
- Vector loader configuration
- Basic embedding creation (with a small sample)

### Step 2: Create Arabic Embeddings

Run the main script to create embeddings for all verses:

```bash
python create_arabic_embeddings.py
```

This will:
- Load all verses from `verses_final.json`
- Extract Arabic text from each verse
- Create embeddings in batches (100 verses per API call)
- Save results to `arabic_embeddings/arabic_verses.faiss` and `arabic_embeddings/arabic_verses.json`
- Run a test search to verify the embeddings work

### Step 3: Upload to GitHub Releases

Upload the generated embeddings to GitHub releases for cloud deployment:

```bash
python upload_vectors.py --provider github --github-repo safmy/QuranCompare --source-dir api/arabic_embeddings
```

Or upload all vectors including the new Arabic ones:

```bash
python upload_vectors.py --provider github --github-repo safmy/QuranCompare --source-dir ../..
```

### Step 4: Deploy API

The API has been updated to automatically include Arabic embeddings when available. The changes include:

1. **SearchRequest Model**: Added `include_arabic_verses: bool = True` parameter
2. **Vector Loader**: Added ArabicVerses collection URLs
3. **Search Logic**: Added handling for ArabicVerses results
4. **Embedding Model**: Updated to use `text-embedding-3-small` for consistency

## API Usage

### Search with Arabic Text

```bash
curl -X POST "https://your-api-url.com/search" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
       "num_results": 5,
       "include_arabic_verses": true
     }'
```

### Search with Transliterated Text

```bash
curl -X POST "https://your-api-url.com/search" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "Bismillah Rahman Rahim",
       "num_results": 5,
       "include_arabic_verses": true
     }'
```

### Search with English Text

```bash
curl -X POST "https://your-api-url.com/search" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "In the name of God Most Gracious",
       "num_results": 5,
       "include_arabic_verses": true
     }'
```

## Response Format

Arabic verse results will have the format:

```json
{
  "collection": "ArabicVerses",
  "title": "[1:1] بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  "content": "Arabic: بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\nEnglish: In the name of God, Most Gracious, Most Merciful.*",
  "similarity_score": 0.95,
  "source": "Quran Arabic Verses",
  "source_url": null,
  "youtube_link": null
}
```

## Arabic Text Processing

The system includes advanced Arabic text processing:

### Features

1. **Diacritic Normalization**: Removes Arabic diacritics for better matching
2. **Transliteration Support**: Maps common transliterations to Arabic text
3. **Phonetic Variations**: Handles different spellings of the same words
4. **Unicode Normalization**: Ensures consistent text representation

### Supported Transliterations

- `allah` → `الله`
- `bismillah` → `بسم الله`
- `rahman` → `رحمن`
- `rahim` → `رحيم`
- `qul hu` → `قل هو`
- And many more...

## File Structure

```
api/
├── create_arabic_embeddings.py    # Main embedding creation script
├── test_arabic_embeddings.py      # Test and validation script
├── arabic_utils.py               # Arabic text processing utilities
├── vector_loader.py              # Updated with Arabic embeddings URLs
├── vector_search_api.py          # Updated API with Arabic support
├── upload_vectors.py             # Updated upload script
├── arabic_embeddings/            # Generated embeddings directory
│   ├── arabic_verses.faiss       # FAISS index file
│   └── arabic_verses.json        # Metadata file
└── ARABIC_EMBEDDINGS_GUIDE.md    # This guide
```

## Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**
   ```bash
   export OPENAI_API_KEY="your-api-key"
   ```

2. **verses_final.json not found**
   - Ensure the file exists in `../public/verses_final.json`
   - Check file permissions

3. **Import errors**
   ```bash
   pip install openai faiss-cpu numpy tqdm
   ```

4. **API Rate Limits**
   - The script includes rate limiting (0.5s between batches)
   - Reduce batch size if needed

5. **Memory Issues**
   - Reduce batch size in `create_arabic_embeddings.py`
   - Use `faiss-cpu` instead of `faiss-gpu` if needed

### Verification

1. Check embeddings were created:
   ```bash
   ls -la arabic_embeddings/
   ```

2. Verify file sizes:
   ```bash
   du -h arabic_embeddings/*
   ```

3. Test API locally:
   ```bash
   python -m uvicorn vector_search_api:app --reload
   ```

## Performance

- **Embedding Creation**: ~6000 verses take about 10-15 minutes
- **File Sizes**: 
  - FAISS index: ~35-40 MB
  - Metadata JSON: ~8-10 MB
- **Search Speed**: Sub-second response times
- **Memory Usage**: ~100-200 MB for loaded embeddings

## Next Steps

After successful deployment:

1. Test Arabic search functionality in the frontend
2. Monitor API performance and error rates
3. Consider adding more Arabic text collections
4. Implement caching for frequent queries
5. Add analytics for Arabic vs English search usage