#!/usr/bin/env python3
"""
Vector Search API for QuranCompare
Provides embedded search functionality similar to Discord bot's /search command
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
import faiss
import json
import os
import openai
from openai import OpenAI
import logging
from vector_loader import load_vectors_from_cloud, load_vectors_from_local

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VectorSearchAPI")

# Initialize FastAPI
app = FastAPI(
    title="Quran Vector Search API",
    description="API for semantic search across Quran-related documents",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://phenomenal-cuchufli-e6cece.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
VECTOR_COLLECTIONS = {}
COMBINED_INDEX = None
COMBINED_METADATA = []
client = None

# Request/Response models
class SearchRequest(BaseModel):
    query: str
    num_results: int = 5

class SearchResult(BaseModel):
    collection: str
    title: str
    content: str
    similarity_score: float
    source: Optional[str] = None
    youtube_link: Optional[str] = None

class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    total_results: int

def load_vector_collections():
    """Load all vector collections from disk or cloud"""
    global VECTOR_COLLECTIONS, COMBINED_INDEX, COMBINED_METADATA
    
    # Try loading from cloud first
    use_cloud = os.getenv("USE_CLOUD_VECTORS", "true").lower() == "true"
    
    if use_cloud:
        logger.info("Attempting to load vectors from cloud storage...")
        VECTOR_COLLECTIONS = load_vectors_from_cloud()
    
    # Fallback to local if cloud fails or is disabled
    if not VECTOR_COLLECTIONS:
        logger.info("Loading vectors from local files...")
        VECTOR_COLLECTIONS = load_vectors_from_local()
    
    if not VECTOR_COLLECTIONS:
        logger.error("❌ Failed to load any vector collections")
        return
    
    # Create combined index
    all_embeddings = []
    COMBINED_METADATA = []
    
    for name, collection in VECTOR_COLLECTIONS.items():
        try:
            index = collection["index"]
            metadata = collection["metadata"]
            
            logger.info(f"Processing {name}: {index.ntotal} vectors, {len(metadata)} metadata entries")
            
            # Extract embeddings for combined index
            embeddings = []
            for i in range(index.ntotal):
                try:
                    embedding = index.reconstruct(i)
                    embeddings.append(embedding)
                    
                    # Handle missing metadata gracefully
                    if i < len(metadata):
                        meta = metadata[i]
                    else:
                        # Create placeholder metadata for missing entries
                        meta = {
                            "content": f"Vector {i} from {name}",
                            "title": f"{name} Item {i}",
                            "id": i
                        }
                    
                    COMBINED_METADATA.append({
                        "collection": name,
                        "original_index": i,
                        "metadata": meta
                    })
                except Exception as e:
                    logger.error(f"Error reconstructing vector {i} from {name}: {e}")
                    continue
            
            if embeddings:
                all_embeddings.extend(embeddings)
                logger.info(f"Successfully processed {len(embeddings)} vectors from {name}")
            else:
                logger.warning(f"No embeddings extracted from {name}")
                
        except Exception as e:
            logger.error(f"❌ Error processing {name}: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(traceback.format_exc())
    
    # Create combined index
    if all_embeddings:
        dimension = len(all_embeddings[0])
        COMBINED_INDEX = faiss.IndexFlatL2(dimension)
        COMBINED_INDEX.add(np.array(all_embeddings).astype('float32'))
        logger.info(f"✅ Created combined index with {COMBINED_INDEX.ntotal} vectors")
    else:
        logger.error("❌ No embeddings to create combined index")

def create_embedding(text: str) -> np.ndarray:
    """Create embedding for text using OpenAI"""
    global client
    
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not initialized")
    
    try:
        response = client.embeddings.create(
            input=text,
            model="text-embedding-ada-002"
        )
        return np.array(response.data[0].embedding).astype('float32')
    except Exception as e:
        logger.error(f"Error creating embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating embedding: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Initialize the API on startup"""
    global client
    
    logger.info("Starting Vector Search API...")
    
    # Initialize OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("⚠️ OPENAI_API_KEY not found in environment variables")
    else:
        try:
            # Try to initialize without proxy settings
            client = OpenAI(
                api_key=api_key,
                timeout=30.0,
                max_retries=3
            )
            logger.info("✅ OpenAI client initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize OpenAI client: {e}")
            # Try simpler initialization
            try:
                import openai
                openai.api_key = api_key
                client = OpenAI(api_key=api_key)
                logger.info("✅ OpenAI client initialized (fallback method)")
            except Exception as e2:
                logger.error(f"❌ Failed to initialize OpenAI client (fallback): {e2}")
    
    # Load vector collections
    load_vector_collections()
    
    logger.info("🚀 Vector Search API ready!")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Quran Vector Search API",
        "version": "1.0.0",
        "collections": list(VECTOR_COLLECTIONS.keys()),
        "total_vectors": COMBINED_INDEX.ntotal if COMBINED_INDEX else 0,
        "endpoints": {
            "search": "/search",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "collections_loaded": len(VECTOR_COLLECTIONS),
        "total_vectors": COMBINED_INDEX.ntotal if COMBINED_INDEX else 0,
        "openai_configured": client is not None
    }

