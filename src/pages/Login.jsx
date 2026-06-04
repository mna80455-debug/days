import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Compass, X } from 'lucide-react';

/* ── Scoped styles for Login page ── */
const loginStyles = `
  .login-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 70vh;
    width: 100%;
    max-width: 440px;
    margin: 0 auto;
    padding: 0 var(--space-lg);
    position: relative;
    overflow: hidden;
  }

  .login-card {
    padding: var(--space-3xl) var(--space-2xl);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
    gap: var(--space-xl);
    position: relative;
    z-index: 2;
  }

  /* ── Floating decorative circles ── */
  .login-bg-decor {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
  }

  .login-circle {
    position: absolute;
    border-radius: var(--radius-full);
    opacity: 0;
    animation: loginFloat 8s ease-in-out infinite, loginFadeIn 1s ease-out forwards;
  }

  .login-circle--1 {
    width: 120px;
    height: 120px;
    background: var(--orange-glow);
    top: 12%;
    right: 8%;
    animation-delay: 0s;
  }

  .login-circle--2 {
    width: 80px;
    height: 80px;
    background: var(--pink-light);
    top: 60%;
    right: 75%;
    animation-delay: 1.5s;
  }

  .login-circle--3 {
    width: 50px;
    height: 50px;
    background: var(--orange-glow);
    top: 30%;
    right: 85%;
    animation-delay: 3s;
  }

  .login-circle--4 {
    width: 100px;
    height: 100px;
    background: var(--pink-light);
    top: 75%;
    right: 15%;
    animation-delay: 2s;
  }

  .login-circle--5 {
    width: 36px;
    height: 36px;
    background: var(--orange-glow);
    top: 8%;
    right: 55%;
    animation-delay: 4s;
  }

  .login-circle--6 {
    width: 64px;
    height: 64px;
    background: var(--pink-light);
    top: 45%;
    right: 45%;
    animation-delay: 2.5s;
  }

  @keyframes loginFloat {
    0%, 100% { transform: translateY(0) scale(1); }
    33% { transform: translateY(-12px) scale(1.04); }
    66% { transform: translateY(6px) scale(0.97); }
  }

  @keyframes loginFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* ── Logo orbit ── */
  .login-logo-wrap {
    position: relative;
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: var(--border-ui);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
    animation: breathe 4s ease-in-out infinite;
  }

  .login-logo-compass {
    color: var(--orange);
    transition: transform var(--duration-slow) var(--ease-out);
  }

  .login-logo-wrap:hover .login-logo-compass {
    transform: rotate(45deg);
  }

  .login-celestial {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-celestial--sun {
    top: var(--space-sm);
    right: var(--space-sm);
    color: var(--orange);
  }

  .login-celestial--moon {
    bottom: var(--space-sm);
    left: var(--space-sm);
    color: var(--text-muted);
  }

  /* ── Title area ── */
  .login-title {
    font-size: 2.5rem;
    font-weight: 900;
    color: var(--brown);
    margin-bottom: var(--space-xs);
    line-height: 1.2;
  }

  .login-subtitle {
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .login-description {
    font-size: 0.95rem;
    color: var(--text-muted);
    opacity: 0.9;
    line-height: 1.7;
    max-width: 300px;
  }

  /* ── Error ── */
  .login-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    width: 100%;
    padding: var(--space-md);
    border-radius: var(--radius-md);
    background: rgba(230, 57, 70, 0.08);
    border: 1px solid rgba(230, 57, 70, 0.2);
    color: var(--red);
    font-size: 0.85rem;
    text-align: right;
    animation: slideUp 0.3s var(--ease-out) both;
  }

  .login-error-dismiss {
    background: transparent;
    border: none;
    color: var(--red);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.6;
    transition: opacity var(--duration-fast);
  }

  .login-error-dismiss:hover {
    opacity: 1;
  }

  /* ── Login button ── */
  .login-btn {
    width: 100%;
    font-size: 1.05rem;
    padding: var(--space-md) var(--space-xl);
    border-radius: var(--radius-lg);
  }

  .login-btn svg {
    flex-shrink: 0;
  }

  /* ── Skeleton ── */
  .login-skeleton-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: var(--space-xl);
    padding: var(--space-3xl) var(--space-2xl);
  }

  .login-skeleton-circle {
    width: 96px;
    height: 96px;
    border-radius: var(--radius-full);
  }

  .login-skeleton-title {
    width: 120px;
    height: 36px;
  }

  .login-skeleton-subtitle {
    width: 200px;
    height: 18px;
  }

  .login-skeleton-desc {
    width: 260px;
    height: 54px;
  }

  .login-skeleton-btn {
    width: 100%;
    height: 50px;
    border-radius: var(--radius-lg);
  }

  /* ── Footer hint ── */
  .login-footer-hint {
    font-size: 0.8rem;
    opacity: 0.7;
    color: var(--text-muted);
  }
`;

