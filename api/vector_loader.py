"""
Vector data loader with cloud storage support
Downloads and caches vector files from cloud storage
"""

import os
import json
import requests
import logging
from typing import Dict, Optional
import faiss
from pathlib import Path

logger = logging.getLogger("VectorLoader")

# Configuration for cloud storage URLs
# Default to GitHub Releases format
GITHUB_RELEASE_BASE = "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors"

VECTOR_URLS = {
    "RashadAllMedia": {
        "faiss": f"{GITHUB_RELEASE_BASE}/RashadAllMedia.faiss",
        "json": f"{GITHUB_RELEASE_BASE}/RashadAllMedia.json"
    },
    "FinalTestament": {
        "faiss": f"{GITHUB_RELEASE_BASE}/FinalTestament.faiss",
        "json": f"{GITHUB_RELEASE_BASE}/FinalTestament.json"
    },
    "QuranTalkArticles": {
        "faiss": f"{GITHUB_RELEASE_BASE}/qurantalk_articles_1744655632.faiss",
        "json": f"{GITHUB_RELEASE_BASE}/qurantalk_articles_1744655632.json"
    },
    "Newsletters": {
        "faiss": f"{GITHUB_RELEASE_BASE}/newsletters_comprehensive.faiss",
        "json": f"{GITHUB_RELEASE_BASE}/newsletters_comprehensive.json"
    },
    "ArabicVerses": {
        "faiss": f"{GITHUB_RELEASE_BASE}/arabic_verses.faiss",
        "json": f"{GITHUB_RELEASE_BASE}/arabic_verses.json"
    }
}

# Alternative: Use environment variables for URLs
def get_vector_urls():
    """Get vector URLs from environment variables or defaults"""
    return {
        "RashadAllMedia": {
            "faiss": os.getenv("RASHAD_FAISS_URL", VECTOR_URLS["RashadAllMedia"]["faiss"]),
            "json": os.getenv("RASHAD_JSON_URL", VECTOR_URLS["RashadAllMedia"]["json"])
        },
        "FinalTestament": {
            "faiss": os.getenv("FINAL_TESTAMENT_FAISS_URL", VECTOR_URLS["FinalTestament"]["faiss"]),
            "json": os.getenv("FINAL_TESTAMENT_JSON_URL", VECTOR_URLS["FinalTestament"]["json"])
        },
        "QuranTalkArticles": {
            "faiss": os.getenv("QURANTALK_FAISS_URL", VECTOR_URLS["QuranTalkArticles"]["faiss"]),
            "json": os.getenv("QURANTALK_JSON_URL", VECTOR_URLS["QuranTalkArticles"]["json"])
        },
        "Newsletters": {
            "faiss": os.getenv("NEWSLETTERS_FAISS_URL", VECTOR_URLS["Newsletters"]["faiss"]),
            "json": os.getenv("NEWSLETTERS_JSON_URL", VECTOR_URLS["Newsletters"]["json"])
        },
        "ArabicVerses": {
            "faiss": os.getenv("ARABIC_VERSES_FAISS_URL", VECTOR_URLS["ArabicVerses"]["faiss"]),
            "json": os.getenv("ARABIC_VERSES_JSON_URL", VECTOR_URLS["ArabicVerses"]["json"])
        }
    }

