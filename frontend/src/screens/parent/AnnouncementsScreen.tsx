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
              const ac = post.subject_color ?? 'var(--a4)';
              const ini = (name: string) => name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div key={post.uuid} style={{ border: '1px solid var(--bd)', borderRadius: 12, background: 'var(--card)', overflow: 'hidden' }}>

                  {/* ── Post header (always visible) ── */}
                  <div
                    style={{ padding: '14px 16px', cursor: 'pointer' }}
                    onClick={() => {
                      const opening = !isOpen;
                      setExpandedTeacherPost(opening ? post.uuid : null);
                      if (opening && !readPostIds.has(post.uuid)) markPostRead(post.uuid);
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ac + '18', color: ac }}>
                        {post.subject_name ?? post.target_label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>posted by Ms. Thompson · {timeAgo(post.created_at)}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx3)' }}>
                        💬 {replies.length} comment{replies.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.3 }}>{post.title}</div>
                    {!isOpen && (
                      <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 6, lineHeight: 1.5 }}>
                        {content?.slice(0, 100)}…
                      </div>
                    )}
                  </div>

                  {/* ── Expanded: body + comments ── */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--bd)' }}>

                      {/* Post body */}
                      <div style={{ padding: '14px 16px 16px', fontSize: 13, color: 'var(--tx)', lineHeight: 1.75, background: ac + '04' }}>
                        {content}
                      </div>

                      {/* Comments section */}
                      <div style={{ borderTop: '2px solid var(--bd)', padding: '0 16px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 0 10px' }}>
                          {replies.length} Comment{replies.length !== 1 ? 's' : ''}
                        </div>

                        {/* Comment list */}
                        {replies.map(r => {
                          const isTeacher = r.role === 'teacher';
                          return (
                            <div key={r.uuid} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                background: isTeacher ? ac + '20' : 'var(--a2)20',
                                color: isTeacher ? ac : 'var(--a2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, marginTop: 1,
                              }}>
                                {ini(r.author_name)}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{r.author_name}</span>
                                  {isTeacher && (
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: ac + '18', color: ac }}>
                                      Teacher
                                    </span>
                                  )}
                                  <span style={{ fontSize: 11, color: 'var(--tx3)' }}>· {timeAgo(r.sent_at)}</span>
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--tx)', lineHeight: 1.65 }}>{r.text}</div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add comment */}
                        <div style={{ display: 'flex', gap: 12, paddingBottom: 14 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--a2)20', color: 'var(--a2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                            LW
                          </div>
                          <div style={{ flex: 1 }}>
                            <textarea
                              className="input-field"
                              placeholder="Add a comment…"
                              value={postReplyDrafts[post.uuid] ?? ''}
                              onChange={e => setPostReplyDrafts(prev => ({ ...prev, [post.uuid]: e.target.value }))}
                              rows={2}
                              style={{ resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8, minHeight: 60 }}
                              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTeacherPostReply(post.uuid); } }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, gap: 8 }}>
                              <button
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--tx3)', fontFamily: 'var(--font-body)', padding: '5px 10px' }}
                                onClick={() => setPostReplyDrafts(prev => ({ ...prev, [post.uuid]: '' }))}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn-primary"
                                style={{ width: 'auto', padding: '6px 18px', fontSize: 12, borderRadius: 20, opacity: !(postReplyDrafts[post.uuid] ?? '').trim() ? 0.4 : 1 }}
                                onClick={() => handleTeacherPostReply(post.uuid)}
                                disabled={!(postReplyDrafts[post.uuid] ?? '').trim()}
                              >
                                Comment
                              </button>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
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