const Login = () => {
  const { currentUser, loginWithGoogle, loginAsGuest } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('days_has_seen_onboarding')) {
      navigate('/onboarding');
      return;
    }
    
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  /* Simulate brief skeleton then reveal */
  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{loginStyles}</style>

      {/* Floating decorative background circles */}
      <div className="login-bg-decor" aria-hidden="true">
        <div className="login-circle login-circle--1" />
        <div className="login-circle login-circle--2" />
        <div className="login-circle login-circle--3" />
        <div className="login-circle login-circle--4" />
        <div className="login-circle login-circle--5" />
        <div className="login-circle login-circle--6" />
      </div>

      <div className="login-page">
        {!pageReady ? (
          /* ── Shimmer loading skeleton ── */
          <div className="card login-skeleton-wrap animate-in" role="status" aria-label="جاري التحميل">
            <div className="skeleton login-skeleton-circle" />
            <div className="skeleton login-skeleton-title" />
            <div className="skeleton login-skeleton-subtitle" />
            <div className="skeleton login-skeleton-desc" />
            <div className="skeleton login-skeleton-btn" />
          </div>
        ) : (
          /* ── Login card ── */
          <div className="card login-card animate-in">

            {/* Animated App Brand/Logo */}
            <div className="login-logo-wrap animate-in animate-in-delay-1">
              <Compass size={48} className="login-logo-compass" />
              <div className="login-celestial login-celestial--sun" aria-hidden="true">
                <Sun size={16} />
              </div>
              <div className="login-celestial login-celestial--moon" aria-hidden="true">
                <Moon size={16} />
              </div>
            </div>

            {/* Text Details */}
            <div className="animate-in animate-in-delay-2">
              <h1 className="login-title">أيام</h1>
              <p className="login-subtitle">تطبيق للوعي والحضور اليومي</p>
            </div>

            <p className="login-description animate-in animate-in-delay-3">
              أدرك تفاصيل حضورك، وثق مشاعرك ونواياك في الصباح، وتأمل رحلتك في المساء لتصنع ذاكرة واعية لرحلة حياتك.
            </p>

            {/* Error message with dismiss */}
            {error && (
              <div className="login-error" role="alert">
                <span>{error}</span>
                <button
                  className="login-error-dismiss"
                  onClick={() => setError('')}
                  aria-label="إغلاق رسالة الخطأ"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Google Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary login-btn animate-in animate-in-delay-4"
              aria-label="تسجيل الدخول عبر Google"
            >
              {loading ? (
                <span className="loader loader-sm" />
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>تسجيل الدخول عبر Google</span>
                </>
              )}
            </button>

            {/* Dynamic theme hint */}
            <p className="login-footer-hint animate-in animate-in-delay-5">
              يتغير ثيم وألوان التطبيق تلقائياً تبعاً للتوقيت الحالي اليومي
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;
