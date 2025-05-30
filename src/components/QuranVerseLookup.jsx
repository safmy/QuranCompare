import React, { useState, useEffect } from 'react';
import './QuranVerseLookup.css';
import LanguageSwitcher from './LanguageSwitcher';
import VoiceSearchButton from './VoiceSearchButton';
import { useLanguage } from '../contexts/LanguageContext';
import { getLanguageConfig, getTranslationText, getFootnoteText } from '../config/languages';

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
    const { currentLanguage, changeLanguage } = useLanguage();
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
    const [selectedWord, setSelectedWord] = useState(null); // For mobile touch interaction
    const [isMobile, setIsMobile] = useState(false);
    const [selectedMeaningCategory, setSelectedMeaningCategory] = useState(null);
    
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

    const detectSearchType = (input) => {
        const trimmed = input.trim();
        
        // Patterns for verse ranges
        const versePatterns = [
            /^(\d+):(\d+)(?:-(\d+))?$/,  // Standard format: 1:1 or 1:1-7
            /^(\d+)$/, // Just chapter number
            /^(\d+):$/, // Chapter with colon
            /^chapter\s+(\d+)(?:\s+verse\s+(\d+)(?:\s*(?:to|-)\s*(\d+))?)?$/i,
            /^surah?\s+(\d+)(?:\s+(?:verse|ayah?)\s+(\d+)(?:\s*(?:to|-)\s*(\d+))?)?$/i,
        ];
        
        return versePatterns.some(pattern => pattern.test(trimmed));
    };

    const fetchVerses = async () => {
        if (!verseRange.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const isVerseRange = detectSearchType(verseRange);
            
            if (isVerseRange) {
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
                setSearchMode('range'); // Update mode indicator
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
                setSearchMode('text'); // Update mode indicator
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
    
    const analyzeWordRoot = (word, root, verse, wordMeaning) => {
        if (!root || root === '-' || !allVersesData.length) return;
        
        // Find all verses containing this specific root
        const relatedVerses = [];
        const meaningVariations = new Map(); // Track different meanings of the same root
        let totalCount = 0;
        
        allVersesData.forEach(v => {
            if (v.roots && v.roots.includes(root)) {
                totalCount++;
                if (v.sura_verse !== verse.sura_verse) {
                    // Extract meanings for this root in this verse
                    const rootsArray = v.roots.split(',').map(r => r.trim());
                    const meaningsArray = v.meanings ? v.meanings.split(',').map(m => m.trim()) : [];
                    const arabicWords = v.arabic ? v.arabic.split(/\s+/) : [];
                    
                    // Find all occurrences of this root and their meanings
                    rootsArray.forEach((r, idx) => {
                        if (r === root && meaningsArray[idx]) {
                            const meaning = meaningsArray[idx];
                            const arabicWord = arabicWords[idx] || '';
                            
                            // Group by meaning variation
                            if (!meaningVariations.has(meaning)) {
                                meaningVariations.set(meaning, []);
                            }
                            
                            // Check if this verse is already in this meaning group
                            const existingVerse = meaningVariations.get(meaning).find(item => item.verse.sura_verse === v.sura_verse);
                            if (!existingVerse) {
                                meaningVariations.get(meaning).push({
                                    verse: v,
                                    arabicWord: arabicWord,
                                    meaning: meaning,
                                    rootIndex: idx
                                });
                            }
                        }
                    });
                    
                    relatedVerses.push({
                        ...v,
                        matchingRoots: [root]
                    });
                }
            }
        });
        
        // Sort meaning variations by frequency (most common first)
        const sortedVariations = Array.from(meaningVariations.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 10); // Limit to top 10 variations
        
        // Sort related verses by verse reference
        relatedVerses.sort((a, b) => a.sura_verse.localeCompare(b.sura_verse));
        
        setRootAnalysisData({
            sourceVerse: verse,
            clickedWord: word,
            clickedWordMeaning: wordMeaning,
            selectedRoot: root,
            totalCount: totalCount,
            relatedVerses: relatedVerses,
            totalRelated: relatedVerses.length,
            meaningVariations: sortedVariations
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
    
    const handleVoiceTranscription = (transcription) => {
        // Simply set the transcription and let fetchVerses handle the detection
        setVerseRange(transcription.trim());
        
        // Automatically search after a short delay
        setTimeout(() => {
            fetchVerses();
        }, 100);
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
            const wordKey = `${verse.sura_verse}-${index}`;
            const isSelected = selectedWord?.key === wordKey;
            
            return (
                <span
                    key={index}
                    className={`arabic-word ${isClickable ? 'clickable' : ''} ${isSelected ? 'selected' : ''}`}
                    onMouseEnter={(e) => {
                        if (!isMobile && (root || meaning)) {
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
                    onMouseLeave={() => {
                        if (!isMobile) {
                            setHoveredWord(null);
                        }
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        
                        if (isMobile) {
                            // Mobile behavior: first tap shows tooltip, second tap analyzes root
                            if (isSelected) {
                                // Second tap - analyze root
                                if (isClickable) {
                                    analyzeWordRoot(word, root, verse, meaning);
                                }
                            } else {
                                // First tap - show tooltip
                                const rect = e.target.getBoundingClientRect();
                                setTooltipPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 10
                                });
                                setSelectedWord({
                                    key: wordKey,
                                    word: word,
                                    root: root,
                                    meaning: meaning
                                });
                                setHoveredWord({
                                    word: word,
                                    root: root,
                                    meaning: meaning
                                });
                            }
                        } else {
                            // Desktop behavior - immediate analysis
                            if (isClickable) {
                                analyzeWordRoot(word, root, verse, meaning);
                            }
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
        // Detect mobile device
        const checkMobile = () => {
            setIsMobile(window.matchMedia('(max-width: 768px)').matches || 
                       'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        // Clear selected word when clicking outside
        const handleClickOutside = (e) => {
            if (!e.target.closest('.arabic-word') && !e.target.closest('.word-tooltip')) {
                setSelectedWord(null);
                if (isMobile) {
                    setHoveredWord(null);
                }
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        
        return () => {
            window.removeEventListener('resize', checkMobile);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isMobile]);

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

    // Force re-render when language changes (for display purposes)
    useEffect(() => {
        // This ensures the component re-renders with new language
        // The actual translation change happens in the render function
    }, [currentLanguage]);

    return (
        <div className="verse-lookup-container">
            <LanguageSwitcher 
                currentLanguage={currentLanguage}
                onLanguageChange={changeLanguage}
            />
            
            <div className="verse-lookup-header">
                <h2>📖 Quran Search</h2>
                <p>Enter verse references (1:1-7, 2:5, chapter 3) or search for text within verses</p>
                
                {/* Simplified toggle controls */}
                <div className="toggle-controls">
                    <div className="unified-controls">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                checked={showArabic}
                                onChange={(e) => setShowArabic(e.target.checked)}
                                className="toggle-checkbox"
                            />
                            <span className="toggle-text">Show Arabic Text</span>
                        </label>
                        
                        {searchMode === 'text' && (
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={exactMatch}
                                    onChange={(e) => setExactMatch(e.target.checked)}
                                    className="toggle-checkbox"
                                />
                                <span className="toggle-text">Exact Match</span>
                            </label>
                        )}
                    </div>
                    
                    {searchMode === 'text' && (
                        <div className="search-mode-indicator">
                            📝 Text search {exactMatch ? '(exact phrase)' : '(flexible matching)'}
                        </div>
                    )}
                    {searchMode === 'range' && (
                        <div className="search-mode-indicator">
                            📍 Verse range lookup
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
                        placeholder="1:1-7, chapter 2, or search text..."
                        className="verse-input"
                    />
                    <button type="submit" disabled={loading} className="lookup-button">
                        {loading ? '🔄' : '🔍'} Search
                    </button>
                    {detectSearchType(verseRange) && isChapterInput() && (
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
                    <VoiceSearchButton onTranscription={handleVoiceTranscription} />
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
                    {searchMode === 'text' ? `matching "${verseRange}"` : `for "${verseRange}"`}
                </div>
            )}

            <div className="verses-container">
                {verses.map((verse, index) => {
                    // Check if this is the first verse or if subtitle is different from previous
                    const showSubtitle = verse.subtitle && (
                        index === 0 || 
                        verse.subtitle !== verses[index - 1]?.subtitle
                    );
                    
                    return (
                        <div key={verse.sura_verse}>
                            {/* Display subtitle if this verse has one and it's different from previous */}
                            {showSubtitle && (
                                <div className="subtitle-header">
                                    <h3 className="subtitle-text">{verse.subtitle}</h3>
                                </div>
                            )}
                            
                            {/* Mobile hint for first verse with Arabic text */}
                            {isMobile && index === 0 && verse.arabic && showArabic && verse.roots && (
                                <div className="mobile-hint" style={{
                                    padding: '10px',
                                    background: '#e3f2fd',
                                    borderRadius: '6px',
                                    marginBottom: '15px',
                                    fontSize: '14px',
                                    color: '#1976d2',
                                    textAlign: 'center'
                                }}>
                                    💡 Tap Arabic words to see root/meaning, tap again to analyze
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
                            
                            <div className="translation-text" style={{ direction: getLanguageConfig(currentLanguage).direction }}>
                                {getTranslationText(verse, currentLanguage)}
                            </div>
                            
                            {searchMode === 'text' && !verse.arabic && (
                                <div className="search-note">
                                    <small>💡 Use Range Lookup mode to see Arabic text with word meanings</small>
                                </div>
                            )}
                            
                            {getFootnoteText(verse, currentLanguage) && (
                                <div className="footnote" style={{ direction: getLanguageConfig(currentLanguage).direction }}>
                                    <small>{getFootnoteText(verse, currentLanguage)}</small>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                    );
                })}
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
                        {hoveredWord.root && hoveredWord.root !== '-' && (
                            <div className="tooltip-root">
                                <strong>Root:</strong> {hoveredWord.root}
                            </div>
                        )}
                        {hoveredWord.meaning && (
                            <div className="tooltip-meaning">
                                <strong>Meaning:</strong> {hoveredWord.meaning}
                            </div>
                        )}
                        {isMobile && hoveredWord.root && hoveredWord.root !== '-' && (
                            <div style={{
                                marginTop: '8px',
                                fontSize: '12px',
                                opacity: 0.8
                            }}>
                                Tap again to see all verses with this root
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
                            <p><strong>Meaning in this verse:</strong> {rootAnalysisData.clickedWordMeaning || 'N/A'}</p>
                            <p><strong>From verse:</strong> [{rootAnalysisData.sourceVerse.sura_verse}]</p>
                            <p><strong>Total occurrences:</strong> {rootAnalysisData.totalCount} verses</p>
                            <p><strong>Other verses with this root:</strong> {rootAnalysisData.totalRelated}</p>
                        </div>
                        
                        {/* Meaning variations section */}
                        {rootAnalysisData.meaningVariations && rootAnalysisData.meaningVariations.length > 0 && (
                            <div className="meaning-variations" style={{
                                padding: '20px',
                                background: '#f8f9fa',
                                borderBottom: '1px solid #e8ecf0',
                                maxHeight: isMobile ? '200px' : 'auto',
                                overflowY: isMobile ? 'auto' : 'visible'
                            }}>
                                <h4 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>
                                    Meaning Variations of "{rootAnalysisData.selectedRoot}"
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {rootAnalysisData.meaningVariations.map(([meaning, verses], idx) => (
                                        <div key={idx} style={{
                                            padding: '8px 12px',
                                            background: selectedMeaningCategory === meaning ? '#1976d2' : '#e3f2fd',
                                            color: selectedMeaningCategory === meaning ? 'white' : 'inherit',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onClick={() => setSelectedMeaningCategory(selectedMeaningCategory === meaning ? null : meaning)}
                                        >
                                            <strong>{meaning}</strong>
                                            <span style={{ marginLeft: '10px', color: selectedMeaningCategory === meaning ? 'rgba(255,255,255,0.8)' : '#666' }}>
                                                ({verses.length} verse{verses.length !== 1 ? 's' : ''})
                                            </span>
                                            {selectedMeaningCategory === meaning && (
                                                <span style={{ marginLeft: '10px', fontSize: '12px' }}>
                                                    ✓ Selected
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Quick action buttons */}
                                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        className="quick-action-btn"
                                        style={{
                                            padding: '8px 16px',
                                            background: '#4caf50',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                            // Select one verse from each meaning variation
                                            const versesToCompare = [rootAnalysisData.sourceVerse];
                                            rootAnalysisData.meaningVariations.forEach(([meaning, verses]) => {
                                                if (verses.length > 0) {
                                                    versesToCompare.push(verses[0].verse);
                                                }
                                            });
                                            navigateToCompare(versesToCompare.slice(0, 11)); // Limit to 10 variations + source
                                            setShowRootAnalysis(false);
                                        }}
                                    >
                                        📊 Compare One from Each Meaning
                                    </button>
                                    
                                    {selectedMeaningCategory && (
                                        <button
                                            className="quick-action-btn"
                                            style={{
                                                padding: '8px 16px',
                                                background: '#2196f3',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                // Get all verses for selected meaning category
                                                const categoryData = rootAnalysisData.meaningVariations.find(([meaning]) => meaning === selectedMeaningCategory);
                                                if (categoryData) {
                                                    const [, verses] = categoryData;
                                                    const versesToCompare = verses.map(v => v.verse).slice(0, 10); // Limit to 10
                                                    navigateToCompare(versesToCompare);
                                                    setShowRootAnalysis(false);
                                                }
                                            }}
                                        >
                                            📚 View All "{selectedMeaningCategory}" Verses
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        
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
                            
                            {/* Sticky action buttons for mobile */}
                            <div className="action-buttons" style={{
                                position: isMobile ? 'sticky' : 'relative',
                                bottom: isMobile ? 0 : 'auto',
                                background: isMobile ? 'white' : 'transparent',
                                padding: isMobile ? '15px' : '20px',
                                paddingTop: '20px',
                                borderTop: '1px solid #e8ecf0',
                                display: 'flex',
                                gap: '10px',
                                flexDirection: isMobile ? 'column' : 'row',
                                boxShadow: isMobile ? '0 -2px 10px rgba(0,0,0,0.1)' : 'none'
                            }}>
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
                                    📊 Compare Selected Verses
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={() => {
                                        setShowRootAnalysis(false);
                                        setSelectedMeaningCategory(null);
                                    }}
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