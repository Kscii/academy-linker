// ============================================================
// ClassDetailScreen — Class info, student list, click → StudentDetail
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { TeacherClass, TeacherClassStudentItem } from '@/types/api';

export function ClassDetailScreen() {
  const navigate = useNavigate();
  const { classUuid } = useParams<{ classUuid: string }>();

  const [cls, setCls] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<TeacherClassStudentItem[]>([]);

  useEffect(() => {
    if (!classUuid) return;
    teacherApi.getClasses().then(res => {
      const found = res.data.find(c => c.uuid === classUuid) ?? null;
      setCls(found);
    }).catch(() => {});
    teacherApi.getClassStudents(classUuid).then(res => {
      setStudents(res.data);
    }).catch(() => {});
  }, [classUuid]);

  if (!cls) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>Loading…</div>
  );

  return (
    <div>
      <button
        onClick={() => navigate('/teacher/dashboard')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontWeight: 700,
          fontFamily: 'var(--font-body)',
        }}
      >
        ← Back to Dashboard
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'var(--a1)18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          🏫
        </div>
        <div>
          <div className="font-serif" style={{ fontSize: 24, color: 'var(--tx)' }}>{cls.name}</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
            Grade {cls.grade_level} · {cls.academic_year}
            {cls.is_homeroom && <span className="badge" style={{ marginLeft: 8, background: 'var(--a1)20', color: 'var(--a1)', fontSize: 10 }}>Homeroom</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="stat-box">
          <div className="stat-label">Students</div>
          <div className="stat-value" style={{ color: 'var(--a1)' }}>{cls.student_count}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Grade</div>
          <div className="stat-value" style={{ color: 'var(--a2)' }}>{cls.grade_level ?? '—'}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>Students</div>
        {students.length === 0 ? (
          <div style={{ color: 'var(--tx3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
            No students found.
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 140px 32px',
            gap: 12, padding: '6px 10px',
            fontSize: 11, fontWeight: 700, color: 'var(--tx3)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            borderBottom: '1px solid var(--bd)',
          }}>
            <span>Student</span><span>Subjects</span><span />
          </div>

          {students.map(item => {
            const inits = item.full_name
              .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div
                key={item.uuid}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 140px 32px',
                  gap: 12, padding: '10px 10px',
                  cursor: 'pointer', borderRadius: 8,
                  transition: 'background 0.12s',
                  alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => navigate(`/teacher/students/${item.uuid}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar" style={{ background: 'var(--a1)18', color: 'var(--a1)', fontSize: 11 }}>
                    {inits}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
                      {item.full_name}
                    </div>
                    {item.preferred_name && (
                      <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{item.preferred_name}</div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                  {item.subjects.map(s => s.name).join(', ') || '—'}
                </div>

                <span style={{ fontSize: 14, color: 'var(--tx3)', textAlign: 'center' }}>›</span>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
