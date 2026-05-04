import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = ({ navItems, onCollapsedChange }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('pipelineiq_sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('pipelineiq_sidebar_collapsed', collapsed);
    const main = document.querySelector('.main-content');
    if (main) {
      if (collapsed) main.classList.add('sidebar-collapsed');
      else main.classList.remove('sidebar-collapsed');
    }
    if (onCollapsedChange) onCollapsedChange(collapsed);
  }, [collapsed, onCollapsedChange]);

  const userName = user?.name || 'User';
  const userEmail = user?.email || 'No email';
  const avatarLetter = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarStyle = {
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
    background: isDark ? '#0a0a0a' : '#f9fafb',
    borderRight: '1px solid var(--border)',
    transition: 'width 0.3s ease',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const logoRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    minHeight: '60px',
  };

  const navItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    margin: '2px 8px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
    background: isActive ? 'var(--accent-bg)' : 'transparent',
    border: '1px solid transparent',
    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  });

  return (
    <nav style={sidebarStyle} className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo row */}
      <div style={logoRowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}>IQ</span>
          <span style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            overflow: 'hidden',
            transition: 'opacity 0.2s ease, width 0.3s ease',
            whiteSpace: 'nowrap',
          }}>PipelineIQ</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'transform 0.3s ease, background 0.2s ease, border-color 0.2s ease',
            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >◀</button>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, padding: '8px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map(({ path, label }) => (
          <NavLink
            key={path}
            to={path}
            title={collapsed ? label : undefined}
            style={({ isActive }) => navItemStyle(isActive)}
            onMouseEnter={(e) => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = 'var(--bg-surface)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              flexShrink: 0,
              color: 'inherit',
              letterSpacing: '0.3px',
              minWidth: '20px',
              textAlign: 'center',
            }}>{label.slice(0, 2).toUpperCase()}</span>
            <span style={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 'auto',
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.3s ease',
              whiteSpace: 'nowrap',
            }}>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Bottom section */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
            marginBottom: '8px',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '13px', flexShrink: 0, fontWeight: 700 }}>{isDark ? '☀' : '☾'}</span>
          <span style={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            overflow: 'hidden',
            transition: 'opacity 0.2s ease, width 0.3s ease',
          }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0 8px' }} />

        {/* User info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 4px',
          overflow: 'hidden',
        }}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={userName}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#fff',
              fontSize: '14px',
              flexShrink: 0,
            }}>{avatarLetter}</div>
          )}
          <div style={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            overflow: 'hidden',
            transition: 'opacity 0.2s ease, width 0.3s ease',
            minWidth: 0,
          }}>
            <div style={{
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{userName}</div>
            <div style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{userEmail}</div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            marginTop: '8px',
            borderRadius: '8px',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; }}
        >
          <span style={{ fontSize: '13px', flexShrink: 0, fontWeight: 700 }}>X</span>
          <span style={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            overflow: 'hidden',
            transition: 'opacity 0.2s ease, width 0.3s ease',
          }}>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
