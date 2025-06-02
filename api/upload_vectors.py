#!/usr/bin/env python3
"""
Script to upload vector files to cloud storage
Supports multiple cloud providers
"""

import os
import sys
import argparse
from pathlib import Path

def upload_to_github_release(files, repo, tag):
    """Upload files as GitHub release assets"""
    print(f"Uploading to GitHub release {repo} tag {tag}")
    
    # Use GitHub CLI (gh)
    for file_path in files:
        if os.path.exists(file_path):
            cmd = f"gh release upload {tag} {file_path} --repo {repo}"
            print(f"Running: {cmd}")
            os.system(cmd)
        else:
            print(f"File not found: {file_path}")

def upload_to_huggingface(files, repo_id):
    """Upload files to Hugging Face Hub"""
    try:
        from huggingface_hub import HfApi
        api = HfApi()
        
        print(f"Uploading to Hugging Face Hub: {repo_id}")
        
        for file_path in files:
            if os.path.exists(file_path):
                print(f"Uploading {file_path}...")
                api.upload_file(
                    path_or_fileobj=file_path,
                    path_in_repo=os.path.basename(file_path),
                    repo_id=repo_id,
                    repo_type="dataset"
                )
            else:
                print(f"File not found: {file_path}")
                
    except ImportError:
        print("Please install huggingface-hub: pip install huggingface-hub")
        sys.exit(1)

def upload_to_s3(files, bucket, prefix=""):
    """Upload files to AWS S3"""
    try:
        import boto3
        s3 = boto3.client('s3')
        
        print(f"Uploading to S3 bucket: {bucket}")
        
        for file_path in files:
            if os.path.exists(file_path):
                key = os.path.join(prefix, os.path.basename(file_path))
                print(f"Uploading {file_path} to s3://{bucket}/{key}")
                s3.upload_file(file_path, bucket, key)
            else:
                print(f"File not found: {file_path}")
                
    except ImportError:
        print("Please install boto3: pip install boto3")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Upload vector files to cloud storage")
    parser.add_argument("--provider", choices=["github", "huggingface", "s3"], 
                        required=True, help="Cloud storage provider")
    parser.add_argument("--source-dir", default="../..", 
                        help="Directory containing vector files")
    
    # Provider-specific arguments
    parser.add_argument("--github-repo", help="GitHub repository (e.g., safmy/QuranCompare)")
    parser.add_argument("--github-tag", default="v1.0", help="GitHub release tag")
    parser.add_argument("--hf-repo", help="Hugging Face repo ID (e.g., safmy/quran-vectors)")
    parser.add_argument("--s3-bucket", help="S3 bucket name")
    parser.add_argument("--s3-prefix", default="vectors", help="S3 key prefix")
    
    args = parser.parse_args()
    
    # Define vector files to upload
    source_dir = Path(args.source_dir)
    
    # Check if we're uploading Arabic embeddings specifically
    if args.source_dir.endswith('arabic_embeddings'):
        vector_files = [
            source_dir / "arabic_verses.faiss",
            source_dir / "arabic_verses.json"
        ]
    else:
        vector_files = [
            source_dir / "data" / "RashadAllMedia.faiss",
            source_dir / "data" / "RashadAllMedia.json",
            source_dir / "FinalTestament.faiss",
            source_dir / "FinalTestament.json",
            source_dir / "qurantalk_articles_1744655632.faiss",
            source_dir / "qurantalk_articles_1744655632.json",
            source_dir / "api" / "arabic_embeddings" / "arabic_verses.faiss",
            source_dir / "api" / "arabic_embeddings" / "arabic_verses.json"
        ]
    
    # Convert to absolute paths
    vector_files = [str(f.absolute()) for f in vector_files]
    
    # Check which files exist
    print("Checking for vector files...")
    existing_files = []
    for f in vector_files:
        if os.path.exists(f):
            size_mb = os.path.getsize(f) / (1024 * 1024)
            print(f"✓ Found: {os.path.basename(f)} ({size_mb:.1f} MB)")
            existing_files.append(f)
        else:
            print(f"✗ Missing: {f}")
    
    if not existing_files:
        print("No vector files found!")
        sys.exit(1)
    
    # Upload based on provider
    if args.provider == "github":
        if not args.github_repo:
            print("Error: --github-repo required for GitHub uploads")
            sys.exit(1)
        upload_to_github_release(existing_files, args.github_repo, args.github_tag)
        
    elif args.provider == "huggingface":
        if not args.hf_repo:
            print("Error: --hf-repo required for Hugging Face uploads")
            sys.exit(1)
        upload_to_huggingface(existing_files, args.hf_repo)
        
    elif args.provider == "s3":
        if not args.s3_bucket:
            print("Error: --s3-bucket required for S3 uploads")
            sys.exit(1)
        upload_to_s3(existing_files, args.s3_bucket, args.s3_prefix)
    
    print("\nUpload complete!")
    print("\nNext steps:")
    print("1. Update environment variables with the URLs of uploaded files")
    print("2. Deploy the API with USE_CLOUD_VECTORS=true")

if __name__ == "__main__":
    main()