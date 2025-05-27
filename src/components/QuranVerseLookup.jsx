import React, { useState, useEffect } from 'react';
import './QuranVerseLookup.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://vector-search-api-production.up.railway.app';

// Chapter verse counts
const CHAPTER_VERSE_COUNTS = {
    1: 7, 2: 287, 3: 201, 4: 177, 5: 121, 6: 166, 7: 207, 8: 76, 9: 130, 10: 110,
    11: 124, 12: 112, 13: 44, 14: 53, 15: 100, 16: 129, 17: 112, 18: 111, 19: 99, 20: 136,
    21: 113, 22: 79, 23: 119, 24: 65, 25: 78, 26: 228, 27: 94, 28: 89, 29: 70, 30: 61,
    31: 35, 32: 31, 33: 74, 34: 55, 35: 46, 36: 84, 37: 183, 38: 89, 39: 76, 40: 86,
    41: 55, 42: 54, 43: 90, 44: 60, 45: 38, 46: 36, 47: 39, 48: 30, 49: 19, 50: 46,
    51: 61, 52: 50, 53: 63, 54: 56, 55: 79, 56: 97, 57: 30, 58: 23, 59: 25, 60: 14,
    61: 15, 62: 12, 63: 12, 64: 19, 65: 13, 66: 13, 67: 31, 68: 53, 69: 53, 70: 45,
    71: 29, 72: 29, 73: 21, 74: 57, 75: 41, 76: 32, 77: 51, 78: 41, 79: 47, 80: 43,
    81: 30, 82: 20, 83: 37, 84: 26, 85: 23, 86: 18, 87: 20, 88: 27, 89: 31, 90: 21,
    91: 16, 92: 22, 93: 12, 94: 9, 95: 9, 96: 20, 97: 6, 98: 9, 99: 9, 100: 12,
    101: 12, 102: 9, 103: 4, 104: 10, 105: 6, 106: 5, 107: 8, 108: 4, 109: 7, 110: 4,
    111: 6, 112: 5, 113: 6, 114: 7
};

