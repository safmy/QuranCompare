import React, { useState, useEffect, useRef } from 'react';
import './QuranVerseLookup.css';
import VoiceSearchButton from './VoiceSearchButton';
import RootAnalysisModal from './RootAnalysisModal';
import { useLanguage } from '../contexts/LanguageContext';
import { getLanguageConfig, getTranslationText, getFootnoteText, getSubtitleText } from '../config/languages';
import { getVerseAudioUrl, getAllVerseAudioUrls } from '../utils/verseMapping';
import { Clipboard } from '@capacitor/clipboard';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

// Global audio manager to prevent rate limiting
const AudioManager = {
    currentAudio: null,
    playQueue: [],
    isPlaying: false,
    lastPlayTime: 0,
    minInterval: 1000, // Minimum 1 second between plays
    
    async playAudio(audioUrl, onStart, onEnd, onError) {
        // Stop current audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        
        // Rate limiting
        const now = Date.now();
        if (now - this.lastPlayTime < this.minInterval) {
            const delay = this.minInterval - (now - this.lastPlayTime);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        try {
            this.isPlaying = true;
            this.lastPlayTime = Date.now();
            onStart();
            
            this.currentAudio = new Audio(audioUrl);
            
            this.currentAudio.addEventListener('ended', () => {
                this.isPlaying = false;
                this.currentAudio = null;
                onEnd();
            });
            
            this.currentAudio.addEventListener('error', (e) => {
                this.isPlaying = false;
                this.currentAudio = null;
                onError(e);
            });
            
            await this.currentAudio.play();
        } catch (error) {
            this.isPlaying = false;
            this.currentAudio = null;
            onError(error);
        }
    },
    
    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.isPlaying = false;
        }
    }
};

// Minimal audio button component
const MinimalAudioButton = ({ verseReference }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;
    
    useEffect(() => {
        // Cleanup on unmount
        return () => {
            if (AudioManager.currentAudio) {
                AudioManager.stopAudio();
            }
        };
    }, []);
    
    const playWithRetry = async (attempt = 0, providerIndex = 0) => {
        // Get all available audio URLs
        const audioUrls = getAllVerseAudioUrls(verseReference, 64);
        
        if (!audioUrls.length) {
            setError('No audio sources available');
            return;
        }
        
        // Try current provider
        const audioUrl = audioUrls[providerIndex];
        if (!audioUrl) {
            // Move to next provider if available
            if (providerIndex + 1 < audioUrls.length) {
                console.log(`Trying next audio provider (${providerIndex + 1}/${audioUrls.length})`);
                setRetryCount(providerIndex + 1);
                return playWithRetry(0, providerIndex + 1);
            } else {
                setError('All audio sources failed');
                return;
            }
        }
        
        try {
            await AudioManager.playAudio(
                audioUrl,
                () => {
                    setIsLoading(false);
                    setIsPlaying(true);
                    setError(null);
                    setRetryCount(0);
                },
                () => {
                    setIsPlaying(false);
                },
                (err) => {
                    setIsPlaying(false);
                    setIsLoading(false);
                    
                    console.log(`Audio failed from provider ${providerIndex + 1}: ${audioUrl}`);
                    
                    // Try next provider first
                    if (providerIndex + 1 < audioUrls.length) {
                        console.log(`Switching to provider ${providerIndex + 2}/${audioUrls.length}`);
                        setRetryCount(providerIndex + 1);
                        setTimeout(() => playWithRetry(0, providerIndex + 1), 1000);
                    } else if (attempt < maxRetries) {
                        // Retry with same provider if no more providers
                        console.log(`Retrying provider 1 (attempt ${attempt + 1}/${maxRetries})`);
                        setRetryCount(attempt + 1);
                        setTimeout(() => playWithRetry(attempt + 1, 0), 2000 * (attempt + 1));
                    } else {
                        setError('All audio sources failed');
                        console.error('Audio playback failed from all providers');
                    }
                }
            );
        } catch (err) {
            console.error('Audio playback error:', err);
            // Try next provider
            if (providerIndex + 1 < audioUrls.length) {
                setTimeout(() => playWithRetry(0, providerIndex + 1), 1000);
            } else {
                setError('Audio unavailable');
                setIsLoading(false);
                setIsPlaying(false);
            }
        }
    };
    
    const togglePlay = () => {
        if (isPlaying) {
            AudioManager.stopAudio();
            setIsPlaying(false);
        } else {
            setIsLoading(true);
            setError(null);
            playWithRetry();
        }
    };
    
    const getButtonContent = () => {
        if (error) return '❌';
        if (isLoading) return retryCount > 0 ? `${retryCount}⏳` : '⏳';
        return isPlaying ? '⏸' : '▶';
    };
    
    const getButtonTitle = () => {
        if (error) return `Audio error: ${error}`;
        if (isLoading && retryCount > 0) return `Trying source ${retryCount}...`;
        if (isLoading) return 'Loading audio...';
        return isPlaying ? 'Pause' : 'Play Mishary recitation (multiple sources)';
    };
    
    return (
        <button 
            className="minimal-audio-btn"
            onClick={togglePlay}
            disabled={isLoading}
            title={getButtonTitle()}
            style={{
                opacity: error ? 0.5 : 1,
                color: error ? '#ff4444' : (isPlaying ? '#4caf50' : '#666')
            }}
        >
            {getButtonContent()}
        </button>
    );
};

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

