// ============================================================
// Admin ClassesScreen — list, create, manage classes
// ============================================================

import { useState, useEffect } from 'react';
import { admin as adminApi } from '@/lib/api';
import type { AdminClass, AdminUser, AdminStudent } from '@/types/api';

export function AdminClassesScreen() {
  const [classes,     setClasses]     = useState<AdminClass[]>([]);
  const [teachers,    setTeachers]    = useState<AdminUser[]>([]);
  const [allStudents, setAllStudents] = useState<AdminStudent[]>([]);
  const [selected,    setSelected]    = useState<string | null>(null);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newGrade,   setNewGrade]   = useState('');
  const [newHR,      setNewHR]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  // add-student picker
  const [addSid,   setAddSid]   = useState('');
  const [adding,   setAdding]   = useState(false);
  const [hrSaving, setHrSaving] = useState(false);
  const [hrEdit,   setHrEdit]   = useState('');

  useEffect(() => {
    adminApi.getClasses().then(r => setClasses(r.data)).catch(() => {});
    adminApi.getUsers({ role: 'teacher' }).then(r => setTeachers(r.data)).catch(() => {});
    adminApi.getStudents().then(r => setAllStudents(r.data)).catch(() => {});
  }, []);

  const current = classes.find(c => c.uuid === selected) ?? null;

  // Students currently enrolled in selected class
  const classStudents = allStudents.filter(s => s.class_uuid === selected);
  // Students not yet in the selected class (available to add)
  const enrollable = allStudents.filter(s => s.class_uuid !== selected);

  const handleCreate = async () => {
    if (!newName.trim()) { setError('Class name is required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await adminApi.createClass({
        name: newName.trim(),
        grade_level: newGrade.trim() || null,
        homeroom_teacher_uuid: newHR || null,
      });
      setClasses(prev => [...prev, res.data]);
      setShowCreate(false); setNewName(''); setNewGrade(''); setNewHR('');
    } catch { setError('Failed to create class.'); }
    finally { setSaving(false); }
  };

  const handleAddStudent = async () => {
    if (!selected || !addSid) return;
    setAdding(true);
    try {
      await adminApi.transferClass(addSid, selected);
      // Re-fetch both to get accurate student_count and updated class_uuid
      const [studentsRes, classesRes] = await Promise.all([
        adminApi.getStudents(),
        adminApi.getClasses(),
      ]);
      setAllStudents(studentsRes.data);
      setClasses(classesRes.data);
      setAddSid('');
    } catch {}
    finally { setAdding(false); }
  };

  const handleRemoveStudent = async (studentUuid: string) => {
    if (!selected) return;
    try {
      await adminApi.updateStudent(studentUuid, { class_uuid: null });
      setAllStudents(prev => prev.map(s =>
        s.uuid === studentUuid ? { ...s, class_uuid: null, class_name: null } : s
      ));
      setClasses(prev => prev.map(c =>
        c.uuid === selected ? { ...c, student_count: c.student_count - 1 } : c
      ));
    } catch {}
  };

  const handleSaveHR = async () => {
    if (!selected) return;
    setHrSaving(true);
    try {
      const res = await adminApi.updateClass(selected, { homeroom_teacher_uuid: hrEdit || null });
      setClasses(prev => prev.map(c => c.uuid === selected ? res.data : c));
    } catch {}
    finally { setHrSaving(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
      {/* ── Class list ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)' }}>Classes</div>
          <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => { setShowCreate(v => !v); setError(''); }}>
            + New
          </button>
        </div>

        {showCreate && (
          <div className="card" style={{ marginBottom: 12, padding: 14 }}>
            <input className="input-field" placeholder="Class name (e.g. 7A)" value={newName} onChange={e => setNewName(e.target.value)} style={{ marginBottom: 8 }} />
            <input className="input-field" placeholder="Grade level (e.g. Year 7)" value={newGrade} onChange={e => setNewGrade(e.target.value)} style={{ marginBottom: 8 }} />
            <select className="input-field" value={newHR} onChange={e => setNewHR(e.target.value)} style={{ marginBottom: 8 }}>
              <option value="">— Homeroom teacher —</option>
              {teachers.map(t => <option key={t.uuid} value={t.uuid}>{t.display_name}</option>)}
            </select>
            {error && <div style={{ fontSize: 12, color: 'var(--a1)', marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={handleCreate} disabled={saving}>
                {saving ? '…' : 'Create'}
              </button>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {classes.map(c => (
            <div
              key={c.uuid}
              className="card-sm"
              style={{ cursor: 'pointer', borderColor: selected === c.uuid ? 'var(--a1)' : 'var(--bd)', background: selected === c.uuid ? 'rgba(232,97,78,0.04)' : 'var(--card)' }}
              onClick={() => { setSelected(c.uuid); setHrEdit(c.homeroom_teacher?.uuid ?? ''); setAddSid(''); }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>{c.grade_level} · {c.student_count} students</div>
              {c.homeroom_teacher && <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 1 }}>HR: {c.homeroom_teacher.display_name}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Class detail ── */}
      {current ? (
        <div className="card">
          <div className="font-serif" style={{ fontSize: 20, color: 'var(--tx)', marginBottom: 4 }}>{current.name}</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 20 }}>{current.grade_level}</div>

          {/* Homeroom teacher */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Homeroom Teacher</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                className="input-field"
                value={hrEdit}
                onChange={e => setHrEdit(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">— None —</option>
                {teachers.map(t => <option key={t.uuid} value={t.uuid}>{t.display_name}</option>)}
              </select>
              <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: 12, flexShrink: 0 }} onClick={handleSaveHR} disabled={hrSaving}>
                {hrSaving ? '…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Students */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Students ({current.student_count})
          </div>

          {/* Add student */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select className="input-field" value={addSid} onChange={e => setAddSid(e.target.value)} style={{ flex: 1 }}>
              <option value="">— Add a student —</option>
              {enrollable.map(s => <option key={s.uuid} value={s.uuid}>{s.full_name}{s.sid ? ` (${s.sid})` : ''}</option>)}
            </select>
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 16px', fontSize: 12, flexShrink: 0, opacity: addSid ? 1 : 0.4 }}
              onClick={handleAddStudent}
              disabled={!addSid || adding}
            >
              {adding ? '…' : 'Add'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {classStudents.map(s => (
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
                  title="Remove from class"
                  onClick={() => handleRemoveStudent(s.uuid)}
                >
                  ×
                </button>
              </div>
            ))}
            {classStudents.length === 0 && (
              <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No students enrolled yet.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--tx3)', fontSize: 14 }}>
          Select a class to manage
        </div>
      )}
    </div>
  );
}
