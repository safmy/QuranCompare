# Guide: Uploading Large Vector Files for Semantic Search

Since the FAISS indices and JSON files are too large for GitHub (~30MB each), here's a step-by-step guide to host them for free.

## Option 1: GitHub Releases (Easiest & Free)

### Step 1: Prepare Your Vector Files
First, locate your vector files:
```bash
# These files should exist in your local machine:
ls -lh ~/Desktop/OCR_Arabic-1/data/RashadAllMedia.faiss
ls -lh ~/Desktop/OCR_Arabic-1/data/RashadAllMedia.json
ls -lh ~/Desktop/OCR_Arabic-1/FinalTestament.faiss
ls -lh ~/Desktop/OCR_Arabic-1/FinalTestament.json
ls -lh ~/Desktop/OCR_Arabic-1/qurantalk_articles_1744655632.faiss
ls -lh ~/Desktop/OCR_Arabic-1/qurantalk_articles_1744655632.json
```

### Step 2: Create a GitHub Release

1. Go to: https://github.com/safmy/QuranCompare/releases
2. Click "Create a new release"
3. Choose a tag: `v1.0-vectors`
4. Release title: "Vector Embeddings for Semantic Search"
5. Description: "FAISS indices and metadata for semantic search functionality"
6. Upload each file by dragging them to the "Attach binaries" section
7. Publish the release

### Step 3: Get Direct Download URLs
After publishing, right-click each file and copy link. URLs will look like:
```
https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.faiss
https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.json
# etc...
```

### Step 4: Update Your API Configuration
Create a `.env` file in `QuranCompare/api/`:
```env
OPENAI_API_KEY=your-openai-api-key
USE_CLOUD_VECTORS=true
RASHAD_FAISS_URL=https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.faiss
RASHAD_JSON_URL=https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.json
FINAL_TESTAMENT_FAISS_URL=https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/FinalTestament.faiss
FINAL_TESTAMENT_JSON_URL=https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/FinalTestament.json
QURANTALK_FAISS_URL=https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/qurantalk_articles_1744655632.faiss
QURANTALK_JSON_URL=https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/qurantalk_articles_1744655632.json
```

## Option 2: Using the Upload Script

I've created a script to automate the upload process:

```bash
cd ~/Desktop/OCR_Arabic-1/QuranCompare/api

# For GitHub Releases (requires GitHub CLI)
python upload_vectors.py --provider github --github-repo safmy/QuranCompare --github-tag v1.0-vectors

# The script will:
# 1. Find all vector files
# 2. Show their sizes
# 3. Upload them to the release
# 4. Give you the URLs to use
```

## Option 3: Hugging Face Hub (Alternative)

1. Create a free account at https://huggingface.co
2. Install the CLI:
   ```bash
   pip install huggingface-hub
   huggingface-cli login
   ```
3. Upload using the script:
   ```bash
   python upload_vectors.py --provider huggingface --hf-repo your-username/quran-vectors
   ```

## Deploying the Complete System

### Local Development:
```bash
# Terminal 1: Start the API
cd QuranCompare/api
pip install -r requirements.txt
export OPENAI_API_KEY='your-key'
python vector_search_api.py

# Terminal 2: Start React app
cd QuranCompare
npm install
npm start
```

### Production Deployment:

1. **Deploy API to Railway.app**:
   ```bash
   cd QuranCompare/api
   railway login
   railway init
   railway up
   ```
   
2. **Set Railway Environment Variables**:
   - Go to Railway dashboard
   - Add all the environment variables from your .env file
   
3. **Update Netlify**:
   - Go to Netlify site settings
   - Add environment variable:
     ```
     REACT_APP_API_URL=https://your-api.railway.app
     ```
   - Redeploy

## Troubleshooting

### If files are too large for GitHub Releases:
- Compress them first: `gzip -k *.faiss *.json`
- Upload the .gz files
- Update vector_loader.py to decompress

### If download is slow:
- The API caches downloaded files in `./vector_cache/`
- First load will be slow, subsequent loads use cache

### To verify everything works:
```bash
# Test the API locally
curl -X POST http://localhost:8001/search \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the purpose of life?", "num_results": 3}'
```

## Next Steps

1. Upload your vector files using one of the methods above
2. Configure the environment variables with the URLs
3. Test locally to ensure everything works
4. Deploy to production

The semantic search will then work exactly like your Discord bot's `/search` command!