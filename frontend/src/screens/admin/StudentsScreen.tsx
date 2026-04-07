// ============================================================
// Admin StudentsScreen — list, create, edit students
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin as adminApi } from '@/lib/api';
import type { AdminClass, AdminStudent, CreateStudentRequest, PaginationMeta, UpdateStudentRequest } from '@/types/api';

type StudentForm = {
  uuid?: string;
  sid: string;
  full_name: string;
  preferred_name: string;
  class_uuid: string;
  avatar_url: string;
  date_of_birth: string;
  is_active: boolean;
};

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

const EMPTY_FORM: StudentForm = {
  sid: '',
  full_name: '',
  preferred_name: '',
  class_uuid: '',
  avatar_url: '',
  date_of_birth: '',
  is_active: true,
};

export function AdminStudentsScreen() {
  const { t } = useTranslation('app');
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [keyword, setKeyword] = useState('');
  const [selectedClassUuid, setSelectedClassUuid] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [sort, setSort] = useState<'created_at_desc' | 'created_at_asc' | 'full_name_asc'>('full_name_asc');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadStudents = async () => {
    const [studentsRes, classesRes] = await Promise.all([
      adminApi.getStudents({
        page,
        page_size: 20,
        keyword: keyword.trim() || undefined,
        class_uuid: selectedClassUuid || undefined,
        is_active: status === 'all' ? undefined : status === 'active',
        sort,
      }),
      adminApi.getClasses({ page: 1, page_size: 200, is_active: true }),
    ]);
    setStudents(studentsRes.data);
    setClasses(classesRes.data);
    setMeta(studentsRes.meta);
  };

  useEffect(() => {
    void loadStudents();
  }, [page, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setError('');
    setShowForm(true);
  };

  const openEdit = (student: AdminStudent) => {
    setForm({
      uuid: student.uuid,
      sid: student.sid ?? '',
      full_name: student.full_name,
      preferred_name: student.preferred_name ?? '',
      class_uuid: student.class_uuid ?? '',
      avatar_url: student.avatar_url ?? '',
      date_of_birth: '',
      is_active: student.is_active,
    });
    setEditing(true);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setError(t('adminStudents.fullNameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing && form.uuid) {
        const body: UpdateStudentRequest = {
          sid: form.sid.trim() || null,
          full_name: form.full_name.trim(),
          preferred_name: form.preferred_name.trim() || null,
          class_uuid: form.class_uuid || null,
          avatar_url: form.avatar_url.trim() || null,
          date_of_birth: form.date_of_birth || null,
          is_active: form.is_active,
        };
        await adminApi.updateStudent(form.uuid, body);
      } else {
        const body: CreateStudentRequest = {
          sid: form.sid.trim() || null,
          full_name: form.full_name.trim(),
          preferred_name: form.preferred_name.trim() || null,
          class_uuid: form.class_uuid || null,
          avatar_url: form.avatar_url.trim() || null,
          date_of_birth: form.date_of_birth || null,
        };
        await adminApi.createStudent(body);
      }
      setShowForm(false);
      await loadStudents();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? t('adminStudents.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('adminStudents.title')}</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('adminStudents.count', { count: meta.total })}</div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={openCreate}>
          + {t('adminStudents.new')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(4, minmax(120px, 1fr)) auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.search')}</label>
            <input className="input-field" placeholder={t('adminStudents.searchPlaceholder')} value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.class')}</label>
            <select className="input-field" value={selectedClassUuid} onChange={e => setSelectedClassUuid(e.target.value)}>
              <option value="">{t('adminStudents.allClasses')}</option>
              {classes.map(item => <option key={item.uuid} value={item.uuid}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.status')}</label>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
              <option value="all">{t('common.all')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.sort')}</label>
            <select className="input-field" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
              <option value="full_name_asc">{t('adminStudents.sortNameAsc')}</option>
              <option value="created_at_desc">{t('adminStudents.sortNewest')}</option>
              <option value="created_at_asc">{t('adminStudents.sortOldest')}</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.page')}</label>
            <div className="input-field" style={{ display: 'flex', alignItems: 'center' }}>{t('common.pageStatus', { page: meta.page, totalPages: Math.max(meta.total_pages, 1) })}</div>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => { setPage(1); void loadStudents(); }}>
            {t('actions.apply')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--a2)', borderWidth: 1.5 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>{editing ? t('adminStudents.editTitle') : t('adminStudents.newTitle')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.fullName')}</label>
              <input className="input-field" value={form.full_name} onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.preferredName')}</label>
              <input className="input-field" value={form.preferred_name} onChange={e => setForm(prev => ({ ...prev, preferred_name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.studentId')}</label>
              <input className="input-field" value={form.sid} onChange={e => setForm(prev => ({ ...prev, sid: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.class')}</label>
              <select className="input-field" value={form.class_uuid} onChange={e => setForm(prev => ({ ...prev, class_uuid: e.target.value }))}>
                <option value="">{t('adminStudents.unassigned')}</option>
                {classes.map(item => <option key={item.uuid} value={item.uuid}>{item.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.avatarUrl')}</label>
              <input className="input-field" value={form.avatar_url} onChange={e => setForm(prev => ({ ...prev, avatar_url: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.dateOfBirth')}</label>
              <input className="input-field" type="date" value={form.date_of_birth} onChange={e => setForm(prev => ({ ...prev, date_of_birth: e.target.value }))} />
            </div>
            {editing && (
              <div>
                <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('adminStudents.status')}</label>
                <select className="input-field" value={String(form.is_active)} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}>
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
        {students.map(student => (
          <div key={student.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ width: 38, height: 38, fontSize: 13, background: 'var(--a2)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {student.full_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{student.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{student.sid ?? t('common.notAvailable')} · {student.class_name ?? t('adminStudents.unassigned')} · {student.grade_level ?? t('common.notAvailable')}</div>
            </div>
            <span className="badge" style={{ background: student.is_active ? 'var(--a3)18' : 'var(--tx3)18', color: student.is_active ? 'var(--a3)' : 'var(--tx3)', fontSize: 10 }}>
              {student.is_active ? t('common.active') : t('common.inactive')}
            </span>
            <button className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => openEdit(student)}>
              {t('actions.edit')}
            </button>
          </div>
        ))}
        {students.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '40px 0' }}>
            {t('adminStudents.noStudentsForFilters')}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
          {t('actions.previous')}
        </button>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
          {t('actions.next')}
        </button>
      </div>
    </div>
  );
}
