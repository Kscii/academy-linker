// ============================================================
// Teacher StudentDetailScreen — student dashboard workbench
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { TeacherStudentDashboard } from '@/types/api';

export function StudentDetailScreen() {
  const { t } = useTranslation('app');
  const navigate = useNavigate();
  const { studentUuid } = useParams<{ studentUuid: string }>();
  const [dashboard, setDashboard] = useState<TeacherStudentDashboard | null>(null);

  useEffect(() => {
    if (!studentUuid) return;
    teacherApi.getStudentDashboard(studentUuid).then(res => setDashboard(res.data)).catch(() => {});
  }, [studentUuid]);

  if (!dashboard) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>{t('common.loading')}</div>
    );
  }

  const { student, unread_post_count, summary_cards } = dashboard;
  const initials = student.full_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  const summaryText = summary_cards.summary?.display_text ?? null;

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
        ← {t('teacherStudentDetail.back')}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div className="avatar" style={{ width: 60, height: 60, fontSize: 22, flexShrink: 0, background: 'var(--a1)', color: '#fff' }}>
          {initials}
        </div>
        <div>
          <div className="font-serif" style={{ fontSize: 24, color: 'var(--tx)' }}>
            {student.full_name}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--tx2)' }}>
              {student.sid ?? t('common.noSid')} · {student.grade_level ?? t('common.notAvailable')} · {student.class_name ?? t('common.notAvailable')}
            </span>
            {student.preferred_name && (
              <span className="badge" style={{ fontSize: 10 }}>
                {t('teacherStudentDetail.preferred', { name: student.preferred_name })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('teacherStudentDetail.performance'), value: summary_cards.overall_performance_index != null ? `${Math.round(summary_cards.overall_performance_index)}%` : t('common.notAvailable'), color: 'var(--a1)' },
          { label: t('teacherStudentDetail.attendance'), value: summary_cards.attendance_rate != null ? `${Math.round(summary_cards.attendance_rate * 100)}%` : t('common.notAvailable'), color: 'var(--a2)' },
          { label: t('teacherStudentDetail.completion'), value: summary_cards.assignment_completion_rate != null ? `${Math.round(summary_cards.assignment_completion_rate * 100)}%` : t('common.notAvailable'), color: 'var(--a3)' },
          { label: t('teacherStudentDetail.unreadPosts'), value: unread_post_count, color: 'var(--a4)' },
        ].map((item, index) => (
          <div key={index} className="stat-box">
            <div className="stat-label">{item.label}</div>
            <div className="stat-value" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
            {t('teacherStudentDetail.latestSummary')}
          </div>
          {summaryText ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6 }}>{summaryText}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge" style={{ fontSize: 10 }}>
                  {t('teacherStudentDetail.report', { value: summary_cards.summary?.report_title ?? t('common.notAvailable') })}
                </span>
                <span className="badge" style={{ fontSize: 10 }}>
                  {t('teacherStudentDetail.lang', { value: summary_cards.summary?.display_language ?? t('common.notAvailable') })}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t('teacherStudentDetail.noSummary')}</div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
            {t('teacherStudentDetail.quickActions')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate(`/teacher/discussions?student=${student.uuid}`)}>
              {t('teacherStudentDetail.openParentDiscussion')}
            </button>
            <button className="btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate(`/teacher/reports?student=${student.uuid}`)}>
              {t('teacherStudentDetail.createReport')}
            </button>
            <button className="btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate(`/teacher/posts?mode=announcement&student=${student.uuid}`)}>
              {t('teacherStudentDetail.createAnnouncement')}
            </button>
            <button className="btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate(`/teacher/exam-scores?student=${student.uuid}`)}>
              {t('teacherStudentDetail.manageExamScores')}
            </button>
            <button className="btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate(`/teacher/period-metrics?student=${student.uuid}`)}>
              {t('teacherStudentDetail.managePeriodMetrics')}
            </button>
            <button className="btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate(`/teacher/ai-reports?student=${student.uuid}`)}>
              {t('teacherStudentDetail.generateAiReport')}
            </button>
            <button className="btn-secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => navigate('/teacher/find-student')}>
              {t('teacherStudentDetail.backToStudentSearch')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
