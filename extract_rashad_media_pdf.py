import PyPDF2
import json
import re
from datetime import datetime

def extract_pdf_content(pdf_path):
    """Extract text content from PDF with page numbers and structure"""
    
    transcripts = []
    current_transcript = None
    
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            total_pages = len(pdf_reader.pages)
            
            print(f"Total pages: {total_pages}")
            
            for page_num in range(total_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                
                # Split by lines
                lines = text.split('\n')
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Check if this is a new transcript header (e.g., "Audio 1 @ minute 0:00")
                    audio_match = re.match(r'(Audio|Video)\s+(\d+)\s*@\s*minute\s*([\d:]+)', line, re.IGNORECASE)
                    if audio_match:
                        # Save previous transcript if exists
                        if current_transcript and current_transcript['content']:
                            transcripts.append(current_transcript)
                        
                        # Start new transcript
                        media_type = audio_match.group(1)
                        media_number = int(audio_match.group(2))
                        timestamp = audio_match.group(3)
                        
                        current_transcript = {
                            'id': f"{media_type.lower()}_{media_number}_{timestamp.replace(':', '_')}",
                            'media_type': media_type,
                            'media_number': media_number,
                            'timestamp': timestamp,
                            'title': line,
                            'content': '',
                            'page_start': page_num + 1,
                            'page_end': page_num + 1
                        }
                    elif current_transcript:
                        # Add content to current transcript
                        if current_transcript['content']:
                            current_transcript['content'] += ' '
                        current_transcript['content'] += line
                        current_transcript['page_end'] = page_num + 1
                
                if page_num % 10 == 0:
                    print(f"Processed page {page_num + 1}/{total_pages}")
        
        # Don't forget the last transcript
        if current_transcript and current_transcript['content']:
            transcripts.append(current_transcript)
        
        print(f"\nExtracted {len(transcripts)} transcript segments")
        
        # Create a master document structure
        master_document = {
            'metadata': {
                'source': 'Final_-_All_audios__videos_PDF_with_timestamps.pdf',
                'total_pages': total_pages,
                'total_transcripts': len(transcripts),
                'extraction_date': datetime.now().isoformat()
            },
            'transcripts': transcripts
        }
        
        # Save to JSON
        output_path = 'rashad_media_master.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(master_document, f, indent=2, ensure_ascii=False)
        
        print(f"\nSaved to {output_path}")
        
        # Create a simplified search index
        search_index = []
        for transcript in transcripts:
            # Split content into chunks for better searching
            content = transcript['content']
            chunk_size = 500  # characters per chunk
            
            for i in range(0, len(content), chunk_size):
                chunk = content[i:i + chunk_size]
                search_index.append({
                    'id': f"{transcript['id']}_chunk_{i//chunk_size}",
                    'transcript_id': transcript['id'],
                    'media_type': transcript['media_type'],
                    'media_number': transcript['media_number'],
                    'timestamp': transcript['timestamp'],
                    'content': chunk,
                    'position': i,
                    'pages': f"{transcript['page_start']}-{transcript['page_end']}"
                })
        
        # Save search index
        index_path = 'rashad_media_search_index.json'
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(search_index, f, indent=2, ensure_ascii=False)
        
        print(f"Created search index with {len(search_index)} chunks")
        print(f"Saved to {index_path}")
        
        return master_document, search_index
        
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return None, None

if __name__ == "__main__":
    # Update this path to your PDF location
    pdf_path = "/Users/safmy/Desktop/OCR_Arabic-1/Final_-_All_audios__videos_PDF_with_timestamps.pdf"
    
    print("Starting PDF extraction...")
    master_doc, search_index = extract_pdf_content(pdf_path)
    
    if master_doc:
        # Print sample of first transcript
        if master_doc['transcripts']:
            first = master_doc['transcripts'][0]
            print(f"\nSample transcript:")
            print(f"Title: {first['title']}")
            print(f"Pages: {first['page_start']}-{first['page_end']}")
            print(f"Content preview: {first['content'][:200]}...")