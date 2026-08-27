import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import aiApi from '../services/aiApi';

// Shared AI context: feature flags, role permissions and the CampusAI
// chat state used by the floating widget + assistant page.
const AIContext = createContext();

export const AIProvider = ({ children }) => {
  const [features, setFeatures] = useState({
    aiEnabled: true,
    assistantEnabled: true,
    searchEnabled: true,
    insightsEnabled: true,
    riskEnabled: true,
    documentEnabled: true,
    loggingEnabled: true,
    provider: 'local',
    role: 'admin',
    permissions: { admin: false, teacher: false, accountant: false },
  });
  const [loaded, setLoaded] = useState(false);

  // CampusAI chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const busyRef = useRef(false);

  const loadFeatures = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) {
        setLoaded(true);
        return;
      }
      const data = await aiApi.getFeatures();
      setFeatures(prev => ({ ...prev, ...data }));
    } catch (error) {
      // Non-fatal — fall back to defaults so the UI still renders.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { loadFeatures(); }, [loadFeatures]);

  const openChat = useCallback(() => {
    setChatOpen(true);
    setChatError('');
  }, []);

  const closeChat = useCallback(() => {
    setChatOpen(false);
  }, []);

  // Send a message to the assistant. Returns the assistant reply object.
  const sendMessage = useCallback(async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || busyRef.current) return null;
    busyRef.current = true;
    setChatLoading(true);
    setChatError('');
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    try {
      const data = await aiApi.chat(trimmed, conversationId);
      setConversationId(data.conversationId);
      setMessages(prev => [...prev, data.message]);
      setSuggestions(data.suggestions || []);
      return data.message;
    } catch (error) {
      const msg = error.response?.data?.error || 'Something went wrong. Please try again.';
      setChatError(msg);
      setMessages(prev => [...prev, { role: 'assistant', content: msg, status: 'error' }]);
      return null;
    } finally {
      busyRef.current = false;
      setChatLoading(false);
    }
  }, [conversationId]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setConversationId(null);
    setChatError('');
  }, []);

  const loadConversation = useCallback(async (id) => {
    try {
      const data = await aiApi.getConversation(id);
      setConversationId(id);
      setMessages(data.messages);
      setSuggestions([]);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const value = {
    features,
    loaded,
    refreshFeatures: loadFeatures,
    // Chat
    chatOpen, openChat, closeChat,
    messages, setMessages,
    suggestions, conversationId,
    chatLoading, chatError,
    sendMessage, resetChat, loadConversation,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
