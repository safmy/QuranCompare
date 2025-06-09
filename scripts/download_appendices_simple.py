#!/usr/bin/env python3
"""
Simple script to download appendices PDFs using only standard library
"""

import os
import json
import urllib.request
import urllib.error
import time
from urllib.parse import urlparse

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "appendices")

# PDF URLs to try
PDF_URLS = [
    "https://www.quraniclabs.com/appendices/Appendices.pdf",
    "https://www.masjidtucson.org/quran/appendices/appendices.pdf",
    "https://submission.org/appendices/Appendices.pdf"
]

# Appendices metadata (matching the component)
APPENDICES_METADATA = [
    {"number": 1, "title": "One of the Great Miracles", "filename": "appendix_01.pdf"},
    {"number": 2, "title": "God's Messenger of the Covenant", "filename": "appendix_02.pdf"},
    {"number": 3, "title": "We Made the Quran Easy", "filename": "appendix_03.pdf"},
    {"number": 4, "title": "Why Was the Quran Revealed in Arabic?", "filename": "appendix_04.pdf"},
    {"number": 5, "title": "The Quran's Common Denominator", "filename": "appendix_05.pdf"},
    {"number": 6, "title": "Greatest Criterion", "filename": "appendix_06.pdf"},
    {"number": 7, "title": "The Miracle of the Quran", "filename": "appendix_07.pdf"},
    {"number": 8, "title": "The Myth of Intercession", "filename": "appendix_08.pdf"},
    {"number": 9, "title": "Abraham: Founder of Islam", "filename": "appendix_09.pdf"},
    {"number": 10, "title": "The Day of Resurrection", "filename": "appendix_10.pdf"},
    {"number": 11, "title": "God's Usage of the Plural", "filename": "appendix_11.pdf"},
    {"number": 12, "title": "Role of the Prophet Muhammad", "filename": "appendix_12.pdf"},
    {"number": 13, "title": "The First Pillar of Islam", "filename": "appendix_13.pdf"},
    {"number": 14, "title": "The Contact Prayers (Salat)", "filename": "appendix_14.pdf"},
    {"number": 15, "title": "The Obligatory Charity (Zakat)", "filename": "appendix_15.pdf"},
    {"number": 16, "title": "Dietary Prohibitions", "filename": "appendix_16.pdf"},
    {"number": 17, "title": "Death", "filename": "appendix_17.pdf"},
    {"number": 18, "title": "Quran: The Ultimate Reference", "filename": "appendix_18.pdf"},
    {"number": 19, "title": "Hadith & Sunna: Satan's Hypocritical Inventions", "filename": "appendix_19.pdf"},
    {"number": 20, "title": "Quran: Unlike Any Other Book", "filename": "appendix_20.pdf"},
    {"number": 21, "title": "Satan's Clever Trick", "filename": "appendix_21.pdf"},
    {"number": 22, "title": "Jesus", "filename": "appendix_22.pdf"},
    {"number": 23, "title": "Mathematical Coding of the Quran", "filename": "appendix_23.pdf"},
    {"number": 24, "title": "Tampering With the Word of God", "filename": "appendix_24.pdf"},
    {"number": 25, "title": "The End of the World", "filename": "appendix_25.pdf"},
    {"number": 26, "title": "The Three Messengers of Islam", "filename": "appendix_26.pdf"},
    {"number": 27, "title": "Muhammad's Household", "filename": "appendix_27.pdf"},
    {"number": 28, "title": "The Age of 40", "filename": "appendix_28.pdf"},
    {"number": 29, "title": "The Missing Basmalah", "filename": "appendix_29.pdf"},
    {"number": 30, "title": "Messengers vs. Prophets", "filename": "appendix_30.pdf"},
    {"number": 31, "title": "Chronological Order of Revelation", "filename": "appendix_31.pdf"},
    {"number": 32, "title": "God's Usage of the Plural", "filename": "appendix_32.pdf"},
    {"number": 33, "title": "Why Did God Send a Messenger Now?", "filename": "appendix_33.pdf"},
    {"number": 34, "title": "Virginity", "filename": "appendix_34.pdf"},
    {"number": 35, "title": "Drugs & Alcohol", "filename": "appendix_35.pdf"},
    {"number": 36, "title": "What Price A Great Nation", "filename": "appendix_36.pdf"},
    {"number": 37, "title": "The Crucial Age of 40", "filename": "appendix_37.pdf"},
    {"number": 38, "title": "19 - The Creator's Signature", "filename": "appendix_38.pdf"}
]

def create_directories():
    """Create necessary directories for storing PDFs"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Created output directory: {OUTPUT_DIR}")

def download_file(url, filepath):
    """Download a file from URL to filepath"""
    try:
        print(f"Downloading: {url}")
        
        # Create request with headers
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        )
        
        # Download the file
        with urllib.request.urlopen(req, timeout=30) as response:
            with open(filepath, 'wb') as out_file:
                out_file.write(response.read())
        
        print(f"Successfully downloaded to: {filepath}")
        return True
        
    except urllib.error.URLError as e:
        print(f"URL Error downloading {url}: {e}")
        return False
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return False

def download_main_appendices():
    """Download the main appendices PDF"""
    main_pdf_path = os.path.join(OUTPUT_DIR, "appendices_complete.pdf")
    
    # Try each URL until one works
    for url in PDF_URLS:
        if download_file(url, main_pdf_path):
            return True
        print(f"Failed to download from {url}, trying next source...")
    
    return False

def generate_metadata_json():
    """Generate metadata JSON file for the appendices"""
    metadata = {
        "appendices": APPENDICES_METADATA,
        "pdf_base_path": "/appendices/",
        "complete_pdf": "appendices_complete.pdf",
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_count": len(APPENDICES_METADATA)
    }
    
    metadata_path = os.path.join(OUTPUT_DIR, "metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"Generated metadata file: {metadata_path}")
    return metadata_path

def main():
    """Main function to download and prepare appendices"""
    print("Starting appendices PDF download...")
    
    # Create directories
    create_directories()
    
    # Download main appendices PDF
    print("\nDownloading main appendices PDF...")
    if download_main_appendices():
        print("✓ Successfully downloaded main appendices PDF")
    else:
        print("✗ Failed to download main appendices PDF from all sources")
        print("\nYou may need to:")
        print("1. Download the PDF manually from one of these URLs:")
        for url in PDF_URLS:
            print(f"   - {url}")
        print(f"2. Save it as: {os.path.join(OUTPUT_DIR, 'appendices_complete.pdf')}")
    
    # Generate metadata
    print("\nGenerating metadata...")
    generate_metadata_json()
    
    print("\n✅ Setup complete!")
    print(f"\nPDFs should be stored in: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()