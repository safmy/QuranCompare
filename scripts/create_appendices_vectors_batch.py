#!/usr/bin/env python3
"""
Create vector embeddings for Final Testament Appendices using text-embedding-3-small
Batch version for faster processing
"""

import os
import json
import numpy as np
import faiss
from typing import List, Dict, Any
import PyPDF2
import pdfplumber
from openai import OpenAI
import logging
import re
from datetime import datetime
import time

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize OpenAI client
# Read API key from .env.local file
api_key = None
env_path = "/Users/safmy/Desktop/OCR_Arabic-1/QuranCompare/.env.local"
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_OPENAI_API_KEY='):
                api_key = line.split('=', 1)[1].strip()
                break

if not api_key:
    raise ValueError("OpenAI API key not found in .env.local")

client = OpenAI(api_key=api_key)

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file using multiple methods for best results"""
    text = ""
    
    try:
        # Try pdfplumber first (better for complex layouts)
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
        
        # If pdfplumber didn't get much text, try PyPDF2
        if len(text.strip()) < 100:
            logger.info(f"Trying PyPDF2 for {pdf_path}")
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"
    
    except Exception as e:
        logger.error(f"Error extracting text from {pdf_path}: {e}")
        return ""
    
    # Clean up the text
    text = re.sub(r'\n{3,}', '\n\n', text)  # Replace multiple newlines
    text = re.sub(r' {2,}', ' ', text)  # Replace multiple spaces
    
    return text.strip()

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks for better embedding quality"""
    chunks = []
    sentences = text.split('.')
    
    current_chunk = ""
    current_size = 0
    
    for sentence in sentences:
        sentence = sentence.strip() + '.'
        sentence_size = len(sentence)
        
        if current_size + sentence_size > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            
            # Keep last part for overlap
            overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
            current_chunk = overlap_text + " " + sentence
            current_size = len(current_chunk)
        else:
            current_chunk += " " + sentence
            current_size += sentence_size
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks

def create_embeddings_batch(texts: List[str], batch_size: int = 100) -> List[np.ndarray]:
    """Create embeddings in batches for efficiency"""
    embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        logger.info(f"Processing batch {i//batch_size + 1} with {len(batch)} texts")
        
        try:
            response = client.embeddings.create(
                input=batch,
                model="text-embedding-3-small"
            )
            
            batch_embeddings = [np.array(data.embedding).astype('float32') for data in response.data]
            embeddings.extend(batch_embeddings)
            
            # Rate limiting
            time.sleep(0.5)
            
        except Exception as e:
            logger.error(f"Error creating embeddings for batch {i//batch_size + 1}: {e}")
            # Process individually if batch fails
            for text in batch:
                try:
                    response = client.embeddings.create(
                        input=text,
                        model="text-embedding-3-small"
                    )
                    embeddings.append(np.array(response.data[0].embedding).astype('float32'))
                except Exception as e2:
                    logger.error(f"Error creating individual embedding: {e2}")
                    # Add zero embedding as fallback
                    embeddings.append(np.zeros(1536).astype('float32'))  # 3-small has 1536 dimensions
    
    return embeddings

