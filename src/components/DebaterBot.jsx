import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkPremiumAccess, PREMIUM_FEATURES, hasActiveSubscription, getSubscriptionInfo } from '../config/premium';
import LoginForm from './LoginForm';

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
  const { user, isAuthenticated, hasActiveSubscription: authHasSubscription } = useAuth();
  const messagesEndRef = useRef(null);

  const subscriptionInfo = getSubscriptionInfo();

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check access on component mount
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    const hasAccess = checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT);
    if (!hasAccess) {
      setShowSubscriptionPrompt(true);
    }
  }, [isAuthenticated]);

  const startDebate = async (topic) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    if (!checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT)) {
      setShowSubscriptionPrompt(true);
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
      setShowLogin(true);
      return;
    }
    
    if (!checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT)) {
      setShowSubscriptionPrompt(true);
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
    setMessages([]);
    setCurrentTopic('');
    setDebateMode(false);
    setError(null);
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

  // Show login form if not authenticated
  if (showLogin && !isAuthenticated) {
    return (
      <>
        <LoginForm onClose={() => setShowLogin(false)} />
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <div style={{ textAlign: 'center', color: '#666' }}>
            <h2>Please log in to access the AI Debater Bot</h2>
            <p>Premium subscription required for unlimited debates.</p>
          </div>
        </div>
      </>
    );
  }

  if (showSubscriptionPrompt && !checkPremiumAccess(PREMIUM_FEATURES.DEBATER_BOT)) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          textAlign: 'center'
        }}>
          <h2 style={{ marginTop: 0, color: '#1976d2' }}>
            🤖 AI Debater Bot
          </h2>
          <p style={{ marginBottom: '20px', color: '#666', lineHeight: '1.6' }}>
            The AI Debater Bot is a premium subscription feature that provides specialized theological debates 
            based on Rashad Khalifa's teachings and the Final Testament - something you won't find anywhere else.
          </p>
          <div style={{
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
              Unique Value - Why Not Just Use ChatGPT?
            </h3>
            <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '20px' }}>
              <li><strong>Specialized Knowledge:</strong> Trained on Rashad Khalifa's complete teachings</li>
              <li><strong>Authentic Perspective:</strong> Responds as a true submitter, not neutral AI</li>
              <li><strong>Integrated Research:</strong> Instant access to 60+ debate rules and audio references</li>
              <li><strong>Final Testament Focus:</strong> All responses backed by Quranic verses</li>
              <li><strong>Community Wisdom:</strong> Incorporates years of submission community discussions</li>
            </ul>
          </div>
          
          <div style={{
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <strong>Subscription Status:</strong> {subscriptionInfo.isActive ? 'Active' : 'Inactive'}
            {subscriptionInfo.expiry && (
              <div>Expires: {new Date(subscriptionInfo.expiry).toLocaleDateString()}</div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowSubscriptionPrompt(false)}
              style={{
                padding: '12px 20px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Maybe Later
            </button>
            
            <button
              onClick={() => {
                // TODO: Implement actual subscription flow
                alert('Subscription flow coming soon! Contact support for early access.');
                setShowSubscriptionPrompt(false);
              }}
              style={{
                padding: '12px 20px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Subscribe Now (£2.99/month)
            </button>
            
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '15px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>🤖 AI Debater Bot</h1>
            {currentTopic && (
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Topic: {currentTopic}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={resetDebate}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Reset
            </button>
            <div style={{
              fontSize: '12px',
              padding: '8px 12px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {user?.email && <span>👤 {user.email}</span>}
              {authHasSubscription ? <span>✅ Premium</span> : <span>🔓 Free</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!debateMode ? (
          /* Topic Selection */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px'
          }}>
            <h2 style={{ marginBottom: '30px', color: '#333' }}>Choose a Debate Topic</h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '40px',
              width: '100%',
              maxWidth: '800px'
            }}>
              {topicSuggestions.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => startDebate(topic)}
                  style={{
                    padding: '15px',
                    backgroundColor: 'white',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.3s ease',
                    ':hover': {
                      borderColor: '#2196F3',
                      backgroundColor: '#f0f8ff'
                    }
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

            <div style={{ textAlign: 'center', maxWidth: '400px' }}>
              <p style={{ marginBottom: '15px', color: '#666' }}>Or start with a custom topic:</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter your debate topic..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && inputText.trim() && startDebate(inputText.trim())}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={() => inputText.trim() && startDebate(inputText.trim())}
                  disabled={!inputText.trim()}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    opacity: inputText.trim() ? 1 : 0.5
                  }}
                >
                  Start Debate
                </button>
              </div>
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
                      {message.content}
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
              padding: '20px',
              backgroundColor: 'white',
              borderTop: '1px solid #e0e0e0'
            }}>
              {error && (
                <div style={{
                  padding: '10px',
                  backgroundColor: '#ffebee',
                  color: '#d32f2f',
                  borderRadius: '4px',
                  marginBottom: '10px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <textarea
                  placeholder="Type your response..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'none',
                    minHeight: '44px',
                    maxHeight: '120px',
                    lineHeight: '1.4'
                  }}
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || isLoading}
                  style={{
                    padding: '12px 20px',
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (!inputText.trim() || isLoading) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: (!inputText.trim() || isLoading) ? 0.5 : 1,
                    minWidth: '80px'
                  }}
                >
                  {isLoading ? '...' : 'Send'}
                </button>
              </div>
              
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Press Enter to send, Shift+Enter for new line
              </div>
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
    </div>
  );
};

export default DebaterBot;