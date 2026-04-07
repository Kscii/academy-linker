// ============================================================
// ConversationScreen — parent ↔ teacher discussion thread
// Route: /parent/students/:sid/discussions/:teacherUuid
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { getSubjectColor } from '@/lib/constants';
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
  const { sid, teacherUuid } = useParams<{ sid: string; teacherUuid: string }>();
  const { language, markThreadRead } = useApp();

  const [teacherItem, setTeacherItem] = useState<DiscussionTeacherItem | null>(null);
  const [messages, setMessages] = useState<ThreadPost[]>([]);
  const [availableTags, setAvailableTags] = useState<ThreadPost['tags']>([]);
  const [threadUuid, setThreadUuid] = useState('');
  const [draft, setDraft] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [msgTranslations, setMsgTranslations] = useState<Record<string, MsgTx>>({});
  const [sort, setSort] = useState<'created_at_desc' | 'created_at_asc'>('created_at_desc');
  const [tag, setTag] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedTagUuids, setSelectedTagUuids] = useState<string[]>([]);
  const [replyToPostUuid, setReplyToPostUuid] = useState('');
  const [editingPostUuid, setEditingPostUuid] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingTagUuids, setEditingTagUuids] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      page: 1,
      page_size: 20,
      sort,
      tag: tag || undefined,
      keyword: keyword.trim() || undefined,
    });
    setMessages(res.data.posts);
    setAvailableTags(res.data.available_tags);
    setThreadUuid(res.data.thread_uuid);
    markThreadRead(res.data.thread_uuid);
  }, [keyword, markThreadRead, sid, sort, tag, teacherUuid]);

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
    setMsgTranslations(prev => {
      const validIds = new Set(messages.filter(msg => !msg.is_deleted).map(msg => msg.uuid));
      return Object.fromEntries(Object.entries(prev).filter(([key]) => validIds.has(key)));
    });
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const txViewGrades = t('parentConversation.viewGrades');
  const txNoMessages = t('parentConversation.noMessages', { name: teacherItem?.display_name ?? '' });
  const txTranslate = t('actions.translate');

  const subject = teacherItem?.subjects[0] ?? null;
  const subjectColor = getSubjectColor(subject?.code);
  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const replyTarget = useMemo(
    () => messages.find(message => message.uuid === replyToPostUuid) ?? null,
    [messages, replyToPostUuid]
  );

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
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !threadUuid || sending) return;
    setSending(true);
    try {
      await postsApi.create(threadUuid, {
        title: draftTitle.trim() || null,
        content_markdown: text,
        original_language: language,
        tag_uuids: selectedTagUuids.length > 0 ? selectedTagUuids : undefined,
        reply_to_post_uuid: replyToPostUuid || null,
      });
      setDraftTitle('');
      setDraft('');
      setSelectedTagUuids([]);
      setReplyToPostUuid('');
      await loadThread();
      await loadTeacher();
    } finally {
      setSending(false);
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

  const startEditing = (post: ThreadPost) => {
    setEditingPostUuid(post.uuid);
    setEditingTitle(post.title ?? '');
    setEditingContent(post.original_content_markdown);
    setEditingTagUuids(post.tags.map(tagItem => tagItem.uuid));
  };

  const cancelEditing = () => {
    setEditingPostUuid('');
    setEditingTitle('');
    setEditingContent('');
    setEditingTagUuids([]);
  };

  const saveEdit = async () => {
    if (!editingPostUuid || !editingContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await postsApi.update(editingPostUuid, {
        title: editingTitle.trim() || null,
        content_markdown: editingContent.trim(),
        original_language: language,
        tag_uuids: editingTagUuids,
      });
      cancelEditing();
      await loadThread();
    } finally {
      setSavingEdit(false);
    }
  };

  const deletePost = async (postUuid: string) => {
    if (!window.confirm(t('parentConversation.deleteConfirm'))) return;
    await postsApi.delete(postUuid);
    if (editingPostUuid === postUuid) cancelEditing();
    setMsgTranslations(prev => {
      const next = { ...prev };
      delete next[postUuid];
      return next;
    });
    if (replyToPostUuid === postUuid) setReplyToPostUuid('');
    await loadThread();
    await loadTeacher();
  };

  const charLeft = MAX_CHARS - draft.length;
  const isOverLimit = charLeft < 0;

  if (!teacherItem) {
    return <div style={{ padding: 32, color: 'var(--tx3)' }}>{t('parentConversation.notFound')}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxHeight: 820 }}>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 0 }}>
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
              const isEditing = editingPostUuid === msg.uuid;
              const bubbleText = tx?.showOriginal
                ? msg.original_content_markdown
                : (tx?.text ?? msg.content_markdown);
              const canTranslate = !msg.is_deleted && msg.original_language !== language;
              const isShowingOriginal = tx?.showOriginal ?? false;
              const replyPreview = msg.reply_to_post_uuid ? messages.find(item => item.uuid === msg.reply_to_post_uuid) : null;
              const titleText = msg.title?.trim() || t('common.untitled');

              return (
                <div key={msg.uuid} style={{ marginBottom: 12, border: '1px solid var(--bd)', borderRadius: 14, background: 'var(--card)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--bd)', background: isParent ? `${subjectColor}10` : 'var(--bg2)' }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, background: isParent ? subjectColor : subjectColor + '20', color: isParent ? '#fff' : subjectColor, fontWeight: 700 }}>
                      {initials(msg.author.display_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{titleText}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{msg.author.display_name} · {formatTime(msg.created_at)}</div>
                    </div>
                    {!msg.is_deleted && (
                      <button className="chip" style={{ fontSize: 11 }} onClick={() => setReplyToPostUuid(msg.uuid)}>
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
                    {isEditing ? (
                      <div style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 14, padding: 12 }}>
                        <input
                          className="input-field"
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                          placeholder={t('parentConversation.optionalTitle')}
                          style={{ marginBottom: 8 }}
                        />
                        <textarea
                          className="input-field"
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                          rows={4}
                          style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 13 }}
                        />
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                          {availableTags.map(item => {
                            const selected = editingTagUuids.includes(item.uuid);
                            return (
                              <button
                                key={item.uuid}
                                className="chip"
                                style={{ fontSize: 11, background: selected ? 'var(--a1)' : undefined, color: selected ? '#fff' : undefined }}
                                onClick={() => setEditingTagUuids(prev => selected ? prev.filter(id => id !== item.uuid) : [...prev, item.uuid])}
                              >
                                {item.name}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} onClick={cancelEditing}>
                            {t('parentConversation.cancel')}
                          </button>
                          <button className="btn-primary" style={{ width: 'auto', padding: '8px 12px' }} disabled={!editingContent.trim() || savingEdit} onClick={() => void saveEdit()}>
                            {savingEdit ? t('parentConversation.saving') : t('actions.save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, lineHeight: 1.65, color: msg.is_deleted ? 'var(--tx3)' : 'var(--tx)' }}>
                        {bubbleText}
                      </div>
                    )}

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
                      {isParent && !isEditing && (
                        <>
                          <button onClick={() => startEditing(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a2)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)' }}>
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
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bd)', background: 'var(--card)', borderRadius: '0 0 12px 12px', flexShrink: 0 }}>
        {replyTarget && (
          <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)' }}>
                {t('parentConversation.replyingTo', { title: replyTarget.title?.trim() || t('common.untitled') })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                {replyTarget.original_content_markdown.slice(0, 120)}
              </div>
            </div>
            <button className="btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: 11 }} onClick={() => setReplyToPostUuid('')}>
              {t('parentConversation.clearReply')}
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {availableTags.map(item => {
            const selected = selectedTagUuids.includes(item.uuid);
            return (
              <button
                key={item.uuid}
                className="chip"
                style={{ fontSize: 11, background: selected ? 'var(--a1)' : undefined, color: selected ? '#fff' : undefined }}
                onClick={() => setSelectedTagUuids(prev => selected ? prev.filter(id => id !== item.uuid) : [...prev, item.uuid])}
              >
                {item.name}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <input
              className="input-field"
              placeholder={t('parentConversation.optionalTitle')}
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <textarea
              className="input-field"
              placeholder={t('parentConversation.bodyPlaceholder')}
              value={draft}
              onChange={e => setDraft(e.target.value.slice(0, MAX_CHARS + 20))}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isOverLimit) void handleSend();
                }
              }}
              rows={2}
              style={{ resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, minHeight: 60, borderColor: isOverLimit ? 'var(--warn)' : undefined }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, marginTop: 4, color: charLeft <= 30 ? (isOverLimit ? 'var(--warn)' : 'var(--a1)') : 'var(--tx3)' }}>
              {draft.length}/{MAX_CHARS}
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || isOverLimit || sending || !threadUuid}
            style={{ width: 'auto', padding: '10px 18px', fontSize: 13, marginBottom: 22, opacity: (!draft.trim() || isOverLimit || !threadUuid) ? 0.45 : 1 }}
          >
            {replyToPostUuid ? t('parentConversation.postReply') : t('parentConversation.newPost')}
          </button>
        </div>
      </div>
    </div>
  );
}
