import React from 'react';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', fontFamily: 'Cairo, sans-serif', direction: 'rtl',
          background: '#F8F5F0', color: '#5C4B43', padding: '24px', textAlign: 'center', gap: '16px'
        }}>
          <div style={{ fontSize: '3rem' }}>😔</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>حدث خطأ غير متوقع</h2>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, maxWidth: '400px' }}>
            نعتذر عن هذا الخطأ. يرجى تحديث الصفحة أو المحاولة مرة أخرى.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              background: '#F4A261', color: '#fff', border: 'none', padding: '12px 32px',
              borderRadius: '12px', fontFamily: 'Cairo', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer'
            }}
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Register Service Worker for PWA and Push Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
