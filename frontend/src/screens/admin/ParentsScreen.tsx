// ============================================================
// Admin ParentsScreen — list, create parents, bind students
// ============================================================

import { useEffect, useState } from 'react';
import { admin as adminApi } from '@/lib/api';
import type { AdminUser, AdminStudent, CreateUserRequest, PaginationMeta, ParentStudentBinding } from '@/types/api';

type ParentRow = AdminUser & { phone_number: string | null };

const EMPTY_FORM: Omit<CreateUserRequest, 'role'> = {
  display_name: '',
  email: '',
  password: '',
  phone_number: '',
};

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

function toParentRow(item: AdminUser): ParentRow {
  return { ...item, phone_number: null };
}

export function AdminParentsScreen() {
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [bindings, setBindings] = useState<ParentStudentBinding[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [selected, setSelected] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bindSid, setBindSid] = useState('');
  const [binding, setBinding] = useState(false);

  const loadParents = async () => {
    const [parentsRes, studentsRes, bindingsRes] = await Promise.all([
      adminApi.getUsers({
        page,
        page_size: 20,
        role: 'parent',
        keyword: keyword.trim() || undefined,
        sort: 'display_name_asc',
      }),
      adminApi.getStudents({ page: 1, page_size: 200, is_active: true }),
      adminApi.getBindings({ page: 1, page_size: 200, is_active: true }),
    ]);

    let rows = parentsRes.data.map(toParentRow);
    if (status !== 'all') {
      rows = rows.filter(item => item.is_active === (status === 'active'));
    }
    setParents(rows);
    setStudents(studentsRes.data);
    setBindings(bindingsRes.data);
    setMeta(parentsRes.meta);
  };

  useEffect(() => {
    void loadParents();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = parents.find(parent => parent.uuid === selected) ?? null;
  const currentBindings = bindings.filter(bindingItem => bindingItem.parent_uuid === selected);
  const boundUuids = new Set(currentBindings.map(bindingItem => bindingItem.student_uuid));
  const bindable = students.filter(student => !boundUuids.has(student.uuid));

  const handleCreate = async () => {
    if (!form.display_name.trim() || !form.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (!form.password.trim()) {
      setError('Password is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminApi.createUser({
        role: 'parent',
        display_name: form.display_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_number: form.phone_number?.trim() || null,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await loadParents();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? 'Failed to create parent.');
    } finally {
      setSaving(false);
    }
  };

  const handleBind = async () => {
    if (!selected || !bindSid) return;
    setBinding(true);
    try {
      await adminApi.createBinding({ parent_uuid: selected, student_uuid: bindSid });
      setBindSid('');
      await loadParents();
    } finally {
      setBinding(false);
    }
  };

  const handleUnbind = async (studentUuid: string) => {
    if (!selected) return;
    const res = await adminApi.getBindings({
      page: 1,
      page_size: 20,
      parent_uuid: selected,
      student_uuid: studentUuid,
      is_active: true,
    });
    const bindingItem = res.data[0];
    if (!bindingItem) return;
    await adminApi.updateBinding(bindingItem.uuid, { is_active: false });
    await loadParents();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)' }}>Parents</div>
          <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => { setShowForm(prev => !prev); setError(''); }}>
            + New
          </button>
        </div>

        <div className="card" style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 8 }}>Total: {meta.total}</div>
          <input className="input-field" placeholder="Search by name or email" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ marginBottom: 8 }} />
          <select className="input-field" value={status} onChange={e => setStatus(e.target.value as typeof status)} style={{ marginBottom: 8 }}>
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => { setPage(1); void loadParents(); }}>
            Apply Filters
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 12, padding: 14 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>Full Name *</label>
              <input className="input-field" value={form.display_name} onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>Email *</label>
              <input className="input-field" type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>Phone Number</label>
              <input className="input-field" value={form.phone_number ?? ''} onChange={e => setForm(prev => ({ ...prev, phone_number: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>Password *</label>
              <input className="input-field" type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} />
            </div>
            {error && <div style={{ fontSize: 12, color: 'var(--a1)', marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => void handleCreate()} disabled={saving}>
                {saving ? '…' : 'Create'}
              </button>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {parents.map(parent => {
            const childCount = bindings.filter(bindingItem => bindingItem.parent_uuid === parent.uuid).length;
            return (
              <div
                key={parent.uuid}
                className="card-sm"
                style={{ cursor: 'pointer', borderColor: selected === parent.uuid ? 'var(--a3)' : 'var(--bd)', background: selected === parent.uuid ? 'rgba(61,182,168,0.04)' : 'var(--card)' }}
                onClick={() => { setSelected(parent.uuid); setBindSid(''); }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{parent.display_name}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 1 }}>{parent.email}</div>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>
                  {childCount > 0 ? `${childCount} child${childCount > 1 ? 'ren' : ''}` : 'No children linked'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
            Previous
          </button>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
            Next
          </button>
        </div>
      </div>

      {current ? (
        <div className="card">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, background: 'var(--a3)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {current.display_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="font-serif" style={{ fontSize: 18, color: 'var(--tx)' }}>{current.display_name}</div>
              <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{current.email}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>Phone: {current.phone_number ?? 'Not returned by list API'}</div>
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Linked Children ({currentBindings.length})
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select className="input-field" value={bindSid} onChange={e => setBindSid(e.target.value)} style={{ flex: 1 }}>
              <option value="">— Link a student —</option>
              {bindable.map(student => <option key={student.uuid} value={student.uuid}>{student.full_name}{student.sid ? ` (${student.sid})` : ''}</option>)}
            </select>
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12, flexShrink: 0, opacity: bindSid ? 1 : 0.4 }} onClick={() => void handleBind()} disabled={!bindSid || binding}>
              {binding ? '…' : 'Link'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {currentBindings.map(bindingItem => {
              const student = students.find(item => item.uuid === bindingItem.student_uuid);
              if (!student) return null;
              return (
                <div key={bindingItem.uuid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8 }}>
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: 'var(--a2)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {student.full_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{student.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{student.sid ?? 'No SID'}</div>
                  </div>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a1)', fontSize: 16, padding: '2px 4px' }} title="Unlink student" onClick={() => void handleUnbind(student.uuid)}>
                    ×
                  </button>
                </div>
              );
            })}
            {currentBindings.length === 0 && (
              <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No children linked. Use the picker above to link a student.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--tx3)', fontSize: 14 }}>
          Select a parent to manage
        </div>
      )}
    </div>
  );
}
