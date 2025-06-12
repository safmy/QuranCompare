import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AuthModal from './AuthModal';
import SubscriptionModal from './SubscriptionModal';
import VoiceSearchButton from './VoiceSearchButton';
import './EnhancedDebaterBot.css';
import { FaPaperPlane, FaTrash, FaChevronDown, FaChevronUp, FaSearch, FaBook, FaLanguage, FaPlay, FaExternalLinkAlt } from 'react-icons/fa';
import { supabase } from '../utils/supabase';
import { checkPremiumStatus } from '../utils/subscriptionManager';

// Import API URL from config
const API_URL = process.env.REACT_APP_API_URL || 'https://qurancompare-api.onrender.com';

const EnhancedDebaterBot = ({ onNavigateToTab, currentTab, currentVerses, recentSearch }) => {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState(() => {
    const saved = sessionStorage.getItem('debaterConversation');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error parsing saved conversation:', error);
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [savedConversations, setSavedConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(() => {
    return sessionStorage.getItem('debaterConversationId') || null;
  });
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
    } catch (error) {
      console.error('Error parsing saved related data:', error);
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
  const conversationRef = useRef(conversation);

  // Update conversation ref and save to session when conversation changes
  useEffect(() => {
    conversationRef.current = conversation;
    if (conversation.length > 0) {
      sessionStorage.setItem('debaterConversation', JSON.stringify(conversation));
    }
  }, [conversation]);
  
  // Save related data when it changes
  useEffect(() => {
    if (Object.values(relatedData).some(arr => arr.length > 0)) {
      sessionStorage.setItem('debaterRelatedData', JSON.stringify(relatedData));
    }
  }, [relatedData]);
  
  // Save conversation ID when it changes
  useEffect(() => {
    if (currentConversationId) {
      sessionStorage.setItem('debaterConversationId', currentConversationId);
    }
  }, [currentConversationId]);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        console.log('Enhanced Debater - User data:', {
          email: user.email,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionExpiry: user.subscriptionExpiry
        });
        
        // Check if user has active subscription from AuthContext
        const hasActiveSubscription = user?.subscriptionStatus === 'active' && 
                                      user?.subscriptionExpiry && 
                                      new Date(user.subscriptionExpiry) > new Date();
        
        console.log('Enhanced Debater - Premium status:', hasActiveSubscription);
        setIsPremium(hasActiveSubscription);
      } else {
        console.log('Enhanced Debater - No user logged in');
        setIsPremium(false);
      }
    };

    checkSubscription();
  }, [user]);

  // Load saved conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('debate_conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setSavedConversations(data || []);
        } catch (error) {
          console.error('Error loading conversations:', error);
        }
      }
    };

    loadConversations();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Enhanced content parser with HTML support and clickable links
  const parseAndLinkReferences = (text) => {
    // First, handle verse references
    let processedText = text.replace(/\[(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\]/g, (match, chapter, startVerse, endVerse) => {
      const verseRef = endVerse ? `${chapter}:${startVerse}-${endVerse}` : `${chapter}:${startVerse}`;
      return `<verse-ref data-ref="${verseRef}">[${verseRef}]</verse-ref>`;
    });

    // Then handle Rashad media links
    processedText = processedText.replace(/(Rashad Khalifa|Rashad's)/gi, (match) => {
      return `<rashad-link>${match}</rashad-link>`;
    });

    // Parse HTML safely
    const createMarkup = () => {
      return { __html: processedText };
    };

    return (
      <div 
        className="message-parsed-content"
        dangerouslySetInnerHTML={createMarkup()}
        onClick={(e) => {
          // Handle clicks on verse references
          if (e.target.tagName === 'VERSE-REF') {
            const ref = e.target.getAttribute('data-ref');
            handleVerseClick(ref);
          }
          // Handle clicks on Rashad links
          else if (e.target.tagName === 'RASHAD-LINK') {
            onNavigateToTab('semanticSearch', { 
              query: 'Rashad Khalifa',
              source: 'RashadAllMedia'
            });
          }
        }}
      />
    );
  };

  // Handle verse click navigation
  const handleVerseClick = (verseRef) => {
    // Save current conversation state before navigating
    sessionStorage.setItem('debaterConversation', JSON.stringify(conversation));
    sessionStorage.setItem('debaterConversationId', currentConversationId || '');
    sessionStorage.setItem('debaterRelatedData', JSON.stringify(relatedData));
    
    // Dispatch event to open verse in lookup tab
    window.dispatchEvent(new CustomEvent('openVerseRange', {
      detail: { range: verseRef }
    }));
  };

  // Handle root word click
  const handleRootClick = (root) => {
    onNavigateToTab('rootSearch', {
      query: root,
      searchType: 'root'
    });
  };

  // Handle search result click
  const handleSearchResultClick = (result) => {
    if (result.collection === 'RashadAllMedia' && result.youtube_link) {
      window.open(result.youtube_link, '_blank');
    } else if (result.source_url) {
      window.open(result.source_url, '_blank');
    } else {
      onNavigateToTab('semanticSearch', {
        query: result.title,
        source: result.collection
      });
    }
  };

  // Enhanced debate function with context
  const sendMessage = async (isNewTopic = false, topic = null) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!isPremium) {
      setShowSubscriptionModal(true);
      return;
    }

    const messageToSend = topic || message.trim();
    if (!messageToSend) return;

    setIsLoading(true);
    const userMessage = { role: 'user', content: messageToSend, timestamp: new Date().toISOString() };
    setConversation(prev => [...prev, userMessage]);

    if (!topic) {
      setMessage('');
    }

    try {
      // First try enhanced endpoint, fallback to regular if it fails
      let endpoint = '/debate/enhanced';
      let response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: isNewTopic ? null : messageToSend,
          topic: isNewTopic ? messageToSend : null,
          isNewTopic,
          conversationHistory: conversationRef.current.slice(-10), // Last 10 messages for context
          currentTab,
          currentVerses: currentVerses || [],
          searchContext: recentSearch,
          userLanguage: language
        }),
      });

      if (!response.ok) {
        // If enhanced endpoint fails, try regular endpoint
        if (endpoint === '/debate/enhanced') {
          console.log('Enhanced endpoint failed, trying regular endpoint...');
          endpoint = '/debate';
          response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: isNewTopic ? null : messageToSend,
              topic: isNewTopic ? messageToSend : null,
              isNewTopic,
              conversationHistory: conversationRef.current.slice(-10)
            }),
          });
          
          if (!response.ok) {
            throw new Error('Both endpoints failed');
          }
        } else {
          throw new Error('Failed to get response');
        }
      }

      const data = await response.json();
      
      // Update related data (enhanced endpoint provides more data)
      if (endpoint === '/debate/enhanced') {
        setRelatedData({
          verses: data.relatedVerses || [],
          searchResults: data.searchResults || [],
          rootAnalysis: data.rootAnalysis || [],
          suggestedTabs: data.suggestedTabs || [],
          citations: data.citations || []
        });
      } else {
        // Regular endpoint doesn't provide related data
        setRelatedData({
          verses: [],
          searchResults: [],
          rootAnalysis: [],
          suggestedTabs: [],
          citations: []
        });
      }

      const aiMessage = { 
        role: 'assistant', 
        content: data.response,
        timestamp: new Date().toISOString(),
        relatedContent: {
          verses: data.relatedVerses,
          searchResults: data.searchResults,
          rootAnalysis: data.rootAnalysis
        }
      };
      
      setConversation(prev => [...prev, aiMessage]);

      // Save conversation
      await saveConversation([...conversationRef.current, userMessage, aiMessage]);

    } catch (error) {
      console.error('Error in debate:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date().toISOString() 
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save conversation to Supabase
  const saveConversation = async (messages) => {
    if (!user) {
      console.log('No user, skipping save');
      return;
    }
    
    if (!currentConversationId) {
      // Create new conversation
      try {
        const { data, error } = await supabase
          .from('debate_conversations')
          .insert({
            user_id: user.id,
            messages: messages,
            title: messages[0]?.content.substring(0, 50) + '...' || 'New Debate'
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating conversation:', error);
          // Don't throw, just log - allow conversation to continue
          return;
        }
        
        setCurrentConversationId(data.id);
        setSavedConversations(prev => [data, ...prev]);
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    } else {
      // Update existing conversation
      try {
        const { error } = await supabase
          .from('debate_conversations')
          .update({
            messages: messages,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentConversationId);

        if (error) {
          console.error('Error updating conversation:', error);
          // Don't throw, just log - allow conversation to continue
        }
      } catch (error) {
        console.error('Error updating conversation:', error);
      }
    }
  };

  // Load a saved conversation
  const loadConversation = async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('debate_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      
      setConversation(data.messages || []);
      setCurrentConversationId(conversationId);
      setRelatedData({
        verses: [],
        searchResults: [],
        rootAnalysis: [],
        suggestedTabs: [],
        citations: []
      });
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    try {
      const { error } = await supabase
        .from('debate_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      
      setSavedConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (conversationId === currentConversationId) {
        setConversation([]);
        setCurrentConversationId(null);
        setRelatedData({
          verses: [],
          searchResults: [],
          rootAnalysis: [],
          suggestedTabs: [],
          citations: []
        });
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
    
    setShowDeleteConfirm(false);
    setConversationToDelete(null);
  };

  // Start new conversation
  const startNewConversation = () => {
    setConversation([]);
    setCurrentConversationId(null);
    setRelatedData({
      verses: [],
      searchResults: [],
      rootAnalysis: [],
      suggestedTabs: [],
      citations: []
    });
    // Clear session storage
    sessionStorage.removeItem('debaterConversation');
    sessionStorage.removeItem('debaterConversationId');
    sessionStorage.removeItem('debaterRelatedData');
  };

  // Handle voice search result
  const handleVoiceResult = useCallback((transcript) => {
    setMessage(transcript);
  }, []);

  // Render related content panel
  const renderRelatedContent = () => {
    if (!showRelatedContent || (!relatedData.verses.length && !relatedData.searchResults.length && !relatedData.rootAnalysis.length)) {
      return null;
    }

    return (
      <div className="related-content-panel">
        <div className="related-content-header">
          <h4>Related Content</h4>
          <button 
            className="toggle-related"
            onClick={() => setShowRelatedContent(!showRelatedContent)}
          >
            {showRelatedContent ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>

        {showRelatedContent && (
          <div className="related-content-body">
            {/* Related Verses */}
            {relatedData.verses.length > 0 && (
              <div className="related-section">
                <h5><FaBook /> Related Verses</h5>
                {relatedData.verses.map((verse, index) => (
                  <div key={index} className="related-verse">
                    <button 
                      className="verse-ref-btn"
                      onClick={() => handleVerseClick(verse.sura_verse)}
                    >
                      [{verse.sura_verse}]
                    </button>
                    <p className="verse-english">{verse.english}</p>
                    {verse.arabic && <p className="verse-arabic">{verse.arabic}</p>}
                    {verse.footnote && <p className="verse-footnote">Note: {verse.footnote}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Root Analysis */}
            {relatedData.rootAnalysis.length > 0 && (
              <div className="related-section">
                <h5><FaLanguage /> Root Analysis</h5>
                {relatedData.rootAnalysis.map((root, index) => (
                  <div key={index} className="root-analysis">
                    <button 
                      className="root-btn"
                      onClick={() => handleRootClick(root.root)}
                    >
                      {root.root}
                    </button>
                    <span className="root-meaning">{root.meaning}</span>
                    <span className="root-frequency">({root.frequency} verses)</span>
                  </div>
                ))}
              </div>
            )}

            {/* Search Results */}
            {relatedData.searchResults.length > 0 && (
              <div className="related-section">
                <h5><FaSearch /> Relevant Media & Articles</h5>
                {relatedData.searchResults.map((result, index) => (
                  <div key={index} className="search-result-item">
                    <button 
                      className="result-title"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      {result.title}
                      {result.youtube_link && <FaPlay className="play-icon" />}
                      {result.source_url && <FaExternalLinkAlt className="link-icon" />}
                    </button>
                    <p className="result-content">{result.content}</p>
                    <span className="result-source">{result.source}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested Tabs */}
            {relatedData.suggestedTabs.length > 0 && (
              <div className="related-section suggested-tabs">
                <h5>Explore More</h5>
                {relatedData.suggestedTabs.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggested-tab-btn"
                    onClick={() => onNavigateToTab(suggestion.tab, suggestion.data)}
                  >
                    {suggestion.reason}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Topic suggestions with context awareness
  const topicSuggestions = [
    { text: "Is Rashad Khalifa a messenger?", icon: "🎯" },
    { text: "Explain the mathematical miracle", icon: "🔢" },
    { text: "What is Submission?", icon: "📖" },
    { text: "Are hadiths authorized?", icon: "❓" },
    { text: "Explain 19-based miracle", icon: "💫" },
    { text: "Who are the messengers after Muhammad?", icon: "👥" }
  ];

  if (authLoading) {
    return <div className="debater-bot-loading">Loading...</div>;
  }

  return (
    <div className={`debater-bot-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="debater-header">
        <div className="header-content">
          <h3>AI Debater - Enhanced</h3>
          {!isExpanded && conversation.length > 0 && (
            <span className="message-count">{conversation.length} messages</span>
          )}
        </div>
        <button 
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {isExpanded && (
        <div className="debater-content">
          <div className="main-chat-area">
            {/* Saved Conversations Sidebar */}
            {user && savedConversations.length > 0 && (
              <div className="conversations-sidebar">
                <div className="sidebar-header">
                  <h4>Previous Debates</h4>
                  <button className="new-chat-btn" onClick={startNewConversation}>
                    New Chat
                  </button>
                </div>
                <div className="conversations-list">
                  {savedConversations.map((conv) => (
                    <div 
                      key={conv.id}
                      className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
                    >
                      <button
                        className="conversation-btn"
                        onClick={() => loadConversation(conv.id)}
                      >
                        <span className="conv-title">{conv.title}</span>
                        <span className="conv-date">
                          {new Date(conv.created_at).toLocaleDateString()}
                        </span>
                      </button>
                      <button
                        className="delete-conv-btn"
                        onClick={() => {
                          setConversationToDelete(conv.id);
                          setShowDeleteConfirm(true);
                        }}
                        aria-label="Delete conversation"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="messages-container">
              {conversation.length === 0 ? (
                <div className="welcome-message">
                  <h4>Welcome to the Enhanced AI Debater!</h4>
                  <p>I can help you explore Islamic topics with integrated verse lookup, media search, and root analysis.</p>
                  <p>I have access to:</p>
                  <ul>
                    <li>The complete Quran with all translations</li>
                    <li>Rashad Khalifa's videos and lectures</li>
                    <li>QuranTalk articles and newsletters</li>
                    <li>Arabic root word analysis</li>
                  </ul>
                  <p>Choose a topic below or ask your own question:</p>
                  <div className="topic-grid">
                    {topicSuggestions.map((topic, index) => (
                      <button
                        key={index}
                        className="topic-suggestion enhanced"
                        onClick={() => sendMessage(true, topic.text)}
                      >
                        <span className="topic-icon">{topic.icon}</span>
                        <span className="topic-text">{topic.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {conversation.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                      <div className="message-content">
                        {msg.role === 'assistant' ? parseAndLinkReferences(msg.content) : msg.content}
                      </div>
                      <div className="message-timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message assistant typing">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Related Content Panel */}
          {renderRelatedContent()}

          {/* Input Area */}
          <div className="input-area enhanced">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={user ? "Ask a question or challenge a belief..." : "Sign in to start debating"}
              disabled={!user || isLoading}
              className="message-input"
            />
            <VoiceSearchButton 
              onResult={handleVoiceResult}
              disabled={!user || isLoading}
              className="voice-input-btn"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!user || isLoading || !message.trim()}
              className="send-button"
              aria-label="Send message"
            >
              <FaPaperPlane />
            </button>
          </div>

          {/* User Status */}
          <div className="user-status">
            {user ? (
              <span className="status-text">
                {isPremium ? '✓ Premium Active' : 'Premium Required'}
              </span>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="sign-in-prompt">
                Sign in to debate
              </button>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Delete Conversation?</h4>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="delete-btn"
                onClick={() => deleteConversation(conversationToDelete)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <SubscriptionModal 
          user={user}
          onClose={() => setShowSubscriptionModal(false)}
          feature="AI Debater"
        />
      )}
    </div>
  );
};

export default EnhancedDebaterBot;