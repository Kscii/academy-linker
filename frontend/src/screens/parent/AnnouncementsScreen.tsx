// ============================================================
// AnnouncementsScreen — list of school announcements
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { parent as parentApi, translations } from '@/lib/api';
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
  const { t } = useTranslation('app');
  const { sid } = useParams<{ sid: string }>();
  const studentUuid = sid ?? '';
  const { language, readAnnouncementIds, markAnnouncementRead, setAnnouncementUuids } = useApp();
  const txTitle = t('parentAnnouncements.title');
  const txSubtitle = t('parentAnnouncements.subtitle');
  const txUnread = t('parentAnnouncements.unreadNotices');
  const [selectedUuid, setSelectedUuid] = useState('');
  const readSet = readAnnouncementIds;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [detail, setDetail] = useState<AnnouncementDetail | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [resolvingTranslation, setResolvingTranslation] = useState(false);

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
      setShowOriginal(false);
      return;
    }
    parentApi.getAnnouncement(selectedUuid).then(res => {
      setDetail(res.data);
    }).catch(() => {});
  }, [selectedUuid]);

  const handleOpen = (ann: Announcement) => {
    setSelectedUuid(ann.uuid);
    setShowOriginal(false);
    if (!readSet.has(ann.uuid)) {
      markAnnouncementRead(ann.uuid);
      parentApi.markAnnouncementRead(ann.uuid).catch(() => {});
    }
  };

  const toggleTranslation = async () => {
    if (!detail || detail.original_language === language) return;
    if (detail.translated_content_markdown || detail.translation_status === 'completed') {
      setShowOriginal(prev => !prev);
      return;
    }
    setResolvingTranslation(true);
    try {
      const res = await translations.resolve({ resource_type: 'announcement', resource_uuid: detail.uuid });
      setDetail(prev => prev ? ({
        ...prev,
        display_content_markdown: res.data.display_content_markdown,
        translated_content_markdown: res.data.translated_content_markdown,
        display_language: res.data.display_language,
        translated_language: res.data.translated_language,
        translation_status: res.data.translation_status,
        translated_at: res.data.translated_at,
      }) : prev);
      setShowOriginal(false);
    } finally {
      setResolvingTranslation(false);
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
          {announcements.map(ann => {
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
                          {t('parentAnnouncements.new')}
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

          {announcements.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '60px 0' }}>
              {t('parentAnnouncements.empty')}
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
                    {detail.due_at ? ` · ${t('parentAnnouncements.due', { date: formatDate(detail.due_at) })}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {detail.original_language !== language && (
                    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 11 }} onClick={() => void toggleTranslation()} disabled={resolvingTranslation}>
                      {resolvingTranslation ? '…' : showOriginal ? t('actions.showTranslation') : (detail.translated_content_markdown ? t('actions.showOriginal') : t('actions.translate'))}
                    </button>
                  )}
                  <span className="badge" style={{ background: CATEGORY_COLORS[detail.category] + '18', color: CATEGORY_COLORS[detail.category], fontSize: 11 }}>
                    {detail.category}
                  </span>
                  {detail.is_important && (
                    <span className="badge" style={{ background: 'var(--a1)18', color: 'var(--a1)', fontSize: 11 }}>
                      {t('parentAnnouncements.important')}
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
                {showOriginal ? detail.original_content_markdown : detail.display_content_markdown}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '80px 0' }}>
              {t('parentAnnouncements.selectPrompt')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
