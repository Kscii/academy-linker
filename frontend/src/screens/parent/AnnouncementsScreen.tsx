// ============================================================
// AnnouncementsScreen — list of school announcements
// ============================================================

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { mockAnnouncements } from '@/lib/mock-data';
import { translateBatch } from '@/lib/translate';
import type { Announcement } from '@/types/api';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  Event:      'var(--a1)',
  Interviews: 'var(--a2)',
  Excursion:  'var(--a3)',
  Default:    'var(--a4)',
};

export function AnnouncementsScreen() {
  const { language } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(
    new Set(mockAnnouncements.filter(a => a.is_read).map(a => a.uuid))
  );
  const [txAnn, setTxAnn] = useState(mockAnnouncements);

  useEffect(() => {
    setTxAnn(mockAnnouncements);
    if (language === 'en') return;
    const texts = mockAnnouncements.flatMap(a => [a.title, a.body_preview]);
    translateBatch(texts, language).then(results => {
      setTxAnn(mockAnnouncements.map((a, i) => ({
        ...a,
        title: results[i * 2] || a.title,
        body_preview: results[i * 2 + 1] || a.body_preview,
      })));
    });
  }, [language]);

  const toggleRead = (uuid: string) => {
    setReadSet(prev => {
      const next = new Set(prev);
      next.add(uuid);
      return next;
    });
  };

  const handleExpand = (ann: Announcement) => {
    setExpanded(expanded === ann.uuid ? null : ann.uuid);
    if (!readSet.has(ann.uuid)) toggleRead(ann.uuid);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          School Notices
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Important announcements from the school
        </div>
      </div>

      {/* Unread count banner */}
      {mockAnnouncements.filter(a => !readSet.has(a.uuid)).length > 0 && (
        <div style={{
          background: 'rgba(232,97,78,0.08)', border: '1px solid rgba(232,97,78,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--a1)',
        }}>
          <span style={{ fontSize: 16 }}>📢</span>
          <strong>{mockAnnouncements.filter(a => !readSet.has(a.uuid)).length} unread notices</strong>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {txAnn.map(ann => {
          const isRead = readSet.has(ann.uuid);
          const catColor = CATEGORY_COLORS[ann.category ?? 'Default'] ?? CATEGORY_COLORS.Default;
          const isOpen = expanded === ann.uuid;

          return (
            <div
              key={ann.uuid}
              className="card-sm"
              style={{
                cursor: 'pointer',
                borderLeft: `4px solid ${isRead ? 'var(--bd)' : catColor}`,
                background: !isRead ? `${catColor}05` : 'var(--card)',
              }}
              onClick={() => handleExpand(ann)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {!isRead && (
                      <span
                        className="badge"
                        style={{ background: catColor, color: '#fff', fontSize: 10 }}
                      >
                        New
                      </span>
                    )}
                    {ann.category && (
                      <span
                        className="badge"
                        style={{ background: catColor + '18', color: catColor, fontSize: 10 }}
                      >
                        {ann.category}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 'auto' }}>
                      {formatDate(ann.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>
                    {ann.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5 }}>
                    {isOpen ? ann.body_preview : ann.body_preview.slice(0, 80) + '…'}
                  </div>
                  {isOpen && ann.author && (
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 8 }}>
                      From: {ann.author}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--tx3)', flexShrink: 0 }}>
                  {isOpen ? '▴' : '▾'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
