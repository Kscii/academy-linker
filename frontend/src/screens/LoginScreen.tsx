// ============================================================
// LoginScreen — split layout: form (left) + illustration (right)
// Day/Night illustrations show overlapping school-home circles
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { LanguageCombobox } from '@/components/layout/LanguageCombobox';
import { LogoMark } from '@/components/LogoMark';

// ── Building silhouettes (used inside SVG via clipPath) ───────

function SchoolSilhouette({ color = '#fff' }: { color?: string }) {
  return (
    <g fill={color}>
      {/* Main body + bell tower merged shape */}
      <polygon points="-44,-4 -14,-4 -14,-44 -17,-44 0,-62 17,-44 14,-44 14,-4 44,-4 44,44 -44,44" />
      {/* Flag pole */}
      <rect x="-1.5" y="-74" width="3" height="13" />
      {/* Flag */}
      <polygon points="0,-74 18,-68 0,-62" />
      {/* Door indent */}
      <rect x="-10" y="20" width="20" height="24" fill={color} opacity="0.55" />
      {/* Window row */}
      <rect x="-36" y="2" width="13" height="12" fill={color} opacity="0.55" />
      <rect x="-6" y="2" width="12" height="12" fill={color} opacity="0.55" />
      <rect x="23" y="2" width="13" height="12" fill={color} opacity="0.55" />
    </g>
  );
}

function HouseSilhouette({ color = '#fff' }: { color?: string }) {
  return (
    <g fill={color}>
      {/* House body + roof */}
      <polygon points="0,-44 42,-8 42,44 -42,44 -42,-8" />
      {/* Chimney */}
      <rect x="16" y="-58" width="10" height="28" />
      {/* Door indent */}
      <rect x="-10" y="18" width="20" height="26" fill={color} opacity="0.55" />
      {/* Window left */}
      <rect x="-32" y="-2" width="14" height="13" fill={color} opacity="0.55" />
      {/* Window right */}
      <rect x="18" y="-2" width="14" height="13" fill={color} opacity="0.55" />
    </g>
  );
}

// ── Sunburst helper ───────────────────────────────────────────

function Sunburst({ cx, cy, r1, r2, rays, color, opacity }: {
  cx: number; cy: number; r1: number; r2: number;
  rays: number; color: string; opacity: number;
}) {
  return (
    <g opacity={opacity}>
      {Array.from({ length: rays }, (_, i) => {
        const a = (i / rays) * Math.PI * 2;
        const extra = i % 4 === 0 ? 40 : i % 2 === 0 ? 18 : 0;
        return (
          <line
            key={i}
            x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)}
            x2={cx + (r2 + extra) * Math.cos(a)} y2={cy + (r2 + extra) * Math.sin(a)}
            stroke={color}
            strokeWidth={i % 4 === 0 ? 1.6 : 0.8}
          />
        );
      })}
    </g>
  );
}

// ── Day illustration ──────────────────────────────────────────

