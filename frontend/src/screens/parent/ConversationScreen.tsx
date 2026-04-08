// ============================================================
// ConversationScreen — parent ↔ teacher discussion thread
// Route: /parent/students/:sid/discussions/:teacherUuid
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PostComposerDrawer } from '@/components/PostComposerDrawer';
import { TtsButton } from '@/components/TtsButton';
import { getSubjectColor } from '@/lib/constants';
import { useEscapeKey } from '@/lib/keyboard';
import type { DiscussionTeacherItem, ThreadPost } from '@/types/api';
import { useApp } from '@/contexts/AppContext';
import { parent as parentApi, posts as postsApi, translations } from '@/lib/api';

const MAX_CHARS = 300;
const POLL_INTERVAL = 10_000;

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateLabel(dateStr: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t('parentConversation.today');
  if (d.toDateString() === yesterday.toDateString()) return t('parentConversation.yesterday');
  return d.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
}

interface MsgTx {
  text: string | null;
  loading: boolean;
  showOriginal: boolean;
}

export function ConversationScreen() {
  const { t } = useTranslation('app');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sid, teacherUuid } = useParams<{ sid: string; teacherUuid: string }>();
  const { language, markThreadRead } = useApp();

  const [teacherItem, setTeacherItem] = useState<DiscussionTeacherItem | null>(null);
  const [messages, setMessages] = useState<ThreadPost[]>([]);
  const [availableTags, setAvailableTags] = useState<ThreadPost['tags']>([]);
  const [threadUuid, setThreadUuid] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [composerBusy, setComposerBusy] = useState(false);
  const [msgTranslations, setMsgTranslations] = useState<Record<string, MsgTx>>({});
  const [sort, setSort] = useState<'created_at_desc' | 'created_at_asc'>('created_at_desc');
  const [tag, setTag] = useState('');
  const [keyword, setKeyword] = useState('');
  const [composerState, setComposerState] = useState<{
    mode: 'create' | 'reply' | 'edit';
    post?: ThreadPost;
  } | null>(null);
  const highlightedPostUuid = searchParams.get('post') ?? '';

  const loadTeacher = useCallback(async () => {
    if (!sid || !teacherUuid) return null;
    const res = await parentApi.getDiscussionTeachers(sid, { sort: 'display_name_asc' });
    const found = res.data.find(item => item.uuid === teacherUuid) ?? null;
    setTeacherItem(found);
    return found;
  }, [sid, teacherUuid]);

  const loadThread = useCallback(async () => {
    if (!sid || !teacherUuid) return;
    const res = await parentApi.getDiscussionThread(sid, teacherUuid, {
      page,
      page_size: 20,
      sort,
      tag: tag || undefined,
      keyword: keyword.trim() || undefined,
    });
    setMessages(res.data.posts);
    setAvailableTags(res.data.available_tags);
    setThreadUuid(res.data.thread_uuid);
    setTotalPages(Math.max(res.data.meta.total_pages, 1));
    markThreadRead(res.data.thread_uuid);
  }, [keyword, markThreadRead, page, sid, sort, tag, teacherUuid]);

  useEffect(() => {
    void loadTeacher();
  }, [loadTeacher]);

  useEffect(() => {
    void loadThread();
    const id = setInterval(() => { void loadThread(); }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [loadThread]);

  useEffect(() => {
    setMsgTranslations({});
  }, [language]);

  useEffect(() => {
    setPage(1);
  }, [keyword, sort, tag, teacherUuid]);

  useEffect(() => {
    setComposerState(null);
  }, [teacherUuid]);

  useEffect(() => {
    setMsgTranslations(prev => {
      const validIds = new Set(messages.filter(msg => !msg.is_deleted).map(msg => msg.uuid));
      return Object.fromEntries(Object.entries(prev).filter(([key]) => validIds.has(key)));
    });
  }, [messages]);

  useEffect(() => {
    if (!highlightedPostUuid) return;
    const el = document.getElementById(`post-${highlightedPostUuid}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timeout = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('post');
        return next;
      }, { replace: true });
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [highlightedPostUuid, messages, setSearchParams]);

  useEscapeKey({
    enabled: composerState === null,
    onEscape: () => {
      if (!sid) return;
      navigate(`/parent/students/${sid}/discussions`);
    },
  });

  const txViewGrades = t('parentConversation.viewGrades');
  const txNoMessages = t('parentConversation.noMessages', { name: teacherItem?.display_name ?? '' });
  const txTranslate = t('actions.translate');

  const subject = teacherItem?.subjects[0] ?? null;
  const subjectColor = getSubjectColor(subject?.code);
  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const replyTarget = composerState?.mode === 'reply' ? composerState.post ?? null : null;
  const composerResetKey = composerState
    ? composerState.mode === 'create'
      ? 'create'
      : `${composerState.mode}:${composerState.post?.uuid ?? ''}`
    : 'closed';

  const groupedMessages = useMemo(() => {
    const groups: { label: string; msgs: ThreadPost[] }[] = [];
    let lastLabel = '';
    for (const msg of messages) {
      const label = formatDateLabel(msg.created_at, t);
      if (label !== lastLabel) {
        groups.push({ label, msgs: [] });
        lastLabel = label;
      }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [messages, t]);

  const submitComposer = async (payload: { title: string | null; content: string; tagUuids: string[] }) => {
    if (!threadUuid || !composerState || composerBusy) return;
    setComposerBusy(true);
    try {
      if (composerState.mode === 'edit' && composerState.post) {
        await postsApi.update(composerState.post.uuid, {
          title: payload.title,
          content_markdown: payload.content,
          original_language: language,
          tag_uuids: payload.tagUuids,
        });
      } else {
        await postsApi.create(threadUuid, {
          title: payload.title,
          content_markdown: payload.content,
          original_language: language,
          tag_uuids: payload.tagUuids.length > 0 ? payload.tagUuids : undefined,
          reply_to_post_uuid: composerState.mode === 'reply' ? composerState.post?.uuid ?? null : null,
        });
      }
      setComposerState(null);
      await loadThread();
      await loadTeacher();
    } finally {
      setComposerBusy(false);
    }
  };

  const handleTranslate = async (post: ThreadPost) => {
    if (post.is_deleted) return;
    const id = post.uuid;
    const existing = msgTranslations[id];
    if (existing) {
      setMsgTranslations(prev => ({ ...prev, [id]: { ...prev[id], showOriginal: !prev[id].showOriginal } }));
      return;
    }
    if (post.translated_content_markdown) {
      setMsgTranslations(prev => ({
        ...prev,
        [id]: {
          text: post.translated_content_markdown,
          loading: false,
          showOriginal: post.display_language !== post.original_language,
        },
      }));
      return;
    }
    setMsgTranslations(prev => ({ ...prev, [id]: { text: '', loading: true, showOriginal: false } }));
    try {
      const res = await translations.resolve({ resource_type: 'post', resource_uuid: post.uuid });
      const translated = res.data.translated_content_markdown ?? res.data.display_content_markdown;
      setMsgTranslations(prev => ({ ...prev, [id]: { text: translated, loading: false, showOriginal: false } }));
      await loadThread();
    } catch {
      setMsgTranslations(prev => ({ ...prev, [id]: { text: post.content_markdown, loading: false, showOriginal: false } }));
    }
  };

  const deletePost = async (postUuid: string) => {
    if (!window.confirm(t('parentConversation.deleteConfirm'))) return;
    await postsApi.delete(postUuid);
    if (composerState?.post?.uuid === postUuid) setComposerState(null);
    setMsgTranslations(prev => {
      const next = { ...prev };
      delete next[postUuid];
      return next;
    });
    await loadThread();
    await loadTeacher();
  };

  if (!teacherItem) {
    return <div style={{ padding: 32, color: 'var(--tx3)' }}>{t('parentConversation.notFound')}</div>;
  }

  return (
    <>
    <div className="discussion-shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--bd)', background: 'var(--card)', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
        <button
          onClick={() => navigate(`/parent/students/${sid}/discussions`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 20, lineHeight: 1, padding: '0 4px', fontFamily: 'var(--font-body)' }}
        >
          ←
        </button>

        <div className="avatar avatar-lg" style={{ background: subjectColor + '20', color: subjectColor, fontWeight: 700, flexShrink: 0 }}>
          {initials(teacherItem.display_name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{teacherItem.display_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            {teacherItem.subjects.map(item => (
              <span key={item.uuid} className="subject-chip" style={{ background: subjectColor + '18', color: subjectColor, fontSize: 11 }}>
                {item.name}
              </span>
            ))}
          </div>
        </div>

        {subject && (
          <button
            onClick={() => navigate(`/parent/students/${sid}/subjects/${subject.uuid}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${subjectColor}30`, background: subjectColor + '10', color: subjectColor, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <span style={{ fontSize: 14 }}>📊</span>
            {txViewGrades}
          </button>
        )}
      </div>

      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bd)', background: 'var(--card)', display: 'grid', gridTemplateColumns: '1fr 180px 180px', gap: 8, flexShrink: 0 }}>
        <input className="input-field" placeholder={t('parentConversation.searchPlaceholder')} value={keyword} onChange={e => setKeyword(e.target.value)} />
        <select className="input-field" value={tag} onChange={e => setTag(e.target.value)}>
          <option value="">{t('parentConversation.allTags')}</option>
          {availableTags.map(item => <option key={item.uuid} value={item.name}>{item.name}</option>)}
        </select>
        <select className="input-field" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="created_at_desc">{t('parentConversation.sortNewest')}</option>
          <option value="created_at_asc">{t('parentConversation.sortOldest')}</option>
        </select>
      </div>

      <div className="discussion-scroll-area" style={{ padding: '20px 20px 8px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, marginTop: 40 }}>
            {txNoMessages}
          </div>
        )}

        {groupedMessages.map(group => (
          <div key={group.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
              <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{group.label}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
            </div>

            {group.msgs.map((msg) => {
              const isParent = msg.author.role === 'parent';
              const tx = msgTranslations[msg.uuid];
              const bubbleText = tx?.showOriginal
                ? msg.original_content_markdown
                : (tx?.text ?? msg.content_markdown);
              const canTranslate = !msg.is_deleted && msg.original_language !== language;
              const isShowingOriginal = tx?.showOriginal ?? false;
              const replyPreview = msg.reply_to_post_uuid ? messages.find(item => item.uuid === msg.reply_to_post_uuid) : null;
              const titleText = msg.title?.trim() || t('common.untitled');

              return (
                <div
                  key={msg.uuid}
                  id={`post-${msg.uuid}`}
                  style={{
                    marginBottom: 12,
                    border: highlightedPostUuid === msg.uuid ? '1px solid var(--a1)' : '1px solid var(--bd)',
                    borderRadius: 14,
                    background: highlightedPostUuid === msg.uuid ? 'rgba(232,97,78,0.06)' : 'var(--card)',
                    overflow: 'hidden',
                    boxShadow: highlightedPostUuid === msg.uuid ? '0 0 0 3px rgba(232,97,78,0.12)' : undefined,
                    transition: 'box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--bd)', background: isParent ? `${subjectColor}10` : 'var(--bg2)' }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, background: isParent ? subjectColor : subjectColor + '20', color: isParent ? '#fff' : subjectColor, fontWeight: 700 }}>
                      {initials(msg.author.display_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{titleText}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{msg.author.display_name} · {formatTime(msg.created_at)}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span className="badge" style={{ fontSize: 10 }}>{msg.display_language}</span>
                        {msg.translated_language && <span className="badge" style={{ fontSize: 10 }}>{msg.translated_language}</span>}
                        {msg.updated_at && <span className="badge" style={{ fontSize: 10 }}>{t('parentConversation.edited')}</span>}
                        {msg.translated_at && <span className="badge" style={{ fontSize: 10 }}>{t('parentConversation.translated')}</span>}
                      </div>
                    </div>
                    {!msg.is_deleted && (
                      <button className="chip" style={{ fontSize: 11 }} onClick={() => setComposerState({ mode: 'reply', post: msg })}>
                        {t('parentConversation.reply')}
                      </button>
                    )}
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    {replyPreview && (
                      <div style={{ marginBottom: 10, padding: '8px 10px', borderLeft: `3px solid ${subjectColor}`, background: 'var(--bg2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>
                          {replyPreview.title?.trim() || t('common.untitled')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                          {replyPreview.original_content_markdown.slice(0, 120)}
                        </div>
                      </div>
                    )}
                    <div style={{ fontSize: 13, lineHeight: 1.65, color: msg.is_deleted ? 'var(--tx3)' : 'var(--tx)' }}>
                      {bubbleText}
                    </div>

                    {msg.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {msg.tags.map(item => (
                          <span key={item.uuid} className="badge" style={{ fontSize: 10 }}>{item.name}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--tx3)', marginTop: 10, flexWrap: 'wrap' }}>
                      {canTranslate && (
                        <button
                          onClick={() => void handleTranslate(msg)}
                          disabled={tx?.loading}
                          style={{ background: 'none', border: 'none', cursor: tx?.loading ? 'default' : 'pointer', color: 'var(--a1)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)', opacity: tx?.loading ? 0.5 : 1 }}
                        >
                          {tx?.loading ? '···' : isShowingOriginal ? t('actions.showTranslation') : (msg.translated_content_markdown || tx?.text || msg.display_language !== msg.original_language ? t('actions.showOriginal') : txTranslate)}
                        </button>
                      )}
                      {!msg.is_deleted && <TtsButton resourceType="post" resourceUuid={msg.uuid} />}
                      {isParent && (
                        <>
                          <button onClick={() => setComposerState({ mode: 'edit', post: msg })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a2)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)' }}>
                            {t('actions.edit')}
                          </button>
                          <button onClick={() => void deletePost(msg.uuid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c43c3c', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)' }}>
                            {t('actions.delete')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bd)', background: 'var(--card)', borderRadius: '0 0 12px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 18px', fontSize: 13 }}
            disabled={!threadUuid}
            onClick={() => setComposerState({ mode: 'create' })}
          >
            {t('parentConversation.newPost')}
          </button>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 11 }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
            {t('actions.previous')}
          </button>
          <div style={{ fontSize: 11, color: 'var(--tx3)', alignSelf: 'center' }}>
            {t('parentConversation.pageStatus', { page, totalPages })}
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 11 }} disabled={page >= totalPages} onClick={() => setPage(prev => prev + 1)}>
            {t('actions.next')}
          </button>
        </div>
        </div>
      </div>
    </div>
    <PostComposerDrawer
      open={composerState !== null}
      resetKey={composerResetKey}
      mode={composerState?.mode ?? 'create'}
      role="parent"
      availableTags={availableTags}
      replyTarget={replyTarget}
      initialTitle={composerState?.mode === 'edit' ? (composerState.post?.title ?? '') : ''}
      initialContent={composerState?.mode === 'edit' ? (composerState.post?.original_content_markdown ?? '') : ''}
      initialTagUuids={composerState?.mode === 'edit' ? (composerState.post?.tags.map(tagItem => tagItem.uuid) ?? []) : []}
      busy={composerBusy}
      maxChars={MAX_CHARS}
      onClose={() => setComposerState(null)}
      onSubmit={submitComposer}
    />
    </>
  );
}
