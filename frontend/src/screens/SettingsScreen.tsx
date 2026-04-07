// ============================================================
// SettingsScreen — appearance, language, accessibility, AI, notifications
// ============================================================

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useTranslation } from 'react-i18next';
import { LanguageCombobox } from '@/components/layout/LanguageCombobox';
import { settingsApi } from '@/lib/api';

// ── Simple localStorage-backed settings ───────────────────────

function useBoolSetting(key: string, defaultValue = true) {
  const stored = localStorage.getItem(key);
  const [value, setValue] = useState(stored !== null ? stored === 'true' : defaultValue);

  const set = (v: boolean) => {
    setValue(v);
    localStorage.setItem(key, String(v));
  };
  return [value, set] as const;
}

// ── Toggle row component ──────────────────────────────────────

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = label.replace(/\s+/g, '-').toLowerCase();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', borderBottom: '1px solid var(--bd)',
    }}>
      <div style={{ flex: 1, paddingRight: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{label}</div>
        {description && (
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{description}</div>
        )}
      </div>
      <label
        htmlFor={id}
        style={{
          position: 'relative', display: 'inline-block',
          width: 40, height: 22, flexShrink: 0, cursor: 'pointer',
        }}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }}
        />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 11,
          background: checked ? 'var(--a1)' : 'var(--bg2)',
          border: '1px solid var(--bd)',
          transition: 'background 0.2s',
        }} />
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#fff' : 'var(--tx3)',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </label>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── SettingsScreen ────────────────────────────────────────────

export function SettingsScreen() {
  const { theme, toggleTheme, language, setLanguage } = useApp();
  const { t } = useTranslation('settings');

  const [highContrast, setHighContrastState] = useBoolSetting('highContrast', false);
  const [ttsEnabled, setTtsEnabled] = useBoolSetting('ttsEnabled', false);
  const [aiEnabled, setAiEnabled] = useBoolSetting('aiEnabled', true);
  const [aiDrafts, setAiDrafts] = useBoolSetting('aiDrafts', true);
  const [notifReports, setNotifReports] = useBoolSetting('notifReports', true);
  const [notifAnnouncements, setNotifAnnouncements] = useBoolSetting('notifAnnouncements', true);
  const [notifMessages, setNotifMessages] = useBoolSetting('notifMessages', true);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsApi.get().then(res => {
      const data = res.data;
      if (data.language) setLanguage(data.language.slice(0, 2));
      setHighContrastState(data.high_contrast_mode);
      setTtsEnabled(data.tts_enabled);
      setAiEnabled(data.ai_auto_translate_enabled);
      setNotifReports(data.email_digest_enabled);
      setNotifAnnouncements(data.email_post_notification_enabled);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply high contrast class to <html>
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  const handleSave = async () => {
    try {
      await settingsApi.update({
        language,
        theme: theme === 'night' ? 'dark' : 'light',
        high_contrast_mode: highContrast,
        tts_enabled: ttsEnabled,
        email_digest_enabled: notifReports,
        email_post_notification_enabled: notifAnnouncements || notifMessages,
        ai_auto_translate_enabled: aiEnabled,
      });
    } catch {
      // Backend offline — localStorage already saved
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isNight = theme === 'night';

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 28, color: 'var(--tx)', marginBottom: 4 }}>
          {t('title')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('subtitle')}</div>
      </div>

      {/* Appearance */}
      <Section title={t('appearance')}>
        {/* Theme */}
        <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--bd)', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>{t('theme')}</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 10 }}>{t('themeDesc')}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['day', 'night'] as const).map(m => (
              <button
                key={m}
                onClick={() => { if ((m === 'night') !== isNight) toggleTheme(); }}
                style={{
                  flex: 1, padding: '10px 0',
                  background: (m === 'night') === isNight ? 'var(--a1)' : 'var(--bg2)',
                  color: (m === 'night') === isNight ? '#fff' : 'var(--tx2)',
                  border: '1px solid var(--bd)',
                  borderRadius: 8, cursor: 'pointer', fontWeight: 700,
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {m === 'day' ? '☀️' : '🌙'} {t(m === 'day' ? 'dayMode' : 'nightMode')}
              </button>
            ))}
          </div>
        </div>

        <ToggleRow
          label={t('highContrast')}
          description={t('highContrastDesc')}
          checked={highContrast}
          onChange={setHighContrastState}
        />
      </Section>

      {/* Language */}
      <Section title={t('language')}>
        <div style={{ paddingBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>{t('languageLabel')}</div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 10 }}>{t('languageDesc')}</div>
          <LanguageCombobox value={language} onChange={setLanguage} />
        </div>
      </Section>

      {/* Accessibility */}
      <Section title={t('accessibility')}>
        <ToggleRow
          label={t('tts')}
          description={t('ttsDesc')}
          checked={ttsEnabled}
          onChange={setTtsEnabled}
        />
      </Section>

      {/* AI Preferences */}
      <Section title={t('aiPreferences')}>
        <ToggleRow
          label={t('aiEnabled')}
          description={t('aiEnabledDesc')}
          checked={aiEnabled}
          onChange={setAiEnabled}
        />
        <ToggleRow
          label={t('aiDrafts')}
          description={t('aiDraftsDesc')}
          checked={aiDrafts}
          onChange={setAiDrafts}
        />
      </Section>

      {/* Email Notifications */}
      <Section title={t('notifications')}>
        <ToggleRow
          label={t('notifReports')}
          description={t('notifReportsDesc')}
          checked={notifReports}
          onChange={setNotifReports}
        />
        <ToggleRow
          label={t('notifAnnouncements')}
          description={t('notifAnnouncementsDesc')}
          checked={notifAnnouncements}
          onChange={setNotifAnnouncements}
        />
        <ToggleRow
          label={t('notifMessages')}
          description={t('notifMessagesDesc')}
          checked={notifMessages}
          onChange={setNotifMessages}
        />
      </Section>

      {/* Save button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
        <button className="btn-primary" onClick={handleSave} style={{ width: 'auto', padding: '10px 28px' }}>
          {t('saveSettings')}
        </button>
        {saved && (
          <span style={{ fontSize: 13, color: 'var(--a2)', fontWeight: 700 }}>
            ✓ {t('saved')}
          </span>
        )}
      </div>
    </div>
  );
}
