// ============================================================
// FindStudentScreen — search input, student result cards
// ============================================================

import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { mockTeacherStudents, SUBJECT_COLORS } from '@/lib/mock-data';

export function FindStudentScreen() {
  const { navigate } = useApp();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return mockTeacherStudents;
    const q = query.toLowerCase();
    return mockTeacherStudents.filter(
      s =>
        s.student.display_name.toLowerCase().includes(q) ||
        s.student.class_name?.toLowerCase().includes(q) ||
        s.student.grade?.toLowerCase().includes(q)
    );
  }, [query]);

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          Find Student
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Search across all your students
        </div>
      </div>

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: 'var(--tx3)',
        }}>
          🔍
        </span>
        <input
          className="input-field"
          style={{ paddingLeft: 40, fontSize: 15 }}
          placeholder="Search by name, class, or year level…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 14, fontWeight: 700 }}>
        {results.length} {results.length === 1 ? 'student' : 'students'} found
      </div>

      {/* Result cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {results.map(item => {
          const subjectColor = SUBJECT_COLORS.math;
          return (
            <div
              key={item.student.uuid}
              className="card-sm"
              style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
              onClick={() => navigate('student-detail', { studentUuid: item.student.uuid })}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--a1)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  className="avatar avatar-lg"
                  style={{
                    background: item.at_risk ? 'rgba(192,57,43,0.12)' : subjectColor + '18',
                    color: item.at_risk ? 'var(--warn)' : subjectColor,
                    fontWeight: 700,
                  }}
                >
                  {initials(item.student.display_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>
                    {item.student.display_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                    {item.student.grade} · {item.student.class_name}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${item.overall_score}%`,
                          background: item.at_risk ? 'var(--warn)' : subjectColor,
                        }}
                      />
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: item.at_risk ? 'var(--warn)' : subjectColor,
                      width: 36,
                    }}>
                      {item.overall_score}%
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  {item.at_risk && (
                    <span className="badge badge-warn" style={{ fontSize: 10 }}>At Risk</span>
                  )}
                  {item.unread_messages > 0 && (
                    <span
                      className="badge"
                      style={{ background: 'var(--a1)', color: '#fff', fontSize: 10 }}
                    >
                      {item.unread_messages} msg
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--tx3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>No students found</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Try a different name or class</div>
        </div>
      )}
    </div>
  );
}
