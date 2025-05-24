# Quran Vector Search API

This API provides semantic search functionality across multiple Quran-related collections using OpenAI embeddings and FAISS vector similarity search.

## Features

- Searches across three collections:
  - **RashadAllMedia**: Video transcripts and media content
  - **FinalTestament**: Quran verses with translations
  - **QuranTalkArticles**: Articles and writings
- Uses OpenAI's text-embedding-ada-002 model for semantic understanding
- Returns similarity scores and relevant metadata
- CORS enabled for web application integration

## Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set OpenAI API Key**
   ```bash
   export OPENAI_API_KEY='your-openai-api-key'
   ```

3. **Run the API**
   ```bash
   ./start_api.sh
   # or
   python vector_search_api.py
   ```

The API will start on `http://localhost:8001`

## API Endpoints

### GET /
Returns API information and available collections

### GET /health
Health check endpoint showing system status

### POST /search
Perform semantic search across all collections

**Request Body:**
```json
{
  "query": "your search query",
  "num_results": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "collection": "RashadAllMedia",
      "title": "Video Title",
      "content": "Content preview...",
      "similarity_score": 0.89,
      "source": "Rashad Khalifa Media",
      "youtube_link": "https://youtube.com/..."
    }
  ],
  "query": "your search query",
  "total_results": 5
}
```

## Integration with React App

The React app component `QuranVectorSearch.jsx` is already configured to use this API. 

To use in production:
1. Deploy the API to a server
2. Set the `REACT_APP_API_URL` environment variable in your React app:
   ```bash
   REACT_APP_API_URL=https://your-api-server.com
   ```

## File Structure

The API expects the following vector files to be available:
- `../../data/RashadAllMedia.faiss` and `.json`
- `../../FinalTestament.faiss` and `.json`
- `../../qurantalk_articles_1744655632.faiss` and `.json`

These paths are relative to the API directory.