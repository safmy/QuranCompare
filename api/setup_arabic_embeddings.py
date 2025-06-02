#!/usr/bin/env python3
"""
Setup script to create Arabic embeddings on server deployment
This will be run automatically when the API starts if embeddings don't exist
"""

import os
import sys
import subprocess

def setup_arabic_embeddings():
    """Setup Arabic embeddings for production deployment"""
    
    print("🔤 Setting up Arabic embeddings for production...")
    
    # Check if embeddings already exist
    faiss_path = "arabic_embeddings/arabic_verses.faiss"
    json_path = "arabic_embeddings/arabic_verses.json"
    
    if os.path.exists(faiss_path) and os.path.exists(json_path):
        print("✅ Arabic embeddings already exist, skipping generation")
        return True
    
    print("🚀 Creating Arabic embeddings...")
    
    try:
        # Run the embedding creation script
        result = subprocess.run([
            sys.executable, 
            "create_arabic_embeddings.py"
        ], capture_output=True, text=True, cwd="/app/api")
        
        if result.returncode == 0:
            print("✅ Arabic embeddings created successfully!")
            print(result.stdout)
            return True
        else:
            print("❌ Failed to create Arabic embeddings")
            print("Error:", result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Exception during embedding creation: {e}")
        return False

if __name__ == "__main__":
    success = setup_arabic_embeddings()
    sys.exit(0 if success else 1)