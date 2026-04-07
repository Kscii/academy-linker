// ============================================================
// AnnouncementsScreen — list of school announcements
// ============================================================

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { parent as parentApi } from '@/lib/api';
import { translateBatch, useTranslatedText } from '@/lib/translate';
import type { Announcement, AnnouncementDetail } from '@/types/api';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

const CATEGORY_COLORS: Record<string, string> = {
  announcement: 'var(--a4)',
  task:         'var(--a2)',
};

export function AnnouncementsScreen() {
  const { sid } = useParams<{ sid: string }>();
  const studentUuid = sid ?? '';
  const { language, readAnnouncementIds, markAnnouncementRead, setAnnouncementUuids } = useApp();
  const txTitle    = useTranslatedText('School Notices', language);
  const txSubtitle = useTranslatedText('Important announcements from the school', language);
  const txUnread   = useTranslatedText('unread notices', language);
  const [selectedUuid, setSelectedUuid] = useState('');
  const readSet = readAnnouncementIds;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [txAnn, setTxAnn] = useState<Announcement[]>([]);
  const [detail, setDetail] = useState<AnnouncementDetail | null>(null);

  // Fetch announcements from API
  useEffect(() => {
    if (!studentUuid) return;
    parentApi.getAnnouncements(studentUuid).then(res => {
      setAnnouncements(res.data);
      setAnnouncementUuids(res.data.map(a => a.uuid));
      res.data.filter(a => a.is_read).forEach(a => markAnnouncementRead(a.uuid));
      setSelectedUuid(prev => prev || res.data[0]?.uuid || '');
    }).catch(() => {});
  }, [studentUuid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedUuid) {
      setDetail(null);
      return;
    }
    parentApi.getAnnouncement(selectedUuid).then(res => {
      setDetail(res.data);
    }).catch(() => {});
  }, [selectedUuid]);

  useEffect(() => {
    setTxAnn(announcements);
    if (language === 'en') return;
    const texts = announcements.flatMap(a => [a.title, a.body_preview ?? '', a.category ?? '']);
    translateBatch(texts, language).then(results => {
      setTxAnn(announcements.map((a, i) => ({
        ...a,
        title:        results[i * 3]     || a.title,
        body_preview: results[i * 3 + 1] || a.body_preview,
        category:     (results[i * 3 + 2] || a.category) as Announcement['category'],
      })));
    });
  }, [language, announcements]);

  const handleOpen = (ann: Announcement) => {
    setSelectedUuid(ann.uuid);
    if (!readSet.has(ann.uuid)) {
      markAnnouncementRead(ann.uuid);
      parentApi.markAnnouncementRead(ann.uuid).catch(() => {});
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          {txTitle}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {txSubtitle}
        </div>
      </div>

      {announcements.filter(a => !readSet.has(a.uuid)).length > 0 && (
        <div style={{
          background: 'rgba(232,97,78,0.08)', border: '1px solid rgba(232,97,78,0.2)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--a1)',
        }}>
          <span style={{ fontSize: 16 }}>📢</span>
          <strong>{announcements.filter(a => !readSet.has(a.uuid)).length} {txUnread}</strong>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {txAnn.map(ann => {
            const isRead = readSet.has(ann.uuid);
            const catColor = CATEGORY_COLORS[ann.category ?? 'announcement'] ?? 'var(--a4)';
            const isSelected = selectedUuid === ann.uuid;

            return (
              <div
                key={ann.uuid}
                className="card-sm"
                style={{
                  cursor: 'pointer',
                  borderLeft: `4px solid ${isRead ? 'var(--bd)' : catColor}`,
                  borderColor: isSelected ? catColor : undefined,
                  background: isSelected ? `${catColor}10` : (!isRead ? `${catColor}05` : 'var(--card)'),
                }}
                onClick={() => handleOpen(ann)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {!isRead && (
                        <span className="badge" style={{ background: catColor, color: '#fff', fontSize: 10 }}>
                          New
                        </span>
                      )}
                      {ann.category && (
                        <span className="badge" style={{ background: catColor + '18', color: catColor, fontSize: 10 }}>
                          {ann.category}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 'auto' }}>
                        {formatDate(ann.published_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>
                      {ann.title}
                    </div>
                    {ann.body_preview && (
                      <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.5 }}>
                        {ann.body_preview.slice(0, 100)}{ann.body_preview.length > 100 ? '…' : ''}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--tx3)', flexShrink: 0 }}>›</span>
                </div>
              </div>
            );
          })}

          {txAnn.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '60px 0' }}>
              No announcements yet.
            </div>
          )}
        </div>

        <div className="card" style={{ minHeight: 480 }}>
          {detail ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div>
                  <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)', marginBottom: 6 }}>{detail.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                    {detail.author.display_name} · {formatDate(detail.published_at)}
                    {detail.due_at ? ` · Due ${formatDate(detail.due_at)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className="badge" style={{ background: CATEGORY_COLORS[detail.category] + '18', color: CATEGORY_COLORS[detail.category], fontSize: 11 }}>
                    {detail.category}
                  </span>
                  {detail.is_important && (
                    <span className="badge" style={{ background: 'var(--a1)18', color: 'var(--a1)', fontSize: 11 }}>
                      Important
                    </span>
                  )}
                </div>
              </div>

              {detail.subject && (
                <div style={{ marginBottom: 16 }}>
                  <span className="badge" style={{ fontSize: 11 }}>{detail.subject.name}</span>
                </div>
              )}

              <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                {detail.display_content_markdown}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '80px 0' }}>
              Select an announcement to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
