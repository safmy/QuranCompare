import PyPDF2
import json
import re
from datetime import datetime

def extract_pdf_content(pdf_path, max_pages=10):
    """Extract text content from PDF with page numbers and structure"""
    
    transcripts = []
    current_transcript = None
    full_text = ""
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = min(len(pdf_reader.pages), max_pages)
            
            print(f"Processing {total_pages} pages (out of {len(pdf_reader.pages)} total)...")
            
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                # Add page marker
                full_text += f"\n\n--- PAGE {page_num + 1} ---\n\n"
                full_text += text
                
                print(f"Processed page {page_num + 1}")
        
        # Save full text for inspection
        with open('rashad_media_sample.txt', 'w', encoding='utf-8') as f:
            f.write(full_text)
        
        print(f"\nSaved sample text to rashad_media_sample.txt")
        
        # Try to identify structure
        print("\nLooking for Audio/Video markers...")
        markers = re.findall(r'(Audio|Video)\s+(\d+)\s*@\s*minute\s*([\d:]+)', full_text, re.IGNORECASE)
        print(f"Found {len(markers)} markers: {markers[:5]}...")  # Show first 5
        
        return full_text
        
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return None

if __name__ == "__main__":
    # Update this path to your PDF location
    pdf_path = "/Users/safmy/Desktop/OCR_Arabic-1/Final_-_All_audios__videos_PDF_with_timestamps.pdf"
    
    print("Starting PDF extraction (first 10 pages)...")
    text = extract_pdf_content(pdf_path, max_pages=10)