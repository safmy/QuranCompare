import React, { useState, useEffect, useRef } from 'react';
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
      // For now, show a message that the feature is being set up
      console.log('Rashad Media Browser: Full transcripts are being prepared');
      setTranscripts([]);
      
      // TODO: Uncomment when table is ready
      // const { data, error } = await supabase
      //   .from('rashad_media_full')
      //   .select('*')
      //   .order('media_type', { ascending: true })
      //   .order('media_number', { ascending: true });
      // 
      // if (error) throw error;
      // setTranscripts(data || []);
      // 
      // // If we have an initial search term, find and select the best match
      // if (initialSearchTerm && data) {
      //   const match = data.find(t => 
      //     t.content.toLowerCase().includes(initialSearchTerm.toLowerCase())
      //   );
      //   if (match) {
      //     setSelectedTranscript(match);
      //     // Scroll to match after component renders
      //     setTimeout(() => scrollToSearchTerm(initialSearchTerm), 100);
      //   }
      // }
    } catch (error) {
      console.error('Error loading transcripts:', error);
      setTranscripts([]);
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
          ) : transcripts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              <p style={{ fontSize: '16px', marginBottom: '10px' }}>🚧 Coming Soon!</p>
              <p style={{ fontSize: '14px' }}>Full transcript browsing is being set up.</p>
              <p style={{ fontSize: '12px', marginTop: '10px' }}>The search results already show relevant excerpts from the transcripts.</p>
            </div>
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

export default RashadMediaBrowser;