import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 4000),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning', 4000),
  };

  const colors = {
    success: { bg: '#e8f5e9', border: '#4caf50', color: '#1b5e20', icon: '✅' },
    error: { bg: '#fef2f2', border: '#ef4444', color: '#991b1b', icon: '❌' },
    info: { bg: '#e3f2fd', border: '#2196f3', color: '#0d47a1', icon: 'ℹ️' },
    warning: { bg: '#fff8e1', border: '#ff9800', color: '#e65100', icon: '⚠️' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container */}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none', maxWidth: 380
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{
              padding: '12px 18px', borderRadius: 12,
              background: c.bg, border: `1px solid ${c.border}`,
              color: c.color, fontSize: 13, fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 8,
              animation: 'slideInRight 0.3s ease',
              pointerEvents: 'auto',
            }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              {t.message}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
