// ============================================================
// ResourcesScreen — resource library backed by API
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resourcesApi } from '@/lib/api';
import type { PaginationMeta, ResourceCategory, ResourceDetail, ResourceListItem } from '@/types/api';

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

export function ResourcesScreen() {
  const { t } = useTranslation('portal');
  const [items, setItems] = useState<ResourceListItem[]>([]);
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [selectedUuid, setSelectedUuid] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    resourcesApi.getCategories({ audience_role: 'parent' }).then(res => {
      setCategories(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    resourcesApi.getList({
      page,
      page_size: 20,
      audience_role: 'parent',
      category: category || undefined,
      keyword: keyword.trim() || undefined,
      sort: 'published_at_desc',
    }).then(res => {
      setItems(res.data);
      setMeta(res.meta);
      setSelectedUuid(prev => (res.data.some(item => item.uuid === prev) ? prev : res.data[0]?.uuid ?? ''));
    }).catch(() => {});
  }, [category, keyword, page]);

  useEffect(() => {
    if (!selectedUuid) {
      setDetail(null);
      return;
    }
    resourcesApi.getDetail(selectedUuid).then(res => {
      setDetail(res.data);
    }).catch(() => {});
  }, [selectedUuid]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          {t('resourcesTitle')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {t('resourcesSubtitle')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
            <input className="input-field" placeholder={t('searchResources')} value={keyword} onChange={e => { setPage(1); setKeyword(e.target.value); }} />
            <select className="input-field" value={category} onChange={e => { setPage(1); setCategory(e.target.value); }}>
              <option value="">{t('allCategories')}</option>
              {categories.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div
                key={item.uuid}
                className="card-sm"
                style={{ cursor: 'pointer', borderColor: selectedUuid === item.uuid ? 'var(--a1)' : undefined }}
                onClick={() => setSelectedUuid(item.uuid)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{item.title}</div>
                  {item.is_pinned && <span className="badge" style={{ fontSize: 10 }}>{t('pinned')}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 6 }}>{item.category_label}</div>
                {item.summary && <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>{item.summary}</div>}
              </div>
            ))}
            {items.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '40px 0' }}>
                {t('noResourcesFound')}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
              {t('previous')}
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
              {t('next')}
            </button>
          </div>
        </div>

        <div className="card" style={{ minHeight: 520 }}>
          {detail ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div>
                  <div className="font-serif" style={{ fontSize: 24, color: 'var(--tx)', marginBottom: 6 }}>{detail.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{detail.category_label} · {detail.published_at.slice(0, 10)}</div>
                </div>
                {detail.external_url && (
                  <a className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', textDecoration: 'none' }} href={detail.external_url} target="_blank" rel="noreferrer">
                    {t('openLink')}
                  </a>
                )}
              </div>
              {detail.summary && <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, marginBottom: 16 }}>{detail.summary}</div>}
              <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                {detail.display_content_markdown}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '100px 0' }}>
              {t('selectResource')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