const QuranVerseLookup = ({ initialRange = '1:1-7' }) => {
    const [verseRange, setVerseRange] = useState(initialRange || '1:1-7');
    const [verses, setVerses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hoveredWord, setHoveredWord] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [searchMode, setSearchMode] = useState('range'); // 'range' or 'text'
    const [showArabic, setShowArabic] = useState(true); // New state for show/hide Arabic
    const [exactMatch, setExactMatch] = useState(true); // New state for exact vs regex match
    const [allVersesData, setAllVersesData] = useState([]); // Store all verses for text search
    const [showRootAnalysis, setShowRootAnalysis] = useState(false);
    const [rootAnalysisData, setRootAnalysisData] = useState(null);
    const [showAllRootVerses, setShowAllRootVerses] = useState(false);
    
    const handleVerseClick = async (verseRef) => {
        try {
            // Get the subtitle range for this verse
            const response = await fetch(`${API_BASE_URL}/verse-range-for-subtitle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    verse_ref: verseRef
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                // Update the verse range input and switch to range mode
                setVerseRange(data.subtitle_range);
                setSearchMode('range');
                // Trigger a new search with the subtitle range
                setTimeout(() => {
                    fetchVerses();
                }, 100);
            }
        } catch (err) {
            console.error('Failed to get verse range:', err);
            // Fallback: just search for the single verse
            setVerseRange(verseRef);
            setSearchMode('range');
            setTimeout(() => {
                fetchVerses();
            }, 100);
        }
    };

    const fetchVerses = async () => {
        if (!verseRange.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            if (searchMode === 'range') {
                // Range lookup (e.g., 1:1-7)
                const response = await fetch(`${API_BASE_URL}/verses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        verse_range: verseRange
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to fetch verses');
                }
                
                const data = await response.json();
                // Ensure subtitle data is included from local data if missing
                const versesWithSubtitles = data.verses.map(verse => {
                    if (!verse.subtitle && allVersesData.length > 0) {
                        const localVerse = allVersesData.find(v => v.sura_verse === verse.sura_verse);
                        if (localVerse && localVerse.subtitle) {
                            return { ...verse, subtitle: localVerse.subtitle };
                        }
                    }
                    return verse;
                });
                setVerses(versesWithSubtitles);
            } else {
                // Text search mode - search through local verse content
                if (!allVersesData.length) {
                    throw new Error('Verses data not loaded yet. Please try again.');
                }
                
                const searchTerm = verseRange.trim();
                if (!searchTerm) {
                    setVerses([]);
                    return;
                }
                
                // Perform local search
                const matchedVerses = allVersesData.filter(verse => {
                    const textToSearch = verse.english.toLowerCase();
                    const searchLower = searchTerm.toLowerCase();
                    
                    if (exactMatch) {
                        // Exact match - look for the exact phrase
                        return textToSearch.includes(searchLower);
                    } else {
                        // Regex match
                        try {
                            const regex = new RegExp(searchTerm, 'i');
                            return regex.test(verse.english);
                        } catch (e) {
                            // Invalid regex, fall back to includes
                            return textToSearch.includes(searchLower);
                        }
                    }
                });
                
                setVerses(matchedVerses);
            }
        } catch (err) {
            setError(err.message);
            setVerses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        fetchVerses();
    };
    
    const loadFullChapter = () => {
        // Extract chapter number from current input
        const chapterMatch = verseRange.match(/^(\d+)/);
        if (chapterMatch) {
            const chapter = parseInt(chapterMatch[1]);
            const verseCount = CHAPTER_VERSE_COUNTS[chapter];
            if (verseCount) {
                // Set range to full chapter
                setVerseRange(`${chapter}:1-${verseCount}`);
                // This will trigger fetchVerses via useEffect
            }
        }
    };
    
    const isChapterInput = () => {
        // Check if input looks like a chapter number (e.g., "2" or "2:")
        return /^\d+:?\s*$/.test(verseRange);
    };
    
    const analyzeWordRoot = (word, root, verse) => {
        if (!root || root === '-' || !allVersesData.length) return;
        
        // Find all verses containing this specific root
        const relatedVerses = [];
        let totalCount = 0;
        
        allVersesData.forEach(v => {
            if (v.roots && v.roots.includes(root)) {
                totalCount++;
                if (v.sura_verse !== verse.sura_verse) {
                    relatedVerses.push({
                        ...v,
                        matchingRoots: [root]
                    });
                }
            }
        });
        
        // Sort by verse reference
        relatedVerses.sort((a, b) => a.sura_verse.localeCompare(b.sura_verse));
        
        setRootAnalysisData({
            sourceVerse: verse,
            clickedWord: word,
            selectedRoot: root,
            totalCount: totalCount,
            relatedVerses: relatedVerses,
            totalRelated: relatedVerses.length
        });
        setShowRootAnalysis(true);
        setShowAllRootVerses(false);
    };
    
    const navigateToCompare = (verses) => {
        // Store verses in sessionStorage to pass to Compare tab
        sessionStorage.setItem('compareVerses', JSON.stringify(verses.map(v => v.sura_verse)));
        
        // Trigger navigation to Compare tab
        const event = new CustomEvent('navigateToCompare', { 
            detail: { verses: verses.map(v => v.sura_verse) } 
        });
        window.dispatchEvent(event);
    };

    // Parse Arabic text with roots and meanings for hover functionality
    const parseArabicText = (arabic, roots, meanings, verse) => {
        if (!arabic || !roots || !meanings) return arabic;

        const arabicWords = arabic.split(/\s+/);
        const rootsArray = roots.split(',').map(r => r.trim());
        const meaningsArray = meanings.split(',').map(m => m.trim());

        return arabicWords.map((word, index) => {
            const root = rootsArray[index] || '';
            const meaning = meaningsArray[index] || '';
            const isClickable = root && root !== '-';
            
            return (
                <span
                    key={index}
                    className={`arabic-word ${isClickable ? 'clickable' : ''}`}
                    onMouseEnter={(e) => {
                        if (root || meaning) {
                            const rect = e.target.getBoundingClientRect();
                            setTooltipPosition({
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10
                            });
                            setHoveredWord({
                                word: word,
                                root: root,
                                meaning: meaning
                            });
                        }
                    }}
                    onMouseLeave={() => setHoveredWord(null)}
                    onClick={() => {
                        if (isClickable) {
                            analyzeWordRoot(word, root, verse);
                        }
                    }}
                >
                    {word}
                    {index < arabicWords.length - 1 && ' '}
                </span>
            );
        });
    };

    useEffect(() => {
        // Load all verses data for text search
        const loadAllVerses = async () => {
            try {
                const response = await fetch('/verses_final.json');
                if (response.ok) {
                    const data = await response.json();
                    setAllVersesData(data);
                }
            } catch (err) {
                console.error('Failed to load verses data:', err);
            }
        };
        loadAllVerses();
        
        // Load verses when component mounts or when initialRange changes
        if (initialRange && initialRange !== verseRange) {
            setVerseRange(initialRange);
            setSearchMode('range');
        }
        fetchVerses();
    }, [initialRange]);
    
    useEffect(() => {
        // Fetch verses when verseRange, searchMode, or exactMatch changes
        if (verseRange) {
            fetchVerses();
        }
    }, [verseRange, searchMode, exactMatch]);

    return (
        <div className="verse-lookup-container">
            <div className="verse-lookup-header">
                <h2>📖 Quran Verse Lookup</h2>
                <p>{searchMode === 'range' ? 'Enter a verse range (e.g., 1:1-7, 2:5-10, or 3:15)' : 'Search for text within verses'}</p>
                
                <div className="search-mode-toggle">
                    <button 
                        className={`mode-button ${searchMode === 'range' ? 'active' : ''}`}
                        onClick={() => setSearchMode('range')}
                    >
                        📍 Range Lookup
                    </button>
                    <button 
                        className={`mode-button ${searchMode === 'text' ? 'active' : ''}`}
                        onClick={() => setSearchMode('text')}
                    >
                        🔍 Text Search
                    </button>
                </div>
                
                {/* Toggle checkboxes */}
                <div className="toggle-controls">
                    {searchMode === 'range' && (
                        <div className="arabic-toggle">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={showArabic}
                                    onChange={(e) => setShowArabic(e.target.checked)}
                                    className="toggle-checkbox"
                                />
                                <span className="toggle-text">Show Arabic Text</span>
                            </label>
                        </div>
                    )}
                    {searchMode === 'text' && (
                        <div className="search-toggle">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={exactMatch}
                                    onChange={(e) => setExactMatch(e.target.checked)}
                                    className="toggle-checkbox"
                                />
                                <span className="toggle-text">Exact Match</span>
                            </label>
                            <span className="search-mode-hint">
                                {exactMatch ? '(searching for exact phrase)' : '(regex pattern matching)'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="verse-lookup-form">
                <div className="input-group">
                    <input
                        type="text"
                        value={verseRange}
                        onChange={(e) => setVerseRange(e.target.value)}
                        placeholder={searchMode === 'range' ? '1:1-7' : 'Search text...'}
                        className="verse-input"
                    />
                    <button type="submit" disabled={loading} className="lookup-button">
                        {loading ? '🔄' : '🔍'} Lookup
                    </button>
                    {searchMode === 'range' && isChapterInput() && (
                        <button 
                            type="button" 
                            onClick={loadFullChapter} 
                            disabled={loading} 
                            className="chapter-button"
                            title="Load the entire chapter"
                        >
                            📖 Full Chapter
                        </button>
                    )}
                </div>
            </form>

            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}

            {loading && (
                <div className="loading">
                    🔄 Loading verses...
                </div>
            )}

            {!loading && verses.length > 0 && (
                <div className="verse-info">
                    📊 Showing {verses.length} verse{verses.length !== 1 ? 's' : ''} 
                    {searchMode === 'text' ? `matching "${verseRange}"` : `for range: ${verseRange}`}
                </div>
            )}

            <div className="verses-container">
                {verses.map((verse, index) => (
                    <div key={verse.sura_verse}>
                        {/* Display subtitle if this verse has one */}
                        {verse.subtitle && (
                            <div className="subtitle-header">
                                <h3 className="subtitle-text">{verse.subtitle}</h3>
                            </div>
                        )}
                        
                        <div className="verse-card">
                            <div className="verse-header">
                                <span 
                                    className="verse-ref"
                                    onClick={() => handleVerseClick(verse.sura_verse)}
                                    title={`Click to view subtitle section for ${verse.sura_verse}`}
                                >
                                    [{verse.sura_verse}]
                                </span>
                            </div>
                            
                            <div className="verse-content">
                            {verse.arabic && showArabic && (
                                <div className="arabic-text" dir="rtl">
                                    {parseArabicText(verse.arabic, verse.roots, verse.meanings, verse)}
                                </div>
                            )}
                            
                            <div className="english-text">
                                {verse.english}
                            </div>
                            
                            {searchMode === 'text' && !verse.arabic && (
                                <div className="search-note">
                                    <small>💡 Use Range Lookup mode to see Arabic text with word meanings</small>
                                </div>
                            )}
                            
                            {verse.footnote && (
                                <div className="footnote">
                                    <small>{verse.footnote}</small>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tooltip for word hover */}
            {hoveredWord && (
                <div 
                    className="word-tooltip"
                    style={{
                        position: 'fixed',
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        transform: 'translateX(-50%) translateY(-100%)',
                        zIndex: 1000
                    }}
                >
                    <div className="tooltip-content">
                        <div className="tooltip-word">{hoveredWord.word}</div>
                        {hoveredWord.root && (
                            <div className="tooltip-root">
                                <strong>Root:</strong> {hoveredWord.root}
                            </div>
                        )}
                        {hoveredWord.meaning && (
                            <div className="tooltip-meaning">
                                <strong>Meaning:</strong> {hoveredWord.meaning}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Root Analysis Modal */}
            {showRootAnalysis && rootAnalysisData && (
                <div className="root-analysis-modal">
                    <div className="root-analysis-content">
                        <div className="root-analysis-header">
                            <h3>Root Analysis: "{rootAnalysisData.selectedRoot}"</h3>
                            <button 
                                className="close-btn"
                                onClick={() => setShowRootAnalysis(false)}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="root-info">
                            <p><strong>Word clicked:</strong> {rootAnalysisData.clickedWord}</p>
                            <p><strong>Root:</strong> {rootAnalysisData.selectedRoot}</p>
                            <p><strong>From verse:</strong> [{rootAnalysisData.sourceVerse.sura_verse}]</p>
                            <p><strong>Total occurrences:</strong> {rootAnalysisData.totalCount} verses</p>
                            <p><strong>Other verses with this root:</strong> {rootAnalysisData.totalRelated}</p>
                        </div>
                        
                        <div className="related-verses-section">
                            <h4>Related Verses (showing {showAllRootVerses ? rootAnalysisData.relatedVerses.length : Math.min(10, rootAnalysisData.relatedVerses.length)})</h4>
                            
                            <div className="related-verses-list">
                                {rootAnalysisData.relatedVerses
                                    .slice(0, showAllRootVerses ? undefined : 10)
                                    .map((verse, index) => (
                                        <div key={verse.sura_verse} className="related-verse-item">
                                            <div className="related-verse-header">
                                                <span className="verse-number">{index + 1}.</span>
                                                <span className="verse-ref-small">[{verse.sura_verse}]</span>
                                            </div>
                                            <div className="related-verse-text">
                                                {verse.english}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            
                            {rootAnalysisData.relatedVerses.length > 10 && (
                                <div className="show-more-section">
                                    <label className="toggle-label">
                                        <input
                                            type="checkbox"
                                            checked={showAllRootVerses}
                                            onChange={(e) => setShowAllRootVerses(e.target.checked)}
                                            className="toggle-checkbox"
                                        />
                                        <span className="toggle-text">
                                            Show all {rootAnalysisData.relatedVerses.length} verses
                                        </span>
                                    </label>
                                </div>
                            )}
                            
                            <div className="action-buttons">
                                <button
                                    className="compare-btn"
                                    onClick={() => {
                                        const versesToCompare = [
                                            rootAnalysisData.sourceVerse,
                                            ...rootAnalysisData.relatedVerses.slice(0, showAllRootVerses ? 10 : 5)
                                        ];
                                        navigateToCompare(versesToCompare);
                                        setShowRootAnalysis(false);
                                    }}
                                >
                                    📊 Compare in Compare Tab
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={() => setShowRootAnalysis(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuranVerseLookup;