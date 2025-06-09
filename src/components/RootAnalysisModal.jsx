import React, { useState } from 'react';
import './RootAnalysisModal.css';

const RootAnalysisModal = ({ 
    rootAnalysisData, 
    onClose, 
    onCompare,
    currentLanguage,
    getTranslationText 
}) => {
    const [expandedSections, setExpandedSections] = useState({
        overview: true,
        compareOptions: true,
        meanings: true,
        allVerses: false
    });
    
    const [selectedMeanings, setSelectedMeanings] = useState(new Set());
    const [selectedVerses, setSelectedVerses] = useState(new Set());
    
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };
    
    const toggleMeaningSelection = (meaning) => {
        setSelectedMeanings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(meaning)) {
                newSet.delete(meaning);
            } else {
                newSet.add(meaning);
            }
            return newSet;
        });
    };
    
    const toggleVerseSelection = (verseRef) => {
        setSelectedVerses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(verseRef)) {
                newSet.delete(verseRef);
            } else {
                newSet.add(verseRef);
            }
            return newSet;
        });
    };
    
    const compareSelectedMeanings = () => {
        const versesToCompare = [];
        const seenVerses = new Set();
        
        // Always include source verse
        versesToCompare.push(rootAnalysisData.sourceVerse);
        seenVerses.add(rootAnalysisData.sourceVerse.sura_verse);
        
        // Add verses from selected meanings
        rootAnalysisData.meaningVariations.forEach(([meaning, occurrences]) => {
            if (selectedMeanings.has(meaning)) {
                occurrences.forEach(occ => {
                    if (!seenVerses.has(occ.verseRef)) {
                        versesToCompare.push(occ.verse);
                        seenVerses.add(occ.verseRef);
                    }
                });
            }
        });
        
        if (versesToCompare.length > 1) {
            onCompare(versesToCompare);
            onClose();
        }
    };
    
    const compareSelectedVerses = () => {
        const versesToCompare = [rootAnalysisData.sourceVerse];
        
        rootAnalysisData.relatedVerses.forEach(verse => {
            if (selectedVerses.has(verse.sura_verse) && verse.sura_verse !== rootAnalysisData.sourceVerse.sura_verse) {
                versesToCompare.push(verse);
            }
        });
        
        if (versesToCompare.length > 1) {
            onCompare(versesToCompare);
            onClose();
        }
    };
    
    return (
        <div className="root-analysis-modal">
            <div className="root-analysis-content">
                <div className="root-analysis-header">
                    <h3>Root Analysis: "{rootAnalysisData.selectedRoot}"</h3>
                    <button 
                        className="close-btn"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>
                
                {/* Overview Section */}
                <div className="analysis-section">
                    <div 
                        className="section-header"
                        onClick={() => toggleSection('overview')}
                    >
                        <span className="section-icon">{expandedSections.overview ? '▼' : '▶'}</span>
                        <h4>Overview</h4>
                    </div>
                    {expandedSections.overview && (
                        <div className="section-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="label">Word clicked:</span>
                                    <span className="value">{rootAnalysisData.clickedWord}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Root:</span>
                                    <span className="value root-highlight">{rootAnalysisData.selectedRoot}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Meaning here:</span>
                                    <span className="value">{rootAnalysisData.clickedWordMeaning || 'N/A'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Source verse:</span>
                                    <span className="value verse-ref">[{rootAnalysisData.sourceVerse.sura_verse}]</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Total occurrences:</span>
                                    <span className="value">{rootAnalysisData.totalCount} verses</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Quick Compare Options Section - moved to second position */}
                <div className="analysis-section">
                    <div 
                        className="section-header"
                        onClick={() => toggleSection('compareOptions')}
                    >
                        <span className="section-icon">{expandedSections.compareOptions ? '▼' : '▶'}</span>
                        <h4>Quick Compare Options</h4>
                    </div>
                    {expandedSections.compareOptions && (
                        <div className="section-content">
                            <div className="compare-options">
                                <button
                                    className="compare-option-btn"
                                    onClick={() => {
                                        // Compare one from each meaning
                                        const versesToCompare = [];
                                        const seenVerses = new Set();
                                        
                                        versesToCompare.push(rootAnalysisData.sourceVerse);
                                        seenVerses.add(rootAnalysisData.sourceVerse.sura_verse);
                                        
                                        rootAnalysisData.meaningVariations.forEach(([meaning, occurrences]) => {
                                            const uniqueVerse = occurrences.find(occ => !seenVerses.has(occ.verseRef));
                                            if (uniqueVerse) {
                                                versesToCompare.push(uniqueVerse.verse);
                                                seenVerses.add(uniqueVerse.verseRef);
                                            }
                                        });
                                        
                                        onCompare(versesToCompare.slice(0, 11));
                                        onClose();
                                    }}
                                >
                                    <span className="option-icon">🔤</span>
                                    <span className="option-text">
                                        <strong>One from Each Meaning</strong>
                                        <small>Compare different uses of this root</small>
                                    </span>
                                </button>
                                
                                <button
                                    className="compare-option-btn"
                                    onClick={() => {
                                        // Compare all verses with same meaning as clicked word
                                        const versesToCompare = [];
                                        const clickedMeaning = rootAnalysisData.clickedWordMeaning;
                                        
                                        rootAnalysisData.meaningVariations.forEach(([meaning, occurrences]) => {
                                            if (meaning === clickedMeaning) {
                                                occurrences.forEach(occ => {
                                                    versesToCompare.push(occ.verse);
                                                });
                                            }
                                        });
                                        
                                        if (versesToCompare.length === 0) {
                                            versesToCompare.push(rootAnalysisData.sourceVerse);
                                        }
                                        
                                        onCompare(versesToCompare.slice(0, 20));
                                        onClose();
                                    }}
                                >
                                    <span className="option-icon">🎯</span>
                                    <span className="option-text">
                                        <strong>Same Meaning as Clicked</strong>
                                        <small>All verses where "{rootAnalysisData.selectedRoot}" means "{rootAnalysisData.clickedWordMeaning}"</small>
                                    </span>
                                </button>
                                
                                <button
                                    className="compare-option-btn"
                                    onClick={() => {
                                        // Compare first 10 verses with this root
                                        onCompare(rootAnalysisData.relatedVerses.slice(0, 10));
                                        onClose();
                                    }}
                                >
                                    <span className="option-icon">📊</span>
                                    <span className="option-text">
                                        <strong>First 10 Occurrences</strong>
                                        <small>Compare chronologically</small>
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Meaning Variations Section - moved to third position */}
                <div className="analysis-section">
                    <div 
                        className="section-header"
                        onClick={() => toggleSection('meanings')}
                    >
                        <span className="section-icon">{expandedSections.meanings ? '▼' : '▶'}</span>
                        <h4>Meaning Variations ({rootAnalysisData.meaningVariations.length})</h4>
                    </div>
                    {expandedSections.meanings && (
                        <div className="section-content">
                            <div className="meanings-list">
                                {rootAnalysisData.meaningVariations.map(([meaning, occurrences], idx) => {
                                    // Get unique Arabic words for this meaning
                                    const arabicWords = [...new Set(occurrences.map(occ => occ.arabicWord).filter(word => word))];
                                    
                                    return (
                                        <div key={idx} className="meaning-item">
                                            <label className="meaning-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMeanings.has(meaning)}
                                                    onChange={() => toggleMeaningSelection(meaning)}
                                                />
                                                <div className="meaning-info">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span className="meaning-text">{meaning}</span>
                                                        {arabicWords.length > 0 && (
                                                            <span style={{ 
                                                                fontSize: '18px', 
                                                                fontFamily: 'var(--arabic-font-family)',
                                                                color: '#666',
                                                                direction: 'rtl'
                                                            }}>
                                                                ({arabicWords.slice(0, 3).join(' / ')}{arabicWords.length > 3 ? ' ...' : ''})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="meaning-count">({occurrences.length} verses)</span>
                                                </div>
                                            </label>
                                            <div className="meaning-examples">
                                                {occurrences.slice(0, 3).map((occ, i) => (
                                                    <span 
                                                        key={i} 
                                                        className="example-verse"
                                                        onClick={() => {
                                                            // Navigate to the verse when clicked
                                                            onCompare([occ.verseRef]);
                                                            onClose();
                                                        }}
                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                    >
                                                        [{occ.verseRef}]
                                                        {i < Math.min(2, occurrences.length - 1) && ', '}
                                                    </span>
                                                ))}
                                                {occurrences.length > 3 && <span className="more-indicator">...</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {selectedMeanings.size > 0 && (
                                <button 
                                    className="compare-btn primary"
                                    onClick={compareSelectedMeanings}
                                >
                                    Compare Selected Meanings ({selectedMeanings.size})
                                </button>
                            )}
                        </div>
                    )}
                </div>
                
                
                {/* All Verses Section */}
                <div className="analysis-section">
                    <div 
                        className="section-header"
                        onClick={() => toggleSection('allVerses')}
                    >
                        <span className="section-icon">{expandedSections.allVerses ? '▼' : '▶'}</span>
                        <h4>All Verses ({rootAnalysisData.relatedVerses.length})</h4>
                    </div>
                    {expandedSections.allVerses && (
                        <div className="section-content">
                            <div className="verses-list">
                                {rootAnalysisData.relatedVerses.map((verse, idx) => (
                                    <div key={idx} className={`verse-item ${verse.isSourceVerse ? 'source-verse' : ''}`}>
                                        <label className="verse-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedVerses.has(verse.sura_verse)}
                                                onChange={() => toggleVerseSelection(verse.sura_verse)}
                                                disabled={verse.isSourceVerse}
                                            />
                                            <div className="verse-info">
                                                <span className="verse-ref">[{verse.sura_verse}]</span>
                                                <span className="verse-preview">
                                                    {getTranslationText(verse, currentLanguage).substring(0, 100)}...
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                            {selectedVerses.size > 0 && (
                                <button 
                                    className="compare-btn primary"
                                    onClick={compareSelectedVerses}
                                >
                                    Compare Selected Verses ({selectedVerses.size + 1})
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RootAnalysisModal;