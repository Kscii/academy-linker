// ============================================================
// AppShell — Fixed sidebar + scrollable main content (Outlet)
// Sidebar: logo, role tabs, nav items, language, theme, profile
// ============================================================

import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { LanguageCombobox } from './LanguageCombobox';

// ── Nav item definitions ──────────────────────────────────────

interface NavItem {
  id: string;
  labelKey: string;
  icon: string;
  /** For parent routes, `path` is a function of sid */
  path: string | ((sid: string) => string);
}

const PARENT_NAV: NavItem[] = [
  { id: 'dashboard',  labelKey: 'nav:dashboard',  icon: '⊞', path: (sid) => `/parent/students/${sid}/dashboard` },
  { id: 'messages',   labelKey: 'nav:messages',   icon: '✉', path: (sid) => `/parent/students/${sid}/discussions` },
  { id: 'reports',    labelKey: 'nav:reports',    icon: '📋', path: (sid) => `/parent/students/${sid}/reports` },
  { id: 'notices',    labelKey: 'nav:notices',    icon: '📢', path: (sid) => `/parent/students/${sid}/tasks` },
  { id: 'resources',  labelKey: 'nav:resources',  icon: '📚', path: (sid) => `/parent/students/${sid}/resources` },
];

const TEACHER_NAV: NavItem[] = [
  { id: 'dashboard',    labelKey: 'nav:dashboard',    icon: '⊞', path: '/teacher/dashboard' },
  { id: 'messages',     labelKey: 'nav:messages',     icon: '✉', path: '/teacher/messages' },
  { id: 'find-student', labelKey: 'nav:findStudent',  icon: '🔍', path: '/teacher/find-student' },
];

const SHARED_NAV: NavItem[] = [
  { id: 'settings', labelKey: 'nav:settings', icon: '⚙', path: '/settings' },
];

// ── Decorative sidebar SVG ────────────────────────────────────

function SidebarDecor() {
  return (
    <svg width="180" height="80" viewBox="0 0 180 80" fill="none" style={{ opacity: 0.12, margin: '0 auto', display: 'block' }}>
      <circle cx="30"  cy="40" r="28" stroke="var(--a1)" strokeWidth="1.5" />
      <circle cx="90"  cy="25" r="18" stroke="var(--a2)" strokeWidth="1.5" />
      <circle cx="150" cy="50" r="22" stroke="var(--a3)" strokeWidth="1.5" />
      <line x1="58" y1="40" x2="72"  y2="28" stroke="var(--tx3)" strokeWidth="1" />
      <line x1="108" y1="30" x2="128" y2="42" stroke="var(--tx3)" strokeWidth="1" />
    </svg>
  );
}

// ── User profile popup ────────────────────────────────────────

function UserProfile() {
  const { user, logout } = useApp();
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const { role } = useApp();

  const initials = user?.display_name
    ?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', cursor: 'pointer',
          borderTop: '1px solid var(--bd)',
        }}
        onClick={() => setShowMenu(m => !m)}
      >
        <div
          className="avatar"
          style={{ background: role === 'parent' ? 'var(--a1)' : 'var(--a4)', color: '#fff' }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.display_name ?? 'User'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email ?? ''}
          </div>
        </div>
        <span style={{ color: 'var(--tx3)', fontSize: 10 }}>▾</span>
      </div>

      {showMenu && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 10, right: 10,
          background: 'var(--card)', border: '1px solid var(--bd)',
          borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 50, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--tx2)', borderBottom: '1px solid var(--bd)' }}>
            {t('signedInAs')} <strong>{user?.role}</strong>
          </div>
          <button
            onClick={() => { setShowMenu(false); navigate('/settings'); }}
            style={{
              width: '100%', padding: '10px 14px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--tx)', fontWeight: 600,
              fontFamily: 'var(--font-body)', borderBottom: '1px solid var(--bd)',
            }}
          >
            ⚙ {t('settings')}
          </button>
          <button
            onClick={() => { setShowMenu(false); logout(); navigate('/login'); }}
            style={{
              width: '100%', padding: '10px 14px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--warn)', fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            {t('signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────

export function AppShell() {
  const { role, setRole, toggleTheme, theme, language, setLanguage, unreadMessageCount } = useApp();
  const { t } = useTranslation(['common', 'nav']);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const params = useParams<{ sid?: string }>();
  const sid = params.sid ?? 'student-001';

  const navItems = role === 'parent' ? PARENT_NAV : TEACHER_NAV;

  const getPath = (item: NavItem) =>
    typeof item.path === 'function' ? item.path(sid) : item.path;

  const isActive = (item: NavItem) => pathname === getPath(item) || pathname.startsWith(getPath(item) + '/');

  const switchRole = (r: 'parent' | 'teacher') => {
    setRole(r);
    if (r === 'parent') navigate(`/parent/students/${sid}/dashboard`);
    else navigate('/teacher/dashboard');
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--a1), var(--a3))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>
              🎓
            </div>
            <div>
              <div className="font-serif" style={{ fontSize: 15, color: 'var(--tx)', fontWeight: 400, lineHeight: 1 }}>Academy</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Linker</div>
            </div>
          </div>
        </div>

        {/* Role tabs */}
        <div className="role-tabs">
          <div className={`role-tab ${role === 'parent' ? 'active' : ''}`} onClick={() => switchRole('parent')}>
            {t('common:parent')}
          </div>
          <div className={`role-tab ${role === 'teacher' ? 'active' : ''}`} onClick={() => switchRole('teacher')}>
            {t('common:teacher')}
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map(item => (
            <div
              key={item.id}
              className={`nav-item ${isActive(item) ? 'active' : ''}`}
              onClick={() => navigate(getPath(item))}
            >
              <span className="nav-icon" style={{ fontSize: 15 }}>{item.icon}</span>
              {t(item.labelKey)}
              {item.id === 'messages' && unreadMessageCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--a1)', flexShrink: 0,
                }} />
              )}
            </div>
          ))}

          {/* Settings item */}
          {SHARED_NAV.map(item => (
            <div
              key={item.id}
              className={`nav-item ${isActive(item) ? 'active' : ''}`}
              onClick={() => navigate(getPath(item))}
            >
              <span className="nav-icon" style={{ fontSize: 15 }}>{item.icon}</span>
              {t(item.labelKey)}
            </div>
          ))}
        </nav>

        {/* Decorative SVG */}
        <SidebarDecor />

        {/* Language selector */}
        <div style={{ padding: '4px 12px 8px' }}>
          <LanguageCombobox value={language} onChange={setLanguage} compact />
        </div>

        {/* Theme toggle */}
        <div style={{ padding: '4px 14px 8px' }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'var(--bg2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
              fontSize: 12, color: 'var(--tx2)', fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            <span>{theme === 'day' ? '🌙' : '☀️'}</span>
            {theme === 'day' ? t('common:nightMode') : t('common:dayMode')}
          </button>
        </div>

        {/* User profile */}
        <UserProfile />
      </aside>

      {/* ── Main content (screen rendered by react-router Outlet) ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
