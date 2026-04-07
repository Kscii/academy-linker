// ============================================================
// Admin StudentsScreen — list and create students
// ============================================================

import { useState, useEffect } from 'react';
import { admin as adminApi } from '@/lib/api';
import type { AdminStudent } from '@/types/api';

const EMPTY_FORM = { full_name: '', preferred_name: '', sid: '' };

export function AdminStudentsScreen() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [search,   setSearch]   = useState('');
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    adminApi.getStudents().then(r => setStudents(r.data)).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.full_name.trim()) { setError('Full name is required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await adminApi.createStudent(form);
      setStudents(prev => [...prev, res.data]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? 'Failed to create student.');
    } finally { setSaving(false); }
  };

  const filtered = students.filter(s =>
    !search.trim() ||
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.sid ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.class_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>Students</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{students.length} student{students.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => { setShowForm(v => !v); setError(''); }}>
          + New Student
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--a2)', borderWidth: 1.5 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>New Student</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              { key: 'full_name',      label: 'Full Name *', placeholder: 'James O\'Brien' },
              { key: 'preferred_name', label: 'Preferred Name', placeholder: 'James' },
              { key: 'sid',            label: 'Student ID', placeholder: 'S2024099 (auto if blank)' },
            ] as const).map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  className="input-field"
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--a1)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving…' : 'Create'}
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        className="input-field"
        placeholder="Search by name, ID or class…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 14, maxWidth: 380 }}
      />

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(s => (
          <div key={s.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="avatar" style={{ width: 38, height: 38, fontSize: 13, background: 'var(--a2)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {s.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{s.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{s.sid ?? '—'} · {s.class_name ?? '—'} · {s.grade_level ?? '—'}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '40px 0' }}>
            {search ? 'No results found.' : 'No students yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
