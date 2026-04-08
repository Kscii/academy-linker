// ============================================================
// LanguageCombobox — searchable language selector dropdown
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useEscapeKey } from '@/lib/keyboard';

export const LANGUAGES = [
  { code: 'en', nativeName: 'English',           englishName: 'English' },
  { code: 'zh', nativeName: '中文',               englishName: 'Chinese' },
  { code: 'vi', nativeName: 'Tiếng Việt',        englishName: 'Vietnamese' },
  { code: 'ar', nativeName: 'العربية',            englishName: 'Arabic' },
  { code: 'fr', nativeName: 'Français',           englishName: 'French' },
  { code: 'es', nativeName: 'Español',            englishName: 'Spanish' },
  { code: 'pt', nativeName: 'Português',          englishName: 'Portuguese' },
  { code: 'de', nativeName: 'Deutsch',            englishName: 'German' },
  { code: 'ja', nativeName: '日本語',              englishName: 'Japanese' },
  { code: 'ko', nativeName: '한국어',              englishName: 'Korean' },
  { code: 'it', nativeName: 'Italiano',           englishName: 'Italian' },
  { code: 'hi', nativeName: 'हिन्दी',              englishName: 'Hindi' },
  { code: 'th', nativeName: 'ภาษาไทย',            englishName: 'Thai' },
  { code: 'ms', nativeName: 'Bahasa Melayu',     englishName: 'Malay' },
  { code: 'id', nativeName: 'Bahasa Indonesia',  englishName: 'Indonesian' },
  { code: 'tl', nativeName: 'Filipino',           englishName: 'Filipino' },
];

interface Props {
  value: string;
  onChange: (lang: string) => void;
  /** compact: shows shortened trigger for sidebar use */
  compact?: boolean;
}

export function LanguageCombobox({ value, onChange, compact = false }: Props) {
  const { t } = useTranslation('app');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === value) ?? LANGUAGES[0];

  const filtered = LANGUAGES.filter(l =>
    l.nativeName.toLowerCase().includes(search.toLowerCase()) ||
    l.englishName.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEscapeKey({
    enabled: open,
    allowInInput: true,
    onEscape: () => {
      setOpen(false);
      setSearch('');
    },
  });

  const select = (code: string) => {
    onChange(code);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 4 : 8,
          width: '100%',
          background: 'var(--bg2)', border: '1px solid var(--bd)',
          borderRadius: 8, padding: compact ? '6px 10px' : '8px 12px',
          cursor: 'pointer', fontSize: compact ? 12 : 13,
          color: 'var(--tx2)', fontWeight: 600,
          fontFamily: 'var(--font-body)',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--a1)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd)')}
      >
        <span style={{ fontSize: 14 }}>🌐</span>
        <span style={{ flex: 1, textAlign: 'left' }}>
          {current.nativeName}
        </span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? '▴' : '▾'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: compact ? '100%' : 'auto',
            top: compact ? 'auto' : '100%',
            left: 0, right: 0,
            marginBottom: compact ? 4 : 0,
            marginTop: compact ? 0 : 4,
            background: 'var(--card)',
            border: '1px solid var(--bd)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            zIndex: 200,
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('languageCombobox.searchPlaceholder')}
              style={{
                width: '100%', padding: '6px 10px',
                background: 'var(--bg2)', border: '1px solid var(--bd)',
                borderRadius: 6, fontSize: 12, color: 'var(--tx)',
                fontFamily: 'var(--font-body)', outline: 'none',
                boxSizing: 'border-box',
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                if (e.key === 'Enter' && filtered.length > 0) select(filtered[0].code);
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--tx3)', textAlign: 'center' }}>
                {t('common.noResults')}
              </div>
            ) : (
              filtered.map(lang => (
                <div
                  key={lang.code}
                  onClick={() => select(lang.code)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                    background: lang.code === value ? 'var(--bg2)' : 'transparent',
                    color: lang.code === value ? 'var(--a1)' : 'var(--tx)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (lang.code !== value) e.currentTarget.style.background = 'var(--bg2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = lang.code === value ? 'var(--bg2)' : 'transparent'; }}
                >
                  <span style={{ fontWeight: lang.code === value ? 700 : 400 }}>{lang.nativeName}</span>
                  <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{lang.englishName}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
