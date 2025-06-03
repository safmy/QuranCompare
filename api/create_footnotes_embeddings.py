#!/usr/bin/env python3
"""
Script to create embeddings for Final Testament footnotes and subtitles
Uses text-embedding-ada-002 with 1536 dimensions to match existing Final Testament embeddings
"""

import json
import faiss
import numpy as np
import os
import time
import openai
from openai import OpenAI
from tqdm import tqdm
from pathlib import Path
from datetime import datetime

# Set OpenAI API key from environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("Please set OPENAI_API_KEY environment variable")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

def load_verses(verses_file):
    """Load verses from the JSON file"""
    print(f"Loading verses from {verses_file}...")
    
    with open(verses_file, 'r', encoding='utf-8') as f:
        verses = json.load(f)
    
    print(f"Loaded {len(verses)} verses")
    return verses

def create_footnotes_subtitles_embeddings(verses, batch_size=100):
    """
    Create embeddings for footnotes and subtitles
    
    Args:
        verses: List of verse objects
        batch_size: Number of texts to embed in a single API call
    
    Returns:
        embeddings: List of embedding vectors
        texts: List of text strings
        metadata: List of metadata for each embedding
    """
    texts = []
    metadata = []
    
    print("Extracting footnotes and subtitles...")
    
    # Process each verse
    for verse in tqdm(verses):
        verse_ref = verse.get('sura_verse', '')
        
        # Add footnote if exists
        if verse.get('footnote'):
            footnote_text = f"Footnote for {verse_ref}: {verse['footnote']}"
            texts.append(footnote_text)
            
            metadata.append({
                'type': 'footnote',
                'sura_verse': verse_ref,
                'content': verse['footnote'],
                'english_verse': verse.get('english', ''),
                'index': len(metadata)
            })
        
        # Add subtitle if exists
        if verse.get('subtitle'):
            subtitle_text = f"Subtitle for {verse_ref}: {verse['subtitle']}"
            texts.append(subtitle_text)
            
            metadata.append({
                'type': 'subtitle',
                'sura_verse': verse_ref,
                'content': verse['subtitle'],
                'english_verse': verse.get('english', ''),
                'index': len(metadata)
            })
    
    print(f"Extracted {len(texts)} texts ({sum(1 for m in metadata if m['type'] == 'footnote')} footnotes, {sum(1 for m in metadata if m['type'] == 'subtitle')} subtitles)")
    
    if not texts:
        print("No footnotes or subtitles found!")
        return [], [], []
    
    # Create embeddings in batches
    embeddings = []
    total_batches = (len(texts) + batch_size - 1) // batch_size
    
    print(f"Creating embeddings using text-embedding-ada-002 in {total_batches} batches...")
    
    for i in tqdm(range(0, len(texts), batch_size)):
        batch_texts = texts[i:i+batch_size]
        
        try:
            # Rate limiting
            time.sleep(0.5)
            
            # Create embeddings using ada-002 (same as Final Testament)
            response = client.embeddings.create(
                model="text-embedding-ada-002",
                input=batch_texts
            )
            
            # Extract embeddings
            batch_embeddings = [item.embedding for item in response.data]
            embeddings.extend(batch_embeddings)
            
        except Exception as e:
            print(f"Error processing batch {i//batch_size + 1}: {e}")
            # Add empty embeddings for failed batch
            embeddings.extend([[0.0] * 1536] * len(batch_texts))
    
    return embeddings, texts, metadata

def save_embeddings(embeddings, texts, metadata, output_dir):
    """
    Save embeddings to FAISS index and metadata to JSON
    
    Args:
        embeddings: List of embedding vectors
        texts: List of texts
        metadata: List of metadata objects
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
    index_path = output_dir / "footnotes_subtitles.faiss"
    print(f"Saving FAISS index to {index_path}...")
    faiss.write_index(index, str(index_path))
    
    # Save metadata
    metadata_obj = {
        'texts': texts,
        'metadata': metadata,
        'total_embeddings': len(embeddings),
        'embedding_model': 'text-embedding-ada-002',
        'embedding_dimensions': dimension,
        'created_at': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
        'statistics': {
            'total_texts': len(texts),
            'footnotes': sum(1 for m in metadata if m['type'] == 'footnote'),
            'subtitles': sum(1 for m in metadata if m['type'] == 'subtitle')
        }
    }
    
    metadata_path = output_dir / "footnotes_subtitles.json"
    print(f"Saving metadata to {metadata_path}...")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata_obj, f, ensure_ascii=False, indent=2)
    
    # Print summary
    print(f"\nSuccessfully created embeddings:")
    print(f"  - Total texts: {len(texts)}")
    print(f"  - Footnotes: {metadata_obj['statistics']['footnotes']}")
    print(f"  - Subtitles: {metadata_obj['statistics']['subtitles']}")
    print(f"  - Embedding dimension: {dimension}")
    print(f"  - FAISS index size: {index_path.stat().st_size / (1024*1024):.1f} MB")
    print(f"  - Metadata size: {metadata_path.stat().st_size / (1024*1024):.1f} MB")
    
    return index_path, metadata_path

def test_search(index_path, metadata_path, query="God alone", num_results=5):
    """Test the search functionality"""
    print(f"\nTesting search with query: {query}")
    
    # Load index and metadata
    index = faiss.read_index(str(index_path))
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Create query embedding
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=query
    )
    query_embedding = np.array([response.data[0].embedding]).astype('float32')
    
    # Search
    distances, indices = index.search(query_embedding, num_results)
    
    print(f"\nTop {num_results} results:")
    for i, (idx, distance) in enumerate(zip(indices[0], distances[0])):
        if idx < len(data['metadata']):
            meta = data['metadata'][idx]
            print(f"\n{i+1}. {meta['type'].capitalize()} for {meta['sura_verse']} (distance: {distance:.3f})")
            print(f"   Content: {meta['content'][:100]}...")

def main():
    """Main function"""
    # Paths
    verses_file = Path(__file__).parent.parent / "public" / "verses_final.json"
    output_dir = Path(__file__).parent / "footnotes_embeddings"
    
    # Load verses
    verses = load_verses(verses_file)
    
    # Create embeddings
    embeddings, texts, metadata = create_footnotes_subtitles_embeddings(verses, batch_size=100)
    
    if embeddings:
        # Save embeddings
        index_path, metadata_path = save_embeddings(
            embeddings, texts, metadata, output_dir
        )
        
        # Test search
        test_search(index_path, metadata_path)
        
        print("\nFootnotes and subtitles embeddings created successfully!")
        print(f"\nOutput directory: {output_dir.absolute()}")
    else:
        print("No embeddings created - no footnotes or subtitles found.")

if __name__ == "__main__":
    main()