import React, { useEffect, useState } from 'react';
import { useAI } from '../../context/AIContext';
import aiApi from '../../services/aiApi';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';
import { Trash2, Send } from 'lucide-react';

// Full-page CampusAI assistant with conversation history management.
const AIAssistant = () => {
  const { sendMessage, messages, setMessages, chatLoading, chatError } = useAI();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const loadConversations = async () => {
    try {
      const data = await aiApi.listConversations();
      setConversations(data.conversations || []);
    } catch (error) {
      // ignore — sidebar list is optional
    }
  };

  useEffect(() => { loadConversations(); }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    setInput('');
    await sendMessage(input);
    loadConversations();
  };

  const handleSelect = async (id) => {
    const data = await aiApi.getConversation(id);
    if (data.messages) {
      setActiveId(id);
      setMessages(data.messages);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await aiApi.deleteConversation(id);
      toast.success('Conversation deleted');
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
      loadConversations();
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>CampusAI Assistant</h1>
          <p>Natural-language questions about students, attendance, fees and performance.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Conversation history */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Conversations</h2>
          </div>
          <div className="dashboard-section-body">
            {conversations.length === 0 ? (
              <p className="muted-center">No conversations yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {conversations.map(c => (
                  <div key={c.id} className={`ai-conv-item ${activeId === c.id ? 'active' : ''}`} onClick={() => handleSelect(c.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.title}
                      </div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>{formatDateTime(c.updated_at)}</div>
                    </div>
                    <button className="action-btn delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="dashboard-section" style={{ gridColumn: 'span 2' }}>
          <div className="dashboard-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxHeight: '520px' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', minHeight: 320 }}>
              {messages.length === 0 && (
                <p className="muted-center" style={{ marginTop: '24px' }}>
                  Ask CampusAI a question — e.g. "Who has attendance below 75%?" or "Compare branch performance".
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`ai-msg ${msg.role} ${msg.status === 'error' ? 'error' : ''}`}>{msg.content}</div>
                  {msg.role === 'assistant' && msg.intent && (
                    <div className="ai-msg-meta">
                      <span className="ai-intent-badge">{msg.intent.replace(/_/g, ' ')}</span>
                      {msg.model && <span>model: {msg.model}</span>}
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && <div className="ai-typing"><span /><span /><span /></div>}
              {chatError && <p className="text-muted">{chatError}</p>}
            </div>
            <div className="ai-input-row">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type your question…"
                disabled={chatLoading}
              />
              <button className="ai-send-btn" onClick={handleSend} disabled={chatLoading || !input.trim()}><Send size={16} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