function DayIllustration() {
  const cx1 = 205, cy1 = 370, cx2 = 365, cy2 = 370, r = 128;
  return (
    <svg viewBox="0 0 570 900" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="dayBg" cx="55%" cy="65%" r="70%">
          <stop offset="0%"   stopColor="#F2C49A" />
          <stop offset="40%"  stopColor="#EDD4B8" />
          <stop offset="100%" stopColor="#C5D6E2" />
        </radialGradient>
        <radialGradient id="dayCirc1" cx="38%" cy="38%" r="65%">
          <stop offset="0%"   stopColor="#F09A5A" />
          <stop offset="100%" stopColor="#D46830" />
        </radialGradient>
        <radialGradient id="dayCirc2" cx="62%" cy="38%" r="65%">
          <stop offset="0%"   stopColor="#F09A5A" />
          <stop offset="100%" stopColor="#D46830" />
        </radialGradient>
        <clipPath id="dc1"><circle cx={cx1} cy={cy1} r={r} /></clipPath>
        <clipPath id="dc2"><circle cx={cx2} cy={cy2} r={r} /></clipPath>
      </defs>

      {/* Background */}
      <rect width="570" height="900" fill="url(#dayBg)" />

      {/* Sunburst from overlap point */}
      <Sunburst cx={285} cy={370} r1={136} r2={310} rays={32} color="#C86030" opacity={0.4} />

      {/* Left circle — school */}
      <circle cx={cx1} cy={cy1} r={r} fill="url(#dayCirc1)" />
      <g clipPath="url(#dc1)">
        <g transform={`translate(${cx1},${cy1 + 8})`}>
          <SchoolSilhouette color="rgba(255,245,232,0.90)" />
        </g>
      </g>
      <circle cx={cx1} cy={cy1} r={r}     fill="none" stroke="#B85828" strokeWidth="1.8" />
      <circle cx={cx1} cy={cy1} r={r + 20} fill="none" stroke="#C87040" strokeWidth="0.7" strokeOpacity="0.45" />

      {/* Right circle — home */}
      <circle cx={cx2} cy={cy2} r={r} fill="url(#dayCirc2)" opacity="0.88" />
      <g clipPath="url(#dc2)">
        <g transform={`translate(${cx2},${cy2 + 10})`}>
          <HouseSilhouette color="rgba(255,245,232,0.90)" />
        </g>
      </g>
      <circle cx={cx2} cy={cy2} r={r}     fill="none" stroke="#B85828" strokeWidth="1.8" />
      <circle cx={cx2} cy={cy2} r={r + 20} fill="none" stroke="#C87040" strokeWidth="0.7" strokeOpacity="0.45" />

      {/* Center overlap outline (vesica suggestion) */}
      <circle cx={cx1} cy={cy1} r={r} fill="none" stroke="#FF9A60" strokeWidth="0.6" strokeOpacity="0.5" />
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke="#FF9A60" strokeWidth="0.6" strokeOpacity="0.5" />

      {/* Bottom tagline area */}
      <text x="285" y="820" textAnchor="middle"
        fontFamily="Georgia, serif" fontSize="18" fill="#8A5030" fillOpacity="0.5"
        letterSpacing="3">
        BRIDGING SCHOOL &amp; HOME
      </text>
    </svg>
  );
}

// ── Night illustration ────────────────────────────────────────

function NightIllustration() {
  const cx1 = 205, cy1 = 370, cx2 = 365, cy2 = 370, r = 118;
  return (
    <svg viewBox="0 0 570 900" preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <radialGradient id="nightBg" cx="50%" cy="45%" r="70%">
          <stop offset="0%"   stopColor="#16182E" />
          <stop offset="100%" stopColor="#07091A" />
        </radialGradient>
        {/* Corona glow around the eclipse zone */}
        <radialGradient id="corona" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#E07838" stopOpacity="0"   />
          <stop offset="75%" stopColor="#E07838" stopOpacity="0.35" />
          <stop offset="90%" stopColor="#F4A850" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#F4A850" stopOpacity="0"  />
        </radialGradient>
        <clipPath id="nc1"><circle cx={cx1} cy={cy1} r={r} /></clipPath>
        <clipPath id="nc2"><circle cx={cx2} cy={cy2} r={r} /></clipPath>
      </defs>

      {/* Background */}
      <rect width="570" height="900" fill="url(#nightBg)" />

      {/* Eclipse corona (large atmospheric glow) */}
      <circle cx="285" cy="370" r="300" fill="url(#corona)" />

      {/* Glow rays */}
      <Sunburst cx={285} cy={370} r1={140} r2={295} rays={24} color="#E07838" opacity={0.22} />

      {/* Left circle — school (dark, glowing rim) */}
      <circle cx={cx1} cy={cy1} r={r} fill="#111328" />
      <circle cx={cx1} cy={cy1} r={r} fill="none" stroke="#E07838" strokeWidth="2.4" strokeOpacity="0.75" />
      <g clipPath="url(#nc1)">
        <g transform={`translate(${cx1},${cy1 + 8})`}>
          <SchoolSilhouette color="rgba(240,215,185,0.82)" />
        </g>
      </g>
      {/* Inner rim glow */}
      <circle cx={cx1} cy={cy1} r={r - 3} fill="none" stroke="#F4A850" strokeWidth="1" strokeOpacity="0.3" />
      <circle cx={cx1} cy={cy1} r={r + 22} fill="none" stroke="#E07838" strokeWidth="0.7" strokeOpacity="0.22" />

      {/* Right circle — home */}
      <circle cx={cx2} cy={cy2} r={r} fill="#111328" />
      <circle cx={cx2} cy={cy2} r={r} fill="none" stroke="#E07838" strokeWidth="2.4" strokeOpacity="0.75" />
      <g clipPath="url(#nc2)">
        <g transform={`translate(${cx2},${cy2 + 10})`}>
          <HouseSilhouette color="rgba(240,215,185,0.82)" />
        </g>
      </g>
      <circle cx={cx2} cy={cy2} r={r - 3} fill="none" stroke="#F4A850" strokeWidth="1" strokeOpacity="0.3" />
      <circle cx={cx2} cy={cy2} r={r + 22} fill="none" stroke="#E07838" strokeWidth="0.7" strokeOpacity="0.22" />

      {/* Stars scattered */}
      {[
        [60,80],[140,50],[420,90],[500,60],[80,200],[530,180],
        [45,500],[510,480],[90,720],[480,740],[250,140],[320,820],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.5 : 1}
          fill="white" fillOpacity={0.3 + (i % 4) * 0.12} />
      ))}

      {/* Bottom tagline */}
      <text x="285" y="820" textAnchor="middle"
        fontFamily="Georgia, serif" fontSize="18" fill="#E07838" fillOpacity="0.4"
        letterSpacing="3">
        BRIDGING SCHOOL &amp; HOME
      </text>
    </svg>
  );
}

