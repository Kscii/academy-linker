// ============================================================
// Parent Dashboard — greeting, announcement banner, metric cards,
// subject bar chart, trend line chart, subject list
// ============================================================

import { useApp } from '@/contexts/AppContext';
import { mockParentDashboard, mockStudents, SUBJECT_COLORS } from '@/lib/mock-data';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';

const ACCENT_COLORS: Record<string, string> = {
  a1: 'var(--a1)', a2: 'var(--a2)', a3: 'var(--a3)', a4: 'var(--a4)',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export function DashboardScreen() {
  const { navigate, user } = useApp();
  const student = mockStudents[0];
  const dashboard = mockParentDashboard;
  const banner = dashboard.important_post_banners[0];

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 28, color: 'var(--tx)', marginBottom: 4 }}>
          Good morning, {user?.display_name?.split(' ')[0] ?? 'Parent'} 👋
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Here's {student.display_name}'s update for today — <strong>Week 8, Term 2</strong>
        </div>
      </div>

      {/* Announcement banner */}
      {banner && (
        <div className="announcement-banner" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>📢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, marginBottom: 2 }}>
              New post from {banner.teacher_name} · {banner.subject}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{banner.title}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{timeAgo(banner.created_at)}</div>
          </div>
          <button
            onClick={() => navigate('messages')}
            style={{
              background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
              fontSize: 12, color: '#fff', fontWeight: 700, fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            View
          </button>
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {dashboard.summary_cards.map((card, i) => (
          <div key={i} className="stat-box">
            <div className="stat-label">{card.label}</div>
            <div className="stat-value" style={{ color: ACCENT_COLORS[card.color ?? 'a1'] }}>
              {card.value}
            </div>
            {card.sub && (
              <div className="stat-sub" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {card.trend === 'up' && <span style={{ color: 'var(--a2)' }}>↑</span>}
                {card.trend === 'down' && <span style={{ color: 'var(--warn)' }}>↓</span>}
                {card.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Subject bar chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Subject Scores</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--tx3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 4, borderRadius: 2, background: 'var(--a1)', display: 'inline-block' }} />
                Emily
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 4, borderRadius: 2, background: 'rgba(232,97,78,0.35)', display: 'inline-block' }} />
                Class avg
              </span>
            </div>
          </div>
          <BarChart
            data={dashboard.subject_chart}
            colors={['#E8614E', '#3DB6A8', '#4A90D9', '#F0A732', '#8B5CF6', '#E91E8C']}
            height={180}
            showAvg
          />
        </div>

        {/* Trend line chart */}
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
            Overall Trend — Term 2
          </div>
          <LineChart
            data={dashboard.trend_chart}
            avgData={dashboard.trend_chart}
            color="var(--a1)"
            avgColor="var(--a2)"
            showAvg
            height={180}
          />
        </div>
      </div>

      {/* Subject list */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
          All Subjects
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dashboard.subjects.map(sub => (
            <div
              key={sub.uuid}
              style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', padding: '6px 0' }}
              onClick={() => navigate('subject-detail', { subjectUuid: sub.uuid })}
            >
              {/* Colour dot */}
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: SUBJECT_COLORS[sub.code] ?? sub.color,
              }} />

              {/* Name + teacher */}
              <div style={{ width: 150, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{sub.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{sub.teacher?.display_name}</div>
              </div>

              {/* Progress bar */}
              <div style={{ flex: 1 }}>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${sub.progress ?? sub.score ?? 0}%`,
                      background: SUBJECT_COLORS[sub.code] ?? sub.color,
                    }}
                  />
                </div>
              </div>

              {/* Score badge */}
              <div
                className="badge"
                style={{
                  background: `${SUBJECT_COLORS[sub.code] ?? sub.color}22`,
                  color: SUBJECT_COLORS[sub.code] ?? sub.color,
                  fontSize: 13, fontWeight: 700, minWidth: 44, justifyContent: 'center',
                }}
              >
                {sub.score ?? '—'}%
              </div>

              <span style={{ fontSize: 12, color: 'var(--tx3)' }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
