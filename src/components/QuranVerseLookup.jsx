import React, { useState, useEffect } from 'react';
import './QuranVerseLookup.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://vector-search-api-production.up.railway.app';

const QuranVerseLookup = () => {
    const [verseRange, setVerseRange] = useState('1:1-7');
    const [verses, setVerses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hoveredWord, setHoveredWord] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const fetchVerses = async () => {
        if (!verseRange.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
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
            setVerses(data.verses);
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

    // Parse Arabic text with roots and meanings for hover functionality
    const parseArabicText = (arabic, roots, meanings) => {
        if (!arabic || !roots || !meanings) return arabic;

        const arabicWords = arabic.split(/\s+/);
        const rootsArray = roots.split(',').map(r => r.trim());
        const meaningsArray = meanings.split(',').map(m => m.trim());

        return arabicWords.map((word, index) => {
            const root = rootsArray[index] || '';
            const meaning = meaningsArray[index] || '';
            
            return (
                <span
                    key={index}
                    className="arabic-word"
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
                >
                    {word}
                    {index < arabicWords.length - 1 && ' '}
                </span>
            );
        });
    };

    useEffect(() => {
        // Load default verses on component mount
        fetchVerses();
    }, []);

    return (
        <div className="verse-lookup-container">
            <div className="verse-lookup-header">
                <h2>📖 Quran Verse Lookup</h2>
                <p>Enter a verse range (e.g., 1:1-7, 2:5-10, or 3:15)</p>
            </div>

            <form onSubmit={handleSubmit} className="verse-lookup-form">
                <div className="input-group">
                    <input
                        type="text"
                        value={verseRange}
                        onChange={(e) => setVerseRange(e.target.value)}
                        placeholder="1:1-7"
                        className="verse-input"
                    />
                    <button type="submit" disabled={loading} className="lookup-button">
                        {loading ? '🔄' : '🔍'} Lookup
                    </button>
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

            <div className="verses-container">
                {verses.map((verse, index) => (
                    <div key={verse.sura_verse} className="verse-card">
                        <div className="verse-header">
                            <span className="verse-ref">[{verse.sura_verse}]</span>
                        </div>
                        
                        <div className="verse-content">
                            <div className="arabic-text" dir="rtl">
                                {parseArabicText(verse.arabic, verse.roots, verse.meanings)}
                            </div>
                            
                            <div className="english-text">
                                {verse.english}
                            </div>
                            
                            {verse.footnote && (
                                <div className="footnote">
                                    <small>{verse.footnote}</small>
                                </div>
                            )}
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

            {verses.length > 0 && (
                <div className="verse-info">
                    📊 Showing {verses.length} verse{verses.length !== 1 ? 's' : ''} for range: {verseRange}
                </div>
            )}
        </div>
    );
};

export default QuranVerseLookup;