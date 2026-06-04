import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Settings, LogOut, Sun, Coffee, Moon, PieChart, Image, LayoutDashboard, Bell, X, Hourglass, Calendar } from 'lucide-react';
import { checkAndTriggerNotifications } from '../utils/notificationScheduler';

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const { theme, setManualTheme, resetToAutomatic, isManual } = useTheme();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Ask for notification permissions on login after a 3s delay
  useEffect(() => {
    if (currentUser) {
      if ('Notification' in window && Notification.permission === 'default') {
        const timer = setTimeout(() => {
          import('../firebase/notifications').then(({ requestNotificationPermission }) => {
            requestNotificationPermission(currentUser.uid);
          });
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  // Periodic notification checker (runs immediately and then every 30s)
  useEffect(() => {
    if (!currentUser) return;

    const runCheck = () => {
      checkAndTriggerNotifications(currentUser).catch(err => {
        console.error('Error checking and triggering notifications:', err);
      });
    };

    // Run check immediately
    runCheck();

    // Check every 30 seconds
    const interval = setInterval(runCheck, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setShowDropdown(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'اليوم', icon: LayoutDashboard },
    { path: '/memories', label: 'الذكريات', icon: Image },
    { path: '/calendar', label: 'تقويمي', icon: Calendar },
    { path: '/statistics', label: 'الإحصائيات', icon: PieChart },
    { path: '/life-weeks', label: 'عمري', icon: Hourglass },
  ];

  const themeOptions = [
    { key: 'morning', label: 'الصباح (5ص - 11ص)', icon: Coffee },
    { key: 'neutral', label: 'الظهيرة (11ص - 5م)', icon: Sun },
    { key: 'evening', label: 'المساء (5م - 5ص)', icon: Moon },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-gradient)', transition: 'background 0.5s ease' }}>

      {/* Skip to content - accessibility */}
      <a href="#main-content" className="skip-link">تخطي إلى المحتوى</a>

      {/* ══════════ YEAR PROGRESS BAR ══════════ */}
      {(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        const totalDays = now.getFullYear() % 4 === 0 ? 366 : 365;
        const progressPercent = (dayOfYear / totalDays) * 100;
        return (
          <div 
            title={`مضى ${dayOfYear} يوم من ${totalDays}`}
            style={{ 
              width: '100%', 
              height: '4px', 
              background: 'var(--border-ui)', 
              position: 'relative', 
              zIndex: 10,
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
            }}
          >
            <div 
              style={{ 
                height: '100%', 
                background: 'linear-gradient(90deg, var(--orange), var(--pink))', 
                width: `${progressPercent}%`, 
                transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 10px var(--orange), 0 0 5px var(--pink)',
                borderRadius: '0 999px 999px 0'
              }} 
            />
          </div>
        );
      })()}

      {/* ══════════ NAVBAR ══════════ */}
      <nav className="glass-panel navbar" role="navigation" aria-label="التنقل الرئيسي">
        
        {/* Brand */}
        <Link to="/dashboard" className="nav-brand">
          أيام
        </Link>

        {/* Desktop Nav Links */}
        <div className="nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Actions */}
        <div className="nav-actions" ref={dropdownRef}>
          <button 
            className="btn-icon"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="الإعدادات"
            aria-expanded={showDropdown}
            aria-haspopup="true"
          >
            <Settings size={18} />
          </button>

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'م')}&background=F4A261&color=fff&size=80&font-size=0.4&bold=true`} 
                alt={currentUser.displayName}
                className="nav-avatar"
              />
              <span className="nav-user-name">
                {currentUser.displayName}
              </span>
            </div>
          )}

          {/* ══════════ DROPDOWN ══════════ */}
          {showDropdown && (
            <div className="glass-panel dropdown" role="menu">
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', marginBottom: '2px' }}>
                محاكاة أوقات اليوم
              </div>
              
              {themeOptions.map((opt) => (
                <button 
                  key={opt.key}
                  role="menuitem"
                  className={`dropdown-item ${theme === opt.key && isManual ? 'active' : ''}`}
                  onClick={() => { setManualTheme(opt.key); setShowDropdown(false); }}
                >
                  <span>{opt.label}</span>
                  <opt.icon size={15} style={{ color: 'var(--orange)' }} />
                </button>
              ))}

              {isManual && (
                <button 
                  className="btn-primary"
                  onClick={() => { resetToAutomatic(); setShowDropdown(false); }}
                  style={{ fontSize: '0.78rem', padding: '6px 12px', marginTop: '4px' }}
                >
                  العودة للوقت التلقائي
                </button>
              )}

              <div className="dropdown-divider" />

              <Link 
                to="/settings" 
                className="dropdown-item"
                role="menuitem"
                onClick={() => setShowDropdown(false)}
              >
                <span>إعدادات الإشعارات</span>
                <Bell size={15} />
              </Link>
              
              <button 
                className="dropdown-item danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <span>تسجيل الخروج</span>
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main id="main-content" className="page-container">
        <Outlet />
      </main>

      {/* ══════════ MOBILE BOTTOM NAV ══════════ */}
      <nav className="glass-panel mobile-nav" aria-label="التنقل للموبايل">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="footer">
        <span>تطبيق أيام &copy; {new Date().getFullYear()} — رحلتك، وعيك، حضورك اليومي.</span>
      </footer>
    </div>
  );
};

export default Layout;
