#!/usr/bin/env python3
"""
Script to create embeddings for Arabic Quran verses
Creates FAISS index and metadata for Arabic text search
"""

import json
import faiss
import numpy as np
import os
import time
import openai
from tqdm import tqdm
from pathlib import Path

# Set OpenAI API key from environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Please set OPENAI_API_KEY environment variable")

openai.api_key = OPENAI_API_KEY

def load_verses(verses_file):
    """Load verses from the JSON file"""
    print(f"Loading verses from {verses_file}...")
    
    with open(verses_file, 'r', encoding='utf-8') as f:
        verses = json.load(f)
    
    print(f"Loaded {len(verses)} verses")
    return verses

def create_arabic_embeddings(verses, batch_size=100):
    """
    Create embeddings for Arabic verses
    
    Args:
        verses: List of verse objects containing 'arabic' field
        batch_size: Number of verses to embed in a single API call
    
    Returns:
        embeddings: List of embedding vectors
        verse_texts: List of Arabic text strings
        verse_metadata: List of metadata for each verse
    """
    verse_texts = []
    verse_metadata = []
    
    print("Extracting Arabic text...")
    for verse in tqdm(verses):
        if 'arabic' in verse and verse['arabic']:
            arabic_text = verse['arabic'].strip()
            verse_texts.append(arabic_text)
            
            # Create metadata
            metadata = {
                'sura_verse': verse.get('sura_verse', ''),
                'english': verse.get('english', ''),
                'arabic': arabic_text,
                'verse_index': len(verse_metadata)
            }
            
            # Add optional fields if they exist
            if 'roots' in verse:
                metadata['roots'] = verse['roots']
            if 'meanings' in verse:
                metadata['meanings'] = verse['meanings']
            if 'footnote' in verse:
                metadata['footnote'] = verse['footnote']
            
            verse_metadata.append(metadata)
    
    print(f"Extracted {len(verse_texts)} Arabic verses")
    
    # Create embeddings in batches
    embeddings = []
    total_batches = (len(verse_texts) + batch_size - 1) // batch_size
    
    print(f"Creating embeddings in {total_batches} batches...")
    
    for i in tqdm(range(0, len(verse_texts), batch_size)):
        batch_texts = verse_texts[i:i+batch_size]
        
        try:
            # Rate limiting
            time.sleep(0.5)
            
            # Create embeddings using the newer API
            response = openai.embeddings.create(
                model="text-embedding-3-small",  # Using the newer, more efficient model
                input=batch_texts
            )
            
            # Extract embeddings
            batch_embeddings = [item.embedding for item in response.data]
            embeddings.extend(batch_embeddings)
            
        except Exception as e:
            print(f"Error processing batch {i//batch_size + 1}: {e}")
            # Add empty embeddings for failed batch
            embeddings.extend([[0.0] * 1536] * len(batch_texts))
    
    return embeddings, verse_texts, verse_metadata

def save_embeddings(embeddings, verse_texts, verse_metadata, output_dir):
    """
    Save embeddings to FAISS index and metadata to JSON
    
    Args:
        embeddings: List of embedding vectors
        verse_texts: List of Arabic texts
        verse_metadata: List of metadata objects
        output_dir: Directory to save files
    """
    # Ensure output directory exists
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Convert embeddings to numpy array
    embeddings_array = np.array(embeddings).astype('float32')
    
    # Create FAISS index
    dimension = embeddings_array.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings_array)
    
    # Save FAISS index
    index_path = output_dir / "arabic_verses.faiss"
    print(f"Saving FAISS index to {index_path}...")
    faiss.write_index(index, str(index_path))
    
    # Save metadata
    metadata = {
        'texts': verse_texts,
        'metadata': verse_metadata,
        'total_embeddings': len(embeddings),
        'embedding_model': 'text-embedding-3-small',
        'created_at': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())
    }
    
    metadata_path = output_dir / "arabic_verses.json"
    print(f"Saving metadata to {metadata_path}...")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    
    # Print summary
    print(f"\nSuccessfully created embeddings:")
    print(f"  - Total verses: {len(verse_texts)}")
    print(f"  - Embedding dimension: {dimension}")
    print(f"  - FAISS index size: {index_path.stat().st_size / (1024*1024):.1f} MB")
    print(f"  - Metadata size: {metadata_path.stat().st_size / (1024*1024):.1f} MB")
    
    return index_path, metadata_path

def test_search(index_path, metadata_path, query="بِسْمِ ٱللَّهِ", num_results=5):
    """Test the search functionality with an Arabic query"""
    print(f"\nTesting search with query: {query}")
    
    # Load index and metadata
    index = faiss.read_index(str(index_path))
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Create query embedding
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=query
    )
    query_embedding = np.array([response.data[0].embedding]).astype('float32')
    
    # Search
    distances, indices = index.search(query_embedding, num_results)
    
    print(f"\nTop {num_results} results:")
    for i, (idx, distance) in enumerate(zip(indices[0], distances[0])):
        verse_meta = data['metadata'][idx]
        print(f"\n{i+1}. {verse_meta['sura_verse']} (distance: {distance:.3f})")
        print(f"   Arabic: {verse_meta['arabic']}")
        print(f"   English: {verse_meta['english'][:100]}...")

def main():
    """Main function"""
    # Paths
    verses_file = Path(__file__).parent.parent / "public" / "verses_final.json"
    output_dir = Path(__file__).parent / "arabic_embeddings"
    
    # Load verses
    verses = load_verses(verses_file)
    
    # Create embeddings
    embeddings, verse_texts, verse_metadata = create_arabic_embeddings(verses, batch_size=100)
    
    # Save embeddings
    index_path, metadata_path = save_embeddings(
        embeddings, verse_texts, verse_metadata, output_dir
    )
    
    # Test search
    test_search(index_path, metadata_path)
    
    print("\nEmbeddings created successfully!")
    print(f"\nTo upload to GitHub releases, run:")
    print(f"python upload_vectors.py --provider github --github-repo safmy/QuranCompare --source-dir {output_dir}")

if __name__ == "__main__":
    main()