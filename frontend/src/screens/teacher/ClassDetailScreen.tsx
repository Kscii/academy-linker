// ============================================================
// ClassDetailScreen — Class stats, student list with scores,
// click student → StudentDetailScreen
// ============================================================

import { useApp } from '@/contexts/AppContext';
import { mockTeacherClasses, mockTeacherStudents, SUBJECT_COLORS } from '@/lib/mock-data';

export function ClassDetailScreen() {
  const { currentClassUuid, navigate } = useApp();
  const cls = mockTeacherClasses.find(c => c.uuid === currentClassUuid) ?? mockTeacherClasses[0];
  const subjectColor = SUBJECT_COLORS[cls.subject.code] ?? cls.subject.color;

  // Filter students to those in this class (mock: use all for demo)
  const students = mockTeacherStudents;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('dashboard')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontWeight: 700,
          fontFamily: 'var(--font-body)',
        }}
      >
        ← Back to Dashboard
      </button>

      {/* Class header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: subjectColor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          📐
        </div>
        <div>
          <div className="font-serif" style={{ fontSize: 24, color: 'var(--tx)' }}>{cls.name}</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
            {cls.student_count} students · Term 2, Week 8
          </div>
        </div>
      </div>

      {/* Class stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Students',   value: cls.student_count, color: subjectColor },
          { label: 'Avg Score',  value: `${cls.avg_score}%`, color: 'var(--a2)' },
          { label: 'At Risk',    value: cls.at_risk_count, color: 'var(--warn)' },
          { label: 'Passing',    value: cls.student_count - cls.at_risk_count, color: 'var(--a3)' },
        ].map((s, i) => (
          <div key={i} className="stat-box">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Student list */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
          Students
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 32px',
            gap: 12, padding: '6px 10px',
            fontSize: 11, fontWeight: 700, color: 'var(--tx3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            borderBottom: '1px solid var(--bd)',
          }}>
            <span>Student</span>
            <span>Progress</span>
            <span style={{ textAlign: 'center' }}>Score</span>
            <span style={{ textAlign: 'center' }}>Status</span>
            <span />
          </div>

          {students.map(item => {
            const initials = item.student.display_name
              .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div
                key={item.student.uuid}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 32px',
                  gap: 12, padding: '10px 10px',
                  cursor: 'pointer', borderRadius: 8,
                  transition: 'background 0.12s',
                  alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => navigate('student-detail', { studentUuid: item.student.uuid })}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    className="avatar"
                    style={{
                      background: item.at_risk ? 'rgba(192,57,43,0.12)' : subjectColor + '18',
                      color: item.at_risk ? 'var(--warn)' : subjectColor,
                      fontSize: 11,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
                      {item.student.display_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                      {item.student.class_name}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${item.overall_score}%`,
                        background: item.at_risk ? 'var(--warn)' : subjectColor,
                      }}
                    />
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center' }}>
                  <span
                    className="badge"
                    style={{
                      background: item.at_risk ? 'rgba(192,57,43,0.1)' : subjectColor + '18',
                      color: item.at_risk ? 'var(--warn)' : subjectColor,
                      fontWeight: 700,
                    }}
                  >
                    {item.overall_score}%
                  </span>
                </div>

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                  {item.at_risk ? (
                    <span className="badge badge-warn" style={{ fontSize: 10 }}>At Risk</span>
                  ) : (
                    <span className="badge badge-ok" style={{ fontSize: 10 }}>On Track</span>
                  )}
                </div>

                <span style={{ fontSize: 14, color: 'var(--tx3)', textAlign: 'center' }}>›</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
