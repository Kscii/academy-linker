// ============================================================
// Admin TeachersScreen — list, create, edit teachers
// ============================================================

import { useState, useEffect } from 'react';
import { admin as adminApi } from '@/lib/api';
import type { AdminTeacher, CreateTeacherRequest } from '@/types/api';

const EMPTY_FORM: CreateTeacherRequest & { uuid?: string } = {
  display_name: '', email: '', password: '', phone_number: '',
};

export function AdminTeachersScreen() {
  const [teachers, setTeachers]   = useState<AdminTeacher[]>([]);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [showForm, setShowForm]   = useState(false);

  useEffect(() => {
    adminApi.getTeachers().then(r => setTeachers(r.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setError('');
    setShowForm(true);
  };

  const openEdit = (t: AdminTeacher) => {
    setForm({ uuid: t.uuid, display_name: t.display_name, email: t.email, phone_number: t.phone_number ?? '', password: '' });
    setEditing(true);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    setSaving(true); setError('');
    try {
      if (editing && form.uuid) {
        const res = await adminApi.updateTeacher(form.uuid, {
          display_name: form.display_name, email: form.email,
          phone_number: form.phone_number, password: form.password || undefined,
        });
        setTeachers(prev => prev.map(t => t.uuid === form.uuid ? res.data : t));
      } else {
        const res = await adminApi.createTeacher(form);
        setTeachers(prev => [...prev, res.data]);
      }
      setShowForm(false);
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? 'Failed to save.');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>Teachers</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{teachers.length} teacher{teachers.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={openCreate}>
          + New Teacher
        </button>
      </div>

      {/* ── Form panel ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--a4)', borderWidth: 1.5 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
            {editing ? 'Edit Teacher' : 'New Teacher'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              { key: 'display_name', label: 'Full Name', placeholder: 'Ms. Thompson', type: 'text' },
              { key: 'email',        label: 'Email',     placeholder: 'teacher@school.edu.au', type: 'email' },
              { key: 'phone_number', label: 'Phone',     placeholder: '+61 4xx xxx xxx', type: 'text' },
              { key: 'password',     label: editing ? 'New Password (leave blank to keep)' : 'Password', placeholder: 'password123', type: 'password' },
            ] as const).map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  className="input-field"
                  type={f.type}
                  placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--a1)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {teachers.map(t => (
          <div key={t.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              className="avatar"
              style={{ background: 'var(--a4)', color: '#fff', width: 38, height: 38, fontSize: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              {t.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{t.display_name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{t.email}</div>
              {t.subjects.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  {t.subjects.map(s => (
                    <span key={s} className="badge" style={{ background: 'var(--a4)18', color: 'var(--a4)', fontSize: 10 }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', textAlign: 'right', flexShrink: 0 }}>
              <div>{t.student_count} student{t.student_count !== 1 ? 's' : ''}</div>
              {t.phone_number && <div style={{ marginTop: 2 }}>{t.phone_number}</div>}
            </div>
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '6px 14px', fontSize: 12, flexShrink: 0 }}
              onClick={() => openEdit(t)}
            >
              Edit
            </button>
          </div>
        ))}
        {teachers.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '40px 0' }}>
            No teachers yet. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}
