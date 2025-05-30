#!/usr/bin/env python3
"""
Upload newsletter vector files to GitHub releases
"""

import os
import sys
import requests
from pathlib import Path

def upload_to_github_release():
    """Upload newsletter vector files to GitHub release"""
    
    # GitHub repository info
    owner = "safmy"
    repo = "QuranCompare"
    tag = "v1.0-vectors"  # Use existing release tag
    
    # Files to upload
    files_to_upload = [
        ("newsletter_data/newsletters_comprehensive.faiss", "newsletters_comprehensive.faiss"),
        ("newsletter_data/newsletters_comprehensive.json", "newsletters_comprehensive.json")
    ]
    
    # Check if GitHub token is available
    github_token = os.environ.get("GITHUB_TOKEN")
    if not github_token:
        print("Error: GITHUB_TOKEN environment variable not set")
        print("Please set it with: export GITHUB_TOKEN='your-personal-access-token'")
        print("\nTo create a token:")
        print("1. Go to https://github.com/settings/tokens")
        print("2. Click 'Generate new token (classic)'")
        print("3. Give it 'repo' scope")
        print("4. Copy the token and set it as GITHUB_TOKEN")
        return False
    
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    # Get release info
    print(f"Getting release info for tag {tag}...")
    release_url = f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}"
    response = requests.get(release_url, headers=headers)
    
    if response.status_code == 404:
        print(f"Release with tag {tag} not found. Creating new release...")
        # Create release
        create_url = f"https://api.github.com/repos/{owner}/{repo}/releases"
        release_data = {
            "tag_name": tag,
            "name": "Vector Files for QuranCompare",
            "body": "Pre-computed vector embeddings for semantic search",
            "draft": False,
            "prerelease": False
        }
        response = requests.post(create_url, json=release_data, headers=headers)
        
        if response.status_code != 201:
            print(f"Failed to create release: {response.status_code}")
            print(response.json())
            return False
    
    release_info = response.json()
    upload_url = release_info["upload_url"].replace("{?name,label}", "")
    
    print(f"\nRelease found: {release_info['name']}")
    print(f"Upload URL: {upload_url}")
    
    # Check existing assets
    existing_assets = {asset["name"]: asset for asset in release_info.get("assets", [])}
    
    # Upload each file
    for local_path, upload_name in files_to_upload:
        file_path = Path(local_path)
        
        if not file_path.exists():
            print(f"\nError: File not found: {local_path}")
            continue
        
        file_size = file_path.stat().st_size / (1024 * 1024)  # MB
        print(f"\nProcessing {upload_name} ({file_size:.1f} MB)...")
        
        # Delete existing asset if it exists
        if upload_name in existing_assets:
            print(f"  Deleting existing asset...")
            delete_url = existing_assets[upload_name]["url"]
            delete_response = requests.delete(delete_url, headers=headers)
            if delete_response.status_code == 204:
                print(f"  ✓ Deleted existing {upload_name}")
            else:
                print(f"  ✗ Failed to delete: {delete_response.status_code}")
        
        # Upload new file
        print(f"  Uploading {upload_name}...")
        with open(file_path, 'rb') as f:
            upload_headers = headers.copy()
            upload_headers["Content-Type"] = "application/octet-stream"
            
            upload_response = requests.post(
                f"{upload_url}?name={upload_name}",
                headers=upload_headers,
                data=f
            )
            
            if upload_response.status_code == 201:
                asset_info = upload_response.json()
                download_url = asset_info["browser_download_url"]
                print(f"  ✓ Uploaded successfully!")
                print(f"  Download URL: {download_url}")
            else:
                print(f"  ✗ Upload failed: {upload_response.status_code}")
                print(upload_response.json())
    
    print("\n" + "="*50)
    print("Upload complete!")
    print("\nNext steps:")
    print("1. Update vector_loader.py to use these URLs:")
    print(f"   - {GITHUB_RELEASE_BASE}/newsletters_comprehensive.faiss")
    print(f"   - {GITHUB_RELEASE_BASE}/newsletters_comprehensive.json")
    print("2. Commit and push the changes")
    print("3. The deployed API will automatically use the new files")
    
    return True

if __name__ == "__main__":
    # Base URL for reference
    GITHUB_RELEASE_BASE = "https://github.com/safmy/QuranCompare/releases/download/v1.0-vectors"
    
    success = upload_to_github_release()
    sys.exit(0 if success else 1)