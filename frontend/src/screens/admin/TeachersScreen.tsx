// ============================================================
// Admin TeachersScreen — list, create, edit teachers
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin as adminApi } from '@/lib/api';
import type { AdminUser, CreateUserRequest, PaginationMeta } from '@/types/api';

type TeacherRow = AdminUser & { phone_number: string | null };

type TeacherForm = Omit<CreateUserRequest, 'role'> & {
  uuid?: string;
  is_active?: boolean;
  phone_dirty?: boolean;
};

const EMPTY_FORM: TeacherForm = {
  display_name: '',
  email: '',
  password: '',
  phone_number: '',
  is_active: true,
  phone_dirty: false,
};

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

function toTeacherRow(item: AdminUser): TeacherRow {
  return { ...item, phone_number: null };
}

export function AdminTeachersScreen() {
  const { t } = useTranslation('app');
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [sort, setSort] = useState<'created_at_desc' | 'created_at_asc' | 'display_name_asc'>('display_name_asc');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<TeacherForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        page,
        page_size: 20,
        role: 'teacher',
        keyword: keyword.trim() || undefined,
        sort,
      });
      let rows = res.data.map(toTeacherRow);
      if (status !== 'all') {
        rows = rows.filter(item => item.is_active === (status === 'active'));
      }
      setTeachers(rows);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeachers();
  }, [page, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = async () => {
    setPage(1);
    await loadTeachers();
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setError('');
    setShowForm(true);
  };

  const openEdit = (teacher: TeacherRow) => {
    setForm({
      uuid: teacher.uuid,
      display_name: teacher.display_name,
      email: teacher.email,
      password: '',
      phone_number: '',
      is_active: teacher.is_active,
      phone_dirty: false,
    });
    setEditing(true);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim() || !form.email.trim()) {
      setError(t('adminTeachers.requiredNameEmail'));
      return;
    }
    if (!editing && !form.password.trim()) {
      setError(t('adminTeachers.requiredPassword'));
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editing && form.uuid) {
        const body: {
          display_name?: string | null;
          is_active?: boolean | null;
          phone_number?: string | null;
        } = {
          display_name: form.display_name.trim(),
          is_active: form.is_active ?? true,
        };
        if (form.phone_dirty) {
          body.phone_number = form.phone_number?.trim() || null;
        }
        await adminApi.updateUser(form.uuid, body);
      } else {
        await adminApi.createUser({
          role: 'teacher',
          display_name: form.display_name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone_number: form.phone_number?.trim() || null,
        });
      }
      setShowForm(false);
      await loadTeachers();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? t('adminTeachers.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('adminTeachers.title')}</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('adminTeachers.count', { count: meta.total })}</div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={openCreate}>
          + {t('adminTeachers.new')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) repeat(3, minmax(140px, 1fr)) auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminTeachers.search')}</label>
            <input className="input-field" placeholder={t('adminTeachers.searchPlaceholder')} value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminTeachers.status')}</label>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
              <option value="all">{t('common.all')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminTeachers.sort')}</label>
            <select className="input-field" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
              <option value="display_name_asc">{t('adminTeachers.sortNameAsc')}</option>
              <option value="created_at_desc">{t('adminTeachers.sortNewest')}</option>
              <option value="created_at_asc">{t('adminTeachers.sortOldest')}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminTeachers.page')}</label>
            <div className="input-field" style={{ display: 'flex', alignItems: 'center' }}>
              {t('common.pageStatus', { page: meta.page, totalPages: Math.max(meta.total_pages, 1) })}
            </div>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => void runSearch()}>
            {t('actions.apply')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--a4)', borderWidth: 1.5 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
            {editing ? t('adminTeachers.editTitle') : t('adminTeachers.newTitle')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminTeachers.fullName')}</label>
              <input className="input-field" value={form.display_name} onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminTeachers.email')}</label>
              <input className="input-field" type="email" value={form.email} disabled={editing} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>
                {editing ? t('adminTeachers.phoneOverwrite') : t('adminTeachers.phone')}
              </label>
              <input
                className="input-field"
                value={form.phone_number ?? ''}
                placeholder={editing ? t('adminTeachers.phoneUnknownPlaceholder') : t('adminTeachers.phoneExample')}
                onChange={e => setForm(prev => ({ ...prev, phone_number: e.target.value, phone_dirty: true }))}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>
                {editing ? t('adminTeachers.newPassword') : t('adminTeachers.password')}
              </label>
              <input className="input-field" type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} />
            </div>
            {editing && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminTeachers.status')}</label>
                <select className="input-field" value={String(form.is_active ?? true)} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}>
                  <option value="true">{t('common.active')}</option>
                  <option value="false">{t('common.inactive')}</option>
                </select>
              </div>
            )}
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--a1)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('actions.saving') : t('actions.save')}
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setShowForm(false)}>
              {t('actions.cancel')}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {teachers.map(teacher => (
          <div key={teacher.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ background: 'var(--a4)', color: '#fff', width: 38, height: 38, fontSize: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {teacher.display_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{teacher.display_name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{teacher.email}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{t('adminUsers.phoneSummary', { role: t('adminTeachers.teacher'), phone: teacher.phone_number ?? t('adminUsers.notReturnedByListApi') })}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', textAlign: 'right', flexShrink: 0 }}>
              <span className="badge" style={{ background: teacher.is_active ? 'var(--a3)18' : 'var(--tx3)18', color: teacher.is_active ? 'var(--a3)' : 'var(--tx3)', fontSize: 10 }}>
                {teacher.is_active ? t('common.active') : t('common.inactive')}
              </span>
            </div>
            <button className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12, flexShrink: 0 }} onClick={() => openEdit(teacher)}>
              Edit
            </button>
          </div>
        ))}
        {!loading && teachers.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '40px 0' }}>
            No teachers found for the current filters.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
          Previous
        </button>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
