// ============================================================
// Parent Dashboard — greeting, announcement banner, metric cards,
// subject bar chart, trend line chart, subject list
// ============================================================

import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { translateBatch, useTranslatedText } from '@/lib/translate';
import { mockParentDashboard, mockStudents, SUBJECT_COLORS } from '@/lib/mock-data';
import { parent as parentApi } from '@/lib/api';
import type { DashboardResponse } from '@/types/api';
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
  const navigate = useNavigate();
  const { sid } = useParams<{ sid: string }>();
  const { user, language } = useApp();
  const { t } = useTranslation('dashboard');

  // Initialize with mock data so offline / pre-fetch renders correctly
  const [dashboard, setDashboard] = useState<DashboardResponse>(mockParentDashboard);
  const [studentName, setStudentName] = useState(mockStudents[0].display_name);

  // Fetch real dashboard data
  useEffect(() => {
    if (!sid) return;
    parentApi.getDashboard(sid).then(res => {
      setDashboard(res.data);
      if (res.data.student?.display_name) setStudentName(res.data.student.display_name);
    }).catch(() => { /* keep mock fallback */ });
  }, [sid]);

  const banner = dashboard.important_post_banners[0];

  // Trigger progress bar entrance animation after mount
  const [barsReady, setBarsReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setBarsReady(true), 60);
    return () => clearTimeout(timer);
  }, []);

  // Translate subject names + bar chart labels
  const [txSubjects, setTxSubjects] = useState(dashboard.subjects);
  const [txChartData, setTxChartData] = useState(dashboard.subject_chart);
  useEffect(() => {
    setTxSubjects(dashboard.subjects);
    setTxChartData(dashboard.subject_chart);
    if (language === 'en') return;
    const names = dashboard.subjects.map(s => s.name);
    translateBatch(names, language).then(results => {
      setTxSubjects(dashboard.subjects.map((s, i) => ({ ...s, name: results[i] || s.name })));
      setTxChartData(dashboard.subject_chart.map((d, i) => ({ ...d, label: results[i] || d.label })));
    });
  }, [language, dashboard]); // eslint-disable-line react-hooks/exhaustive-deps

  // Translate banner content
  const txBannerSubject = useTranslatedText(banner?.subject ?? '', language);
  const txBannerTitle = useTranslatedText(banner?.title ?? '', language);

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 28, color: 'var(--tx)', marginBottom: 4 }}>
          {t('goodMorning', { name: user?.display_name?.split(' ')[0] ?? 'Parent' })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {t('studentUpdateToday', { student: studentName })} — <strong>Week 8, Term 2</strong>
        </div>
      </div>

      {/* Announcement banner */}
      {banner && (
        <div className="announcement-banner" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 22, flexShrink: 0 }}>📢</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, marginBottom: 2 }}>
              New post from {banner.teacher_name} · {txBannerSubject}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{txBannerTitle}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{timeAgo(banner.created_at)}</div>
          </div>
          <button
            onClick={() => navigate(`/parent/students/${sid}/discussions`)}
            style={{
              background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
              fontSize: 12, color: '#fff', fontWeight: 700, fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
            }}
          >
            {t('viewButton')}
          </button>
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {dashboard.summary_cards.map((card, i) => (
          <div key={i} className="stat-box">
            <div className="stat-label">{t(card.label)}</div>
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
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{t('subjectScores')}</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--tx3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 4, borderRadius: 2, background: 'var(--a1)', display: 'inline-block' }} />
                {studentName.split(' ')[0]}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 4, borderRadius: 2, background: 'rgba(232,97,78,0.35)', display: 'inline-block' }} />
                {t('classAvg')}
              </span>
            </div>
          </div>
          <BarChart
            data={txChartData}
            colors={['#E8614E', '#3DB6A8', '#4A90D9', '#F0A732', '#8B5CF6', '#E91E8C']}
            height={180}
            showAvg
          />
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
            {t('overallTrend')}
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
          {t('allSubjects')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {txSubjects.map((sub, idx) => (
            <div
              key={sub.uuid}
              className="subject-row"
              onClick={() => navigate(`/parent/students/${sid}/subjects/${sub.uuid}`)}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: SUBJECT_COLORS[sub.code] ?? sub.color,
              }} />
              <div style={{ width: 150, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{sub.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{sub.teacher?.display_name}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: barsReady ? `${sub.progress ?? sub.score ?? 0}%` : '0%',
                      background: SUBJECT_COLORS[sub.code] ?? sub.color,
                      transitionDelay: `${idx * 80}ms`,
                    }}
                  />
                </div>
              </div>
              <div
                className="badge subject-row-badge"
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
