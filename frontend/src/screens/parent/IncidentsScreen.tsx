// ============================================================
// Parent IncidentsScreen — list and create incident reports
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { parent as parentApi } from '@/lib/api';
import type { IncidentReport, IncidentType, PaginationMeta } from '@/types/api';

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

export function ParentIncidentsScreen() {
  const { t } = useTranslation('portal');
  const { sid } = useParams<{ sid: string }>();
  const [items, setItems] = useState<IncidentReport[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ incident_type: IncidentType; description: string; is_anonymous: boolean }>({
    incident_type: 'bullying',
    description: '',
    is_anonymous: false,
  });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    if (!sid) return;
    const res = await parentApi.getIncidentReports(sid, { page, page_size: 20 });
    setItems(res.data);
    setMeta(res.meta);
  };

  useEffect(() => {
    void loadItems();
  }, [page, sid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!sid || !form.description.trim()) return;
    setSaving(true);
    try {
      await parentApi.createIncidentReport(sid, form);
      setForm({ incident_type: 'bullying', description: '', is_anonymous: false });
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('incidentsTitle')}</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('reportsCount', { count: meta.total })}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item.uuid} className="card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{item.incident_type}</div>
                  <span className="badge" style={{ fontSize: 11 }}>{item.status}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{item.submitted_at.slice(0, 10)}</div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>{item.description}</div>
              </div>
            ))}
            {items.length === 0 && <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t('noIncidentReportsFound')}</div>}
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

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('submitReport')}</div>
          <div style={{ display: 'grid', gap: 10, marginBottom: 10 }}>
            <select className="input-field" value={form.incident_type} onChange={e => setForm(prev => ({ ...prev, incident_type: e.target.value as IncidentType }))}>
              <option value="bullying">{t('bullying')}</option>
              <option value="drugs">{t('drugs')}</option>
              <option value="misconduct">{t('misconduct')}</option>
              <option value="other">{t('other')}</option>
            </select>
            <textarea className="input-field" rows={6} placeholder={t('describeWhatHappened')} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--tx2)' }}>
              <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm(prev => ({ ...prev, is_anonymous: e.target.checked }))} />
              {t('submitAnonymously')}
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => void handleCreate()} disabled={saving || !form.description.trim()}>
              {saving ? t('submitting') : t('submitReport')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
