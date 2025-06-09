#!/usr/bin/env python3
"""
Try to find working URLs for appendices PDFs
"""

import urllib.request
import urllib.error
import os

# List of URLs to try
URLS_TO_TRY = [
    # Submission.org variants
    "https://submission.org/Appendices.pdf",
    "https://submission.org/quran/appendices.pdf",
    "https://submission.org/quran/Appendices.pdf",
    "https://www.submission.org/Appendices.pdf",
    "https://www.submission.org/quran/appendices.pdf",
    
    # Masjid Tucson variants
    "https://masjidtucson.org/publications/books/sp/Appendices.pdf",
    "https://masjidtucson.org/publications/books/qft/Appendices.pdf",
    "https://www.masjidtucson.org/publications/books/sp/Appendices.pdf",
    "https://www.masjidtucson.org/publications/books/qft/Appendices.pdf",
    
    # Quraniclabs variants
    "https://quraniclabs.com/books/appendices.pdf",
    "https://www.quraniclabs.com/books/appendices.pdf",
    
    # WikiSubmission variants
    "https://wikisubmission.org/appendices.pdf",
    "https://www.wikisubmission.org/appendices.pdf",
    "https://docs.wikisubmission.org/appendices.pdf",
    
    # Direct book URLs
    "https://masjidtucson.org/publications/books/sp/qft.pdf",
    "https://www.masjidtucson.org/publications/books/sp/qft.pdf",
    "https://masjidtucson.org/library/books/sp/qft.pdf",
]

def check_url(url):
    """Check if a URL returns a valid PDF"""
    try:
        print(f"Checking: {url}")
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            # Read first few bytes to check if it's a PDF
            header = response.read(4)
            if header == b'%PDF':
                # Get content length
                content_length = response.headers.get('Content-Length', 'Unknown')
                print(f"✓ Found valid PDF at: {url} (Size: {content_length} bytes)")
                return True
            else:
                print(f"✗ Not a PDF: {url}")
                return False
                
    except urllib.error.HTTPError as e:
        print(f"✗ HTTP Error {e.code}: {url}")
        return False
    except urllib.error.URLError as e:
        print(f"✗ URL Error: {url} - {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {url} - {e}")
        return False

def main():
    print("Searching for working appendices PDF URLs...\n")
    
    working_urls = []
    
    for url in URLS_TO_TRY:
        if check_url(url):
            working_urls.append(url)
        print()
    
    print("\n" + "="*50)
    print("SUMMARY:")
    print("="*50)
    
    if working_urls:
        print(f"\nFound {len(working_urls)} working URL(s):")
        for url in working_urls:
            print(f"  - {url}")
    else:
        print("\nNo working URLs found.")
        print("\nYou may need to manually download the appendices from:")
        print("  - https://wikisubmission.org/appendices")
        print("  - https://masjidtucson.org/publications/")

if __name__ == "__main__":
    main()