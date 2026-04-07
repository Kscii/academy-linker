// ============================================================
// AppShell — Fixed sidebar + scrollable main content (Outlet)
// Sidebar: logo, role tabs, nav items, language, theme, profile
// ============================================================

import { useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { LanguageCombobox } from './LanguageCombobox';
import { LogoMark } from '@/components/LogoMark';

// ── Nav item definitions ──────────────────────────────────────

interface NavItem {
  id: string;
  labelKey: string;
  icon: string;
  /** For parent routes, `path` is a function of sid */
  path: string | ((sid: string) => string);
}

const PARENT_NAV: NavItem[] = [
  { id: 'dashboard',  labelKey: 'nav:dashboard',  icon: '🏠', path: (sid) => `/parent/students/${sid}/dashboard` },
  { id: 'grades',     labelKey: 'nav:grades',     icon: '📊', path: (sid) => `/parent/students/${sid}/grades` },
  { id: 'examScores', labelKey: 'nav:examScores', icon: '📝', path: (sid) => `/parent/students/${sid}/exam-scores` },
  { id: 'periodMetrics', labelKey: 'nav:periodMetrics', icon: '📈', path: (sid) => `/parent/students/${sid}/period-metrics` },
  { id: 'messages',   labelKey: 'nav:messages',   icon: '💬', path: (sid) => `/parent/students/${sid}/discussions` },
  { id: 'reports',    labelKey: 'nav:reports',    icon: '📋', path: (sid) => `/parent/students/${sid}/reports` },
  { id: 'notices',    labelKey: 'nav:notices',    icon: '📢', path: (sid) => `/parent/students/${sid}/tasks` },
  { id: 'leave',      labelKey: 'nav:leave',      icon: '🗒', path: (sid) => `/parent/students/${sid}/leave` },
  { id: 'incidents',  labelKey: 'nav:incidents',  icon: '🚨', path: (sid) => `/parent/students/${sid}/incidents` },
  { id: 'resources',  labelKey: 'nav:resources',  icon: '📚', path: (sid) => `/parent/students/${sid}/resources` },
];

const TEACHER_NAV: NavItem[] = [
  { id: 'dashboard',    labelKey: 'nav:dashboard',    icon: '🏠', path: '/teacher/dashboard' },
  { id: 'messages',     labelKey: 'nav:messages',     icon: '💬', path: '/teacher/messages' },
  { id: 'announcements', labelKey: 'nav:announcements', icon: '📢', path: '/teacher/posts' },
  { id: 'reports',      labelKey: 'nav:reports',      icon: '📋', path: '/teacher/reports' },
  { id: 'tags',         labelKey: 'nav:tags',         icon: '🏷', path: '/teacher/tags' },
  { id: 'examScores',   labelKey: 'nav:examScores',   icon: '📝', path: '/teacher/exam-scores' },
  { id: 'periodMetrics', labelKey: 'nav:periodMetrics', icon: '📈', path: '/teacher/period-metrics' },
  { id: 'aiReports',    labelKey: 'nav:aiReports',    icon: '🤖', path: '/teacher/ai-reports' },
  { id: 'find-student', labelKey: 'nav:findStudent',  icon: '🔍', path: '/teacher/find-student' },
];

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav:dashboard',  icon: '🏠', path: '/admin/dashboard' },
  { id: 'users',     labelKey: 'nav:users',      icon: '🧾', path: '/admin/users' },
  { id: 'teachers',  labelKey: 'nav:teachers',   icon: '👨‍🏫', path: '/admin/teachers' },
  { id: 'classes',   labelKey: 'nav:classes',    icon: '🏫', path: '/admin/classes' },
  { id: 'students',  labelKey: 'nav:students',   icon: '🎒', path: '/admin/students' },
  { id: 'parents',   labelKey: 'nav:parents',    icon: '👪', path: '/admin/parents' },
  { id: 'assignments', labelKey: 'nav:teachingAssignments', icon: '🧩', path: '/admin/assignments/teaching' },
  { id: 'systemTags', labelKey: 'nav:systemTags', icon: '🏷', path: '/admin/tags/system' },
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
  const { role, toggleTheme, theme, language, setLanguage, unreadMessageCount, unreadNoticeCount, firstStudentUuid } = useApp();
  const { t } = useTranslation(['common', 'nav']);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const params = useParams<{ sid?: string }>();
  const sid = params.sid ?? firstStudentUuid ?? 's-aiden-01';

  const navItems = role === 'admin' ? ADMIN_NAV : role === 'parent' ? PARENT_NAV : TEACHER_NAV;

  const getPath = (item: NavItem) =>
    typeof item.path === 'function' ? item.path(sid) : item.path;

  const isActive = (item: NavItem) => pathname === getPath(item) || pathname.startsWith(getPath(item) + '/');

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoMark size={28} />
            <div>
              <div className="font-serif" style={{ fontSize: 15, color: 'var(--tx)', fontWeight: 400, lineHeight: 1 }}>Academy</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Linker</div>
            </div>
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
              {item.id === 'notices' && unreadNoticeCount > 0 && (
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