def process_appendices():
    """Process all appendices and create vector embeddings"""
    
    # Load metadata
    metadata_path = "/Users/safmy/Desktop/OCR_Arabic-1/QuranCompare/public/appendices/metadata.json"
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    # Get appendices info from React component for titles
    appendix_titles = {
        1: "One of the Great Miracles",
        2: "God's Messenger of the Covenant",
        3: "We Made the Quran Easy",
        4: "Why Was the Quran Revealed in Arabic?",
        5: "The Quran's Common Denominator",
        6: "Greatest Criterion",
        7: "The Miracle of the Quran",
        8: "The Myth of Intercession",
        9: "Abraham: Original Messenger of Islam",
        10: "God's Usage of the Plural Tense",
        11: "The Day of Resurrection",
        12: "Role of the Prophet Muhammad",
        13: "The First Pillar of Islam",
        14: "Predestination",
        15: "Religious Duties: Gift from God",
        16: "Dietary Prohibition",
        17: "Death",
        18: "Quran: The Ultimate Reference",
        19: "Hadith & Sunna: Satan's Hypocritical Inventions",
        20: "Quran: Unlike Any Other Book",
        21: "Satan's Clever Trick",
        22: "Jesus",
        23: "Mathematical Coding of the Quran",
        24: "Tampering With the Word of God",
        25: "The End of the World",
        26: "The Three Messengers of Islam",
        27: "Muhammad's Household",
        28: "The Age of 40",
        29: "The Missing Basmalah",
        30: "Messengers vs. Prophets",
        31: "Chronological Order of Revelation",
        32: "God's Usage of the Plural",
        33: "Why Did God Send a Messenger Now?",
        34: "Virginity",
        35: "Drugs & Alcohol",
        36: "What Price A Great Nation",
        37: "The Crucial Age of 40",
        38: "19 - The Creator's Signature"
    }
    
    pdf_base_path = "/Users/safmy/Desktop/OCR_Arabic-1/QuranCompare/public/appendices"
    
    all_chunks = []
    all_metadata = []
    
    # Process each appendix and collect all chunks first
    for appendix_info in metadata['appendices']:  # Process all appendices
        appendix_num = appendix_info['number']
        pdf_filename = appendix_info['filename']
        pdf_path = os.path.join(pdf_base_path, pdf_filename)
        
        logger.info(f"Processing Appendix {appendix_num}: {appendix_titles.get(appendix_num, 'Unknown')}")
        
        if not os.path.exists(pdf_path):
            logger.warning(f"PDF not found: {pdf_path}")
            continue
        
        # Extract text
        text = extract_text_from_pdf(pdf_path)
        if not text:
            logger.warning(f"No text extracted from {pdf_filename}")
            continue
        
        logger.info(f"Extracted {len(text)} characters from {pdf_filename}")
        
        # Chunk the text
        chunks = chunk_text(text)
        logger.info(f"Created {len(chunks)} chunks")
        
        # Create metadata for each chunk
        for i, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            
            chunk_metadata = {
                "appendix_number": appendix_num,
                "title": f"Appendix {appendix_num}: {appendix_titles.get(appendix_num, 'Unknown')}",
                "content": chunk,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "source": "Final Testament Appendices",
                "url": f"https://submission.org/appendices/appendix{appendix_num}.html"
            }
            all_metadata.append(chunk_metadata)
    
    # Create embeddings in batches
    logger.info(f"Creating embeddings for {len(all_chunks)} chunks...")
    all_embeddings = create_embeddings_batch(all_chunks, batch_size=50)
    
    logger.info(f"Total embeddings created: {len(all_embeddings)}")
    
    if not all_embeddings:
        logger.error("No embeddings created!")
        return
    
    # Create FAISS index
    dimension = len(all_embeddings[0])
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(all_embeddings).astype('float32'))
    
    logger.info(f"Created FAISS index with {index.ntotal} vectors of dimension {dimension}")
    
    # Save outputs
    output_dir = "/Users/safmy/Desktop/OCR_Arabic-1/QuranCompare/vector_collections"
    os.makedirs(output_dir, exist_ok=True)
    
    # Save FAISS index
    faiss_path = os.path.join(output_dir, "Appendices.faiss")
    faiss.write_index(index, faiss_path)
    logger.info(f"Saved FAISS index to {faiss_path}")
    
    # Save metadata
    json_path = os.path.join(output_dir, "Appendices.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_metadata, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved metadata to {json_path}")
    
    # Create summary
    summary = {
        "collection_name": "Appendices",
        "description": "Final Testament Appendices by Rashad Khalifa",
        "total_vectors": len(all_embeddings),
        "total_appendices": len(set(m["appendix_number"] for m in all_metadata)),
        "embedding_model": "text-embedding-3-small",
        "dimension": dimension,
        "created_at": datetime.now().isoformat(),
        "chunk_size": 1000,
        "overlap": 200
    }
    
    summary_path = os.path.join(output_dir, "Appendices_summary.json")
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    
    logger.info("Processing complete!")
    logger.info(f"Summary: {json.dumps(summary, indent=2)}")

if __name__ == "__main__":
    process_appendices()