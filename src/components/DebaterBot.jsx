import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkPremiumAccess, PREMIUM_FEATURES, hasActiveSubscription, getSubscriptionInfo } from '../config/premium';
import { supabase } from '../utils/supabase';
import AuthModal from './AuthModal';
import SubscriptionModal from './SubscriptionModal';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://qurancompare.onrender.com';

const DebaterBot = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debateMode, setDebateMode] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');
  const [showSubscriptionPrompt, setShowSubscriptionPrompt] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [chatHistoryId, setChatHistoryId] = useState(null);
  const [previousChats, setPreviousChats] = useState([]);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { user, isAuthenticated, hasActiveSubscription: authHasSubscription } = useAuth();
  const messagesEndRef = useRef(null);

  const subscriptionInfo = getSubscriptionInfo();

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
      
      const chatData = {
        user_email: user.email,
        topic: summary,
        messages: JSON.stringify(messages), // Ensure messages are stored as JSON string
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
      
      // Convert timestamp strings back to Date objects
      const messagesWithDates = parsedMessages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      setMessages(messagesWithDates);
      setCurrentTopic(chat.topic);
      setChatHistoryId(chat.id);
      setDebateMode(true);
      setShowChatHistory(false);
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
      const response = await fetch(`${API_BASE_URL}/debate`, {
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

      const data = await response.json();
      
      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
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
      const response = await fetch(`${API_BASE_URL}/debate`, {
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

      const data = await response.json();
      
      const botMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Parse message content and make verse references clickable
  const parseMessageContent = (content) => {
    // Regex to match verse references like "2:255" or "[2:255]"
    const verseRegex = /\[?(\d{1,3}):(\d{1,3})\]?/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = verseRegex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }
      
      // Add the verse reference as a link
      parts.push({
        type: 'verse',
        content: match[0],
        chapter: parseInt(match[1]),
        verse: parseInt(match[2])
      });
      
      lastIndex = match.index + match[0].length;
    }
    
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

  // Quick topic suggestions
  const topicSuggestions = [
    "The existence of God",
    "Free will vs determinism", 
    "The purpose of life",
    "Science and religion",
    "Morality without religion",
    "The afterlife",
    "Evolution vs creation",
    "The problem of evil"
  ];
  
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
                🤖 AI Debater Bot
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
                {authHasSubscription ? <span>✅</span> : <span>🔓</span>}
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
                  onClick={() => loadPreviousChat(chat)}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    backgroundColor: chatHistoryId === chat.id ? '#e3f2fd' : '#f9f9f9',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    border: '1px solid #e0e0e0'
                  }}
                  onMouseEnter={(e) => {
                    if (chatHistoryId !== chat.id) {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (chatHistoryId !== chat.id) {
                      e.currentTarget.style.backgroundColor = '#f9f9f9';
                    }
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '4px' }}>
                    {chat.topic || 'Untitled Chat'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {formatChatDate(chat.updated_at || chat.created_at)}
                  </div>
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

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        marginLeft: (!isMobile && showChatHistory) ? '300px' : '0',
        transition: 'margin-left 0.3s ease'
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

export default DebaterBot;