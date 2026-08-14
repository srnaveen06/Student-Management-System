import React, { createContext, useState, useContext, useCallback, useRef } from 'react';

const ToastContext = createContext();

// Generate guaranteed unique toast IDs
let toastIdCounter = 0;
const generateId = () => `toast-${Date.now()}-${++toastIdCounter}-${Math.random().toString(36).slice(2, 9)}`;

// ToastProvider manages toast notifications across the app
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Use ref to hold removeToast so addToast doesn't need it as a dependency
  const removeToastRef = useRef(null);

  // Remove a toast by its ID
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Store removeToast in ref so addToast can call it
  removeToastRef.current = removeToast;

  // Add a new toast notification (deduplicates identical messages within 3 seconds)
  const addToast = useCallback((message, type = 'info') => {
    setToasts(prev => {
      // Prevent duplicate identical messages from stacking
      const isDuplicate = prev.some(t => t.message === message && t.type === type);
      if (isDuplicate) return prev;

      const id = generateId();
      const next = [...prev, { id, message, type }];

      // Auto-remove toast after 4 seconds
      setTimeout(() => {
        if (removeToastRef.current) {
          removeToastRef.current(id);
        }
      }, 4000);

      return next;
    });
  }, []);

  // Convenience methods for different toast types
  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Toast Container — renders all active toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' && '\u2713'}
              {t.type === 'error' && '\u2715'}
              {t.type === 'warning' && '\u26A0'}
              {t.type === 'info' && '\u2139'}
            </span>
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" onClick={() => removeToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
