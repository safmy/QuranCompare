import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { checkPremiumAccess, PREMIUM_FEATURES } from '../config/premium';
import { supabase } from '../utils/supabase';
import AuthModal from './AuthModal';
import SubscriptionModal from './SubscriptionModal';
import VoiceSearchButton from './VoiceSearchButton';
import './EnhancedDebaterBot.css';
import { FaPaperPlane, FaTrash, FaChevronDown, FaChevronUp, FaSearch, FaBook, FaLanguage, FaPlay, FaExternalLinkAlt } from 'react-icons/fa';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

// Dearabization function
const dearabizeText = (text) => {
  if (!text) return text;
  
  // Define replacements
  const replacements = {
    // Primary replacements (case-insensitive)
    'allah': 'God',
    'muslim': 'Submitter',
    'muslims': 'Submitters',
    'islam': 'Submission',
    'islamic': 'Submission',
    'sura': 'Chapter',
    'suras': 'Chapters',
    'surah': 'Chapter',
    'surahs': 'Chapters',
    // Additional related terms
    'muslim\'s': 'Submitter\'s',
    'muslims\'': 'Submitters\'',
    'islamically': 'in Submission',
    'islamic teachings': 'Submission teachings',
    'islamic faith': 'faith of Submission',
    'islamic belief': 'belief in Submission',
    'islamic practice': 'practice of Submission',
    'islamic law': 'law of Submission',
    'islamic tradition': 'tradition of Submission',
    'islamic scripture': 'scripture of Submission',
    'islamic religion': 'religion of Submission',
    'the muslims': 'the Submitters',
    'a muslim': 'a Submitter',
    'as muslims': 'as Submitters',
    'for muslims': 'for Submitters',
    'true muslims': 'true Submitters',
    'devout muslim': 'devout Submitter',
    'devout muslims': 'devout Submitters',
    'practicing muslim': 'practicing Submitter',
    'practicing muslims': 'practicing Submitters'
  };
  
  let result = text;
  
  // Apply replacements (case-insensitive)
  Object.entries(replacements).forEach(([from, to]) => {
    // Create regex for whole word matching
    const regex = new RegExp(`\\b${from}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      // Preserve original case
      if (match[0] === match[0].toUpperCase()) {
        return to[0].toUpperCase() + to.slice(1);
      }
      return to;
    });
  });
  
  return result;
};

const EnhancedDebaterBot = ({ onNavigateToTab, currentTab, currentVerses, recentSearch }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('debaterMessages');
    try {
      if (saved) {
        const parsedMessages = JSON.parse(saved);
        // Ensure timestamps are Date objects
        return parsedMessages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
        }));
      }
      return [];
    } catch {
      return [];
    }
  });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debateMode, setDebateMode] = useState(() => {
    const savedMessages = sessionStorage.getItem('debaterMessages');
    return savedMessages && JSON.parse(savedMessages).length > 0;
  });
  const [currentTopic, setCurrentTopic] = useState(() => {
    return sessionStorage.getItem('debaterTopic') || '';
  });
  const [showAuth, setShowAuth] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [chatHistoryId, setChatHistoryId] = useState(() => {
    return sessionStorage.getItem('debaterChatHistoryId') || null;
  });
  const [previousChats, setPreviousChats] = useState([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isTrainer, setIsTrainer] = useState(false);
  const [showTrainingMode, setShowTrainingMode] = useState(false);
  const [trainingInput, setTrainingInput] = useState('');
  const [selectedMessageForTraining, setSelectedMessageForTraining] = useState(null);
  
  // List of authorized trainers
  const authorizedTrainers = ['syedahmadfahmybinsyedsalim@gmail.com'];
  const [showRelatedContent, setShowRelatedContent] = useState(() => {
    const saved = sessionStorage.getItem('debaterShowRelatedContent');
    return saved !== null ? saved === 'true' : true;
  });
  const [relatedData, setRelatedData] = useState(() => {
    const saved = sessionStorage.getItem('debaterRelatedData');
    try {
      return saved ? JSON.parse(saved) : {
        verses: [],
        searchResults: [],
        rootAnalysis: [],
        suggestedTabs: [],
        citations: []
      };
    } catch {
      return {
        verses: [],
        searchResults: [],
        rootAnalysis: [],
        suggestedTabs: [],
        citations: []
      };
    }
  });
  const [selectedMessageId, setSelectedMessageId] = useState(null); // Track which message's related content to show
  const messagesEndRef = useRef(null);

  // Memoize onChange handler to prevent unnecessary re-renders
  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('debaterMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (currentTopic) {
      sessionStorage.setItem('debaterTopic', currentTopic);
    }
  }, [currentTopic]);

  useEffect(() => {
    if (chatHistoryId) {
      sessionStorage.setItem('debaterChatHistoryId', chatHistoryId);
    }
  }, [chatHistoryId]);

  useEffect(() => {
    if (Object.values(relatedData).some(arr => arr.length > 0)) {
      sessionStorage.setItem('debaterRelatedData', JSON.stringify(relatedData));
    }
  }, [relatedData]);

  useEffect(() => {
    sessionStorage.setItem('debaterShowRelatedContent', showRelatedContent.toString());
  }, [showRelatedContent]);

  // Detect mobile device and dark mode
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark-mode'));
    };
    
    checkMobile();
    checkDarkMode();
    
    window.addEventListener('resize', checkMobile);
    
    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      observer.disconnect();
    };
  }, []);

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check access on component mount and when user changes
  useEffect(() => {
    // Don't check auth if still loading
    if (authLoading) return;
    
    // Don't show modals immediately if auth is still loading
    if (!isAuthenticated && user === null) {
      // User might still be loading, wait a bit longer
      const timer = setTimeout(() => {
        if (!isAuthenticated && !authLoading) {
          setShowAuth(true);
        }
      }, 2000); // Increased timeout to 2 seconds
      return () => clearTimeout(timer);
    }
    
    if (isAuthenticated && user) {
      const hasAccess = checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT);
      if (!hasAccess) {
        setShowSubscription(true);
      } else {
        // User has access, close any open modals
        setShowAuth(false);
        setShowSubscription(false);
        // Load previous chats
        loadChatHistory();
        // Check if user is an authorized trainer
        if (user.email && authorizedTrainers.includes(user.email)) {
          setIsTrainer(true);
        }
      }
    }
  }, [isAuthenticated, user, authLoading]);
  
  // Load previous chat history
  const loadChatHistory = async () => {
    if (!user?.email) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_email', user.email)
        .order('updated_at', { ascending: false })
        .limit(20);
        
      if (!error && data) {
        setPreviousChats(data);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };
  
  // Save chat to history
  const saveChatHistory = async () => {
    if (!user?.email || messages.length === 0) return;
    
    try {
      // Get last message for summary
      const lastMessage = messages[messages.length - 1]?.content || '';
      const summary = currentTopic || lastMessage.substring(0, 100) + (lastMessage.length > 100 ? '...' : '');
      
      // Messages already contain relatedData with each assistant message
      const chatData = {
        user_email: user.email,
        topic: summary,
        messages: JSON.stringify(messages), // Store messages as-is, with embedded relatedData
        is_active: true,
        updated_at: new Date().toISOString()
      };
      
      if (chatHistoryId) {
        // Update existing chat
        const { error } = await supabase
          .from('chat_history')
          .update(chatData)
          .eq('id', chatHistoryId);
          
        if (error) console.error('Error updating chat:', error);
      } else {
        // Create new chat
        const { data, error } = await supabase
          .from('chat_history')
          .insert({
            ...chatData,
            created_at: new Date().toISOString()
          })
          .select();
          
        if (!error && data && data[0]) {
          setChatHistoryId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error saving chat history:', err);
    }
  };
  
  // Save chat history when messages change
  useEffect(() => {
    if (messages.length > 0 && user?.email) {
      const saveTimer = setTimeout(() => {
        saveChatHistory();
      }, 2000); // Save after 2 seconds of no changes
      
      return () => clearTimeout(saveTimer);
    }
  }, [messages]);
  
  // Load a previous chat
  const loadPreviousChat = (chat) => {
    try {
      const parsedMessages = typeof chat.messages === 'string' 
        ? JSON.parse(chat.messages) 
        : chat.messages || [];
      
      // Extract relatedData from the last assistant message
      let extractedRelatedData = {
        verses: [],
        searchResults: [],
        rootAnalysis: [],
        suggestedTabs: [],
        citations: []
      };
      
      // Look for relatedData in the last assistant message
      const lastAssistantMsg = [...parsedMessages].reverse().find(msg => msg.role === 'assistant' && msg.relatedData);
      if (lastAssistantMsg && lastAssistantMsg.relatedData) {
        extractedRelatedData = lastAssistantMsg.relatedData;
      }
      
      // Convert timestamp strings back to Date objects (keep relatedData with messages)
      const messagesWithDates = parsedMessages.map(msg => {
        return {
          ...msg,
          timestamp: new Date(msg.timestamp)
        };
      });
      
      setMessages(messagesWithDates);
      setCurrentTopic(chat.topic);
      setChatHistoryId(chat.id);
      setDebateMode(true);
      setShowChatHistory(false);
      setRelatedData(extractedRelatedData);
    } catch (err) {
      console.error('Error loading chat:', err);
      setError('Failed to load chat history');
    }
  };
  
  // Start new chat
  const startNewChat = () => {
    setMessages([]);
    setCurrentTopic('');
    setChatHistoryId(null);
    setDebateMode(false);
    setShowChatHistory(false);
    setError(null);
    setSelectedMessageId(null);
    setRelatedData({
      verses: [],
      searchResults: [],
      rootAnalysis: [],
      suggestedTabs: [],
      citations: []
    });
    // Clear sessionStorage
    sessionStorage.removeItem('debaterMessages');
    sessionStorage.removeItem('debaterTopic');
    sessionStorage.removeItem('debaterChatHistoryId');
    sessionStorage.removeItem('debaterRelatedData');
  };
  
  // Delete chat function
  const deleteChat = async (chatId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this chat? This action cannot be undone.');
    
    if (!confirmDelete) return;
    
    setDeletingChatId(chatId);
    
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId)
        .eq('user_email', user.email); // Ensure user can only delete their own chats
        
      if (error) {
        console.error('Error deleting chat:', error);
        setError('Failed to delete chat');
        return;
      }
      
      // Remove from local state
      setPreviousChats(prev => prev.filter(chat => chat.id !== chatId));
      
      // If the deleted chat was currently active, reset to new chat
      if (chatHistoryId === chatId) {
        startNewChat();
      }
      
      // Show success message
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 2000);
      
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError('Failed to delete chat');
    } finally {
      setDeletingChatId(null);
    }
  };

  const startDebate = async (topic) => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    
    if (!checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT)) {
      setShowSubscription(true);
      return;
    }

    setCurrentTopic(topic);
    setDebateMode(true);
    setError(null);
    setIsLoading(true);

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: `Let's debate about: ${topic}`,
      timestamp: new Date()
    };

    setMessages([userMessage]);

    try {
      // Try enhanced endpoint first
      let endpoint = '/debate/enhanced';
      let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic,
          isNewTopic: true,
          conversationHistory: [],
          currentTab,
          currentVerses: currentVerses || [],
          searchContext: recentSearch,
          userLanguage: language,
          // Force integration features
          forceRelatedContent: true,
          requestEnhanced: true,
          includeVerses: true,
          includeMedia: true,
          includeRootAnalysis: true,
          // Include critical rules
          criticalRules: [
            "The age of responsibility is 40 years old per verse 46:15.",
            "Those who die before age 40 go to heaven as they haven't reached the age of responsibility.",
            "Reference appendix 32 and audio 47 at minute 46 for details on age of responsibility."
          ]
        })
      });

      if (!response.ok) {
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fallback to regular endpoint
        console.log('Enhanced endpoint failed, trying regular endpoint...');
        endpoint = '/debate';
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: topic,
            isNewTopic: true,
            conversationHistory: []
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to start debate: ${response.status}`);
        }
      }

      const data = await response.json();
      
      // Always log what we received
      console.log(`Debate response from ${endpoint}:`, {
        hasRelatedVerses: !!data.relatedVerses,
        relatedVersesCount: data.relatedVerses?.length || 0,
        hasSearchResults: !!data.searchResults,
        searchResultsCount: data.searchResults?.length || 0,
        hasRootAnalysis: !!data.rootAnalysis,
        rootAnalysisCount: data.rootAnalysis?.length || 0
      });
      
      // Update related data if available
      if (data.relatedVerses || data.searchResults || data.rootAnalysis) {
        console.log('Enhanced debate data received');
        // Log detailed info about RashadAllMedia results
        if (data.searchResults) {
          data.searchResults.forEach((result, index) => {
            if (result.collection === 'RashadAllMedia') {
              console.log(`RashadAllMedia result ${index + 1}:`, {
                title: result.title,
                content: result.content?.substring(0, 100),
                youtube_link: result.youtube_link,
                collection: result.collection
              });
            }
          });
        }
        setRelatedData({
          verses: data.relatedVerses || [],
          searchResults: data.searchResults || [],
          rootAnalysis: data.rootAnalysis || [],
          suggestedTabs: data.suggestedTabs || [],
          citations: data.citations || []
        });
      }
      
      // Prepare related data for this message
      let messageRelatedData = {
        verses: data.relatedVerses || [],
        searchResults: data.searchResults || [],
        rootAnalysis: data.rootAnalysis || [],
        suggestedTabs: data.suggestedTabs || [],
        citations: data.citations || []
      };
      
      // If no related data from API, add a note
      if (endpoint === '/debate' && !data.relatedVerses && !data.searchResults && !data.rootAnalysis) {
        console.warn('Regular debate endpoint used - no integrated features available');
        messageRelatedData.citations = [{
          type: 'note',
          content: 'Enhanced features unavailable. Try asking about specific verses or topics for better integration.'
        }];
      }
      
      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: dearabizeText(data.response),
        timestamp: new Date(),
        // Store related data with this specific message
        relatedData: messageRelatedData
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Error starting debate:', err);
      setError('Failed to start debate. Please try again.');
      // Remove the failed user message
      setMessages([]);
      setDebateMode(false);
      setCurrentTopic('');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    
    if (!checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT)) {
      setShowSubscription(true);
      return;
    }
    
    // If not in debate mode, use startDebate for first message
    if (!debateMode) {
      startDebate(inputText);
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      // Try enhanced endpoint first
      let endpoint = '/debate/enhanced';
      let response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputText,
          topic: currentTopic,
          conversationHistory: messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          currentTab,
          currentVerses: currentVerses || [],
          searchContext: recentSearch,
          userLanguage: language,
          // Force integration features
          forceRelatedContent: true,
          requestEnhanced: true,
          includeVerses: true,
          includeMedia: true,
          includeRootAnalysis: true,
          // Include critical rules
          criticalRules: [
            "The age of responsibility is 40 years old per verse 46:15.",
            "Those who die before age 40 go to heaven as they haven't reached the age of responsibility.",
            "Reference appendix 32 and audio 47 at minute 46 for details on age of responsibility."
          ]
        })
      });

      if (!response.ok) {
        // Enhanced endpoint might be temporarily unavailable
        console.warn(`Enhanced endpoint failed with status ${response.status}, trying regular endpoint...`);
        endpoint = '/debate';
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputText,
            topic: currentTopic,
            conversationHistory: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`);
        }
        
        // Notify user that enhanced features are temporarily unavailable
        console.warn('AI Debater is running with limited features. Verse lookup, media search, and root analysis may not be available for this response.');
      }

      const data = await response.json();
      
      // Always log what we received
      console.log(`Debate response from ${endpoint}:`, {
        hasRelatedVerses: !!data.relatedVerses,
        relatedVersesCount: data.relatedVerses?.length || 0,
        hasSearchResults: !!data.searchResults,
        searchResultsCount: data.searchResults?.length || 0,
        hasRootAnalysis: !!data.rootAnalysis,
        rootAnalysisCount: data.rootAnalysis?.length || 0
      });
      
      // Update related data if available
      if (data.relatedVerses || data.searchResults || data.rootAnalysis) {
        console.log('Enhanced debate data received');
        // Log detailed info about RashadAllMedia results
        if (data.searchResults) {
          data.searchResults.forEach((result, index) => {
            if (result.collection === 'RashadAllMedia') {
              console.log(`RashadAllMedia result ${index + 1}:`, {
                title: result.title,
                content: result.content?.substring(0, 100),
                youtube_link: result.youtube_link,
                collection: result.collection
              });
            }
          });
        }
        setRelatedData({
          verses: data.relatedVerses || [],
          searchResults: data.searchResults || [],
          rootAnalysis: data.rootAnalysis || [],
          suggestedTabs: data.suggestedTabs || [],
          citations: data.citations || []
        });
      }
      
      // Prepare related data for this message
      let messageRelatedData = {
        verses: data.relatedVerses || [],
        searchResults: data.searchResults || [],
        rootAnalysis: data.rootAnalysis || [],
        suggestedTabs: data.suggestedTabs || [],
        citations: data.citations || []
      };
      
      // If no related data from API, add a note
      if (endpoint === '/debate' && !data.relatedVerses && !data.searchResults && !data.rootAnalysis) {
        console.warn('Regular debate endpoint used - no integrated features available');
        messageRelatedData.citations = [{
          type: 'note',
          content: 'Enhanced features unavailable. Try asking about specific verses or topics for better integration.'
        }];
      }
      
      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: dearabizeText(data.response),
        timestamp: new Date(),
        // Store related data with this specific message
        relatedData: messageRelatedData
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetDebate = () => {
    startNewChat();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (date) => {
    // Handle both Date objects and date strings
    const dateObj = date instanceof Date ? date : new Date(date);
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format date for chat history
  const formatChatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Parse message content and make references clickable
  const parseMessageContent = (content) => {
    // Regex to match verse references like "2:255" or "[2:255]"
    const verseRegex = /\[?(\d{1,3}):(\d{1,3})\]?/g;
    
    // NO LONGER AUTO-LINKING RASHAD KHALIFA - removed per user request
    
    const parts = [];
    let processedText = content;
    
    // First, replace verse references
    const verseMatches = [];
    let verseMatch;
    while ((verseMatch = verseRegex.exec(content)) !== null) {
      verseMatches.push({
        start: verseMatch.index,
        end: verseMatch.index + verseMatch[0].length,
        type: 'verse',
        content: verseMatch[0],
        chapter: parseInt(verseMatch[1]),
        verse: parseInt(verseMatch[2])
      });
    }
    
    // Only use verse matches (removed Rashad hyperlinking)
    const allMatches = [...verseMatches].sort((a, b) => a.start - b.start);
    
    let lastIndex = 0;
    allMatches.forEach(match => {
      // Add text before the match
      if (match.start > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.start)
        });
      }
      
      // Add the match
      parts.push(match);
      
      lastIndex = match.end;
    });
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }
    
    return parts.length > 0 ? parts : [{ type: 'text', content }];
  };
  
  const handleVerseClick = (chapter, verse) => {
    // Navigate to verse lookup tab with the selected verse
    const verseRange = `${chapter}:${verse}`;
    
    // Dispatch event for the main app to handle
    window.dispatchEvent(new CustomEvent('openVerseRange', {
      detail: { range: verseRange }
    }));
  };
  
  const handleRashadMediaClick = (searchTerm) => {
    // Dispatch event for the main app to handle
    window.dispatchEvent(new CustomEvent('openSemanticSearch', {
      detail: { 
        query: searchTerm,
        source: 'RashadAllMedia'
      }
    }));
  };

  // Quick topic suggestions
  const topicSuggestions = [
    "The existence of God",
    "Free will vs determinism", 
    "The purpose of life",
    "Science and religion",
    "Morality without religion",
    "The afterlife",
    "Evolution vs creation",
    "The problem of evil",
    "Is Rashad Khalifa a messenger?",
    "Explain the mathematical miracle",
    "What is Submission?",
    "Are hadiths authorized?"
  ];
  
  // Submit training correction
  const submitTrainingCorrection = async () => {
    if (!trainingInput.trim() || !selectedMessageForTraining) return;
    
    try {
      // Send correction to backend
      const response = await fetch(`${API_BASE_URL}/debate/training`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId: selectedMessageForTraining,
          correction: trainingInput,
          userEmail: user.email,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        // Clear training input and close modal
        setTrainingInput('');
        setSelectedMessageForTraining(null);
        setShowTrainingMode(false);
        // Show success message
        setError('Training correction submitted successfully!');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error submitting training correction:', err);
      setError('Failed to submit training correction');
    }
  };

  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {showAuth && (
          <AuthModal 
            onClose={() => setShowAuth(false)}
            onSuccess={() => {
              setShowAuth(false);
              // User will be redirected after OAuth or receive email link
            }}
          />
        )}
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{ textAlign: 'center', color: '#666' }}>
            <h2>Please sign in to access the AI Debater Bot</h2>
            <p>Premium subscription required for unlimited debates.</p>
            <button
              onClick={() => setShowAuth(true)}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Sign In / Sign Up
            </button>
          </div>
        </div>
      </>
    );
  }

  // Show subscription modal if authenticated but no premium access
  if (showSubscription && !checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT)) {
    return (
      <>
        <SubscriptionModal
          user={user}
          onClose={() => setShowSubscription(false)}
          onSuccess={() => {
            setShowSubscription(false);
            // Refresh the page or update state after successful subscription
          }}
        />
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{ textAlign: 'center', color: '#666' }}>
            <h2>Premium Subscription Required</h2>
            <p>The AI Debater Bot requires a premium subscription.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1976d2',
        color: 'white',
        padding: isMobile ? '10px 15px' : '15px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              style={{
                padding: '8px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px'
              }}
              title="Chat History"
            >
              ☰
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '18px' : '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🤖 AI Debater Bot Enhanced
                {!showRelatedContent && messages.some(m => m.role === 'assistant' && m.relatedData && 
                  (m.relatedData.verses?.length > 0 || m.relatedData.searchResults?.length > 0 || m.relatedData.rootAnalysis?.length > 0)) && (
                  <span style={{
                    marginLeft: '10px',
                    fontSize: '14px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 'normal'
                  }}>
                    📚 {messages.reduce((total, m) => {
                      if (m.role === 'assistant' && m.relatedData) {
                        return total + (m.relatedData.verses?.length || 0) + 
                               (m.relatedData.searchResults?.length || 0) + 
                               (m.relatedData.rootAnalysis?.length || 0);
                      }
                      return total;
                    }, 0)} items
                  </span>
                )}
                <span style={{
                  marginLeft: '10px',
                  fontSize: '12px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontWeight: 'normal'
                }} title="Integrated with Quran verses, Rashad Khalifa media, and Arabic root analysis">
                  ✨ Integrated
                </span>
              </h1>
              {currentTopic && (
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentTopic}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button
              onClick={startNewChat}
              style={{
                padding: isMobile ? '6px 10px' : '8px 16px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: isMobile ? '12px' : '14px',
                whiteSpace: 'nowrap'
              }}
              title="Start New Chat"
            >
              {isMobile ? '➕' : '➕ New'}
            </button>
            {!isMobile && user?.email && (
              <div style={{
                fontSize: '12px',
                padding: '8px 12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span>👤 {user.email.split('@')[0]}</span>
                {checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT) ? <span>✅</span> : <span>🔓</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat History Sidebar */}
      {showChatHistory && (
        <div style={{
          position: 'absolute',
          top: isMobile ? '50px' : '70px',
          left: 0,
          width: isMobile ? '100%' : '300px',
          height: `calc(100% - ${isMobile ? '50px' : '70px'})`,
          backgroundColor: 'white',
          boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e0e0e0'
        }}>
          <div style={{
            padding: '15px',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#f5f5f5'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>Chat History</h3>
            {deleteSuccess && (
              <div style={{
                marginTop: '8px',
                padding: '6px 10px',
                backgroundColor: '#4caf50',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px',
                textAlign: 'center'
              }}>
                Chat deleted successfully
              </div>
            )}
          </div>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px'
          }}>
            {previousChats.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginTop: '20px' }}>
                No previous chats
              </p>
            ) : (
              previousChats.map((chat) => (
                <div
                  key={chat.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: chatHistoryId === chat.id ? '#e3f2fd' : '#f9f9f9',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    border: '1px solid #e0e0e0',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    setHoveredChatId(chat.id);
                    if (chatHistoryId !== chat.id) {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    setHoveredChatId(null);
                    if (chatHistoryId !== chat.id) {
                      e.currentTarget.style.backgroundColor = '#f9f9f9';
                    }
                  }}
                >
                  <div
                    onClick={() => loadPreviousChat(chat)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '4px', paddingRight: '30px' }}>
                      {chat.topic || 'Untitled Chat'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {formatChatDate(chat.updated_at || chat.created_at)}
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    disabled={deletingChatId === chat.id}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      padding: '4px 8px',
                      backgroundColor: deletingChatId === chat.id ? '#ccc' : '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: deletingChatId === chat.id ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: (isMobile || hoveredChatId === chat.id) ? 1 : 0,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '24px',
                      height: '24px',
                      boxShadow: (isMobile || hoveredChatId === chat.id) ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!deletingChatId) {
                        e.currentTarget.style.backgroundColor = '#ff6666';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!deletingChatId) {
                        e.currentTarget.style.backgroundColor = '#ff4444';
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                    title="Delete chat"
                  >
                    {deletingChatId === chat.id ? '...' : '🗑️'}
                  </button>
                </div>
              ))
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setShowChatHistory(false)}
              style={{
                padding: '12px',
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderTop: '1px solid #e0e0e0',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#666'
              }}
            >
              Close
            </button>
          )}
        </div>
      )}

      {/* Main Content with flex layout */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        marginLeft: (!isMobile && showChatHistory) ? '300px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
        {/* Main Chat Area */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden'
        }}>
          {!debateMode ? (
            /* Topic Selection */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: isMobile ? '20px' : '40px',
              backgroundColor: 'white'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#333', fontSize: isMobile ? '20px' : '24px', textAlign: 'center' }}>
                Start a New Debate
              </h2>
              
              <p style={{ marginBottom: '20px', color: '#666', textAlign: 'center', maxWidth: '600px' }}>
                I can help you explore Islamic topics with integrated verse lookup, media search, and root analysis.
                I have access to all Quran translations, Rashad Khalifa's videos, articles, and newsletters.
                <br />
                <strong style={{ color: '#4caf50' }}>✨ Every response includes related verses, media, and root analysis automatically!</strong>
              </p>
              
              {/* Custom Topic Input - Always visible on mobile */}
              <div style={{ 
                width: '100%', 
                maxWidth: isMobile ? '100%' : '500px',
                marginBottom: '30px'
              }}>
                <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
                  <input
                    type="text"
                    placeholder="Enter your debate topic..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && inputText.trim() && startDebate(inputText.trim())}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      backgroundColor: '#f9f9f9'
                    }}
                  />
                  <button
                    onClick={() => inputText.trim() && startDebate(inputText.trim())}
                    disabled={!inputText.trim()}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '16px',
                      fontWeight: '500',
                      opacity: inputText.trim() ? 1 : 0.5,
                      minWidth: isMobile ? '100%' : 'auto'
                    }}
                  >
                    Start Debate
                  </button>
                </div>
              </div>

              {/* Suggested Topics - Collapsible on mobile */}
              <div style={{ width: '100%', maxWidth: '800px' }}>
                <button
                  onClick={() => setShowTopicInput(!showTopicInput)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#f5f5f5',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#666',
                    display: isMobile ? 'flex' : 'none',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px'
                  }}
                >
                  <span>Suggested Topics</span>
                  <span>{showTopicInput ? '▼' : '▶'}</span>
                </button>
                
                {(!isMobile || showTopicInput) && (
                  <>
                    {!isMobile && (
                      <p style={{ marginBottom: '15px', color: '#666', textAlign: 'center' }}>
                        Or choose from these suggested topics:
                      </p>
                    )}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: isMobile ? '8px' : '12px',
                      width: '100%'
                    }}>
                      {topicSuggestions.map((topic, index) => (
                        <button
                          key={index}
                          onClick={() => startDebate(topic)}
                          style={{
                            padding: isMobile ? '12px' : '15px',
                            backgroundColor: 'white',
                            border: '2px solid #e0e0e0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: isMobile ? '14px' : '15px',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.borderColor = '#2196F3';
                            e.target.style.backgroundColor = '#f0f8ff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.borderColor = '#e0e0e0';
                            e.target.style.backgroundColor = 'white';
                          }}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Chat Interface */
            <>
              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                backgroundColor: 'white'
              }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      marginBottom: '20px',
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '18px',
                      backgroundColor: message.role === 'user' ? '#2196F3' : (isDarkMode ? '#2d2d2d' : '#f0f0f0'),
                      color: message.role === 'user' ? 'white' : (isDarkMode ? '#e0e0e0' : '#333'),
                      position: 'relative'
                    }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                        {message.role === 'assistant' ? (
                          // Format assistant messages with paragraphs
                          message.content.split(/\n\n|\n/).filter(p => p.trim()).map((paragraph, pIndex, paragraphs) => (
                            <div key={pIndex} style={{ 
                              marginBottom: pIndex < paragraphs.length - 1 ? '12px' : '0',
                              textAlign: 'left'
                            }}>
                              {parseMessageContent(paragraph).map((part, index) => {
                                if (part.type === 'verse') {
                                  return (
                                    <span
                                      key={index}
                                      style={{
                                        color: '#1976d2',
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                      }}
                                      onClick={() => handleVerseClick(part.chapter, part.verse)}
                                      title={`Click to view verse ${part.chapter}:${part.verse}`}
                                    >
                                      {part.content}
                                    </span>
                                  );
                                }
                                return <span key={index}>{part.content}</span>;
                              })}
                            </div>
                          ))
                        ) : (
                          // User messages remain as single block
                          parseMessageContent(message.content).map((part, index) => {
                            if (part.type === 'verse') {
                              return (
                                <span
                                  key={index}
                                  style={{
                                    color: '#bbdefb',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                  onClick={() => handleVerseClick(part.chapter, part.verse)}
                                  title={`Click to view verse ${part.chapter}:${part.verse}`}
                                >
                                  {part.content}
                                </span>
                              );
                            }
                            return <span key={index}>{part.content}</span>;
                          })
                        )}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        marginTop: '5px',
                        opacity: 0.7,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {message.role === 'assistant' && message.relatedData && 
                         (message.relatedData.verses?.length > 0 || 
                          message.relatedData.searchResults?.length > 0 || 
                          message.relatedData.rootAnalysis?.length > 0) && (
                          <button
                            onClick={() => {
                              setSelectedMessageId(message.id);
                              setShowRelatedContent(true);
                            }}
                            style={{
                              background: selectedMessageId === message.id ? '#1976d2' : 'transparent',
                              color: selectedMessageId === message.id ? 'white' : '#1976d2',
                              border: '1px solid #1976d2',
                              borderRadius: '12px',
                              padding: '2px 8px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="View related content for this response"
                          >
                            📚 {(message.relatedData.verses?.length || 0) + 
                                (message.relatedData.searchResults?.length || 0) + 
                                (message.relatedData.rootAnalysis?.length || 0)}
                          </button>
                        )}
                        {message.role === 'assistant' && isTrainer && (
                          <button
                            onClick={() => {
                              setSelectedMessageForTraining(message.id);
                              setShowTrainingMode(true);
                            }}
                            style={{
                              background: '#ff9800',
                              color: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              padding: '2px 8px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              marginLeft: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="Train/Correct this response"
                          >
                            🎓 Train
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '18px',
                      backgroundColor: '#f0f0f0',
                      color: '#666'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '14px' }}>
                          AI is thinking...
                          <br />
                          <span style={{ fontSize: '12px', color: '#888' }}>
                            ✨ Searching for related verses, media, and roots...
                          </span>
                        </div>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ddd',
                          borderTop: '2px solid #666',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: isMobile ? '12px' : '20px',
                backgroundColor: 'white',
                borderTop: '1px solid #e0e0e0'
              }}>
                {error && (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#ffebee',
                    color: '#d32f2f',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    fontSize: '13px'
                  }}>
                    {error}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <textarea
                    placeholder="Type your response..."
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: isMobile ? '10px' : '12px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: isMobile ? '16px' : '14px',
                      resize: 'none',
                      minHeight: '44px',
                      maxHeight: '120px',
                      lineHeight: '1.4',
                      backgroundColor: '#f9f9f9'
                    }}
                    rows={1}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || isLoading}
                    style={{
                      padding: isMobile ? '10px 16px' : '12px 20px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (!inputText.trim() || isLoading) ? 'not-allowed' : 'pointer',
                      fontSize: isMobile ? '16px' : '14px',
                      fontWeight: '500',
                      opacity: (!inputText.trim() || isLoading) ? 0.5 : 1,
                      minWidth: isMobile ? '70px' : '80px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {isLoading ? '•••' : 'Send'}
                  </button>
                </div>
                
                {!isMobile && (
                  <div style={{
                    fontSize: '12px',
                    color: '#666',
                    marginTop: '8px',
                    textAlign: 'center'
                  }}>
                    Press Enter to send, Shift+Enter for new line
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Related Content Panel - Only visible in debate mode and not on mobile */}
        {debateMode && !isMobile && (() => {
          // Get related data from selected message or use the latest
          let displayRelatedData = relatedData;
          if (selectedMessageId) {
            const selectedMessage = messages.find(m => m.id === selectedMessageId);
            if (selectedMessage?.relatedData) {
              displayRelatedData = selectedMessage.relatedData;
            }
          } else {
            // Find the latest assistant message with related data
            const latestAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.relatedData);
            if (latestAssistantMsg?.relatedData) {
              displayRelatedData = latestAssistantMsg.relatedData;
            }
          }
          
          // Always show the panel in debate mode to emphasize the integrated nature
          const hasRelatedContent = (displayRelatedData.verses?.length > 0 || 
                                   displayRelatedData.searchResults?.length > 0 || 
                                   displayRelatedData.rootAnalysis?.length > 0);
          
          return true && (
          <>
            {/* Toggle button when collapsed */}
            {!showRelatedContent && (
              <button
                onClick={() => setShowRelatedContent(true)}
                style={{
                  position: 'fixed',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
                  zIndex: 1000,
                  animation: 'pulse 2s infinite',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-50%) translateX(-5px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(33, 150, 243, 0.6)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(-50%)';
                  e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
                }}
                title="Show Related Content"
              >
                📚 Related Content ({
                  (displayRelatedData.verses?.length || 0) + 
                  (displayRelatedData.searchResults?.length || 0) + 
                  (displayRelatedData.rootAnalysis?.length || 0)
                })
              </button>
            )}
        {showRelatedContent && (
          <div style={{
            width: '350px',
            backgroundColor: '#f9f9f9',
            borderLeft: '1px solid #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '15px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>Related Content</h3>
              <button
                onClick={() => setShowRelatedContent(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '15px'
            }}>
              {/* Show message if no content */}
              {!hasRelatedContent && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  <p style={{ fontSize: '14px', marginBottom: '15px' }}>
                    🔍 No related content found for this response
                  </p>
                  <div style={{
                    backgroundColor: '#f5f5f5',
                    padding: '15px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    textAlign: 'left'
                  }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                      The AI Debater should normally provide:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>Related Quran verses with context</li>
                      <li>Relevant media from Rashad Khalifa's talks</li>
                      <li>Arabic root word analysis</li>
                      <li>Related articles and newsletters</li>
                    </ul>
                    <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
                      Try asking about specific verses, topics, or concepts for better integration.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Related Verses */}
              {displayRelatedData.verses.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
                    <FaBook style={{ marginRight: '5px' }} />
                    Related Verses
                  </h4>
                  {displayRelatedData.verses.map((verse, index) => (
                    <div key={index} style={{
                      padding: '10px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <button
                        onClick={() => handleVerseClick(verse.sura_verse.split(':')[0], verse.sura_verse.split(':')[1])}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1976d2',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          padding: 0,
                          marginBottom: '5px'
                        }}
                      >
                        [{verse.sura_verse}]
                      </button>
                      <p style={{ margin: '5px 0', fontSize: '13px', color: '#333' }}>{verse.english}</p>
                      {verse.arabic && <p style={{ margin: '5px 0', fontSize: '13px', color: '#666', textAlign: 'right' }}>{verse.arabic}</p>}
                      {verse.footnote && <p style={{ margin: '5px 0', fontSize: '11px', color: '#888', fontStyle: 'italic' }}>Note: {verse.footnote}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Root Analysis */}
              {displayRelatedData.rootAnalysis.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
                    <FaLanguage style={{ marginRight: '5px' }} />
                    Root Analysis
                  </h4>
                  {displayRelatedData.rootAnalysis.map((root, index) => (
                    <div key={index} style={{
                      padding: '8px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      border: '1px solid #e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('openRootSearch', {
                            detail: { query: root.root, mode: 'root' }
                          }));
                        }}
                        style={{
                          background: '#e3f2fd',
                          border: 'none',
                          color: '#1976d2',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}
                      >
                        {root.root}
                      </button>
                      <span style={{ fontSize: '12px', color: '#666' }}>{root.meaning}</span>
                      <span style={{ fontSize: '11px', color: '#999', marginLeft: 'auto' }}>({root.frequency} verses)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Search Results */}
              {displayRelatedData.searchResults.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
                    <FaSearch style={{ marginRight: '5px' }} />
                    Relevant Media & Articles
                  </h4>
                  {displayRelatedData.searchResults.map((result, index) => (
                    <div key={index} style={{
                      padding: '10px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <div>
                        <button
                          onClick={() => {
                            // Extract a meaningful search query from the content
                            let searchQuery = '';
                            
                            if (result.collection === 'RashadAllMedia') {
                              // For Rashad media, always use part of the transcript content
                              // Keep timestamps as they're crucial for finding exact content
                              searchQuery = result.content
                                .substring(0, 200)  // Take more content to ensure complete sentences with timestamps
                                .replace(/\s+/g, ' ')
                                .trim();
                            } else {
                              // For other content, use title or content excerpt
                              searchQuery = result.title || result.content.substring(0, 50);
                            }
                            
                            // Dispatch to semantic search with the appropriate source
                            window.dispatchEvent(new CustomEvent('openSemanticSearch', {
                              detail: { 
                                query: searchQuery,
                                source: result.collection || 'RashadAllMedia'
                              }
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#1976d2',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            padding: '8px 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            textAlign: 'left',
                            width: '100%'
                          }}
                          title="Click to search in Semantic Search"
                        >
                          <span style={{ flex: 1 }}>
                            {(() => {
                              let displayTitle = result.title;
                              
                              // Debug log for RashadAllMedia items
                              if (result.collection === 'RashadAllMedia') {
                                console.log('RashadAllMedia result:', {
                                  title: result.title,
                                  content: result.content?.substring(0, 100),
                                  collection: result.collection,
                                  youtube_link: result.youtube_link
                                });
                              }
                              
                              // Simply display the title as-is - the backend has already done the mapping
                              return displayTitle || 'Untitled';
                            })()}
                          </span>
                          <FaSearch style={{ fontSize: '12px', color: '#666' }} />
                        </button>
                        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                          {result.content.substring(0, 150)}...
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          {result.collection && (
                            <p style={{ margin: '5px 0', fontSize: '11px', color: '#999' }}>
                              Source: {result.collection}
                            </p>
                          )}
                          {result.youtube_link && !result.youtube_link.includes('search_query') && (
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#ff0000',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FaPlay style={{ fontSize: '10px' }} />
                              YouTube Video Available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
          </>
        )})()}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
          50% {
            opacity: 0.9;
            transform: translateY(-50%) scale(1.05);
          }
        }
      `}</style>

      {/* Auth Modal */}
      {showAuth && (
        <AuthModal 
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            // Check if user now has subscription
            const hasAccess = checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT);
            if (!hasAccess) {
              setShowSubscription(true);
            }
          }}
        />
      )}

      {/* Subscription Modal */}
      {showSubscription && user && (
        <SubscriptionModal
          user={user}
          onClose={() => setShowSubscription(false)}
          onSuccess={() => {
            setShowSubscription(false);
            // Refresh auth context to get updated subscription status
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default EnhancedDebaterBot;