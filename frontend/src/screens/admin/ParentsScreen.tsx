// ============================================================
// Admin ParentsScreen — list, create parents, bind students
// ============================================================

import { useState, useEffect } from 'react';
import { admin as adminApi } from '@/lib/api';
import type { AdminParent, AdminStudent, CreateParentRequest } from '@/types/api';

const EMPTY_FORM: CreateParentRequest = { display_name: '', email: '', password: '', phone_number: '' };

export function AdminParentsScreen() {
  const [parents,  setParents]  = useState<AdminParent[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const [form,     setForm]     = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  // bind picker
  const [bindSid, setBindSid] = useState('');
  const [binding, setBinding] = useState(false);

  useEffect(() => {
    adminApi.getParents().then(r  => setParents(r.data)).catch(() => {});
    adminApi.getStudents().then(r => setStudents(r.data)).catch(() => {});
  }, []);

  const current = parents.find(p => p.uuid === selected) ?? null;

  const handleCreate = async () => {
    if (!form.display_name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await adminApi.createParent(form);
      setParents(prev => [...prev, res.data]);
      setForm(EMPTY_FORM); setShowForm(false);
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? 'Failed to create parent.');
    } finally { setSaving(false); }
  };

  const handleBind = async () => {
    if (!selected || !bindSid) return;
    setBinding(true);
    try {
      await adminApi.bindStudent(selected, bindSid);
      // refresh parents
      const res = await adminApi.getParents();
      setParents(res.data);
      setBindSid('');
    } catch {}
    finally { setBinding(false); }
  };

  const handleUnbind = async (studentUuid: string) => {
    if (!selected) return;
    try {
      await adminApi.unbindStudent(selected, studentUuid);
      const res = await adminApi.getParents();
      setParents(res.data);
    } catch {}
  };

  const currentParentStudentUuids = current?.students.map(s => s.uuid) ?? [];
  const bindable = students.filter(s => !currentParentStudentUuids.includes(s.uuid));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
      {/* ── Parent list ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)' }}>Parents</div>
          <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => { setShowForm(v => !v); setError(''); }}>
            + New
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 12, padding: 14 }}>
            {([
              { key: 'display_name', label: 'Full Name *', placeholder: 'Li Wei', type: 'text' },
              { key: 'email',        label: 'Email *',     placeholder: 'parent@email.com', type: 'email' },
              { key: 'phone_number', label: 'Phone',       placeholder: '+61 4xx xxx xxx', type: 'text' },
              { key: 'password',     label: 'Password',    placeholder: 'password123', type: 'password' },
            ] as const).map(f => (
              <div key={f.key} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                <input
                  className="input-field"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            {error && <div style={{ fontSize: 12, color: 'var(--a1)', marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={handleCreate} disabled={saving}>
                {saving ? '…' : 'Create'}
              </button>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {parents.map(p => (
            <div
              key={p.uuid}
              className="card-sm"
              style={{ cursor: 'pointer', borderColor: selected === p.uuid ? 'var(--a3)' : 'var(--bd)', background: selected === p.uuid ? 'rgba(61,182,168,0.04)' : 'var(--card)' }}
              onClick={() => { setSelected(p.uuid); setBindSid(''); }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{p.display_name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 1 }}>{p.email}</div>
              <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>
                {p.students.length > 0 ? `${p.students.length} child${p.students.length > 1 ? 'ren' : ''}` : 'No children linked'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Parent detail ── */}
      {current ? (
        <div className="card">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, background: 'var(--a3)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {current.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="font-serif" style={{ fontSize: 18, color: 'var(--tx)' }}>{current.display_name}</div>
              <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{current.email}</div>
              {current.phone_number && <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{current.phone_number}</div>}
            </div>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Linked Children ({current.students.length})
          </div>

          {/* Bind student */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select className="input-field" value={bindSid} onChange={e => setBindSid(e.target.value)} style={{ flex: 1 }}>
              <option value="">— Link a student —</option>
              {bindable.map(s => <option key={s.uuid} value={s.uuid}>{s.full_name} ({s.sid})</option>)}
            </select>
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 16px', fontSize: 12, flexShrink: 0, opacity: bindSid ? 1 : 0.4 }}
              onClick={handleBind}
              disabled={!bindSid || binding}
            >
              {binding ? '…' : 'Link'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {current.students.map(s => (
              <div key={s.uuid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8 }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: 'var(--a2)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{s.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{s.sid}</div>
                </div>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a1)', fontSize: 16, padding: '2px 4px' }}
                  title="Unlink student"
                  onClick={() => handleUnbind(s.uuid)}
                >
                  ×
                </button>
              </div>
            ))}
            {current.students.length === 0 && (
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
