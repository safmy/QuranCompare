import React, { useState, useCallback } from 'react';
import ChunkAudioPlayerBackend from './ChunkAudioPlayerBackend';

const InteractiveChunkEditor = ({ arabicText, repeatCount = 3, pauseBetweenRepeats = 1, onUnauthorized }) => {
  // Parse words from Arabic text
  const words = arabicText.split(/\s+/).filter(word => word.trim());
  
  // Default chunking (3-4 words per chunk)
  const createDefaultChunks = useCallback(() => {
    const chunks = [];
    const groupSize = 3;
    
    for (let i = 0; i < words.length; i += groupSize) {
      chunks.push(words.slice(i, i + groupSize));
    }
    
    return chunks;
  }, [words]);
  
  const [chunks, setChunks] = useState(createDefaultChunks());
  const [selectedWord, setSelectedWord] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const moveWordToPreviousChunk = (chunkIndex, wordIndex) => {
    if (chunkIndex === 0) return; // Can't move from first chunk backwards
    
    const newChunks = [...chunks];
    const word = newChunks[chunkIndex][wordIndex];
    
    // Remove word from current chunk
    newChunks[chunkIndex].splice(wordIndex, 1);
    
    // Add word to end of previous chunk
    newChunks[chunkIndex - 1].push(word);
    
    // Clean up empty chunks
    const filteredChunks = newChunks.filter(chunk => chunk.length > 0);
    setChunks(filteredChunks);
  };
  
  const moveWordToNextChunk = (chunkIndex, wordIndex) => {
    const newChunks = [...chunks];
    const word = newChunks[chunkIndex][wordIndex];
    
    // Remove word from current chunk
    newChunks[chunkIndex].splice(wordIndex, 1);
    
    // If next chunk exists, add to beginning
    if (chunkIndex + 1 < newChunks.length) {
      newChunks[chunkIndex + 1].unshift(word);
    } else {
      // Create new chunk
      newChunks.push([word]);
    }
    
    // Clean up empty chunks
    const filteredChunks = newChunks.filter(chunk => chunk.length > 0);
    setChunks(filteredChunks);
  };
  
  const handleWordClick = (chunkIndex, wordIndex, word) => {
    if (!isEditMode) return;
    
    const isFirstWord = wordIndex === 0;
    const isLastWord = wordIndex === chunks[chunkIndex].length - 1;
    const canMovePrevious = chunkIndex > 0; // Can move to previous chunk if not in first chunk
    const canMoveNext = true; // Can always move to next chunk (will create new one if needed)
    
    setSelectedWord({ 
      chunkIndex, 
      wordIndex, 
      word, 
      isFirstWord, 
      isLastWord,
      canMovePrevious,
      canMoveNext
    });
  };
  
  const executeWordMove = (direction) => {
    if (!selectedWord) return;
    
    const { chunkIndex, wordIndex } = selectedWord;
    
    if (direction === 'previous') {
      moveWordToPreviousChunk(chunkIndex, wordIndex);
    } else if (direction === 'next') {
      moveWordToNextChunk(chunkIndex, wordIndex);
    }
    
    setSelectedWord(null);
  };
  
  const resetChunks = () => {
    setChunks(createDefaultChunks());
    setSelectedWord(null);
  };
  
  return (
    <div style={{
      marginTop: '15px',
      padding: '15px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h6 style={{ margin: 0, color: '#333' }}>
          Verse Word Groups:
          <span style={{ 
            fontSize: '11px', 
            color: '#2196F3', 
            marginLeft: '10px',
            fontWeight: 'normal'
          }}>
            (🔊 Play once, 🔁 Repeat {Math.min(repeatCount, 5)} times)
          </span>
        </h6>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            style={{
              padding: '4px 8px',
              backgroundColor: isEditMode ? '#ff9800' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {isEditMode ? '✓ Done' : '✏️ Edit'}
          </button>
          
          {isEditMode && (
            <button
              onClick={resetChunks}
              style={{
                padding: '4px 8px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 Reset
            </button>
          )}
        </div>
      </div>
      
      {isEditMode && (
        <div style={{
          marginBottom: '10px',
          padding: '8px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#1976d2'
        }}>
          <strong>Edit Mode:</strong> Click on any word to move it to the previous or next chunk.
          {selectedWord && (
            <div style={{ marginTop: '5px' }}>
              Selected: <strong>{selectedWord.word}</strong>
              <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                {selectedWord.canMovePrevious && (
                  <button
                    onClick={() => executeWordMove('previous')}
                    style={{
                      padding: '2px 6px',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    ← Move to Previous Chunk
                  </button>
                )}
                
                {selectedWord.canMoveNext && (
                  <button
                    onClick={() => executeWordMove('next')}
                    style={{
                      padding: '2px 6px',
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Move to Next Chunk →
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedWord(null)}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div style={{ direction: 'rtl', fontSize: '16px', lineHeight: '2.5' }}>
        {chunks.map((chunk, chunkIndex) => {
          const chunkText = chunk.join(' ');
          
          if (!isEditMode) {
            // Normal audio player mode
            return (
              <ChunkAudioPlayerBackend
                key={`${chunkIndex}-${chunkText}`}
                arabicText={chunkText}
                chunkIndex={chunkIndex + 1}
                repeatCount={Math.min(repeatCount, 5)}
                pauseBetweenRepeats={pauseBetweenRepeats}
                onUnauthorized={onUnauthorized}
              />
            );
          }
          
          // Edit mode - show individual words
          return (
            <div
              key={`edit-${chunkIndex}`}
              style={{
                display: 'inline-block',
                padding: '8px 12px',
                margin: '4px',
                backgroundColor: '#fff',
                border: '2px solid #2196F3',
                borderRadius: '8px',
                position: 'relative'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                direction: 'rtl'
              }}>
                <strong style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  position: 'absolute',
                  left: '8px',
                  top: '6px'
                }}>
                  {chunkIndex + 1}.
                </strong>
                
                <div style={{ 
                  fontSize: '18px', 
                  fontFamily: 'Arial, sans-serif',
                  marginRight: '24px',
                  direction: 'rtl'
                }}>
                  {chunk.map((word, wordIndex) => {
                    const isSelected = selectedWord?.chunkIndex === chunkIndex && selectedWord?.wordIndex === wordIndex;
                    const isFirstInChunk = wordIndex === 0;
                    const isLastInChunk = wordIndex === chunk.length - 1;
                    
                    return (
                      <span
                        key={`${chunkIndex}-${wordIndex}`}
                        onClick={() => handleWordClick(chunkIndex, wordIndex, word)}
                        style={{
                          cursor: 'pointer',
                          padding: '2px 4px',
                          margin: '0 2px',
                          borderRadius: '3px',
                          backgroundColor: isSelected ? '#ffeb3b' : 'transparent',
                          transition: 'all 0.2s',
                          border: isSelected ? '1px solid #ff9800' : '1px solid transparent',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = '#e3f2fd';
                            e.target.style.borderColor = '#2196F3';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.borderColor = 'transparent';
                          }
                        }}
                        title={`Click to move "${word}" to ${isFirstInChunk && chunkIndex > 0 ? 'previous' : ''}${isFirstInChunk && chunkIndex > 0 && isLastInChunk ? ' or ' : ''}${isLastInChunk ? 'next' : ''} chunk`}
                      >
                        {word}
                        {isSelected && (
                          <span style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '10px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            padding: '1px 3px',
                            borderRadius: '2px',
                            whiteSpace: 'nowrap'
                          }}>
                            Selected
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {!isEditMode && (
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: 0 }}>
          Practice by repeating these word groups along with the audio. Use <strong>Edit</strong> to customize chunks.
        </p>
      )}
      
      {isEditMode && (
        <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: 0 }}>
          Click <strong>Done</strong> when you're happy with your chunks, then use the audio players to practice.
        </p>
      )}
    </div>
  );
};

export default InteractiveChunkEditor;