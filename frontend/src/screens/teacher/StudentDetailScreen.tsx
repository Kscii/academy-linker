// ============================================================
// Teacher StudentDetailScreen — student stats, chart, notes
// ============================================================

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mockTeacherStudents, mockSubjectDetails, SUBJECT_COLORS } from '@/lib/mock-data';
import { LineChart } from '@/components/charts/LineChart';

export function StudentDetailScreen() {
  const navigate = useNavigate();
  const { studentUuid } = useParams<{ studentUuid: string }>();
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<string[]>([]);

  const studentItem =
    mockTeacherStudents.find(s => s.student.uuid === studentUuid) ??
    mockTeacherStudents[0];

  const { student, overall_score, at_risk } = studentItem;
  const mathDetail = mockSubjectDetails['sub-math'];

  const initials = student.display_name
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
            background: at_risk ? 'rgba(192,57,43,0.12)' : 'var(--a1)',
            color: at_risk ? 'var(--warn)' : '#fff',
          }}
        >
          {initials}
        </div>
        <div>
          <div className="font-serif" style={{ fontSize: 24, color: 'var(--tx)' }}>
            {student.display_name}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--tx2)' }}>{student.grade} · {student.class_name}</span>
            {at_risk && <span className="badge badge-warn" style={{ fontSize: 11 }}>⚠ At Risk</span>}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div className="badge-score" style={{ background: at_risk ? 'var(--warn)' : 'var(--a2)' }}>
            {overall_score}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Overall Score',  value: `${overall_score}%`,          color: at_risk ? 'var(--warn)' : 'var(--a1)' },
          { label: 'Attendance',     value: '94%',                        color: 'var(--a2)' },
          { label: 'Tasks Complete', value: '87%',                        color: 'var(--a3)' },
          { label: 'Unread Msgs',    value: studentItem.unread_messages,  color: 'var(--a4)' },
        ].map((s, i) => (
          <div key={i} className="stat-box">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
          Mathematics Score — Term 2
        </div>
        <LineChart
          data={mathDetail.trend_data}
          avgData={mathDetail.class_avg_data}
          color={SUBJECT_COLORS.math}
          avgColor="var(--a2)"
          showAvg
          height={180}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
            Subject Performance
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {studentItem.subjects.map(sub => {
              const color = SUBJECT_COLORS[sub.code] ?? sub.color;
              return (
                <div key={sub.uuid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: 'var(--tx)', fontWeight: 600, width: 130 }}>{sub.name}</div>
                  <div style={{ flex: 1 }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${sub.score ?? 0}%`, background: color }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color, width: 36, textAlign: 'right' }}>
                    {sub.score ?? '—'}%
                  </span>
                </div>
              );
            })}
          </div>
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
