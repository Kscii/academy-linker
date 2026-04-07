// ============================================================
// Parent LeaveRequestsScreen — list and create leave requests
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { parent as parentApi } from '@/lib/api';
import type { LeaveRequest, LeaveRequestStatus, LeaveRequestType, PaginationMeta } from '@/types/api';

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

export function ParentLeaveRequestsScreen() {
  const { t } = useTranslation('portal');
  const { sid } = useParams<{ sid: string }>();
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'all' | LeaveRequestStatus>('all');
  const [form, setForm] = useState<{ type: LeaveRequestType; start_date: string; end_date: string; reason: string }>({
    type: 'sick',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    if (!sid) return;
    const res = await parentApi.getLeaveRequests(sid, { page, page_size: 20, status });
    setItems(res.data);
    setMeta(res.meta);
  };

  useEffect(() => {
    void loadItems();
  }, [page, sid, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!sid || !form.start_date || !form.end_date) return;
    setSaving(true);
    try {
      await parentApi.createLeaveRequest(sid, {
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason || null,
      });
      setForm({ type: 'sick', start_date: '', end_date: '', reason: '' });
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('leaveRequestsTitle')}</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('requestsCount', { count: meta.total })}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <select className="input-field" value={status} onChange={e => { setPage(1); setStatus(e.target.value as typeof status); }}>
              <option value="all">{t('allStatuses')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="approved">{t('approved')}</option>
              <option value="rejected">{t('rejected')}</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item.uuid} className="card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{item.type}</div>
                  <span className="badge" style={{ fontSize: 11 }}>{item.status}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                  {item.start_date}{item.start_date !== item.end_date ? ` - ${item.end_date}` : ''}
                </div>
                {item.reason && <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>{item.reason}</div>}
                {item.school_note && <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>{t('schoolNote')}: {item.school_note}</div>}
              </div>
            ))}
            {items.length === 0 && <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t('noLeaveRequestsFound')}</div>}
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
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('submitRequest')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select className="input-field" value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as LeaveRequestType }))}>
              <option value="sick">{t('sick')}</option>
              <option value="personal">{t('personal')}</option>
              <option value="family">{t('family')}</option>
              <option value="other">{t('other')}</option>
            </select>
            <div />
            <input className="input-field" type="date" value={form.start_date} onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))} />
            <input className="input-field" type="date" value={form.end_date} onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))} />
          </div>
          <textarea className="input-field" rows={5} placeholder={t('reasonOptional')} value={form.reason} onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => void handleCreate()} disabled={saving || !form.start_date || !form.end_date}>
              {saving ? t('submitting') : t('submitRequest')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
