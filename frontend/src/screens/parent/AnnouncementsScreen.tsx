// ============================================================
// AnnouncementsScreen — list of school announcements
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { parent as parentApi } from '@/lib/api';
import { translateBatch, useTranslatedText } from '@/lib/translate';
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600_000);
  const d = Math.floor(diff / 86400_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export function AnnouncementsScreen() {
  const { sid } = useParams<{ sid: string }>();
  const studentUuid = sid ?? '';
  const { language, readAnnouncementIds, markAnnouncementRead, classPosts, addPostReply, setAnnouncementUuids, readPostIds, markPostRead } = useApp();
  const txTitle = useTranslatedText('School Notices', language);
  const txSubtitle = useTranslatedText('Important announcements from the school', language);
  const txUnread = useTranslatedText('unread notices', language);
  const [expanded, setExpanded] = useState<string | null>(null);
  const readSet = readAnnouncementIds;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [txAnn, setTxAnn] = useState<Announcement[]>([]);

  // Fetch real announcements from API
  useEffect(() => {
    if (!studentUuid) return;
    parentApi.getAnnouncements(studentUuid).then(res => {
      setAnnouncements(res.data);
      setAnnouncementUuids(res.data.map(a => a.uuid));
      // Sync server-side is_read to local state
      res.data.filter(a => a.is_read).forEach(a => markAnnouncementRead(a.uuid));
    }).catch(() => {});
  }, [studentUuid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTxAnn(announcements);
    if (language === 'en') return;
    const texts = announcements.flatMap(a => [a.title, a.body_preview, a.category ?? '']);
    translateBatch(texts, language).then(results => {
      setTxAnn(announcements.map((a, i) => ({
        ...a,
        title: results[i * 3] || a.title,
        body_preview: results[i * 3 + 1] || a.body_preview,
        category: results[i * 3 + 2] || a.category,
      })));
    });
  }, [language, announcements]);

  // teacher posts for this student (raw + translated copy)
  const myTeacherPosts = useMemo(
    () => classPosts.filter(p => studentUuid && p.versions[studentUuid] !== undefined),
    [classPosts, studentUuid],
  );
  const [txTeacherPosts, setTxTeacherPosts] = useState(myTeacherPosts);

  useEffect(() => {
    // Don't reset to English — only translate; already-translated content stays intact
    if (language === 'en') { setTxTeacherPosts(myTeacherPosts); return; }
    if (myTeacherPosts.length === 0) { setTxTeacherPosts([]); return; }

    let cancelled = false;
    const texts = myTeacherPosts.flatMap(p => {
      const replies = p.replies[studentUuid] ?? [];
      return [p.title, p.versions[studentUuid], ...replies.map(r => r.text)];
    });

    translateBatch(texts, language).then(results => {
      if (cancelled) return;
      let cursor = 0;
      setTxTeacherPosts(myTeacherPosts.map(p => {
        const replies = p.replies[studentUuid] ?? [];
        const txTitle   = results[cursor++] || p.title;
        const txContent = results[cursor++] || p.versions[studentUuid];
        const txReplies = replies.map(r => ({ ...r, text: results[cursor++] || r.text }));
        return {
          ...p,
          title: txTitle,
          versions: { ...p.versions, [studentUuid]: txContent },
          replies:  { ...p.replies,  [studentUuid]: txReplies },
        };
      }));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTeacherPosts, language]);

  const [expandedTeacherPost, setExpandedTeacherPost] = useState<string | null>(null);
  const [postReplyDrafts, setPostReplyDrafts] = useState<Record<string, string>>({});

  const handleTeacherPostReply = (postUuid: string) => {
    const text = (postReplyDrafts[postUuid] ?? '').trim();
    if (!text) return;
    const reply = {
      uuid: `pr-parent-${Date.now()}`,
      author_name: 'Li Wei',
      role: 'parent' as const,
      text,
      sent_at: new Date().toISOString(),
    };
    addPostReply(postUuid, studentUuid, reply);
    setPostReplyDrafts(prev => ({ ...prev, [postUuid]: '' }));
    // Immediately show in txTeacherPosts in the typed language;
    // the translation effect will replace it with the translated version once ready.
    setTxTeacherPosts(prev => prev.map(p =>
      p.uuid !== postUuid ? p : {
        ...p,
        replies: { ...p.replies, [studentUuid]: [...(p.replies[studentUuid] ?? []), reply] },
      }
    ));
  };

  const handleExpand = (ann: Announcement) => {
    setExpanded(expanded === ann.uuid ? null : ann.uuid);
    if (!readSet.has(ann.uuid)) {
      markAnnouncementRead(ann.uuid);
      // Best-effort backend sync
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

      {/* Unread count banner — directly under title */}
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

      {/* ── Teacher class posts ── */}
      {myTeacherPosts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            From Your Teacher
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {txTeacherPosts.map(post => {
              const content = post.versions[studentUuid];
              const replies = post.replies[studentUuid] ?? [];
              const isOpen = expandedTeacherPost === post.uuid;
              const accentColor = post.subject_color ?? 'var(--a4)';
              return (
                <div
                  key={post.uuid}
                  style={{ border: '1px solid var(--bd)', borderLeft: `4px solid ${accentColor}`, borderRadius: 10, background: 'var(--card)', overflow: 'hidden' }}
                >
                  <div
                    style={{ padding: '12px 16px', cursor: 'pointer' }}
                    onClick={() => {
                      const opening = !isOpen;
                      setExpandedTeacherPost(opening ? post.uuid : null);
                      if (opening && !readPostIds.has(post.uuid)) markPostRead(post.uuid);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: accentColor + '18', color: accentColor }}>
                            {post.subject_name ?? post.target_label}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{timeAgo(post.created_at)}</span>
                          {replies.length > 0 && <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: isOpen ? 0 : 4 }}>{post.title}</div>
                        {!isOpen && <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.5 }}>{content.slice(0, 90)}…</div>}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--tx3)', flexShrink: 0 }}>{isOpen ? '▴' : '▾'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <>
                      <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--tx2)', lineHeight: 1.75, borderTop: '1px solid var(--bd)', paddingTop: 12 }}>
                        {content}
                      </div>

                      {replies.map(r => (
                        <div key={r.uuid} style={{ padding: '10px 16px', borderTop: '1px solid var(--bd)', background: r.role === 'teacher' ? accentColor + '08' : 'var(--bg2)', fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontWeight: 700, color: r.role === 'teacher' ? accentColor : 'var(--tx)' }}>{r.author_name}</span>
                            <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{timeAgo(r.sent_at)}</span>
                          </div>
                          {r.text}
                        </div>
                      ))}

                      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--card)' }}>
                        <textarea
                          className="input-field"
                          placeholder="Reply to this post…"
                          value={postReplyDrafts[post.uuid] ?? ''}
                          onChange={e => setPostReplyDrafts(prev => ({ ...prev, [post.uuid]: e.target.value }))}
                          rows={2}
                          style={{ flex: 1, resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, minHeight: 44 }}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTeacherPostReply(post.uuid); } }}
                        />
                        <button
                          className="btn-primary"
                          style={{ width: 'auto', padding: '8px 16px', fontSize: 13, flexShrink: 0, alignSelf: 'flex-end', opacity: !(postReplyDrafts[post.uuid] ?? '').trim() ? 0.4 : 1 }}
                          onClick={() => handleTeacherPostReply(post.uuid)}
                          disabled={!(postReplyDrafts[post.uuid] ?? '').trim()}
                        >
                          Reply
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
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
