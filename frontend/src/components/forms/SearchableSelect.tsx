import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelectOption } from '@/types/api';

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowClear?: boolean;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled = false,
  allowClear = false,
}: Props) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find(option => option.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter(option => {
      const metaText = Object.values(option.meta ?? {}).join(' ').toLowerCase();
      return option.label.toLowerCase().includes(keyword)
        || option.value.toLowerCase().includes(keyword)
        || metaText.includes(keyword);
    });
  }, [options, search]);

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
        onClick={() => !disabled && setOpen(current => !current)}
        style={{
          width: '100%',
          minHeight: 42,
          borderRadius: 10,
          border: '1px solid var(--bd)',
          background: disabled ? 'var(--bg2)' : 'var(--card)',
          color: selected ? 'var(--tx)' : 'var(--tx3)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '0 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder}
        </span>
        <span style={{ color: 'var(--tx3)', fontSize: 11 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 40,
            background: 'var(--card)',
            border: '1px solid var(--bd)',
            borderRadius: 12,
            boxShadow: '0 16px 32px rgba(0,0,0,0.14)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 8, borderBottom: '1px solid var(--bd)' }}>
            <input
              autoFocus
              className="input-field"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder ?? t('search')}
            />
          </div>

          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {allowClear && value ? (
              <button
                type="button"
                onClick={() => select('')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 0,
                  borderBottom: '1px solid var(--bd)',
                  padding: '10px 12px',
                  color: 'var(--tx2)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {placeholder}
              </button>
            ) : null}

            {filtered.length === 0 ? (
              <div style={{ padding: '14px 12px', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
                {emptyText ?? t('noResults')}
              </div>
            ) : (
              filtered.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => select(option.value)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: option.value === value ? 'var(--bg2)' : 'transparent',
                    border: 0,
                    borderBottom: '1px solid var(--bd)',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <div style={{ color: option.value === value ? 'var(--a1)' : 'var(--tx)', fontWeight: 600, fontSize: 13 }}>
                    {option.label}
                  </div>
                  {option.meta ? (
                    <div style={{ color: 'var(--tx3)', fontSize: 11, marginTop: 2 }}>
                      {Object.values(option.meta).filter(v => v !== null && v !== '').join(' · ')}
                    </div>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
