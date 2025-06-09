import json
import os
from supabase import create_client, Client
from datetime import datetime

# Initialize Supabase client
# Load from environment variables
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_rashad_media_table():
    """Create table for Rashad Media content if it doesn't exist"""
    # Note: You'll need to run this SQL in Supabase console
    sql = """
    CREATE TABLE IF NOT EXISTS rashad_media_full (
        id TEXT PRIMARY KEY,
        media_type TEXT NOT NULL,
        media_number INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        content_length INTEGER,
        page_start INTEGER,
        page_end INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_media_type ON rashad_media_full(media_type);
    CREATE INDEX IF NOT EXISTS idx_media_number ON rashad_media_full(media_number);
    CREATE INDEX IF NOT EXISTS idx_content_search ON rashad_media_full USING gin(to_tsvector('english', content));
    """
    print("Please run this SQL in Supabase console:")
    print(sql)

def load_existing_json():
    """Load the existing RashadAllMedia.json file"""
    try:
        with open('/Users/safmy/Desktop/OCR_Arabic-1/RashadAllMedia.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded {len(data)} entries from RashadAllMedia.json")
            return data
    except Exception as e:
        print(f"Error loading JSON: {e}")
        return []

def process_and_upload_data(data):
    """Process the data and upload to Supabase"""
    processed_entries = []
    
    # First, let's group entries by media type and number
    media_groups = {}
    
    for idx, entry in enumerate(data):
        try:
            # Extract fields
            content = entry.get('content', '')
            source = entry.get('source', '')
            
            # Parse source to get media type and number
            # Example: "Audio 1 @ minute 0:00"
            media_type = 'Unknown'
            media_number = 0
            timestamp = '0:00'
            
            if 'Audio' in source:
                media_type = 'Audio'
            elif 'Video' in source:
                media_type = 'Video'
            
            # Extract number and timestamp
            import re
            match = re.search(r'(\d+)\s*@\s*minute\s*([\d:]+)', source)
            if match:
                media_number = int(match.group(1))
                timestamp = match.group(2)
            
            # Group by media
            media_key = f"{media_type}_{media_number}"
            if media_key not in media_groups:
                media_groups[media_key] = {
                    'media_type': media_type,
                    'media_number': media_number,
                    'segments': []
                }
            
            media_groups[media_key]['segments'].append({
                'timestamp': timestamp,
                'content': content,
                'source': source
            })
            
        except Exception as e:
            print(f"Error processing entry {idx}: {e}")
            continue
    
    # Now create full transcript entries
    for media_key, media_data in media_groups.items():
        try:
            # Sort segments by timestamp
            media_data['segments'].sort(key=lambda x: parse_timestamp(x['timestamp']))
            
            # Combine all segments into full transcript
            full_content = ''
            for segment in media_data['segments']:
                full_content += f"\n\n[{segment['timestamp']}] {segment['content']}"
            
            processed_entry = {
                'id': media_key.lower(),
                'media_type': media_data['media_type'],
                'media_number': media_data['media_number'],
                'timestamp': '0:00',  # Full transcript starts at beginning
                'title': f"{media_data['media_type']} {media_data['media_number']} - Full Transcript",
                'content': full_content.strip(),
                'content_length': len(full_content),
                'segment_count': len(media_data['segments']),
                'page_start': 0,
                'page_end': 0
            }
            
            processed_entries.append(processed_entry)
            print(f"Created full transcript for {media_key} with {len(media_data['segments'])} segments")
            
        except Exception as e:
            print(f"Error creating full transcript for {media_key}: {e}")
            continue
    
    print(f"\nProcessed {len(processed_entries)} full transcripts")
    
    # Upload to Supabase in batches
    batch_size = 10  # Smaller batch size for larger entries
    for i in range(0, len(processed_entries), batch_size):
        batch = processed_entries[i:i+batch_size]
        try:
            result = supabase.table('rashad_media_full').insert(batch).execute()
            print(f"Uploaded batch {i//batch_size + 1}/{(len(processed_entries) + batch_size - 1)//batch_size}")
        except Exception as e:
            print(f"Error uploading batch: {e}")
            # Try one by one for this batch
            for entry in batch:
                try:
                    supabase.table('rashad_media_full').insert(entry).execute()
                except Exception as e2:
                    print(f"Error uploading entry {entry['id']}: {e2}")

def parse_timestamp(timestamp):
    """Convert timestamp string to seconds for sorting"""
    try:
        parts = timestamp.split(':')
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        else:
            return 0
    except:
        return 0

def create_rashad_browser_component():
    """Create a React component for browsing Rashad Media transcripts"""
    component_code = '''import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';

const RashadMediaBrowser = ({ initialSearchTerm = '', initialTimestamp = '', onClose }) => {
  const [transcripts, setTranscripts] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const contentRef = useRef(null);

  // Load all transcripts on mount
  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rashad_media_full')
        .select('*')
        .order('media_type', { ascending: true })
        .order('media_number', { ascending: true });
      
      if (error) throw error;
      setTranscripts(data || []);
      
      // If we have an initial search term, find and select the best match
      if (initialSearchTerm && data) {
        const match = data.find(t => 
          t.content.toLowerCase().includes(initialSearchTerm.toLowerCase())
        );
        if (match) {
          setSelectedTranscript(match);
          // Scroll to match after component renders
          setTimeout(() => scrollToSearchTerm(initialSearchTerm), 100);
        }
      }
    } catch (error) {
      console.error('Error loading transcripts:', error);
    }
    setLoading(false);
  };

  const scrollToSearchTerm = (term) => {
    if (!contentRef.current || !term) return;
    
    // Find all text nodes in the content
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const index = node.textContent.toLowerCase().indexOf(term.toLowerCase());
      if (index !== -1) {
        // Create a temporary span to scroll to
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + term.length);
        
        const rect = range.getBoundingClientRect();
        const containerRect = contentRef.current.getBoundingClientRect();
        
        // Scroll to position
        contentRef.current.scrollTop = rect.top - containerRect.top + contentRef.current.scrollTop - 100;
        break;
      }
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim() || !selectedTranscript) return;
    scrollToSearchTerm(searchTerm);
  };

  const highlightText = (text, query) => {
    if (!query || !query.trim()) return text;
    
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? 
          <mark key={i} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold', padding: '2px' }}>{part}</mark> : 
          part
      );
    } catch (e) {
      return text;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10%',
      left: '10%',
      right: '10%',
      bottom: '10%',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <h2 style={{ margin: 0 }}>📚 Rashad Khalifa Media - Full Transcripts</h2>
          <button onClick={onClose} style={{
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}>
            ✕ Close
          </button>
        </div>
        
        {/* Search within selected transcript */}
        {selectedTranscript && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search within transcript..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Find
            </button>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Transcript list */}
        <div style={{ 
          width: '300px', 
          borderRight: '1px solid #e0e0e0',
          overflowY: 'auto',
          padding: '10px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#333' }}>Available Transcripts</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading...</div>
          ) : (
            transcripts.map(transcript => (
              <div
                key={transcript.id}
                onClick={() => {
                  setSelectedTranscript(transcript);
                  if (searchTerm) {
                    setTimeout(() => scrollToSearchTerm(searchTerm), 100);
                  }
                }}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  backgroundColor: selectedTranscript?.id === transcript.id ? '#4CAF50' : '#fff',
                  color: selectedTranscript?.id === transcript.id ? '#fff' : '#333',
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (selectedTranscript?.id !== transcript.id) {
                    e.currentTarget.style.backgroundColor = '#e8f5e9';
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedTranscript?.id !== transcript.id) {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                  {transcript.media_type === 'Audio' ? '🎙️' : '🎥'} {transcript.title}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: selectedTranscript?.id === transcript.id ? 'rgba(255,255,255,0.9)' : '#666'
                }}>
                  {transcript.segment_count || 0} segments • {Math.round(transcript.content_length / 1000)}k chars
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Full transcript viewer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedTranscript ? (
            <>
              <div style={{ 
                padding: '15px 20px', 
                borderBottom: '1px solid #e0e0e0',
                backgroundColor: '#f5f5f5'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
                  {selectedTranscript.media_type === 'Audio' ? '🎙️' : '🎥'} {selectedTranscript.title}
                </h3>
              </div>
              <div 
                ref={contentRef}
                style={{ 
                  flex: 1,
                  padding: '20px',
                  overflowY: 'auto',
                  lineHeight: '1.8',
                  fontSize: '16px',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#fff'
                }}
              >
                {highlightText(selectedTranscript.content, searchTerm)}
              </div>
            </>
          ) : (
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#666'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
                <p style={{ fontSize: '18px' }}>Select a transcript from the left to view</p>
                <p style={{ fontSize: '14px', marginTop: '10px' }}>Browse complete transcripts of Rashad Khalifa's media</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RashadMediaBrowser;'''

    # Save to src/components directory
    output_path = '/Users/safmy/Desktop/OCR_Arabic-1/QuranCompare/src/components/RashadMediaBrowser.jsx'
    with open(output_path, 'w') as f:
        f.write(component_code)
    
    print(f"\nCreated {output_path}")

if __name__ == "__main__":
    print("Starting Rashad Media data processing...")
    
    # Show SQL for table creation
    create_rashad_media_table()
    
    # Load existing JSON data
    data = load_existing_json()
    
    if data:
        # Process and upload
        process_and_upload_data(data)
        
        # Create React component
        create_rashad_browser_component()
        
        print("\nDone! You can now:")
        print("1. Run the SQL above in Supabase console to create the table")
        print("2. Use the RashadMediaBrowser component in your app")