@app.get("/debug")
async def debug_info():
    """Debug endpoint to check vector loading"""
    import platform
    
    # Check environment variables
    env_vars = {
        "USE_CLOUD_VECTORS": os.getenv("USE_CLOUD_VECTORS", "not set"),
        "OPENAI_API_KEY": "***" + os.getenv("OPENAI_API_KEY", "not set")[-4:] if os.getenv("OPENAI_API_KEY") else "not set",
    }
    
    # Check vector URLs
    from vector_loader import get_vector_urls
    vector_urls = get_vector_urls()
    
    # Check cache directory
    cache_dir = "./vector_cache"
    cache_exists = os.path.exists(cache_dir)
    cache_files = []
    if cache_exists:
        cache_files = os.listdir(cache_dir)
    
    return {
        "system": {
            "platform": platform.system(),
            "python_version": platform.python_version(),
            "working_directory": os.getcwd()
        },
        "environment": env_vars,
        "vector_urls": {
            name: {
                "faiss": urls["faiss"][:100] + "..." if len(urls["faiss"]) > 100 else urls["faiss"],
                "json": urls["json"][:100] + "..." if len(urls["json"]) > 100 else urls["json"]
            }
            for name, urls in vector_urls.items()
        },
        "cache": {
            "directory": cache_dir,
            "exists": cache_exists,
            "files": cache_files
        },
        "collections_status": {
            name: {
                "loaded": name in VECTOR_COLLECTIONS,
                "vectors": VECTOR_COLLECTIONS[name]["size"] if name in VECTOR_COLLECTIONS else 0
            }
            for name in ["RashadAllMedia", "FinalTestament", "QuranTalkArticles"]
        }
    }

@app.get("/test-download")
async def test_download():
    """Test if we can download files from GitHub"""
    import requests
    
    test_url = "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors/RashadAllMedia.json"
    
    try:
        response = requests.head(test_url, allow_redirects=True)
        return {
            "url": test_url,
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "accessible": response.status_code == 200
        }
    except Exception as e:
        return {
            "url": test_url,
            "error": str(e),
            "accessible": False
        }

@app.post("/search", response_model=SearchResponse)
async def vector_search(request: SearchRequest):
    """Perform vector similarity search across all collections"""
    
    if not COMBINED_INDEX:
        raise HTTPException(status_code=503, detail="Vector index not loaded")
    
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI API not configured")
    
    # Validate input
    request.num_results = min(max(1, request.num_results), 10)
    
    try:
        # Create query embedding
        query_embedding = create_embedding(request.query)
        query_embedding = query_embedding.reshape(1, -1)
        
        # Search in combined index
        distances, indices = COMBINED_INDEX.search(query_embedding, request.num_results)
        
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < 0:
                continue
                
            # Get metadata
            combined_meta = COMBINED_METADATA[idx]
            collection = combined_meta["collection"]
            metadata = combined_meta["metadata"]
            
            # Calculate similarity score (1 - normalized distance)
            similarity = float(1 / (1 + distance))
            
            # Format result based on collection type
            if collection == "RashadAllMedia":
                title = metadata.get("title", "Unknown Title")
                content = metadata.get("content", "")[:500] + "..." if len(metadata.get("content", "")) > 500 else metadata.get("content", "")
                youtube_link = f"https://www.youtube.com/watch?v={metadata.get('youtube_id')}" if metadata.get('youtube_id') else None
                source = "Rashad Khalifa Media"
            elif collection == "FinalTestament":
                title = f"Verse {metadata.get('verse_ref', 'Unknown')}"
                content = metadata.get("text", "")
                source = "Final Testament"
                youtube_link = None
            else:  # QuranTalkArticles
                title = metadata.get("title", "Unknown Article")
                content = metadata.get("content", "")[:500] + "..." if len(metadata.get("content", "")) > 500 else metadata.get("content", "")
                source = metadata.get("url", "QuranTalk")
                youtube_link = None
            
            results.append(SearchResult(
                collection=collection,
                title=title,
                content=content,
                similarity_score=similarity,
                source=source,
                youtube_link=youtube_link
            ))
        
        return SearchResponse(
            results=results,
            query=request.query,
            total_results=len(results)
        )
        
    except Exception as e:
        logger.error(f"Error in vector search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Configure and run the server
    uvicorn.run(
        "vector_search_api:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )