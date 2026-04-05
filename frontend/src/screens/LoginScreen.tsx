// ============================================================
// LoginScreen — role selection, email/password, language combobox
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { LanguageCombobox } from '@/components/layout/LanguageCombobox';
import { LogoMark } from '@/components/LogoMark';

// ── Decorative background SVG ─────────────────────────────────

function LoginDecor() {
  return (
    <svg
      viewBox="0 0 800 300"
      fill="none"
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        width: '100%', height: 300, pointerEvents: 'none', opacity: 0.18,
      }}
    >
      <circle cx="100" cy="200" r="120" stroke="var(--a1)" strokeWidth="1.5" />
      <circle cx="300" cy="280" r="80"  stroke="var(--a2)" strokeWidth="1.5" />
      <circle cx="500" cy="180" r="100" stroke="var(--a3)" strokeWidth="1.5" />
      <circle cx="700" cy="260" r="90"  stroke="var(--a4)" strokeWidth="1.5" />
      <circle cx="650" cy="100" r="60"  stroke="var(--a1)" strokeWidth="1"   />
      <line x1="200" y1="200" x2="300" y2="250" stroke="var(--tx3)" strokeWidth="1" />
      <line x1="380" y1="200" x2="500" y2="180" stroke="var(--tx3)" strokeWidth="1" />
      <line x1="580" y1="200" x2="650" y2="130" stroke="var(--tx3)" strokeWidth="1" />
    </svg>
  );
}

export function LoginScreen() {
  const { login, toggleTheme, theme, language, setLanguage } = useApp();
  const { t } = useTranslation('login');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('invalidCredentials'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, rememberMe);
      if (result.role === 'parent') {
        navigate(`/parent/students/${result.firstStudentUuid}/dashboard`, { replace: true });
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
    <div className="login-screen">
      <LoginDecor />

      {/* Top-right theme toggle */}
      <button
        onClick={toggleTheme}
        style={{
          position: 'absolute', top: 20, right: 20,
          background: 'var(--card)', border: '1px solid var(--bd)',
          borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontWeight: 700,
          fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        {theme === 'day' ? '🌙' : '☀️'} {theme === 'day' ? 'Night' : 'Day'}
      </button>

      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <LogoMark size={56} />
          </div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>
            Academy Linker
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
            Bridging School &amp; Home
          </div>
        </div>

        {/* Language combobox */}
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
            onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
          />
        </div>

        {/* Remember me */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <input
            type="checkbox"
            id="remember"
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
  );
}
