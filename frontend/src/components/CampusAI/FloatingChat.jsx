import React, { useRef, useEffect } from 'react';
import { useAI } from '../../context/AIContext';
import { Sparkles, X, Bot, RefreshCw, Send } from 'lucide-react';

// Global CampusAI assistant widget. Mounted once in App.jsx.
// Reads/controls chat state via AIContext so the AIAssistant page and the
// floating widget stay in sync.
const FloatingChat = () => {
  const {
    features, chatOpen, openChat, closeChat,
    messages, suggestions, chatLoading, chatError,
    sendMessage, resetChat,
  } = useAI();

  const [input, setInput] = React.useState('');
  const bodyRef = useRef(null);

  const enabled = features.aiEnabled !== false && features.assistantEnabled !== false;

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  const handleSend = async () => {
    const text = input;
    if (!text.trim()) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMeta = (msg) => {
    const sources = msg.dataSources || msg.data_sources;
    return (
      <div className="ai-msg-meta">
        {msg.intent && <span className="ai-intent-badge">{msg.intent.replace(/_/g, ' ')}</span>}
        {msg.model && <span>model: {msg.model}</span>}
        {Array.isArray(sources) && sources.length > 0 && (
          <span>{sources.length} source(s)</span>
        )}
      </div>
    );
  };

  return (
    <>
      {chatOpen && (
        <div className="ai-widget">
          <div className="ai-widget-header">
            <div>
              <h3><Sparkles size={18} /> CampusAI</h3>
              <p>Ask anything about your students</p>
            </div>
            <div className="ai-widget-actions">
              <button className="ai-icon-btn" title="New conversation" onClick={resetChat}><RefreshCw size={16} /></button>
              <button className="ai-icon-btn" title="Close" onClick={closeChat}><X size={16} /></button>
            </div>
          </div>

          <div className="ai-widget-body" ref={bodyRef}>
            {messages.length === 0 && (
              <>
                <p className="muted-center" style={{ marginTop: '8px' }}>
                  Hello! I'm CampusAI. I can answer questions about students,
                  attendance, fees and academic performance.
                </p>
                <div className="ai-suggestions">
                  {[
                    'How many students are enrolled?',
                    'Who has attendance below 75%?',
                    'Which students have pending fees?',
                    'Which branch has the highest CGPA?',
                  ].map(s => (
                    <button key={s} className="ai-suggestion-chip" onClick={() => sendMessage(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`ai-msg ${msg.role} ${msg.status === 'error' ? 'error' : ''}`}>
                  {msg.content}
                </div>
                {msg.role === 'assistant' && msg.status !== 'error' && renderMeta(msg)}
              </div>
            ))}

            {chatLoading && (
              <div className="ai-typing"><span /><span /><span /></div>
            )}

            {!chatLoading && messages.length > 0 && suggestions.length > 0 && (
              <div className="ai-suggestions">
                {suggestions.slice(0, 4).map(s => (
                  <button key={s} className="ai-suggestion-chip" onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {chatError && <p className="text-muted" style={{ fontSize: '12px' }}>{chatError}</p>}
          </div>

          <div className="ai-widget-footer">
            <div className="ai-input-row">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask CampusAI…"
                disabled={chatLoading}
              />
              <button className="ai-send-btn" onClick={handleSend} disabled={chatLoading || !input.trim()} title="Send">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {enabled && (
        <button className="ai-fab" onClick={chatOpen ? closeChat : openChat} title="CampusAI Assistant">
          <span className="ai-fab-dot" />
          {chatOpen ? <X size={20} /> : <Bot size={20} />}
        </button>
      )}
    </>
  );
};

export default FloatingChat;
