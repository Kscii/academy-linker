import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectOption } from '@/types/api';

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  clearLabel?: string;
};

export function SearchableSelect({ value, onChange, options, placeholder, disabled = false, clearLabel }: Props) {
  const { t } = useTranslation('app');
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const current = options.find(option => option.value === value) ?? null;
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter(option => {
      const haystacks = [option.label, option.value, ...Object.values(option.meta ?? {}).map(String)];
      return haystacks.some(item => item.toLowerCase().includes(keyword));
    });
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const select = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        className="input-field"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          width: '100%',
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: current ? 'var(--tx)' : 'var(--tx3)' }}>
          {current?.label ?? placeholder}
        </span>
        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--card)',
            border: '1px solid var(--bd)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 80,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--bd)' }}>
            <input
              autoFocus
              className="input-field"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t('actions.searching')}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {clearLabel && (
              <button
                type="button"
                onClick={() => select('')}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  color: value ? 'var(--tx)' : 'var(--a1)',
                }}
              >
                {clearLabel}
              </button>
            )}
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--tx3)', textAlign: 'center' }}>
                {t('common.noResults')}
              </div>
            ) : (
              filtered.map(option => {
                const description = option.meta?.description != null ? String(option.meta.description) : '';
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => select(option.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: option.value === value ? 'var(--bg2)' : 'transparent',
                      textAlign: 'left',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      color: option.value === value ? 'var(--a1)' : 'var(--tx)',
                    }}
                  >
                    <div style={{ fontWeight: option.value === value ? 700 : 500 }}>{option.label}</div>
                    {description ? (
                      <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{description}</div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
