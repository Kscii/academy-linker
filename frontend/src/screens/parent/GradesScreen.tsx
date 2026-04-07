// ============================================================
// GradesScreen — academic performance: scores, charts, subjects
// ============================================================

import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { translateBatch, useTranslatedText } from '@/lib/translate';
import { parent as parentApi } from '@/lib/api';
import type { DashboardResponse, SubjectSummary, ChartDataPoint } from '@/types/api';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { SUBJECT_COLORS } from '@/lib/constants';

const ACCENT_COLORS: Record<string, string> = {
  a1: 'var(--a1)', a2: 'var(--a2)', a3: 'var(--a3)', a4: 'var(--a4)',
};

function getSubjectColor(subject: Pick<SubjectSummary, 'code' | 'color'>): string {
  return (subject.code ? SUBJECT_COLORS[subject.code] : undefined) ?? subject.color ?? 'var(--a1)';
}

export function GradesScreen() {
  const navigate = useNavigate();
  const { sid } = useParams<{ sid: string }>();
  const { language } = useApp();
  const { t } = useTranslation('dashboard');

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    if (!sid) return;
    Promise.all([
      parentApi.getDashboard(sid).catch(() => null),
      parentApi.getSubjects(sid).catch(() => null),
    ]).then(([dashRes, subRes]) => {
      if (dashRes) {
        setDashboard(dashRes.data);
        const s = dashRes.data.student;
        if (s) setStudentName(s.preferred_name ?? s.full_name);
      }
      if (subRes) {
        const statsMap = new Map(
          (dashRes?.data.subject_statistics ?? [])
            .filter(st => st.subject_uuid != null)
            .map(st => [st.subject_uuid, st] as const)
        );
        setSubjects(subRes.data.map(sub => ({
          ...sub,
          color: getSubjectColor(sub),
          score: statsMap.get(sub.uuid)?.score,
          progress: statsMap.get(sub.uuid)?.progress,
        })));
      }
    });
  }, [sid]);

  const [barsReady, setBarsReady] = useState(false);
  useEffect(() => {
    const t2 = setTimeout(() => setBarsReady(true), 60);
    return () => clearTimeout(t2);
  }, []);

  const [txSubjects, setTxSubjects] = useState<SubjectSummary[]>([]);
  const [txChartData, setTxChartData] = useState<ChartDataPoint[]>([]);
  useEffect(() => {
    setTxSubjects(subjects);
    const barData = (dashboard?.charts.subject_score_bar_chart ?? []).map(d => ({ label: d.subject_name, value: d.value }));
    setTxChartData(barData);
    if (language === 'en') return;
    const names = subjects.map(s => s.name);
    translateBatch(names, language).then(results => {
      setTxSubjects(subjects.map((s, i) => ({ ...s, name: results[i] || s.name })));
      setTxChartData(barData.map((d, i) => ({ ...d, label: results[i] || d.label })));
    });
  }, [language, subjects, dashboard]); // eslint-disable-line react-hooks/exhaustive-deps // eslint-disable-line react-hooks/exhaustive-deps

  const txTitle = useTranslatedText('Academic Performance', language);
  const txSubtitle = useTranslatedText(`${studentName}'s grades and progress`, language);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>{txTitle}</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{txSubtitle}</div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[{labelKey: 'overallPerformance', value: dashboard?.summary_cards.overall_performance_index != null ? `${Math.round(dashboard.summary_cards.overall_performance_index)}%` : '—', color: 'a1'},
          {labelKey: 'assignmentCompletion', value: dashboard?.summary_cards.assignment_completion_rate != null ? `${Math.round(dashboard.summary_cards.assignment_completion_rate * 100)}%` : '—', color: 'a2'},
          {labelKey: 'attendance', value: dashboard?.summary_cards.attendance_rate != null ? `${Math.round(dashboard.summary_cards.attendance_rate * 100)}%` : '—', color: 'a3'},
          {labelKey: 'subjects', value: txSubjects.length, color: 'a4'},
        ].map((card, i) => (
          <div key={i} className="stat-box">
            <div className="stat-label">{t(card.labelKey)}</div>
            <div className="stat-value" style={{ color: ACCENT_COLORS[card.color ?? 'a1'] }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
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
            data={dashboard?.charts.learning_progress_chart ?? []}
            avgData={dashboard?.charts.learning_progress_chart ?? []}
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
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: getSubjectColor(sub) }} />
              <div style={{ width: 150, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{sub.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{sub.teachers?.[0]?.display_name ?? 'No teacher assigned'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: barsReady ? `${sub.progress ?? sub.score ?? 0}%` : '0%',
                      background: getSubjectColor(sub),
                      transitionDelay: `${idx * 80}ms`,
                    }}
                  />
                </div>
              </div>
              <div
                className="badge subject-row-badge"
                style={{ background: `${getSubjectColor(sub)}22`, color: getSubjectColor(sub), fontSize: 13, fontWeight: 700, minWidth: 44, justifyContent: 'center' }}
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
