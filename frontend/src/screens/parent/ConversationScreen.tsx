// ============================================================
// ConversationScreen — parent ↔ teacher discussion thread
// Route: /parent/students/:sid/conversations/:teacherUuid
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SUBJECT_COLORS } from '@/lib/constants';
import type { DiscussionTeacherItem, ThreadPost } from '@/types/api';
import { useApp } from '@/contexts/AppContext';
import { translateText, useTranslatedText } from '@/lib/translate';
import { parent as parentApi, posts as postsApi } from '@/lib/api';

const MAX_CHARS = 300;
const POLL_INTERVAL = 10_000;

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
}

interface MsgTx {
  text: string;
  loading: boolean;
  shown: boolean;
}

export function ConversationScreen() {
  const navigate = useNavigate();
  const { sid, teacherUuid } = useParams<{ sid: string; teacherUuid: string }>();
  const { language, markThreadRead } = useApp();

  const [teacherItem, setTeacherItem] = useState<DiscussionTeacherItem | null>(null);
  const [messages, setMessages] = useState<ThreadPost[]>([]);
  const [threadUuid, setThreadUuid] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [msgTranslations, setMsgTranslations] = useState<Record<string, MsgTx>>({});
  const [sort, setSort] = useState<'created_at_desc' | 'created_at_asc'>('created_at_desc');
  const [tag, setTag] = useState('');
  const [keyword, setKeyword] = useState('');
  const [editingPostUuid, setEditingPostUuid] = useState('');
  const [editingContent, setEditingContent] = useState('');
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
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const txViewGrades = useTranslatedText('View grades', language);
  const txNoMessages = useTranslatedText(`No messages yet. Send a message to ${teacherItem?.display_name ?? ''}.`, language);
  const txTranslate = useTranslatedText('Translate', language);
  const txHide = useTranslatedText('Hide translation', language);

  const subject = teacherItem?.subjects[0] ?? null;
  const subjectColor = (subject?.code ? SUBJECT_COLORS[subject.code] : undefined) ?? 'var(--a1)';
  const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const availableTags = useMemo(
    () => Array.from(new Map(messages.flatMap(post => post.tags.map(tagItem => [tagItem.name, tagItem]))).values()),
    [messages]
  );

  const groupedMessages = useMemo(() => {
    const groups: { label: string; msgs: ThreadPost[] }[] = [];
    let lastLabel = '';
    for (const msg of messages) {
      const label = formatDateLabel(msg.created_at);
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
      await postsApi.create(threadUuid, { content_markdown: text, original_language: language });
      setDraft('');
      await loadThread();
      await loadTeacher();
    } finally {
      setSending(false);
    }
  };

  const handleTranslate = async (post: ThreadPost) => {
    const id = post.uuid;
    const existing = msgTranslations[id];
    if (existing?.text) {
      setMsgTranslations(prev => ({ ...prev, [id]: { ...prev[id], shown: !prev[id].shown } }));
      return;
    }
    setMsgTranslations(prev => ({ ...prev, [id]: { text: '', loading: true, shown: true } }));
    const translated = await translateText(post.content_markdown, language);
    setMsgTranslations(prev => ({ ...prev, [id]: { text: translated, loading: false, shown: true } }));
  };

  const startEditing = (post: ThreadPost) => {
    setEditingPostUuid(post.uuid);
    setEditingContent(post.content_markdown);
  };

  const cancelEditing = () => {
    setEditingPostUuid('');
    setEditingContent('');
  };

  const saveEdit = async () => {
    if (!editingPostUuid || !editingContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await postsApi.update(editingPostUuid, { content_markdown: editingContent.trim(), original_language: language });
      cancelEditing();
      await loadThread();
    } finally {
      setSavingEdit(false);
    }
  };

  const deletePost = async (postUuid: string) => {
    if (!window.confirm('Delete this message?')) return;
    await postsApi.delete(postUuid);
    if (editingPostUuid === postUuid) cancelEditing();
    await loadThread();
    await loadTeacher();
  };

  const charLeft = MAX_CHARS - draft.length;
  const isOverLimit = charLeft < 0;

  if (!teacherItem) {
    return <div style={{ padding: 32, color: 'var(--tx3)' }}>Conversation not found.</div>;
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
        <input className="input-field" placeholder="Search title or content" value={keyword} onChange={e => setKeyword(e.target.value)} />
        <select className="input-field" value={tag} onChange={e => setTag(e.target.value)}>
          <option value="">All tags</option>
          {availableTags.map(item => <option key={item.uuid} value={item.name}>{item.name}</option>)}
        </select>
        <select className="input-field" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="created_at_desc">Newest first</option>
          <option value="created_at_asc">Oldest first</option>
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

            {group.msgs.map((msg, idx) => {
              const isParent = msg.author.role === 'parent';
              const showAvatar = !isParent && (idx === 0 || group.msgs[idx - 1]?.author.role !== 'teacher');
              const tx = msgTranslations[msg.uuid];
              const isEditing = editingPostUuid === msg.uuid;

              return (
                <div key={msg.uuid} style={{ display: 'flex', flexDirection: isParent ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                  {!isParent && (
                    <div style={{ width: 32, flexShrink: 0 }}>
                      {showAvatar && (
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, background: subjectColor + '20', color: subjectColor, fontWeight: 700 }}>
                          {initials(teacherItem.display_name)}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isParent ? 'flex-end' : 'flex-start' }}>
                    {msg.title && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>
                        {msg.title}
                      </div>
                    )}
                    {isEditing ? (
                      <div style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 14, padding: 12, minWidth: 320 }}>
                        <textarea
                          className="input-field"
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                          rows={4}
                          style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 13 }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} onClick={cancelEditing}>
                            Cancel
                          </button>
                          <button className="btn-primary" style={{ width: 'auto', padding: '8px 12px' }} disabled={!editingContent.trim() || savingEdit} onClick={() => void saveEdit()}>
                            {savingEdit ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '9px 14px', borderRadius: isParent ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isParent ? subjectColor : 'var(--card)', color: isParent ? '#fff' : 'var(--tx)', fontSize: 13, lineHeight: 1.55, border: isParent ? 'none' : '1px solid var(--bd)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                        {msg.content_markdown}
                      </div>
                    )}

                    {msg.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                        {msg.tags.map(item => (
                          <span key={item.uuid} className="badge" style={{ fontSize: 10 }}>{item.name}</span>
                        ))}
                      </div>
                    )}

                    {tx?.shown && (
                      <div style={{ marginTop: 4, padding: '7px 12px', borderRadius: isParent ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: isParent ? subjectColor + '18' : 'var(--bg)', border: `1px solid ${isParent ? subjectColor + '30' : 'var(--bd)'}`, fontSize: 12, lineHeight: 1.55, color: 'var(--tx2)', fontStyle: 'italic', maxWidth: '100%' }}>
                        {tx.loading ? <span style={{ opacity: 0.5 }}>···</span> : tx.text}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--tx3)', marginTop: 3, paddingLeft: 2, paddingRight: 2, flexDirection: isParent ? 'row-reverse' : 'row' }}>
                      <span>{formatTime(msg.created_at)}</span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <button
                        onClick={() => void handleTranslate(msg)}
                        disabled={tx?.loading}
                        style={{ background: 'none', border: 'none', cursor: tx?.loading ? 'default' : 'pointer', color: 'var(--a1)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)', opacity: tx?.loading ? 0.5 : 1 }}
                      >
                        {tx?.loading ? '···' : tx?.shown ? txHide : txTranslate}
                      </button>
                      {isParent && !isEditing && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <button onClick={() => startEditing(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a2)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)' }}>
                            Edit
                          </button>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <button onClick={() => void deletePost(msg.uuid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c43c3c', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)' }}>
                            Delete
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea
              className="input-field"
              placeholder={`Message ${teacherItem.display_name}…`}
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
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
