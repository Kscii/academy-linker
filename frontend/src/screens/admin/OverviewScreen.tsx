// ============================================================
// Admin OverviewScreen — stats dashboard
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { admin as adminApi } from '@/lib/api';
import type { AdminOverview } from '@/types/api';

const STAT_CARDS = [
  { key: 'teacher_count' as const, label: 'Teachers',  icon: '👨‍🏫', color: 'var(--a4)', path: '/admin/teachers' },
  { key: 'student_count' as const, label: 'Students',  icon: '🎒', color: 'var(--a2)', path: '/admin/students' },
  { key: 'parent_count'  as const, label: 'Parents',   icon: '👪', color: 'var(--a3)', path: '/admin/parents'  },
  { key: 'class_count'   as const, label: 'Classes',   icon: '🏫', color: 'var(--a1)', path: '/admin/classes'  },
];

export function AdminOverviewScreen() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  useEffect(() => {
    adminApi.getOverview().then(r => setOverview(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          Admin Panel
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Westside Academy — school management
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {STAT_CARDS.map(card => (
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
        {[
          { title: 'Manage Users', desc: 'View all admin, teacher, and parent accounts with role-based filters.', icon: '🧾', path: '/admin/users', color: 'var(--a4)' },
          { title: 'Manage Teachers', desc: 'Create teacher accounts, set subjects and classes.', icon: '👨‍🏫', path: '/admin/teachers', color: 'var(--a4)' },
          { title: 'Manage Classes', desc: 'Create classes, assign homeroom teachers and enrol students.', icon: '🏫', path: '/admin/classes', color: 'var(--a1)' },
          { title: 'Manage Students', desc: 'Add students, assign to classes.', icon: '🎒', path: '/admin/students', color: 'var(--a2)' },
          { title: 'Manage Parents', desc: 'Create parent accounts and bind them to their children.', icon: '👪', path: '/admin/parents', color: 'var(--a3)' },
          { title: 'Teaching Assignments', desc: 'Create or disable teacher-student-subject assignments.', icon: '🧩', path: '/admin/assignments/teaching', color: 'var(--a1)' },
          { title: 'System Tags', desc: 'Maintain shared system tags used across discussions and dashboards.', icon: '🏷', path: '/admin/tags/system', color: 'var(--a2)' },
        ].map(item => (
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
