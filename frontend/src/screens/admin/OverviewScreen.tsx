// ============================================================
// Admin OverviewScreen — stats dashboard
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { admin as adminApi } from '@/lib/api';
import type { AdminOverview } from '@/types/api';

export function AdminOverviewScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation('app');
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  const statCards = [
    { key: 'teacher_count' as const, label: t('adminOverview.teachers'), icon: '👨‍🏫', color: 'var(--a4)', path: '/admin/teachers' },
    { key: 'student_count' as const, label: t('adminOverview.students'), icon: '🎒', color: 'var(--a2)', path: '/admin/students' },
    { key: 'parent_count' as const, label: t('adminOverview.parents'), icon: '👪', color: 'var(--a3)', path: '/admin/parents' },
    { key: 'class_count' as const, label: t('adminOverview.classes'), icon: '🏫', color: 'var(--a1)', path: '/admin/classes' },
  ];
  const manageCards = [
    { title: t('adminOverview.manageUsersTitle'), desc: t('adminOverview.manageUsersDesc'), icon: '🧾', path: '/admin/users', color: 'var(--a4)' },
    { title: t('adminOverview.manageTeachersTitle'), desc: t('adminOverview.manageTeachersDesc'), icon: '👨‍🏫', path: '/admin/teachers', color: 'var(--a4)' },
    { title: t('adminOverview.manageClassesTitle'), desc: t('adminOverview.manageClassesDesc'), icon: '🏫', path: '/admin/classes', color: 'var(--a1)' },
    { title: t('adminOverview.manageStudentsTitle'), desc: t('adminOverview.manageStudentsDesc'), icon: '🎒', path: '/admin/students', color: 'var(--a2)' },
    { title: t('adminOverview.manageParentsTitle'), desc: t('adminOverview.manageParentsDesc'), icon: '👪', path: '/admin/parents', color: 'var(--a3)' },
    { title: t('adminOverview.teachingAssignmentsTitle'), desc: t('adminOverview.teachingAssignmentsDesc'), icon: '🧩', path: '/admin/assignments/teaching', color: 'var(--a1)' },
    { title: t('adminOverview.systemTagsTitle'), desc: t('adminOverview.systemTagsDesc'), icon: '🏷', path: '/admin/tags/system', color: 'var(--a2)' },
  ];

  useEffect(() => {
    adminApi.getOverview().then(r => setOverview(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          {t('adminOverview.title')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {t('adminOverview.subtitle')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {statCards.map(card => (
          <div
            key={card.key}
            className="card"
            style={{ cursor: 'pointer', borderTop: `3px solid ${card.color}` }}
            onClick={() => navigate(card.path)}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>
              {overview ? overview[card.key] : '—'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {manageCards.map(item => (
          <div
            key={item.path}
            className="card"
            style={{ cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start' }}
            onClick={() => navigate(item.path)}
          >
            <div style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 16, color: 'var(--tx3)', flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
