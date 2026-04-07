// ============================================================
// Teacher StudentDetailScreen — student stats, notes
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { TeacherStudentDashboard } from '@/types/api';

export function StudentDetailScreen() {
  const navigate = useNavigate();
  const { studentUuid } = useParams<{ studentUuid: string }>();
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [dashboard, setDashboard] = useState<TeacherStudentDashboard | null>(null);

  useEffect(() => {
    if (!studentUuid) return;
    teacherApi.getStudentDashboard(studentUuid).then(res => setDashboard(res.data)).catch(() => {});
  }, [studentUuid]);

  if (!dashboard) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>Loading…</div>
  );

  const { student, unread_post_count, summary_cards } = dashboard;

  const initials = student.full_name
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const addNote = () => {
    if (!note.trim()) return;
    setNotes(n => [...n, note.trim()]);
    setNote('');
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontWeight: 700,
          fontFamily: 'var(--font-body)',
        }}
      >
        ← Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div
          className="avatar"
          style={{
            width: 60, height: 60, fontSize: 22, flexShrink: 0,
            background: 'var(--a1)', color: '#fff',
          }}
        >
          {initials}
        </div>
        <div>
          <div className="font-serif" style={{ fontSize: 24, color: 'var(--tx)' }}>
            {student.full_name}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--tx2)' }}>
              {student.grade_level ?? '—'} · {student.class_name ?? '—'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Performance', value: summary_cards.overall_performance_index != null ? `${Math.round(summary_cards.overall_performance_index)}%` : '—', color: 'var(--a1)' },
          { label: 'Attendance',  value: summary_cards.attendance_rate != null ? `${Math.round(summary_cards.attendance_rate)}%` : '—', color: 'var(--a2)' },
          { label: 'Completion',  value: summary_cards.assignment_completion_rate != null ? `${Math.round(summary_cards.assignment_completion_rate)}%` : '—', color: 'var(--a3)' },
          { label: 'Unread Msgs', value: unread_post_count, color: 'var(--a4)' },
        ].map((s, i) => (
          <div key={i} className="stat-box">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
            Summary
          </div>
          {summary_cards.summary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--tx2)' }}>
              <div>{summary_cards.summary.description}</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--tx3)' }}>No summary available.</div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
            Teacher Notes
          </div>

          {notes.length > 0 && (
            <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notes.map((n, i) => (
                <div key={i} style={{
                  background: 'var(--bg2)', borderRadius: 8,
                  padding: '8px 12px', fontSize: 13, color: 'var(--tx)',
                  borderLeft: '3px solid var(--a3)',
                }}>
                  {n}
                </div>
              ))}
            </div>
          )}

          <textarea
            className="input-field"
            placeholder="Add a note about this student…"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            style={{ resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 10 }}
          />
          <button
            className="btn-primary"
            onClick={addNote}
            disabled={!note.trim()}
            style={{ opacity: note.trim() ? 1 : 0.5 }}
          >
            Save Note
          </button>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Quick Actions
            </div>
            {[
              { icon: '✉', label: 'Message parent',       color: 'var(--a1)' },
              { icon: '📋', label: 'Create report entry', color: 'var(--a2)' },
              { icon: '⚠', label: 'Flag for support',    color: 'var(--warn)' },
            ].map(action => (
              <button
                key={action.label}
                className="btn-secondary"
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span style={{ color: action.color }}>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
