import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const { user, isAuthenticated } = useAuth();
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
  const [showRelatedContent, setShowRelatedContent] = useState(true);
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
  const messagesEndRef = useRef(null);

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

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    // Don't show modals immediately if auth is still loading
    if (!isAuthenticated && user === null) {
      // User might still be loading, wait a bit
      const timer = setTimeout(() => {
        if (!isAuthenticated) {
          setShowAuth(true);
        }
      }, 1000);
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
      }
    }
  }, [isAuthenticated, user]);
  
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
      
      // Create an enhanced messages array that includes related data
      const enhancedMessages = messages.map((msg, index) => {
        if (msg.role === 'assistant' && index === messages.length - 1) {
          // Attach relatedData to the last assistant message
          return { ...msg, relatedData };
        }
        return msg;
      });
      
      const chatData = {
        user_email: user.email,
        topic: summary,
        messages: JSON.stringify(enhancedMessages), // Store with related data
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
      
      // Extract relatedData from messages if present
      let extractedRelatedData = {
        verses: [],
        searchResults: [],
        rootAnalysis: [],
        suggestedTabs: [],
        citations: []
      };
      
      // Look for relatedData in assistant messages
      const lastAssistantMsg = [...parsedMessages].reverse().find(msg => msg.role === 'assistant' && msg.relatedData);
      if (lastAssistantMsg && lastAssistantMsg.relatedData) {
        extractedRelatedData = lastAssistantMsg.relatedData;
      }
      
      // Convert timestamp strings back to Date objects and clean messages
      const messagesWithDates = parsedMessages.map(msg => {
        const cleanMsg = { ...msg };
        delete cleanMsg.relatedData; // Remove relatedData from individual messages
        return {
          ...cleanMsg,
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
          userLanguage: language
        })
      });

      if (!response.ok) {
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
      
      // Update related data if available
      if (endpoint === '/debate/enhanced' && data.relatedVerses) {
        setRelatedData({
          verses: data.relatedVerses || [],
          searchResults: data.searchResults || [],
          rootAnalysis: data.rootAnalysis || [],
          suggestedTabs: data.suggestedTabs || [],
          citations: data.citations || []
        });
      }
      
      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: dearabizeText(data.response),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Error starting debate:', err);
      setError('Failed to start debate. Please try again.');
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
          userLanguage: language
        })
      });

      if (!response.ok) {
        // Fallback to regular endpoint
        console.log('Enhanced endpoint failed, trying regular endpoint...');
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
      }

      const data = await response.json();
      
      // Update related data if available
      if (endpoint === '/debate/enhanced' && data.relatedVerses) {
        setRelatedData({
          verses: data.relatedVerses || [],
          searchResults: data.searchResults || [],
          rootAnalysis: data.rootAnalysis || [],
          suggestedTabs: data.suggestedTabs || [],
          citations: data.citations || []
        });
      }
      
      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: dearabizeText(data.response),
        timestamp: new Date()
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
    
    // Regex to match Rashad-related terms
    const rashadTerms = /\b(Rashad Khalifa|Dr\. Rashad|Dr Rashad|Rashad's|messenger of the covenant|God's messenger|the messenger|final testament|mathematical miracle|code 19|miracle 19)\b/gi;
    
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
    
    // Then, find Rashad-related terms (only in non-verse parts)
    const rashadMatches = [];
    let rashadMatch;
    while ((rashadMatch = rashadTerms.exec(content)) !== null) {
      // Check if this overlaps with any verse reference
      const overlapsVerse = verseMatches.some(vm => 
        (rashadMatch.index >= vm.start && rashadMatch.index < vm.end) ||
        (rashadMatch.index + rashadMatch[0].length > vm.start && rashadMatch.index + rashadMatch[0].length <= vm.end)
      );
      
      if (!overlapsVerse) {
        rashadMatches.push({
          start: rashadMatch.index,
          end: rashadMatch.index + rashadMatch[0].length,
          type: 'rashad',
          content: rashadMatch[0]
        });
      }
    }
    
    // Combine and sort all matches
    const allMatches = [...verseMatches, ...rashadMatches].sort((a, b) => a.start - b.start);
    
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
                      justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '18px',
                      backgroundColor: message.role === 'user' ? '#2196F3' : '#f0f0f0',
                      color: message.role === 'user' ? 'white' : '#333'
                    }}>
                      <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                        {parseMessageContent(message.content).map((part, index) => {
                          if (part.type === 'verse') {
                            return (
                              <span
                                key={index}
                                style={{
                                  color: message.role === 'user' ? '#bbdefb' : '#1976d2',
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
                          } else if (part.type === 'rashad') {
                            return (
                              <span
                                key={index}
                                style={{
                                  color: message.role === 'user' ? '#ffeb3b' : '#ff9800',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                                onClick={() => {
                                  const searchTerm = part.content.toLowerCase().includes('code 19') || part.content.toLowerCase().includes('miracle 19') 
                                    ? 'mathematical miracle code 19' 
                                    : part.content;
                                  handleRashadMediaClick(searchTerm);
                                }}
                                title={`Click to search for "${part.content}" in Rashad Khalifa Media`}
                              >
                                {part.content} 🔗
                              </span>
                            );
                          }
                          return <span key={index}>{part.content}</span>;
                        })}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        marginTop: '5px',
                        opacity: 0.7
                      }}>
                        {formatTimestamp(message.timestamp)}
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
                        <div style={{ fontSize: '14px' }}>AI is thinking...</div>
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
                    onChange={(e) => setInputText(e.target.value)}
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
        {debateMode && !isMobile && (relatedData.verses.length > 0 || relatedData.searchResults.length > 0 || relatedData.rootAnalysis.length > 0) && (
          <>
            {/* Toggle button when collapsed */}
            {!showRelatedContent && (
              <button
                onClick={() => setShowRelatedContent(true)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px 0 0 4px',
                  padding: '10px 5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
                  zIndex: 10
                }}
                title="Show Related Content"
              >
                Related Content
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
              {/* Related Verses */}
              {relatedData.verses.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
                    <FaBook style={{ marginRight: '5px' }} />
                    Related Verses
                  </h4>
                  {relatedData.verses.map((verse, index) => (
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
              {relatedData.rootAnalysis.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
                    <FaLanguage style={{ marginRight: '5px' }} />
                    Root Analysis
                  </h4>
                  {relatedData.rootAnalysis.map((root, index) => (
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
              {relatedData.searchResults.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
                    <FaSearch style={{ marginRight: '5px' }} />
                    Relevant Media & Articles
                  </h4>
                  {relatedData.searchResults.map((result, index) => (
                    <div key={index} style={{
                      padding: '10px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <button
                        onClick={() => {
                          if (result.collection === 'RashadAllMedia' && result.youtube_link) {
                            window.open(result.youtube_link, '_blank');
                          } else if (result.source_url) {
                            window.open(result.source_url, '_blank');
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1976d2',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          padding: 0,
                          marginBottom: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {result.title}
                        {result.youtube_link && <FaPlay style={{ fontSize: '10px' }} />}
                        {result.source_url && <FaExternalLinkAlt style={{ fontSize: '10px' }} />}
                      </button>
                      <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                        {result.content.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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