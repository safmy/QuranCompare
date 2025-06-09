import PyPDF2
import json
import re
from datetime import datetime

def extract_and_structure_pdf(pdf_path):
    """Extract and structure Rashad Media PDF content"""
    
    transcripts = {}
    current_media = None
    current_content = []
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            print(f"Processing {total_pages} pages...")
            
            # First pass - extract all text
            full_text = ""
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                full_text += f"\n--- PAGE {page_num + 1} ---\n" + text
                
                if page_num % 10 == 0:
                    print(f"Extracted page {page_num + 1}/{total_pages}")
            
            # Second pass - parse structure
            # Split by potential media markers
            # Looking for patterns like "Audio 1", "Video 1", etc.
            
            # Clean up text first
            full_text = re.sub(r'\s+', ' ', full_text)  # Normalize whitespace
            
            # Find all media markers
            media_pattern = r'(Audio|Video)\s*(\d+)\s*(?:@|at)?\s*(?:minute)?\s*([\d:]+)'
            markers = list(re.finditer(media_pattern, full_text, re.IGNORECASE))
            
            print(f"\nFound {len(markers)} media markers")
            
            # Process each media section
            for i, match in enumerate(markers):
                media_type = match.group(1)
                media_number = int(match.group(2))
                timestamp = match.group(3)
                
                # Get content between this marker and the next
                start_pos = match.start()
                end_pos = markers[i + 1].start() if i + 1 < len(markers) else len(full_text)
                
                content = full_text[start_pos:end_pos].strip()
                
                # Create media key
                media_key = f"{media_type}_{media_number}"
                
                if media_key not in transcripts:
                    transcripts[media_key] = {
                        'media_type': media_type,
                        'media_number': media_number,
                        'title': f"{media_type} {media_number}",
                        'segments': []
                    }
                
                # Clean content - remove the marker itself
                content = content[match.end() - match.start():].strip()
                
                # Further clean the content
                content = clean_transcript_content(content)
                
                transcripts[media_key]['segments'].append({
                    'timestamp': timestamp,
                    'content': content
                })
                
                if i % 10 == 0:
                    print(f"Processed {i + 1}/{len(markers)} markers")
        
        # Create final structured data
        structured_data = []
        for media_key, media_data in transcripts.items():
            # Sort segments by timestamp
            media_data['segments'].sort(key=lambda x: parse_timestamp(x['timestamp']))
            
            # Create full transcript
            full_content = ""
            for segment in media_data['segments']:
                if segment['content']:  # Only add non-empty segments
                    full_content += f"\n\n[{segment['timestamp']}] {segment['content']}"
            
            if full_content.strip():  # Only add if there's actual content
                structured_data.append({
                    'id': media_key.lower(),
                    'media_type': media_data['media_type'],
                    'media_number': media_data['media_number'],
                    'title': f"{media_data['media_type']} {media_data['media_number']} - Complete Transcript",
                    'content': full_content.strip(),
                    'segment_count': len(media_data['segments']),
                    'content_length': len(full_content)
                })
        
        # Sort by media type and number
        structured_data.sort(key=lambda x: (x['media_type'], x['media_number']))
        
        # Save structured data
        output_file = 'rashad_media_structured.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'metadata': {
                    'source': pdf_path,
                    'total_media': len(structured_data),
                    'extraction_date': datetime.now().isoformat()
                },
                'transcripts': structured_data
            }, f, indent=2, ensure_ascii=False)
        
        print(f"\nExtracted {len(structured_data)} complete transcripts")
        print(f"Saved to {output_file}")
        
        return structured_data
        
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return None

def clean_transcript_content(content):
    """Clean and format transcript content"""
    # Remove page markers
    content = re.sub(r'---\s*PAGE\s*\d+\s*---', '', content)
    
    # Fix common OCR issues
    content = re.sub(r'(\d+):(\d+)\)', r'\1:\2)', content)  # Fix timestamp formatting
    
    # Remove excessive whitespace
    content = re.sub(r'\s+', ' ', content)
    
    # Fix sentence spacing
    content = re.sub(r'\.(\w)', r'. \1', content)
    
    return content.strip()

def parse_timestamp(timestamp):
    """Convert timestamp to seconds for sorting"""
    try:
        parts = timestamp.split(':')
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except:
        pass
    return 0

def upload_to_supabase(structured_data):
    """Upload structured data to Supabase"""
    import os
    from supabase import create_client, Client
    
    # Initialize Supabase client
    from dotenv import load_dotenv
    load_dotenv()
    
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables')
    
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("\nUploading to Supabase...")
    
    # Clear existing data
    try:
        supabase.table('rashad_media_full').delete().neq('id', '').execute()
        print("Cleared existing data")
    except:
        pass
    
    # Upload in batches
    batch_size = 5
    for i in range(0, len(structured_data), batch_size):
        batch = structured_data[i:i+batch_size]
        try:
            # Add timestamp and metadata
            for item in batch:
                item['created_at'] = datetime.now().isoformat()
                item['page_start'] = 0
                item['page_end'] = 0
            
            result = supabase.table('rashad_media_full').insert(batch).execute()
            print(f"Uploaded batch {i//batch_size + 1}/{(len(structured_data) + batch_size - 1)//batch_size}")
        except Exception as e:
            print(f"Error uploading batch: {e}")
            # Try individual uploads
            for item in batch:
                try:
                    supabase.table('rashad_media_full').insert(item).execute()
                    print(f"Uploaded {item['id']}")
                except Exception as e2:
                    print(f"Failed to upload {item['id']}: {e2}")
    
    print("\nUpload complete!")

if __name__ == "__main__":
    pdf_path = "/Users/safmy/Desktop/OCR_Arabic-1/Final_-_All_audios__videos_PDF_with_timestamps.pdf"
    
    print("Extracting and structuring PDF content...")
    structured_data = extract_and_structure_pdf(pdf_path)
    
    if structured_data:
        # Ask if user wants to upload
        response = input("\nDo you want to upload to Supabase? (y/n): ")
        if response.lower() == 'y':
            upload_to_supabase(structured_data)
        else:
            print("\nData saved locally. Run with upload option to push to Supabase.")