#!/usr/bin/env python3
"""
Vector Search API for QuranCompare
Provides embedded search functionality similar to Discord bot's /search command
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
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
from youtube_mapper import youtube_mapper
from verses_loader import load_verses_data
from subtitle_ranges import get_cached_verse_range, get_subtitle_for_range
from arabic_utils import enhance_arabic_search_query, is_arabic_text, get_phonetic_variations

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("VectorSearchAPI")

# Load Quran verse mapping and verses data
QURAN_VERSE_MAPPING = None
QURAN_VERSES_DATA = None
try:
    mapping_path = os.path.join(os.path.dirname(__file__), 'quran_verse_mapping.json')
    if os.path.exists(mapping_path):
        with open(mapping_path, 'r', encoding='utf-8') as f:
            mapping_data = json.load(f)
            QURAN_VERSE_MAPPING = mapping_data['verse_mapping']
            logger.info(f"Loaded Quran verse mapping with {len(QURAN_VERSE_MAPPING)} verses")
except Exception as e:
    logger.warning(f"Could not load Quran verse mapping: {e}")

# Load verses data using the dedicated loader
QURAN_VERSES_DATA = load_verses_data()

# Initialize FastAPI
app = FastAPI(
    title="Quran Vector Search API",
    description="API for semantic search across Quran-related documents",
    version="1.0.0"
)

# Add CORS middleware - MUST be before any route definitions
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",") if os.getenv("ALLOWED_ORIGINS") != "*" else ["*"]
# Always allow capacitor URLs for iOS app
if "*" not in allowed_origins:
    allowed_origins.extend(["capacitor://localhost", "ionic://localhost", "http://localhost"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
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
    include_rashad_media: bool = True
    include_final_testament: bool = True  
    include_qurantalk: bool = True
    include_newsletters: bool = True
    include_arabic_verses: bool = True

class VerseRangeRequest(BaseModel):
    verse_range: str  # Format: "1:1-7" or "2:5-10" or "3:15"

class SearchResult(BaseModel):
    collection: str
    title: str
    content: str
    similarity_score: float
    source: Optional[str] = None
    source_url: Optional[str] = None
    youtube_link: Optional[str] = None

class VerseResult(BaseModel):
    sura_verse: str
    english: str
    arabic: str
    roots: str
    meanings: str
    footnote: Optional[str] = None
    # Additional language translations
    tquran: Optional[str] = None
    tmquran: Optional[str] = None
    squran: Optional[str] = None
    rquran: Optional[str] = None
    pquran: Optional[str] = None
    gquran: Optional[str] = None
    fquran: Optional[str] = None
    bquran: Optional[str] = None
    myquran: Optional[str] = None
    # Language-specific footnotes
    tquran_footnote: Optional[str] = None
    tmquran_footnote: Optional[str] = None
    squran_footnote: Optional[str] = None
    rquran_footnote: Optional[str] = None
    pquran_footnote: Optional[str] = None
    gquran_footnote: Optional[str] = None
    fquran_footnote: Optional[str] = None
    bquran_footnote: Optional[str] = None
    myquran_footnote: Optional[str] = None
    # Additional fields
    transliteration: Optional[str] = None
    subtitle: Optional[str] = None

class SearchResponse(BaseModel):
    results: List[SearchResult]
    query: str
    total_results: int

class VerseRangeResponse(BaseModel):
    verses: List[VerseResult]
    total_verses: int
    range_requested: str

class VerseRangeForSubtitleRequest(BaseModel):
    verse_ref: str  # Format: "2:3"

class VerseRangeForSubtitleResponse(BaseModel):
    verse_ref: str
    subtitle_range: str
    subtitle_text: Optional[str] = None
    message: str

def load_vector_collections():
    """Load all vector collections from disk or cloud"""
    global VECTOR_COLLECTIONS, COMBINED_INDEX, COMBINED_METADATA
    
    # Try loading from cloud first
    use_cloud = os.getenv("USE_CLOUD_VECTORS", "true").lower() == "true"
    
    VECTOR_COLLECTIONS = {}
    
    if use_cloud:
        logger.info("Attempting to load vectors from cloud storage...")
        cloud_collections = load_vectors_from_cloud()
        if cloud_collections:
            VECTOR_COLLECTIONS.update(cloud_collections)
    
    # Try to load missing collections from local files
    logger.info("Checking for missing collections in local files...")
    local_collections = load_vectors_from_local()
    if local_collections:
        for name, collection in local_collections.items():
            if name not in VECTOR_COLLECTIONS:
                logger.info(f"Adding {name} from local files")
                VECTOR_COLLECTIONS[name] = collection
    
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

def create_embedding(text: str, force_english: bool = False) -> np.ndarray:
    """Create embedding for text using OpenAI"""
    global client
    
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI client not initialized")
    
    try:
        # If force_english is True, don't apply Arabic enhancements
        if force_english:
            query_text = text
        else:
            # Enhance the text if it's Arabic or transliterated
            enhanced_text = enhance_arabic_search_query(text)
            
            # For Arabic text, we might want to include both original and enhanced
            if is_arabic_text(text) or text != enhanced_text:
                # Create a combined query with variations
                variations = get_phonetic_variations(enhanced_text)
                # Use the first variation or combine them
                query_text = " ".join(variations[:2]) if len(variations) > 1 else enhanced_text
            else:
                query_text = text
        
        response = client.embeddings.create(
            input=query_text,
            model="text-embedding-3-small"
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
    
    logger.info(f"🚀 Vector Search API ready! Loaded collections: {list(VECTOR_COLLECTIONS.keys())}")
    logger.info(f"Combined index total vectors: {COMBINED_INDEX.ntotal if COMBINED_INDEX else 0}")

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
            for name in ["RashadAllMedia", "FinalTestament", "QuranTalkArticles", "Newsletters", "ArabicVerses"]
        }
    }

@app.get("/debug-youtube")
async def debug_youtube():
    """Debug YouTube mapper status"""
    mapper_status = {
        "loaded": youtube_mapper.loaded,
        "content_loaded": youtube_mapper.content_loaded,
        "video_links_count": len(youtube_mapper.video_links),
        "line_mappings_count": len(youtube_mapper.line_to_title_map),
        "rashad_content_size": len(youtube_mapper.rashad_content) if youtube_mapper.rashad_content else 0
    }
    
    # Try to load if not loaded
    if not youtube_mapper.loaded:
        youtube_mapper.load_mappings()
        mapper_status["after_load_attempt"] = {
            "loaded": youtube_mapper.loaded,
            "video_links_count": len(youtube_mapper.video_links),
            "line_mappings_count": len(youtube_mapper.line_to_title_map)
        }
    
    if not youtube_mapper.content_loaded:
        youtube_mapper.load_rashad_content()
        mapper_status["after_content_load"] = {
            "content_loaded": youtube_mapper.content_loaded,
            "rashad_content_size": len(youtube_mapper.rashad_content) if youtube_mapper.rashad_content else 0
        }
    
    return mapper_status

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

@app.options("/verses")
async def verses_options():
    """Handle preflight requests for /verses endpoint"""
    return {"message": "OK"}

@app.post("/verses", response_model=VerseRangeResponse)
async def get_verse_range(request: VerseRangeRequest):
    """Get verses by range (e.g., '1:1-7' or '2:5-10' or '3:15')"""
    
    if not QURAN_VERSES_DATA:
        raise HTTPException(status_code=503, detail="Verses data not loaded")
    
    try:
        # Parse the verse range
        verse_range = request.verse_range.strip()
        
        # Handle single verse (e.g., "1:5")
        if '-' not in verse_range:
            chapter, verse = map(int, verse_range.split(':'))
            start_verse = end_verse = verse
        else:
            # Handle range (e.g., "1:1-7")
            start_ref, end_ref = verse_range.split('-')
            
            # Parse start
            if ':' in start_ref:
                start_chapter, start_verse = map(int, start_ref.split(':'))
            else:
                # Just verse number, assume same chapter as end
                start_verse = int(start_ref)
                # Need to get chapter from end_ref
                if ':' not in end_ref:
                    raise HTTPException(status_code=400, detail="Invalid range format")
                start_chapter = int(end_ref.split(':')[0])
            
            # Parse end
            if ':' in end_ref:
                end_chapter, end_verse = map(int, end_ref.split(':'))
            else:
                end_chapter = start_chapter
                end_verse = int(end_ref)
            
            # For now, only support single chapter ranges
            if start_chapter != end_chapter:
                raise HTTPException(status_code=400, detail="Cross-chapter ranges not supported yet")
            
            chapter = start_chapter
        
        # Find matching verses
        verses = []
        for verse_data in QURAN_VERSES_DATA:
            sura_verse = verse_data['sura_verse']
            verse_chapter, verse_num = map(int, sura_verse.split(':'))
            
            if verse_chapter == chapter and start_verse <= verse_num <= end_verse:
                verses.append(VerseResult(
                    sura_verse=sura_verse,
                    english=verse_data.get('english', ''),
                    arabic=verse_data.get('arabic', ''),
                    roots=verse_data.get('roots', ''),
                    meanings=verse_data.get('meanings', ''),
                    footnote=verse_data.get('footnote'),
                    # Include all language translations
                    tquran=verse_data.get('tquran'),
                    tmquran=verse_data.get('tmquran'),
                    squran=verse_data.get('squran'),
                    rquran=verse_data.get('rquran'),
                    pquran=verse_data.get('pquran'),
                    gquran=verse_data.get('gquran'),
                    fquran=verse_data.get('fquran'),
                    bquran=verse_data.get('bquran'),
                    myquran=verse_data.get('myquran'),
                    # Include language-specific footnotes
                    tquran_footnote=verse_data.get('tquran_footnote'),
                    tmquran_footnote=verse_data.get('tmquran_footnote'),
                    squran_footnote=verse_data.get('squran_footnote'),
                    rquran_footnote=verse_data.get('rquran_footnote'),
                    pquran_footnote=verse_data.get('pquran_footnote'),
                    gquran_footnote=verse_data.get('gquran_footnote'),
                    fquran_footnote=verse_data.get('fquran_footnote'),
                    bquran_footnote=verse_data.get('bquran_footnote'),
                    myquran_footnote=verse_data.get('myquran_footnote'),
                    # Additional fields
                    transliteration=verse_data.get('transliteration'),
                    subtitle=verse_data.get('subtitle')
                ))
        
        return VerseRangeResponse(
            verses=verses,
            total_verses=len(verses),
            range_requested=verse_range
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid verse range format. Use format like '1:1-7' or '2:5'")
    except Exception as e:
        logger.error(f"Error in verse range lookup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.options("/verse-range-for-subtitle")
async def verse_range_for_subtitle_options():
    """Handle preflight requests for /verse-range-for-subtitle endpoint"""
    return {"message": "OK"}

@app.post("/verse-range-for-subtitle", response_model=VerseRangeForSubtitleResponse)
async def get_verse_range_for_subtitle(request: VerseRangeForSubtitleRequest):
    """Get the subtitle range for a given verse (e.g., 2:3 -> 2:3-5)"""
    
    try:
        verse_ref = request.verse_ref.strip()
        subtitle_range = get_cached_verse_range(verse_ref)
        subtitle_text = get_subtitle_for_range(subtitle_range)
        
        return VerseRangeForSubtitleResponse(
            verse_ref=verse_ref,
            subtitle_range=subtitle_range,
            subtitle_text=subtitle_text,
            message=f"Verse {verse_ref} belongs to subtitle range {subtitle_range}"
        )
        
    except Exception as e:
        logger.error(f"Error in verse range for subtitle lookup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.options("/search")
async def search_options():
    """Handle preflight requests for /search endpoint"""
    return {"message": "OK"}

@app.post("/search", response_model=SearchResponse)
async def vector_search(request: SearchRequest):
    """Perform vector similarity search across selected collections individually"""
    
    if not client:
        raise HTTPException(status_code=503, detail="OpenAI API not configured")
    
    # Validate input
    request.num_results = min(max(1, request.num_results), 20)
    
    try:
        # Create embeddings based on collection type
        # For Arabic verses, don't force English processing
        
        # Simple collection filter
        collection_filter = {
            "RashadAllMedia": request.include_rashad_media,
            "FinalTestament": request.include_final_testament,
            "QuranTalkArticles": request.include_qurantalk,
            "Newsletters": request.include_newsletters,
            "ArabicVerses": request.include_arabic_verses
        }
        
        selected_collections = [k for k, v in collection_filter.items() if v]
        logger.info(f"Query: '{request.query}', Selected collections: {selected_collections}")
        
        if not selected_collections:
            return SearchResponse(results=[], query=request.query, total_results=0)
        
        all_results = []
        
        # Search each selected collection individually
        for collection_name in selected_collections:
            if collection_name not in VECTOR_COLLECTIONS:
                logger.warning(f"Collection {collection_name} not found in loaded collections")
                continue
                
            collection_data = VECTOR_COLLECTIONS[collection_name]
            
            # Create appropriate embedding for this collection
            if collection_name == "ArabicVerses":
                # For Arabic verses, use regular embedding processing
                query_embedding = create_embedding(request.query, force_english=False)
            else:
                # For English collections, force English processing
                query_embedding = create_embedding(request.query, force_english=True)
            
            query_embedding = query_embedding.reshape(1, -1)
            
            # Search this collection
            search_count = min(request.num_results, collection_data["index"].ntotal)
            distances, indices = collection_data["index"].search(query_embedding, search_count)
            
            logger.info(f"Searching {collection_name}: found {len(indices[0])} candidates")
            
            # Process results for this collection
            for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                if idx < 0 or idx >= len(collection_data["metadata"]):
                    continue
                
                metadata = collection_data["metadata"][idx]
                similarity = float(1 / (1 + distance))
                
                # Format result based on collection type
                if collection_name == "FinalTestament":
                    verse_text = metadata.get("content", "").strip()
                    
                    if QURAN_VERSE_MAPPING and str(idx) in QURAN_VERSE_MAPPING:
                        verse_ref = f"[{QURAN_VERSE_MAPPING[str(idx)]}]"
                    else:
                        verse_ref = f"[Verse {idx + 1}]"
                    
                    title = f"{verse_ref} {verse_text[:50]}{'...' if len(verse_text) > 50 else ''}"
                    content = verse_text
                    source = "Final Testament"
                    
                    all_results.append(SearchResult(
                        collection=collection_name,
                        title=title,
                        content=content,
                        similarity_score=similarity,
                        source=source,
                        source_url=None,
                        youtube_link=None
                    ))
                    
                elif collection_name == "ArabicVerses":
                    sura_verse = metadata.get("sura_verse", "")
                    arabic_text = metadata.get("arabic", "")
                    english_text = metadata.get("english", "")
                    
                    title = f"[{sura_verse}] {arabic_text[:50]}{'...' if len(arabic_text) > 50 else ''}"
                    content = f"Arabic: {arabic_text}\nEnglish: {english_text}"
                    source = "Quran Arabic Verses"
                    
                    all_results.append(SearchResult(
                        collection=collection_name,
                        title=title,
                        content=content,
                        similarity_score=similarity,
                        source=source,
                        source_url=None,
                        youtube_link=None
                    ))
                    
                elif collection_name == "Newsletters":
                    title = metadata.get("title", "Newsletter")
                    content = metadata.get("content", "")[:500] + "..." if len(metadata.get("content", "")) > 500 else metadata.get("content", "")
                    newsletter_url = metadata.get("url", "")
                    source = "Rashad Khalifa Newsletters"
                    
                    all_results.append(SearchResult(
                        collection=collection_name,
                        title=title,
                        content=content,
                        similarity_score=similarity,
                        source=source,
                        source_url=newsletter_url,
                        youtube_link=None
                    ))
                    
                elif collection_name == "QuranTalkArticles":
                    title = metadata.get("title", "Unknown Article")
                    content = metadata.get("content", "")[:500] + "..." if len(metadata.get("content", "")) > 500 else metadata.get("content", "")
                    article_url = metadata.get("url", "")
                    source = "QuranTalk"
                    
                    all_results.append(SearchResult(
                        collection=collection_name,
                        title=title,
                        content=content,
                        similarity_score=similarity,
                        source=source,
                        source_url=article_url,
                        youtube_link=None
                    ))
                    
                elif collection_name == "RashadAllMedia":
                    content = metadata.get("content", "")
                    
                    # Use YouTube mapper to get proper title and link
                    mapped_title, youtube_link, is_exact_match = youtube_mapper.find_title_for_content_simple(content)
                    
                    if mapped_title:
                        title = mapped_title
                        if is_exact_match:
                            youtube_link = youtube_mapper.add_timestamp_to_youtube_link(youtube_link, content)
                    else:
                        title = youtube_mapper.extract_title_from_content(content)
                        youtube_link = youtube_mapper.get_youtube_link_for_content(content)
                    
                    # Truncate content for display
                    truncated_content = content[:500] + "..." if len(content) > 500 else content
                    
                    if not youtube_link:
                        search_query = title.replace(" ", "+")
                        youtube_link = f"https://www.youtube.com/results?search_query=rashad+khalifa+{search_query}"
                    
                    all_results.append(SearchResult(
                        collection=collection_name,
                        title=title,
                        content=truncated_content,
                        similarity_score=similarity,
                        source="Rashad Khalifa Media",
                        source_url=None,
                        youtube_link=youtube_link
                    ))
        
        # Sort results by similarity score
        all_results.sort(key=lambda x: x.similarity_score, reverse=True)
        
        # Limit to requested number of results
        final_results = all_results[:request.num_results]
        
        logger.info(f"Total results found: {len(final_results)} from {len(selected_collections)} collections")
        
        return SearchResponse(
            results=final_results,
            query=request.query,
            total_results=len(final_results)
        )
        
    except Exception as e:
        logger.error(f"Error in vector search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.options("/transcribe-audio")
async def transcribe_audio_options():
    """Handle preflight requests for /transcribe-audio endpoint"""
    return {"message": "OK"}

@app.post("/transcribe-audio")
async def transcribe_audio(audio: UploadFile = File(...), language: Optional[str] = None):
    """Transcribe audio using OpenAI Whisper API with support for Arabic and English"""
    try:
        # Check if OpenAI client is available
        if not client:
            raise HTTPException(status_code=500, detail="OpenAI client not configured")
        
        logger.info(f"Received audio file: {audio.filename}, content_type: {audio.content_type}, size: {audio.size}")
        
        # Read audio file
        audio_data = await audio.read()
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        logger.info(f"Audio data size: {len(audio_data)} bytes")
        
        # Save temporarily (Whisper API requires a file)
        import tempfile
        import os
        
        # Use appropriate file extension based on content type
        file_extension = '.webm'
        if audio.content_type:
            if 'mp4' in audio.content_type or 'mp4a' in audio.content_type:
                file_extension = '.mp4'
            elif 'wav' in audio.content_type:
                file_extension = '.wav'
            elif 'mpeg' in audio.content_type or 'mp3' in audio.content_type:
                file_extension = '.mp3'
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        logger.info(f"Saved audio to temporary file: {temp_file_path}")
        
        try:
            # Use OpenAI Whisper API
            with open(temp_file_path, 'rb') as audio_file:
                logger.info("Calling OpenAI Whisper API...")
                
                # If no language specified, let Whisper auto-detect
                # Otherwise use the specified language (ar for Arabic, en for English)
                if language:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=language,
                        response_format="text"
                    )
                else:
                    # Auto-detect language
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="text"
                    )
            
            logger.info(f"Transcription result: {transcript}")
            
            # Handle both string and object responses
            transcription_text = transcript if isinstance(transcript, str) else transcript.text if hasattr(transcript, 'text') else str(transcript)
            
            return {"transcription": transcription_text}
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transcribing audio: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

# Catch-all OPTIONS handler for any endpoint
@app.options("/{path:path}")
async def catch_all_options(path: str):
    """Handle all OPTIONS requests for CORS preflight"""
    return {"message": "OK"}

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