// ── Main LoginScreen ──────────────────────────────────────────

export function LoginScreen() {
  const { login, toggleTheme, theme, language, setLanguage } = useApp();
  const { t } = useTranslation('login');
  const navigate = useNavigate();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError(t('invalidCredentials')); return; }
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, rememberMe);
      if (result.role === 'parent') {
        navigate(`/parent/students/${result.firstStudentUuid}/dashboard`, { replace: true });
      } else if (result.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/teacher/dashboard', { replace: true });
      }
    } catch {
      setError(t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100svh', overflow: 'hidden' }}>

      {/* ── Left panel: form ─────────────────────────────── */}
      <div style={{
        width: '44%', minWidth: 340,
        display: 'flex', flexDirection: 'column',
        background: 'var(--card)',
        overflowY: 'auto',
        position: 'relative', zIndex: 1,
        boxShadow: '6px 0 40px rgba(0,0,0,0.10)',
      }}>
        {/* Top bar: logo + theme toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 32px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoMark size={28} />
            <span className="font-serif" style={{ fontSize: 14, color: 'var(--tx)', fontWeight: 400 }}>
              Academy Linker
            </span>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--bd)',
              borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
              fontSize: 12, color: 'var(--tx2)', fontWeight: 700,
              fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {theme === 'day' ? '🌙' : '☀️'}
            {theme === 'day' ? t('nightMode', { ns: 'common' }) : t('dayMode', { ns: 'common' })}
          </button>
        </div>

        {/* Form — vertically centered */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px' }}>
          <div style={{ width: '100%', maxWidth: 360 }}>

            {/* Heading */}
            <div style={{ marginBottom: 32 }}>
              <div className="font-serif" style={{ fontSize: 30, color: 'var(--tx)', marginBottom: 6 }}>
                Welcome back 👋
              </div>
              <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                Bridging School &amp; Home
              </div>
            </div>

            {/* Language selector */}
            <div style={{ marginBottom: 20 }}>
              <LanguageCombobox value={language} onChange={setLanguage} />
            </div>

            {/* Email */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)', display: 'block', marginBottom: 6 }}>
                {t('emailLabel')}
              </label>
              <input
                className="input-field"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)', display: 'block', marginBottom: 6 }}>
                {t('passwordLabel')}
              </label>
              <input
                className="input-field"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                autoComplete="current-password"
                onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
              />
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <input
                type="checkbox" id="remember"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--a1)', cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ fontSize: 13, color: 'var(--tx2)', cursor: 'pointer' }}>
                {t('rememberMe')}
              </label>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                fontSize: 13, color: 'var(--warn)',
              }}>
                {error}
              </div>
            )}

            {/* Sign in button */}
            <button
              className="btn-primary"
              onClick={handleLogin}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? t('signingIn') : t('signIn')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right panel: illustration ─────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {theme === 'day' ? <DayIllustration /> : <NightIllustration />}
      </div>
    </div>
  );
}
