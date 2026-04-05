// ============================================================
// Teacher DashboardScreen — greeting, stat cards, class cards grid
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { mockTeacherDashboard, mockTeacherClasses, SUBJECT_COLORS } from '@/lib/mock-data';
import { BarChart } from '@/components/charts/BarChart';

const ACCENT_COLORS: Record<string, string> = {
  a1: 'var(--a1)', a2: 'var(--a2)', a3: 'var(--a3)', a4: 'var(--a4)',
};

function MiniBarChart({ scores, color }: { scores: number[]; color: string }) {
  const max = Math.max(...scores);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36 }}>
      {scores.map((s, i) => (
        <div
          key={i}
          style={{
            flex: 1, background: color,
            height: `${(s / max) * 100}%`,
            borderRadius: '2px 2px 0 0', opacity: 0.7 + (i / scores.length) * 0.3,
          }}
        />
      ))}
    </div>
  );
}

export function TeacherDashboardScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const dashboard = mockTeacherDashboard;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 28, color: 'var(--tx)', marginBottom: 4 }}>
          Welcome, {user?.display_name?.split(' ')[1] ?? user?.display_name ?? 'Teacher'} 👋
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Here's your class overview for <strong>Week 8, Term 2</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {dashboard.summary_cards.map((card, i) => {
          const isMessages = card.label === 'Unread Msgs';
          return (
            <div
              key={i}
              className="stat-box"
              onClick={isMessages ? () => navigate('/teacher/messages') : undefined}
              style={{ cursor: isMessages ? 'pointer' : 'default' }}
            >
              <div className="stat-label">{card.label}</div>
              <div className="stat-value" style={{ color: ACCENT_COLORS[card.color ?? 'a1'] }}>
                {card.value}
              </div>
              {card.sub && <div className="stat-sub">{card.sub}</div>}
              {isMessages && (
                <div style={{ fontSize: 10, color: 'var(--a4)', marginTop: 4, fontWeight: 700 }}>
                  View all →
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
          Your Classes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {dashboard.classes.map(cls => {
            const subjectColor = SUBJECT_COLORS[cls.subject.code] ?? cls.subject.color;
            return (
              <div
                key={cls.uuid}
                className="card"
                style={{ cursor: 'pointer', transition: 'transform 0.15s', borderTop: `3px solid ${subjectColor}` }}
                onClick={() => navigate(`/teacher/classes/${cls.uuid}`)}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>{cls.student_count} students</div>
                  </div>
                  <span className="subject-chip" style={{ background: subjectColor + '18', color: subjectColor }}>
                    {cls.subject.code.toUpperCase()}
                  </span>
                </div>
                <MiniBarChart scores={cls.scores} color={subjectColor} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)' }}>Avg score</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: subjectColor, fontFamily: 'var(--font-serif)' }}>
                      {cls.avg_score}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--tx3)' }}>At risk</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: cls.at_risk_count > 3 ? 'var(--warn)' : 'var(--tx2)', fontFamily: 'var(--font-serif)' }}>
                      {cls.at_risk_count}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
          Class Average Scores Comparison
        </div>
        <BarChart
          data={mockTeacherClasses.map(c => ({ label: c.name.split(' ')[1] ?? c.name, value: c.avg_score }))}
          colors={mockTeacherClasses.map(c => SUBJECT_COLORS[c.subject.code] ?? 'var(--a1)')}
          height={180}
        />
      </div>
    </div>
  );
}
