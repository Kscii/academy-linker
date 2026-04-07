// ============================================================
// Teacher DashboardScreen — greeting, stat cards, class cards grid
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import { teacher as teacherApi } from '@/lib/api';
import type { TeacherOverview } from '@/types/api';

const CLASS_ACCENT = ['var(--a1)', 'var(--a2)', 'var(--a3)', 'var(--a4)'];

export function TeacherDashboardScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const { t } = useTranslation(['dashboard', 'app']);
  const [overview, setOverview] = useState<TeacherOverview | null>(null);

  useEffect(() => {
    teacherApi.getOverview().then(res => setOverview(res.data)).catch(() => {});
  }, []);

  if (!overview) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>{t('app:common.loading')}</div>
  );

  const { summary, classes } = overview;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 28, color: 'var(--tx)', marginBottom: 4 }}>
          {t('welcome', { name: user?.display_name?.split(' ')[1] ?? user?.display_name ?? 'Teacher' })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {t('classOverview')} <strong>Week 8, Term 2</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        <div className="stat-box">
          <div className="stat-label">{t('students')}</div>
          <div className="stat-value" style={{ color: 'var(--a1)' }}>{summary.student_count}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">{t('classes')}</div>
          <div className="stat-value" style={{ color: 'var(--a2)' }}>{summary.class_count}</div>
        </div>
        <div
          className="stat-box"
          onClick={() => navigate('/teacher/messages')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-label">{t('unreadMsgs')}</div>
          <div className="stat-value" style={{ color: 'var(--a4)' }}>{summary.unread_message_count}</div>
          {summary.unread_message_count > 0 && (
            <div style={{ fontSize: 10, color: 'var(--a4)', marginTop: 4, fontWeight: 700 }}>{t('app:teacherDashboard.viewAll')} →</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
          {t('yourClasses')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {classes.map((cls, i) => {
            const accent = CLASS_ACCENT[i % CLASS_ACCENT.length];
            return (
              <div
                key={cls.uuid}
                className="card"
                style={{ cursor: 'pointer', transition: 'transform 0.15s', borderTop: `3px solid ${accent}` }}
                onClick={() => navigate(`/teacher/classes/${cls.uuid}`)}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>
                      {t('grade')} {cls.grade_level} · {cls.academic_year}
                    </div>
                  </div>
                  {cls.is_homeroom && (
                    <span className="subject-chip" style={{ background: accent + '22', color: accent, fontSize: 10 }}>
                      {t('app:teacherDashboard.homeroom')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                  {cls.student_count} {t('students')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