// Helper function to parse verse range from local data
const parseVerseRangeFromLocal = (range, versesData) => {
    const match = range.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    if (!match) return [];
    
    const chapter = parseInt(match[1]);
    const startVerse = parseInt(match[2]);
    const endVerse = match[3] ? parseInt(match[3]) : startVerse;
    
    return versesData.filter(verse => {
        const [ch, v] = verse.sura_verse.split(':').map(n => parseInt(n));
        return ch === chapter && v >= startVerse && v <= endVerse;
    });
};

const QuranVerseLookup = ({ initialRange = '', savedState = {} }) => {
    const { currentLanguage, changeLanguage } = useLanguage();
    const [verseRange, setVerseRange] = useState(savedState.verseRange || initialRange || '');
    const [verses, setVerses] = useState(savedState.verses || []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hoveredWord, setHoveredWord] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [searchMode, setSearchMode] = useState(savedState.searchMode || 'range');
    const [showArabic, setShowArabic] = useState(savedState.showArabic ?? true);
    const [exactMatch, setExactMatch] = useState(savedState.exactMatch ?? true);
    const [excludeVerse0, setExcludeVerse0] = useState(savedState.excludeVerse0 ?? false);
    const [allVersesData, setAllVersesData] = useState([]);
    const [showRootAnalysis, setShowRootAnalysis] = useState(false);
    const [rootAnalysisData, setRootAnalysisData] = useState(null);
    const [showAllRootVerses, setShowAllRootVerses] = useState(false);
    const [selectedWord, setSelectedWord] = useState(null); // For mobile touch interaction
    const [isMobile, setIsMobile] = useState(false);
    const [selectedMeaningCategory, setSelectedMeaningCategory] = useState(null);
    const [hoveredEnglishIndex, setHoveredEnglishIndex] = useState(null); // For English word hover
    const [hoveredArabicIndex, setHoveredArabicIndex] = useState(null); // For Arabic word hover
    const [isDarkMode, setIsDarkMode] = useState(false); // Dark mode detection
    const [showScrollTop, setShowScrollTop] = useState(false);
    
    // Long press functionality
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [copiedVerse, setCopiedVerse] = useState(null);
    
    // Long press handlers with improved iOS compatibility
    const handleLongPressStart = (verse, event) => {
        // Prevent default context menu on mobile
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        
        const timer = setTimeout(() => {
            copyVerseToClipboard(verse);
        }, 500); // 500ms for long press
        setLongPressTimer(timer);
    };

    const handleLongPressEnd = (event) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
        
        // Prevent default behavior on mobile
        if (event && event.preventDefault) {
            event.preventDefault();
        }
    };

    const copyVerseToClipboard = async (verse) => {
        try {
            // Build complete verse text with subtitle and footnote
            let verseText = `[${verse.sura_verse}] ${getTranslationText(verse, currentLanguage)}`;
            
            // Add subtitle if present
            const subtitleText = getSubtitleText(verse, currentLanguage);
            if (subtitleText) {
                verseText = `${subtitleText}\n\n${verseText}`;
            }
            
            // Add footnote if present
            const footnoteText = getFootnoteText(verse, currentLanguage);
            if (footnoteText) {
                verseText += `\n\nFootnote: ${footnoteText}`;
            }
            
            // Enhanced clipboard handling - detect if we're in a Capacitor app
            let copySuccess = false;
            
            // Method 1: Try Capacitor Clipboard plugin (works best in iOS app)
            try {
                // Check if we're in a Capacitor environment
                if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                    await Clipboard.write({
                        string: verseText
                    });
                    copySuccess = true;
                    console.log('Successfully copied using Capacitor Clipboard plugin');
                }
            } catch (capacitorErr) {
                console.log('Capacitor Clipboard failed, trying web API:', capacitorErr);
            }
            
            // Method 2: Try modern clipboard API (for web)
            if (!copySuccess && navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(verseText);
                    copySuccess = true;
                    console.log('Successfully copied using Web Clipboard API');
                } catch (clipboardErr) {
                    console.log('Web Clipboard API failed, trying fallback:', clipboardErr);
                }
            }
            
            // Method 3: Improved fallback for older browsers and edge cases
            if (!copySuccess) {
                try {
                    const textArea = document.createElement('textarea');
                    textArea.value = verseText;
                    
                    // Better positioning and styling for iOS
                    textArea.style.position = 'absolute';
                    textArea.style.left = '50%';
                    textArea.style.top = '50%';
                    textArea.style.transform = 'translate(-50%, -50%)';
                    textArea.style.width = '1px';
                    textArea.style.height = '1px';
                    textArea.style.padding = '0';
                    textArea.style.border = 'none';
                    textArea.style.outline = 'none';
                    textArea.style.boxShadow = 'none';
                    textArea.style.background = 'transparent';
                    textArea.style.fontSize = '16px'; // Prevents zoom on iOS
                    textArea.readOnly = false;
                    textArea.contentEditable = true;
                    
                    document.body.appendChild(textArea);
                    
                    // Focus and select
                    textArea.focus();
                    textArea.select();
                    textArea.setSelectionRange(0, textArea.value.length);
                    
                    // Try to copy
                    copySuccess = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (copySuccess) {
                        console.log('Successfully copied using fallback method');
                    }
                } catch (fallbackErr) {
                    console.error('All copy methods failed:', fallbackErr);
                }
            }
            
            // Show feedback
            if (copySuccess) {
                setCopiedVerse(verse.sura_verse);
                setTimeout(() => {
                    setCopiedVerse(null);
                }, 2000);
            } else {
                // Show error feedback
                setCopiedVerse('error');
                setTimeout(() => {
                    setCopiedVerse(null);
                }, 3000);
            }
        } catch (err) {
            console.error('Failed to copy verse:', err);
            setCopiedVerse('error');
            setTimeout(() => {
                setCopiedVerse(null);
            }, 3000);
        }
    };
    
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
                    // Scroll to top after verses are loaded
                    setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 500);
                }, 100);
            }
        } catch (err) {
            console.error('Failed to get verse range:', err);
            // Fallback: just search for the single verse
            setVerseRange(verseRef);
            setSearchMode('range');
            setTimeout(() => {
                fetchVerses();
                // Scroll to top after verses are loaded
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 500);
            }, 100);
        }
    };

    // Helper function to parse footnote references
    const parseFootnoteReferences = (footnoteText) => {
        if (!footnoteText) return [];
        
        // Pattern to match verse references like 60:8-9, 2:255, etc.
        const versePattern = /(\d+):(\d+)(?:-(\d+))?/g;
        const matches = [];
        let match;
        
        while ((match = versePattern.exec(footnoteText)) !== null) {
            matches.push(match[0]);
        }
        
        return matches;
    };
    
    // Helper function to make footnotes clickable
    const parseFootnoteText = (footnoteText, currentLanguage) => {
        if (!footnoteText) return null;
        
        // Pattern to match verse references
        const versePattern = /(\d+):(\d+)(?:-(\d+))?/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = versePattern.exec(footnoteText)) !== null) {
            // Add text before the match
            if (match.index > lastIndex) {
                parts.push(footnoteText.substring(lastIndex, match.index));
            }
            
            // Add the clickable verse reference
            const verseRef = match[0];
            parts.push(
                <span
                    key={match.index}
                    style={{
                        color: '#1976d2',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontWeight: 'bold'
                    }}
                    onClick={() => {
                        setVerseRange(verseRef);
                        setSearchMode('range');
                        setTimeout(() => {
                            fetchVerses();
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }, 100);
                    }}
                    title={`Click to view ${verseRef}`}
                >
                    {verseRef}
                </span>
            );
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < footnoteText.length) {
            parts.push(footnoteText.substring(lastIndex));
        }
        
        return parts.length > 0 ? parts : footnoteText;
    };
    
    // Helper function to normalize verse input (handle whitespace between chapter and verse)
    const normalizeVerseInput = (input) => {
        // Trim the input
        let normalized = input.trim();
        
        // Handle comma-separated verses
        if (normalized.includes(',')) {
            // Split by comma and normalize each part
            const parts = normalized.split(',').map(part => {
                const trimmed = part.trim();
                // Replace whitespace between chapter and verse with colon
                // Pattern: digits, whitespace, digits (optionally followed by dash and more digits)
                return trimmed.replace(/(\d+)\s+(\d+(?:-\d+)?)/g, '$1:$2');
            });
            return parts.join(', ');
        } else {
            // Single verse - replace whitespace between chapter and verse
            return normalized.replace(/(\d+)\s+(\d+(?:-\d+)?)/g, '$1:$2');
        }
    };

    const detectSearchType = (input) => {
        const trimmed = input.trim();
        
        // Check if it's comma-separated verses
        if (trimmed.includes(',')) {
            // Check if all parts are verse references
            const parts = trimmed.split(',').map(p => p.trim());
            return parts.every(part => {
                // Normalize the part first
                const normalized = part.replace(/(\d+)\s+(\d+(?:-\d+)?)/g, '$1:$2');
                const versePatterns = [
                    /^(\d+):(\d+)(?:-(\d+))?$/,  // Standard format: 1:1 or 1:1-7
                    /^(\d+)$/, // Just chapter number
                    /^(\d+):$/, // Chapter with colon
                ];
                return versePatterns.some(pattern => pattern.test(normalized));
            });
        }
        
        // Patterns for verse ranges
        const versePatterns = [
            /^(\d+):(\d+)(?:-(\d+))?$/,  // Standard format: 1:1 or 1:1-7
            /^(\d+)\s+(\d+)(?:-(\d+))?$/,  // Space format: 1 1 or 1 1-7
            /^(\d+)$/, // Just chapter number
            /^(\d+):$/, // Chapter with colon
            /^chapter\s+(\d+)(?:\s+verse\s+(\d+)(?:\s*(?:to|-)\s*(\d+))?)?$/i,
        ];
        
        return versePatterns.some(pattern => pattern.test(trimmed));
    };

    const fetchVerses = async (rangeToFetch = null) => {
        const range = rangeToFetch || verseRange;
        if (!range.trim()) return;
        
        // Normalize the input first
        const normalizedInput = normalizeVerseInput(range);
        
        setLoading(true);
        setError(null);
        
        try {
            const isVerseRange = detectSearchType(normalizedInput);
            
            if (isVerseRange) {
                // Check if it's comma-separated verses
                if (normalizedInput.includes(',')) {
                    // Handle multiple verses
                    const verseRefs = normalizedInput.split(',').map(v => v.trim());
                    const allVerses = [];
                    const notFound = [];
                    
                    for (const ref of verseRefs) {
                        try {
                            const response = await fetch(`${API_BASE_URL}/verses`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    verse_range: ref
                                })
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                // Ensure subtitle data is included
                                const versesWithSubtitles = data.verses.map(verse => {
                                    if (!verse.subtitle && allVersesData.length > 0) {
                                        const localVerse = allVersesData.find(v => v.sura_verse === verse.sura_verse);
                                        if (localVerse && localVerse.subtitle) {
                                            return { ...verse, subtitle: localVerse.subtitle };
                                        }
                                    }
                                    return verse;
                                });
                                allVerses.push(...versesWithSubtitles);
                            } else {
                                notFound.push(ref);
                            }
                        } catch (err) {
                            console.error(`Failed to fetch ${ref}:`, err);
                            notFound.push(ref);
                        }
                    }
                    
                    if (notFound.length > 0 && allVerses.length === 0) {
                        throw new Error(`Could not find verses: ${notFound.join(', ')}`);
                    }
                    
                    setVerses(allVerses);
                    setSearchMode('range');
                    
                    if (notFound.length > 0) {
                        setError(`Some verses not found: ${notFound.join(', ')}`);
                    }
                } else {
                    // Single verse or range
                    try {
                        const response = await fetch(`${API_BASE_URL}/verses`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                verse_range: normalizedInput
                            })
                        });
                    
                    if (!response.ok) {
                        throw new Error(`API returned ${response.status}`);
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
                    } catch (apiError) {
                        console.error('API call failed, falling back to local data:', apiError);
                        // Fallback to local data processing
                        if (allVersesData.length > 0) {
                            const verses = parseVerseRangeFromLocal(normalizedInput, allVersesData);
                            setVerses(verses);
                            setSearchMode('range');
                        } else {
                            throw new Error('No data available');
                        }
                    }
                }
            } else {
                // Text search mode - search through local verse content
                if (!allVersesData.length) {
                    throw new Error('Verses data not loaded yet. Please try again.');
                }
                
                const searchTerm = normalizedInput.trim();
                if (!searchTerm) {
                    setVerses([]);
                    return;
                }
                
                // Check minimum character requirement for text search
                if (searchTerm.length < 3) {
                    setVerses([]);
                    setError(`Please enter at least 3 characters to search (currently ${searchTerm.length})`);
                    setSearchMode('text');
                    return;
                }
                
                // Clear any previous error
                setError(null);
                
                // Perform local search
                let matchedVerses = allVersesData.filter(verse => {
                    const textToSearch = verse.english.toLowerCase();
                    const searchLower = searchTerm.toLowerCase();
                    
                    if (exactMatch) {
                        // Exact match - look for the exact phrase
                        return textToSearch.includes(searchLower);
                    } else {
                        // Regex match - search for all words in any order
                        const searchWords = searchLower.split(/\s+/);
                        
                        // All words must be present but in any order
                        return searchWords.every(word => {
                            try {
                                // Escape special regex characters for safety
                                const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                const regex = new RegExp(`\\b${escapedWord}`, 'i');
                                return regex.test(verse.english);
                            } catch (e) {
                                // Invalid regex, fall back to includes
                                return textToSearch.includes(word);
                            }
                        });
                    }
                });
                
                // Exclude verse 0 (Basmala) if option is enabled
                if (excludeVerse0) {
                    matchedVerses = matchedVerses.filter(verse => {
                        const [, verseNum] = verse.sura_verse.split(':');
                        return verseNum !== '0';
                    });
                }
                
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
                        
                        // Add ALL verses with this meaning (not just one per verse)
                        meaningVariations.get(meaning).push({
                            verse: v,
                            arabicWord: arabicWord,
                            meaning: meaning,
                            rootIndex: idx,
                            verseRef: v.sura_verse
                        });
                    }
                });
                
                // Include ALL verses with this root, including the source verse
                relatedVerses.push({
                    ...v,
                    matchingRoots: [root],
                    isSourceVerse: v.sura_verse === verse.sura_verse
                });
            }
        });
        
        // Sort meaning variations by frequency (most common first)
        const sortedVariations = Array.from(meaningVariations.entries())
            .sort((a, b) => b[1].length - a[1].length);
            // Removed limit to show all variations
        
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
    
    const navigateToCompare = (verses, meaningData = null) => {
        // Store verses in sessionStorage to pass to Compare tab
        sessionStorage.setItem('compareVerses', JSON.stringify(verses.map(v => v.sura_verse)));
        
        // Store meaning variations data if provided
        if (meaningData) {
            sessionStorage.setItem('compareMeaningData', JSON.stringify(meaningData));
        } else {
            sessionStorage.removeItem('compareMeaningData');
        }
        
        // Trigger navigation to Compare tab
        const event = new CustomEvent('navigateToCompare', { 
            detail: { 
                verses: verses.map(v => v.sura_verse),
                meaningData: meaningData
            } 
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
        if (!arabic) return arabic;
        
        if (!roots || !meanings) {
            // If no roots/meanings, just return plain Arabic text
            return arabic;
        }

        const arabicWords = arabic.split(/\s+/);
        const rootsArray = roots.split(',').map(r => r.trim());
        const meaningsArray = meanings.split(',').map(m => m.trim());

        return arabicWords.map((word, index) => {
            const root = rootsArray[index] || '';
            const meaning = meaningsArray[index] || '';
            const isClickable = root && root !== '-';
            const wordKey = `${verse.sura_verse}-${index}`;
            const isSelected = selectedWord?.key === wordKey;
            const isHighlighted = hoveredEnglishIndex === index || hoveredArabicIndex === index;
            
            return (
                <span
                    key={index}
                    className={`arabic-word ${isClickable ? 'clickable' : ''} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                    onMouseEnter={(e) => {
                        e.stopPropagation();
                        if (!isMobile) {
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
                            // Always set the hovered index for highlighting
                            setHoveredArabicIndex(index);
                            console.log('Arabic word hovered:', { index, word, meaning, verse: verse.sura_verse });
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.stopPropagation();
                        if (!isMobile) {
                            setHoveredWord(null);
                            setHoveredArabicIndex(null);
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
    
    // Helper function to get synonyms for a word
    const getSynonyms = (word) => {
        const synonymMap = {
            'believe': ['faith', 'trust'],
            'believed': ['faith', 'trusted'],
            'worship': ['serve', 'obey'],
            'serve': ['worship', 'obey'],
            'obey': ['worship', 'serve'],
            'path': ['way', 'road'],
            'way': ['path', 'road'],
            'guide': ['lead', 'direct'],
            'lead': ['guide', 'direct'],
            'straight': ['right', 'direct'],
            'right': ['straight', 'correct'],
            // Add more synonym mappings as needed
        };
        return synonymMap[word.toLowerCase()] || [];
    };
    
    // Parse English text to make words hoverable
    const parseEnglishText = (englishText, roots, meanings, verse) => {
        if (!englishText || !roots || !meanings) return englishText;
        
        const rootsArray = roots.split(',').map(r => r.trim());
        const meaningsArray = meanings.split(',').map(m => m.trim());
        const words = englishText.split(/\s+/);
        
        return words.map((word, idx) => {
            // Clean the word of punctuation for matching
            const cleanWord = word.toLowerCase().replace(/[^a-z]/gi, '');
            let isHighlighted = false;
            
            // Skip highlighting for articles and very short words
            const articles = ['a', 'an', 'the', 'in', 'on', 'at', 'to', 'of', 'for', 'by', 'is', 'as'];
            if (articles.includes(cleanWord)) {
                return <span key={idx}>{word}{idx < words.length - 1 ? ' ' : ''}</span>;
            }
            
            // Check if this English word corresponds to the hovered Arabic word
            if (hoveredArabicIndex !== null) {
                const hoveredMeaning = meaningsArray[hoveredArabicIndex];
                console.log('Checking English word highlight:', { 
                    cleanWord, 
                    hoveredArabicIndex, 
                    hoveredMeaning,
                    meaningsArray 
                });
                if (hoveredMeaning && hoveredMeaning !== '-') {
                    const cleanedMeaning = hoveredMeaning.toLowerCase().replace(/^(a|an|the)\s+/i, '');
                    const meaningWords = cleanedMeaning.split(/\s+/);
                    const allRelatedWords = new Set();
                    
                    meaningWords.forEach(mw => {
                        const cleanMw = mw.replace(/[^a-z]/gi, '');
                        if (cleanMw && cleanMw.length > 2) {
                            allRelatedWords.add(cleanMw);
                            if (cleanMw.endsWith('s')) {
                                allRelatedWords.add(cleanMw.slice(0, -1));
                            } else {
                                allRelatedWords.add(cleanMw + 's');
                            }
                            getSynonyms(cleanMw).forEach(syn => {
                                allRelatedWords.add(syn);
                                if (syn.endsWith('s')) {
                                    allRelatedWords.add(syn.slice(0, -1));
                                } else {
                                    allRelatedWords.add(syn + 's');
                                }
                            });
                        }
                    });
                    
                    isHighlighted = Array.from(allRelatedWords).some(rw => {
                        if (cleanWord === rw) return true;
                        if (cleanWord === rw + 's' || cleanWord + 's' === rw) return true;
                        if (cleanWord.length <= 3 || rw.length <= 3) return false;
                        if (rw.length >= 4 && cleanWord.length >= 4) {
                            if (cleanWord.includes(rw)) {
                                const index = cleanWord.indexOf(rw);
                                const beforeChar = index > 0 ? cleanWord[index - 1] : ' ';
                                const afterChar = index + rw.length < cleanWord.length ? cleanWord[index + rw.length] : ' ';
                                return /[^a-z]/i.test(beforeChar) && /[^a-z]/i.test(afterChar);
                            }
                            return rw.includes(cleanWord);
                        }
                        return false;
                    });
                    
                    if (isHighlighted) {
                        console.log('English word will be highlighted:', { cleanWord, hoveredMeaning });
                    }
                }
            }
            
            return (
                <span 
                    key={idx} 
                    className={`english-word ${isHighlighted ? 'english-word-highlighted' : ''} clickable`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                        e.stopPropagation();
                        // Find which Arabic word corresponds to this English word
                        meaningsArray.forEach((meaning, index) => {
                            if (meaning && meaning !== '-') {
                                const meaningWords = meaning.toLowerCase().split(/\s+/);
                                const allRelatedWords = new Set();
                                
                                meaningWords.forEach(mw => {
                                    allRelatedWords.add(mw.replace(/[^a-z]/gi, ''));
                                    // Add synonyms
                                    getSynonyms(mw).forEach(syn => allRelatedWords.add(syn));
                                });
                                
                                if (Array.from(allRelatedWords).some(rw => {
                                    // Exact match
                                    if (cleanWord === rw) return true;
                                    // Check if it's a plural/singular form
                                    if (cleanWord === rw + 's' || cleanWord + 's' === rw) return true;
                                    // For very short words, only allow exact matches
                                    if (cleanWord.length <= 3 || rw.length <= 3) {
                                        return false;
                                    }
                                    // Only do substring matching for longer words
                                    if (rw.length >= 4 && cleanWord.length >= 4) {
                                        if (cleanWord.includes(rw)) {
                                            const index = cleanWord.indexOf(rw);
                                            const beforeChar = index > 0 ? cleanWord[index - 1] : ' ';
                                            const afterChar = index + rw.length < cleanWord.length ? cleanWord[index + rw.length] : ' ';
                                            return /[^a-z]/i.test(beforeChar) && /[^a-z]/i.test(afterChar);
                                        }
                                        return rw.includes(cleanWord);
                                    }
                                    return false;
                                })) {
                                    setHoveredEnglishIndex(index);
                                }
                            }
                        });
                    }}
                    onMouseLeave={(e) => {
                        e.stopPropagation();
                        setHoveredEnglishIndex(null);
                    }}
                >
                    {word}{idx < words.length - 1 ? ' ' : ''}
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
        
        // Detect dark mode
        const checkDarkMode = () => {
            setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        };
        
        checkMobile();
        checkDarkMode();
        window.addEventListener('resize', checkMobile);
        
        // Listen for dark mode changes
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeMediaQuery.addEventListener('change', checkDarkMode);
        
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
            darkModeMediaQuery.removeEventListener('change', checkDarkMode);
        };
    }, [isMobile]);

    useEffect(() => {
        // Load all verses data for text search
        const loadAllVerses = async () => {
            try {
                // For iOS/Capacitor apps, we need to use the full URL
                const isCapacitor = window.Capacitor !== undefined;
                let url = '/verses_final.json';
                if (isCapacitor) {
                    // Use the capacitor URL scheme
                    url = window.location.origin + '/verses_final.json';
                }
                
                const response = await fetch(url);
                if (response && response.ok) {
                    const data = await response.json();
                    setAllVersesData(data);
                }
            } catch (err) {
                console.error('Failed to load verses data:', err);
            }
        };
        loadAllVerses();
        
        // Update verseRange from initialRange when it changes
        if (initialRange && initialRange !== verseRange) {
            setVerseRange(initialRange);
            setSearchMode('range');
            // Clear any saved state to ensure fresh search
            sessionStorage.removeItem('verseLookupState');
            // Pass the initialRange directly to fetchVerses
            fetchVerses(initialRange);
        }
    }, [initialRange]);
    
    // Removed auto-search behavior - users must manually search

    // Force re-render when language changes (for display purposes)
    useEffect(() => {
        // This ensures the component re-renders with new language
        // The actual translation change happens in the render function
    }, [currentLanguage]);

    // Save state changes to parent component
    useEffect(() => {
        const currentState = {
            verseRange,
            verses,
            searchMode,
            showArabic,
            exactMatch,
            excludeVerse0
        };
        
        // Emit state change to parent
        const event = new CustomEvent('updateComponentState', {
            detail: { component: 'lookup', state: currentState }
        });
        window.dispatchEvent(event);
    }, [verseRange, verses, searchMode, showArabic, exactMatch, excludeVerse0]);
    
    // Handle scroll event to show/hide scroll-to-top button
    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className={`verse-lookup-container ${isDarkMode ? 'dark-mode' : ''}`}>
            <div className="verse-lookup-header compact">
                <h2>📖 Quran Search</h2>
            </div>

            <form onSubmit={handleSubmit} className="verse-lookup-form">
                <div className="search-hint-inline">
                    Enter verse references (1:1-7, 2:5, 4:89, 60:8-9) or search for text. Use commas for multiple verses
                    {searchMode === 'text' && (
                        <>
                            <label className="toggle-compact inline">
                                <input
                                    type="checkbox"
                                    checked={exactMatch}
                                    onChange={(e) => setExactMatch(e.target.checked)}
                                />
                                <span>Exact</span>
                            </label>
                            <label className="toggle-compact inline" style={{ marginLeft: '10px' }}>
                                <input
                                    type="checkbox"
                                    checked={excludeVerse0}
                                    onChange={(e) => setExcludeVerse0(e.target.checked)}
                                />
                                <span>Exclude verse 0</span>
                            </label>
                        </>
                    )}
                </div>
                <div className="input-group">
                    <input
                        type="text"
                        value={verseRange}
                        onChange={(e) => setVerseRange(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="1:1-7, 4:89, 60:8-9, or search text..."
                        className="verse-input"
                    />
                    <label className="toggle-compact" style={{ marginLeft: '10px', marginRight: '10px' }}>
                        <input
                            type="checkbox"
                            checked={showArabic}
                            onChange={(e) => setShowArabic(e.target.checked)}
                        />
                        <span>Arabic</span>
                    </label>
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
                <div className={error.includes('at least 3 characters') ? 'search-hint' : 'error-message'}>
                    {error.includes('at least 3 characters') ? '💡' : '❌'} {error}
                </div>
            )}

            {loading && (
                <div className="loading">
                    🔄 Loading verses...
                </div>
            )}


            {/* Result count and tap hint header */}
            {verses.length > 0 && (
                <div className="results-header">
                    <span className="result-count">
                        Found {verses.length} verse{verses.length !== 1 ? 's' : ''}
                    </span>
                    {showArabic && verses.some(v => v.arabic && v.roots) && (
                        <span className="tap-hint">
                            💡 Tap Arabic words
                        </span>
                    )}
                </div>
            )}

            <div className="verses-container">
                {verses.map((verse, verseIndex) => {
                    // Get subtitle for current language
                    const currentSubtitle = getSubtitleText(verse, currentLanguage);
                    const previousSubtitle = verseIndex > 0 ? getSubtitleText(verses[verseIndex - 1], currentLanguage) : null;
                    
                    // Check if this is the first verse or if subtitle is different from previous
                    const showSubtitle = currentSubtitle && (
                        verseIndex === 0 || 
                        currentSubtitle !== previousSubtitle
                    );
                    
                    return (
                        <div key={verse.sura_verse}>
                            
                            {/* Display subtitle if this verse has one and it's different from previous */}
                            {showSubtitle && (
                                <div className="subtitle-header">
                                    <h3 className="subtitle-text">{currentSubtitle}</h3>
                                </div>
                            )}
                        
                        <div 
                            className="verse-card"
                            style={{
                                position: 'relative'
                            }}
                        >
                            <div className="verse-header">
                                <span 
                                    className="verse-ref"
                                    onClick={() => handleVerseClick(verse.sura_verse)}
                                    title={`Click to view subtitle section for ${verse.sura_verse}`}
                                >
                                    [{verse.sura_verse}]
                                </span>
                                {/* Minimal audio player */}
                                <div className="verse-audio-player">
                                    <MinimalAudioButton 
                                        verseReference={verse.sura_verse}
                                    />
                                    <button
                                        className="memorize-btn"
                                        onClick={() => {
                                            // Navigate to compare with memorization mode
                                            const event = new CustomEvent('navigateToCompare', {
                                                detail: {
                                                    verses: [verse],
                                                    enableMemorization: true
                                                }
                                            });
                                            window.dispatchEvent(event);
                                        }}
                                        title="Memorize this verse"
                                        style={{
                                            background: 'rgba(76, 175, 80, 0.1)',
                                            border: '1px solid #4caf50',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            marginLeft: '8px',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = '#4caf50';
                                            e.target.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(76, 175, 80, 0.1)';
                                            e.target.style.color = 'inherit';
                                        }}
                                    >
                                        🧠
                                    </button>
                                </div>
                            </div>
                            
                            <div className="verse-content">
                            {verse.arabic && showArabic && (
                                <div className="arabic-text" dir="rtl">
                                    {parseArabicText(verse.arabic, verse.roots, verse.meanings, verse)}
                                </div>
                            )}
                            
                            <div 
                                className="translation-text" 
                                style={{ direction: getLanguageConfig(currentLanguage).direction }}
                                onMouseDown={(e) => handleLongPressStart(verse, e)}
                                onMouseUp={handleLongPressEnd}
                                onMouseLeave={handleLongPressEnd}
                                onTouchStart={(e) => handleLongPressStart(verse, e)}
                                onTouchEnd={handleLongPressEnd}
                                onTouchCancel={handleLongPressEnd}
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                {currentLanguage === 'english' && verse.roots && verse.meanings
                                    ? parseEnglishText(getTranslationText(verse, currentLanguage), verse.roots, verse.meanings, verse)
                                    : getTranslationText(verse, currentLanguage)
                                }
                            </div>
                            
                            {searchMode === 'text' && !verse.arabic && (
                                <div className="search-note">
                                    <small>💡 Use Range Lookup mode to see Arabic text with word meanings</small>
                                </div>
                            )}
                            
                            {getFootnoteText(verse, currentLanguage) && (
                                <div className="footnote" style={{ direction: getLanguageConfig(currentLanguage).direction }}>
                                    <small>{parseFootnoteText(getFootnoteText(verse, currentLanguage), currentLanguage)}</small>
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Copy feedback */}
            {copiedVerse && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: copiedVerse === 'error' ? '#f44336' : '#4caf50',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    zIndex: 1000,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}>
                    {copiedVerse === 'error' ? 
                        '❌ Copy failed - try selecting text manually' : 
                        `📋 Copied [${copiedVerse}] to clipboard`
                    }
                </div>
            )}

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
                <RootAnalysisModal
                    rootAnalysisData={rootAnalysisData}
                    onClose={() => setShowRootAnalysis(false)}
                    onCompare={navigateToCompare}
                    currentLanguage={currentLanguage}
                    getTranslationText={getTranslationText}
                />
            )}
            
            {/* Scroll to top button */}
            {showScrollTop && (
                <button
                    className="scroll-to-top-btn"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    title="Scroll to top"
                >
                    ↑
                </button>
            )}
            
        </div>
    );
};

export default QuranVerseLookup;