def download_file(url: str, destination: str) -> bool:
    """Download a file from URL to destination"""
    try:
        logger.info(f"Downloading {url} to {destination}")
        
        # Check if URL is accessible
        head_response = requests.head(url, allow_redirects=True)
        if head_response.status_code == 404:
            logger.error(f"File not found at {url}")
            return False
        
        response = requests.get(url, stream=True, allow_redirects=True)
        response.raise_for_status()
        
        # Get file size
        total_size = int(response.headers.get('content-length', 0))
        logger.info(f"File size: {total_size / (1024*1024):.1f} MB")
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        
        # Write file in chunks
        downloaded = 0
        with open(destination, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if downloaded % (1024 * 1024) == 0:  # Log every MB
                    logger.info(f"Downloaded {downloaded / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB")
        
        # Verify download completed
        actual_size = os.path.getsize(destination)
        if actual_size != total_size:
            logger.error(f"Download incomplete! Expected {total_size} bytes, got {actual_size} bytes")
            os.remove(destination)
            return False
            
        logger.info(f"Successfully downloaded {destination} ({actual_size / (1024*1024):.1f} MB)")
        return True
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        return False

def load_vectors_from_cloud(cache_dir: str = "./vector_cache") -> Dict:
    """Load vector collections, downloading from cloud if necessary"""
    vector_collections = {}
    vector_urls = get_vector_urls()
    
    logger.info(f"Loading vectors from cloud with cache directory: {cache_dir}")
    logger.info(f"Current working directory: {os.getcwd()}")
    
    # Create cache directory
    cache_path = Path(cache_dir)
    cache_path.mkdir(exist_ok=True, parents=True)
    logger.info(f"Cache directory created/verified: {cache_path.absolute()}")
    
    for name, urls in vector_urls.items():
        logger.info(f"\nProcessing {name}...")
        logger.info(f"  FAISS URL: {urls['faiss']}")
        logger.info(f"  JSON URL: {urls['json']}")
        
        try:
            # Define local cache paths
            if name == "ArabicVerses":
                # Special handling for Arabic verses - use original filename
                faiss_path = cache_path / "arabic_verses.faiss"
                json_path = cache_path / "arabic_verses.json"
            else:
                faiss_path = cache_path / f"{name}.faiss"
                json_path = cache_path / f"{name}.json"
            
            # Download if not cached
            if not faiss_path.exists():
                logger.info(f"  FAISS file not in cache, downloading...")
                if not download_file(urls["faiss"], str(faiss_path)):
                    logger.warning(f"Failed to download {name} FAISS index")
                    continue
            else:
                logger.info(f"  FAISS file found in cache: {faiss_path}")
            
            if not json_path.exists():
                logger.info(f"  JSON file not in cache, downloading...")
                if not download_file(urls["json"], str(json_path)):
                    logger.warning(f"Failed to download {name} metadata")
                    continue
            else:
                logger.info(f"  JSON file found in cache: {json_path}")
            
            # Load from cache
            if faiss_path.exists() and json_path.exists():
                logger.info(f"  Loading FAISS index...")
                index = faiss.read_index(str(faiss_path))
                logger.info(f"  Loading metadata from {json_path}")
                logger.info(f"  JSON file size: {os.path.getsize(json_path) / (1024*1024):.2f} MB")
                
                with open(json_path, 'r', encoding='utf-8') as f:
                    # Read raw content first to check
                    content = f.read()
                    logger.info(f"  JSON content length: {len(content)} characters")
                    
                    # Parse JSON
                    data = json.loads(content)
                
                # Handle different JSON structures
                if isinstance(data, dict) and "texts" in data:
                    # Handle different collection formats
                    texts = data.get("texts", [])
                    metadata = []
                    
                    if name == "QuranTalkArticles" and "metadata" in data:
                        # QuranTalkArticles has separate metadata
                        meta_list = data.get("metadata", [])
                        for i, text in enumerate(texts):
                            if i < len(meta_list):
                                meta = meta_list[i]
                                metadata.append({
                                    "content": text,
                                    "title": meta.get("title", f"Article {i}"),
                                    "url": meta.get("url", ""),
                                    "source": "QuranTalk"
                                })
                            else:
                                metadata.append({
                                    "content": text,
                                    "title": f"Article {i}",
                                    "source": "QuranTalk"
                                })
                    elif name == "FinalTestament":
                        # FinalTestament contains verses
                        for i, text in enumerate(texts):
                            # Try to extract verse reference from text
                            metadata.append({
                                "content": text,
                                "text": text,
                                "verse_ref": f"Verse {i}",
                                "title": f"Verse {i}"
                            })
                    elif name == "Newsletters":
                        # Newsletters - use the scraped data structure
                        for i, text in enumerate(texts):
                            metadata.append({
                                "content": text,
                                "title": f"Newsletter {i+1}",
                                "source": "Rashad Khalifa Newsletters",
                                "id": i
                            })
                    elif name == "ArabicVerses":
                        # ArabicVerses - use the verse metadata from the separate metadata array
                        verse_metadata_list = data.get("metadata", [])
                        for i, text in enumerate(texts):
                            if i < len(verse_metadata_list):
                                verse_meta = verse_metadata_list[i]
                                metadata.append(verse_meta)
                            else:
                                # Fallback if metadata is missing
                                metadata.append({
                                    "content": text,
                                    "arabic": text,
                                    "title": f"Arabic Verse {i+1}",
                                    "sura_verse": f"Unknown:{i+1}",
                                    "verse_index": i
                                })
                    else:
                        # RashadAllMedia or default format
                        for i, text in enumerate(texts):
                            metadata.append({
                                "content": text,
                                "title": f"{name} - Item {i+1}",
                                "id": i
                            })
                            
                elif isinstance(data, list):
                    # Handle newsletter format or regular list
                    if name == "Newsletters" and len(data) > 0 and isinstance(data[0], dict) and 'title' in data[0]:
                        # Newsletter format with full metadata
                        metadata = data
                    elif name == "ArabicVerses" and len(data) > 0 and isinstance(data[0], dict) and 'sura_verse' in data[0]:
                        # Arabic verses format with verse metadata
                        metadata = data
                    else:
                        # Regular list format
                        metadata = data
                else:
                    logger.warning(f"  Unexpected JSON structure for {name}: {type(data)}")
                    metadata = []
                
                logger.info(f"  Parsed {len(metadata)} metadata entries")
                
                vector_collections[name] = {
                    "index": index,
                    "metadata": metadata,
                    "size": index.ntotal
                }
                logger.info(f"✅ Loaded {name}: {index.ntotal} vectors, {len(metadata)} metadata")
            else:
                logger.error(f"  Files not found after download attempt")
            
        except Exception as e:
            logger.error(f"Error loading {name}: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(traceback.format_exc())
    
    logger.info(f"\nTotal collections loaded: {len(vector_collections)}")
    return vector_collections

def load_vectors_from_local(base_dir: str = ".") -> Dict:
    """Load vector collections from local files (fallback)"""
    vector_collections = {}
    
    local_paths = {
        "RashadAllMedia": {
            "faiss": os.path.join(base_dir, "data/RashadAllMedia.faiss"),
            "json": os.path.join(base_dir, "data/RashadAllMedia.json")
        },
        "FinalTestament": {
            "faiss": os.path.join(base_dir, "FinalTestament.faiss"),
            "json": os.path.join(base_dir, "FinalTestament.json")
        },
        "QuranTalkArticles": {
            "faiss": os.path.join(base_dir, "qurantalk_articles_1744655632.faiss"),
            "json": os.path.join(base_dir, "qurantalk_articles_1744655632.json")
        },
        "Newsletters": {
            "faiss": os.path.join(base_dir, "api/newsletter_data/newsletters_comprehensive.faiss"),
            "json": os.path.join(base_dir, "api/newsletter_data/newsletters_comprehensive.json")
        },
        "ArabicVerses": {
            "faiss": os.path.join(base_dir, "arabic_embeddings/arabic_verses.faiss"),
            "json": os.path.join(base_dir, "arabic_embeddings/arabic_verses.json")
        }
    }
    
    # Also check vector_cache directory for Arabic verses
    vector_cache_paths = {
        "ArabicVerses": {
            "faiss": os.path.join(base_dir, "vector_cache/arabic_verses.faiss"),
            "json": os.path.join(base_dir, "vector_cache/arabic_verses.json")
        }
    }
    
    # Merge vector_cache paths for Arabic verses
    for name, paths in vector_cache_paths.items():
        if name not in local_paths:
            local_paths[name] = paths
        elif os.path.exists(paths["faiss"]) and os.path.exists(paths["json"]):
            # Use vector_cache if files exist there
            local_paths[name] = paths
    
    for name, paths in local_paths.items():
        try:
            if os.path.exists(paths["faiss"]) and os.path.exists(paths["json"]):
                logger.info(f"Loading {name} from local files...")
                index = faiss.read_index(paths["faiss"])
                with open(paths["json"], 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Handle different JSON structures
                if isinstance(data, dict) and "metadata" in data:
                    # ArabicVerses format with separate metadata
                    metadata = data.get("metadata", [])
                    logger.info(f"  Using metadata array with {len(metadata)} entries")
                elif isinstance(data, list):
                    # Direct list format
                    metadata = data
                    logger.info(f"  Using direct list with {len(metadata)} entries")
                else:
                    logger.warning(f"  Unexpected JSON structure for {name}: {type(data)}")
                    metadata = []
                
                vector_collections[name] = {
                    "index": index,
                    "metadata": metadata,
                    "size": index.ntotal
                }
                logger.info(f"✅ Loaded {name} from local: {index.ntotal} vectors, {len(metadata)} metadata")
        except Exception as e:
            logger.error(f"Error loading local {name}: {e}")
    
    return vector_collections

# Cloud storage options:
# 1. AWS S3: Use boto3 to download from S3
# 2. Google Cloud Storage: Use google-cloud-storage
# 3. Cloudflare R2: S3-compatible, use boto3
# 4. GitHub Releases: Store as release assets (up to 2GB per file)
# 5. Hugging Face Hub: Great for ML models/embeddings

def load_from_s3(bucket: str, cache_dir: str = "./vector_cache") -> Dict:
    """Example: Load vectors from AWS S3"""
    import boto3
    
    s3 = boto3.client('s3')
    vector_collections = {}
    cache_path = Path(cache_dir)
    cache_path.mkdir(exist_ok=True)
    
    s3_files = {
        "RashadAllMedia": {
            "faiss": "vectors/RashadAllMedia.faiss",
            "json": "vectors/RashadAllMedia.json"
        },
        "FinalTestament": {
            "faiss": "vectors/FinalTestament.faiss",
            "json": "vectors/FinalTestament.json"
        },
        "QuranTalkArticles": {
            "faiss": "vectors/qurantalk_articles_1744655632.faiss",
            "json": "vectors/qurantalk_articles_1744655632.json"
        }
    }
    
    for name, files in s3_files.items():
        try:
            faiss_path = cache_path / f"{name}.faiss"
            json_path = cache_path / f"{name}.json"
            
            # Download from S3 if not cached
            if not faiss_path.exists():
                s3.download_file(bucket, files["faiss"], str(faiss_path))
            
            if not json_path.exists():
                s3.download_file(bucket, files["json"], str(json_path))
            
            # Load from cache
            index = faiss.read_index(str(faiss_path))
            with open(json_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            vector_collections[name] = {
                "index": index,
                "metadata": metadata,
                "size": index.ntotal
            }
            
        except Exception as e:
            logger.error(f"Error loading {name} from S3: {e}")
    
    return vector_collections

def load_from_huggingface(repo_id: str = "your-username/quran-vectors", cache_dir: str = "./vector_cache") -> Dict:
    """Example: Load vectors from Hugging Face Hub"""
    from huggingface_hub import hf_hub_download
    
    vector_collections = {}
    cache_path = Path(cache_dir)
    cache_path.mkdir(exist_ok=True)
    
    hf_files = {
        "RashadAllMedia": ["RashadAllMedia.faiss", "RashadAllMedia.json"],
        "FinalTestament": ["FinalTestament.faiss", "FinalTestament.json"],
        "QuranTalkArticles": ["qurantalk_articles_1744655632.faiss", "qurantalk_articles_1744655632.json"]
    }
    
    for name, files in hf_files.items():
        try:
            # Download from Hugging Face
            faiss_path = hf_hub_download(repo_id, files[0], cache_dir=cache_dir)
            json_path = hf_hub_download(repo_id, files[1], cache_dir=cache_dir)
            
            # Load files
            index = faiss.read_index(faiss_path)
            with open(json_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            vector_collections[name] = {
                "index": index,
                "metadata": metadata,
                "size": index.ntotal
            }
            
        except Exception as e:
            logger.error(f"Error loading {name} from Hugging Face: {e}")
    
    return vector_collections