// ============================================================
// Teacher MessagesScreen — student and parent discussion workspace
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { teacher as teacherApi, posts as postsApi } from '@/lib/api';
import type { DiscussionParentItem, PostTag, TeacherStudentListItem, ThreadPost } from '@/types/api';
import { translateText, useTranslatedText } from '@/lib/translate';

const POLL_INTERVAL = 5_000;

const AI_DRAFTS = [
  "Thank you for reaching out. I'm reviewing the student's recent progress and will keep you updated.",
  "I'd be happy to schedule a meeting to discuss this in more detail.",
  "I recommend focusing on the suggested activities in the class portal this week.",
  "This is a common challenge at this stage. Here are my suggestions:",
];

interface StudentConvoSummary {
  preview: string | null;
  unread: number;
  parentName: string | null;
  lastPostAt: string | null;
}

function initials(name: string): string {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600_000);
  const d = Math.floor(diff / 86400_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export function TeacherMessagesScreen() {
  const { markThreadRead, threadUnreadCounts, language } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStudentUuid = searchParams.get('student') ?? '';

  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [activeStudentUuid, setActiveStudentUuid] = useState(requestedStudentUuid);
  const [parentLists, setParentLists] = useState<Record<string, DiscussionParentItem[]>>({});
  const [activeParentUuid, setActiveParentUuid] = useState('');
  const [messages, setMessages] = useState<ThreadPost[]>([]);
  const [threadUuid, setThreadUuid] = useState('');
  const [reply, setReply] = useState('');
  const [editingPostUuid, setEditingPostUuid] = useState('');
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [editingTagUuids, setEditingTagUuids] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [sending, setSending] = useState(false);
  const [showAiChips, setShowAiChips] = useState(false);
  const [availableTags, setAvailableTags] = useState<PostTag[]>([]);
  const [selectedTagUuids, setSelectedTagUuids] = useState<string[]>([]);
  const [threadSort, setThreadSort] = useState<'created_at_desc' | 'created_at_asc'>('created_at_desc');
  const [threadKeyword, setThreadKeyword] = useState('');
  const [threadTag, setThreadTag] = useState('');
  const [threadPage] = useState(1);
  const [msgTranslations, setMsgTranslations] = useState<Record<string, { text: string; loading: boolean; shown: boolean }>>({});

  const txTranslate = useTranslatedText('Translate', language);
  const txHide = useTranslatedText('Hide translation', language);

  const activeStudent = students.find(student => student.uuid === activeStudentUuid) ?? null;
  const parentsForActiveStudent = parentLists[activeStudentUuid] ?? [];
  const activeParent = parentsForActiveStudent.find(parent => parent.uuid === activeParentUuid) ?? parentsForActiveStudent[0] ?? null;

  const studentSummaries = useMemo<Record<string, StudentConvoSummary>>(() => {
    const summaries: Record<string, StudentConvoSummary> = {};
    Object.entries(parentLists).forEach(([studentUuid, parents]) => {
      const previewParent = [...parents].sort((a, b) => {
        const aTime = a.last_post_at ? new Date(a.last_post_at).getTime() : 0;
        const bTime = b.last_post_at ? new Date(b.last_post_at).getTime() : 0;
        return bTime - aTime;
      })[0];
      summaries[studentUuid] = {
        preview: previewParent ? `Parent: ${previewParent.display_name}` : null,
        unread: parents.reduce((sum, parent) => sum + parent.unread_post_count, 0),
        parentName: previewParent?.display_name ?? null,
        lastPostAt: previewParent?.last_post_at ?? null,
      };
    });
    return summaries;
  }, [parentLists]);

  const loadParents = useCallback(async (studentUuid: string) => {
    if (!studentUuid) return [];
    const res = await teacherApi.getDiscussionParents(studentUuid, { sort: 'last_post_at_desc' });
    setParentLists(prev => ({ ...prev, [studentUuid]: res.data }));
    return res.data;
  }, []);

  const loadThread = useCallback(async (studentUuid: string, parentUuid: string) => {
    if (!studentUuid || !parentUuid) return;
    const res = await teacherApi.getDiscussionThread(studentUuid, parentUuid, {
      page: threadPage,
      page_size: 20,
      sort: threadSort,
      tag: threadTag || undefined,
      keyword: threadKeyword.trim() || undefined,
    });
    setMessages(res.data.posts);
    setThreadUuid(res.data.thread_uuid);
    markThreadRead(studentUuid);
  }, [markThreadRead, threadKeyword, threadPage, threadSort, threadTag]);

  useEffect(() => {
    setMsgTranslations({});
  }, [language, activeStudentUuid, activeParentUuid]);

  useEffect(() => {
    Promise.all([
      teacherApi.getStudents({ page: 1, page_size: 100, sort: 'last_activity_at_desc' }),
      teacherApi.getTags('all'),
    ]).then(([studentsRes, tagsRes]) => {
      setStudents(studentsRes.data);
      setAvailableTags(tagsRes.data);
      const firstStudentUuid = requestedStudentUuid || studentsRes.data[0]?.uuid || '';
      setActiveStudentUuid(firstStudentUuid);
    }).catch(() => {});
  }, [requestedStudentUuid]);

  useEffect(() => {
    if (!activeStudentUuid) return;
    const next = new URLSearchParams();
    next.set('student', activeStudentUuid);
    setSearchParams(next, { replace: true });
    loadParents(activeStudentUuid).then(parents => {
      setActiveParentUuid(prev => (parents.some(parent => parent.uuid === prev) ? prev : parents[0]?.uuid ?? ''));
    }).catch(() => {});
  }, [activeStudentUuid, loadParents, setSearchParams]);

  useEffect(() => {
    if (!activeStudentUuid || !activeParentUuid) {
      setMessages([]);
      setThreadUuid('');
      return;
    }
    void loadThread(activeStudentUuid, activeParentUuid);
  }, [activeParentUuid, activeStudentUuid, loadThread]);

  useEffect(() => {
    const id = setInterval(async () => {
      if (!activeStudentUuid) return;
      await loadParents(activeStudentUuid);
      if (activeParentUuid) {
        await loadThread(activeStudentUuid, activeParentUuid);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [activeParentUuid, activeStudentUuid, loadParents, loadThread]);

  const handleTranslate = useCallback(async (post: ThreadPost) => {
    const id = post.uuid;
    const existing = msgTranslations[id];
    if (existing?.text) {
      setMsgTranslations(prev => ({ ...prev, [id]: { ...prev[id], shown: !prev[id].shown } }));
      return;
    }
    setMsgTranslations(prev => ({ ...prev, [id]: { text: '', loading: true, shown: true } }));
    const translated = await translateText(post.content_markdown, language);
    setMsgTranslations(prev => ({ ...prev, [id]: { text: translated, loading: false, shown: true } }));
  }, [language, msgTranslations]);

  const sendReply = async (text: string) => {
    if (!text.trim() || !threadUuid || sending) return;
    setSending(true);
    try {
      await postsApi.create(threadUuid, {
        content_markdown: text.trim(),
        original_language: language,
        tag_uuids: selectedTagUuids.length > 0 ? selectedTagUuids : undefined,
      });
      setReply('');
      setSelectedTagUuids([]);
      setShowAiChips(false);
      if (activeStudentUuid && activeParentUuid) {
        await loadThread(activeStudentUuid, activeParentUuid);
        await loadParents(activeStudentUuid);
      }
    } finally {
      setSending(false);
    }
  };

  const startEditing = (post: ThreadPost) => {
    setEditingPostUuid(post.uuid);
    setEditingTitle(post.title ?? '');
    setEditingContent(post.content_markdown);
    setEditingTagUuids(post.tags.map(tag => tag.uuid));
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
      if (activeStudentUuid && activeParentUuid) {
        await loadThread(activeStudentUuid, activeParentUuid);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const deletePost = async (postUuid: string) => {
    if (!window.confirm('Delete this message?')) return;
    await postsApi.delete(postUuid);
    if (editingPostUuid === postUuid) {
      cancelEditing();
    }
    if (activeStudentUuid && activeParentUuid) {
      await loadThread(activeStudentUuid, activeParentUuid);
      await loadParents(activeStudentUuid);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)' }}>Messages</div>
      </div>

      <div className="messages-split">
        <div className="conversation-list">
          <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd)' }}>
            Parent conversations
          </div>
          {students.map(student => {
            const summary = studentSummaries[student.uuid];
            const unreadCount = threadUnreadCounts[student.uuid] ?? summary?.unread ?? 0;
            return (
              <div
                key={student.uuid}
                className={`convo-item ${activeStudentUuid === student.uuid ? 'active' : ''}`}
                onClick={() => setActiveStudentUuid(student.uuid)}
              >
                <div className="avatar" style={{ background: 'var(--a1)18', color: 'var(--a1)', flexShrink: 0 }}>
                  {initials(student.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{student.full_name}</div>
                    {summary?.lastPostAt && (
                      <div style={{ fontSize: 10, color: 'var(--tx3)', flexShrink: 0 }}>
                        {timeAgo(summary.lastPostAt)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {summary?.preview ?? student.class_name ?? 'No parent linked'}
                  </div>
                </div>
                {unreadCount > 0 && (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--a1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {unreadCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="message-thread">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bd)', background: 'var(--card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div className="avatar" style={{ background: 'var(--a1)', color: '#fff' }}>
                {activeStudent ? initials(activeStudent.full_name) : '?'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{activeStudent?.full_name ?? '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                  {activeStudent?.sid ?? 'No SID'} · {activeStudent?.class_name ?? '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {parentsForActiveStudent.map(parent => (
                <button
                  key={parent.uuid}
                  className="chip"
                  style={{ background: activeParentUuid === parent.uuid ? 'var(--a4)' : undefined, color: activeParentUuid === parent.uuid ? '#fff' : undefined }}
                  onClick={() => setActiveParentUuid(parent.uuid)}
                >
                  {parent.display_name} {parent.unread_post_count > 0 ? `(${parent.unread_post_count})` : ''}
                </button>
              ))}
              {parentsForActiveStudent.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--tx3)' }}>No parent linked</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', gap: 8 }}>
              <input className="input-field" placeholder="Search title or content" value={threadKeyword} onChange={e => setThreadKeyword(e.target.value)} />
              <select className="input-field" value={threadTag} onChange={e => setThreadTag(e.target.value)}>
                <option value="">All tags</option>
                {availableTags.map(tag => <option key={tag.uuid} value={tag.name}>{tag.name}</option>)}
              </select>
              <select className="input-field" value={threadSort} onChange={e => setThreadSort(e.target.value as typeof threadSort)}>
                <option value="created_at_desc">Newest first</option>
                <option value="created_at_asc">Oldest first</option>
              </select>
            </div>
          </div>

          <div className="thread-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '40px 0' }}>
                {activeParent ? 'No messages yet.' : 'No parent linked to this student.'}
              </div>
            )}
            {messages.map(post => {
              const isTeacher = post.author.role === 'teacher';
              const tx = msgTranslations[post.uuid];
              const isEditing = editingPostUuid === post.uuid;
              return (
                <div key={post.uuid} style={{ display: 'flex', gap: 10, flexDirection: isTeacher ? 'row-reverse' : 'row' }}>
                  <div className="avatar" style={{ flexShrink: 0, background: isTeacher ? 'var(--a4)' : 'var(--bg2)', color: isTeacher ? '#fff' : 'var(--tx2)', fontSize: 11 }}>
                    {initials(post.author.display_name)}
                  </div>
                  <div style={{ maxWidth: '72%' }}>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4, textAlign: isTeacher ? 'right' : 'left' }}>
                      {post.author.display_name} · {timeAgo(post.created_at)}
                    </div>
                    {post.title && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', marginBottom: 4, textAlign: isTeacher ? 'right' : 'left' }}>
                        {post.title}
                      </div>
                    )}
                    {isEditing ? (
                      <div style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          className="input-field"
                          placeholder="Optional title"
                          value={editingTitle}
                          onChange={e => setEditingTitle(e.target.value)}
                        />
                        <textarea
                          className="input-field"
                          style={{ resize: 'vertical', minHeight: 96, fontFamily: 'var(--font-body)', fontSize: 13 }}
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {availableTags.map(tag => {
                            const selected = editingTagUuids.includes(tag.uuid);
                            return (
                              <button
                                key={tag.uuid}
                                className="chip"
                                style={{ fontSize: 11, background: selected ? 'var(--a1)' : undefined, color: selected ? '#fff' : undefined }}
                                onClick={() => setEditingTagUuids(prev => selected ? prev.filter(id => id !== tag.uuid) : [...prev, tag.uuid])}
                              >
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={cancelEditing}>
                            Cancel
                          </button>
                          <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px' }} disabled={!editingContent.trim() || savingEdit} onClick={() => void saveEdit()}>
                            {savingEdit ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: isTeacher ? 'var(--a4)' : 'var(--card)', color: isTeacher ? '#fff' : 'var(--tx)', border: isTeacher ? 'none' : '1px solid var(--bd)', borderRadius: isTeacher ? '14px 14px 2px 14px' : '14px 14px 14px 2px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
                        {post.content_markdown}
                      </div>
                    )}
                    {(isEditing ? editingTagUuids.length > 0 : post.tags.length > 0) && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, justifyContent: isTeacher ? 'flex-end' : 'flex-start' }}>
                        {(isEditing
                          ? availableTags.filter(tag => editingTagUuids.includes(tag.uuid))
                          : post.tags
                        ).map(tag => (
                          <span key={tag.uuid} className="badge" style={{ fontSize: 10 }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {tx?.shown && (
                      <div style={{ marginTop: 4, padding: '7px 12px', borderRadius: isTeacher ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isTeacher ? 'var(--a4)18' : 'var(--bg)', border: '1px solid var(--bd)', fontSize: 12, lineHeight: 1.55, color: 'var(--tx2)', fontStyle: 'italic' }}>
                        {tx.loading ? <span style={{ opacity: 0.5 }}>···</span> : tx.text}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: isTeacher ? 'flex-end' : 'flex-start', marginTop: 3 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button
                          onClick={() => void handleTranslate(post)}
                          disabled={tx?.loading}
                          style={{ background: 'none', border: 'none', cursor: tx?.loading ? 'default' : 'pointer', color: 'var(--a1)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)', opacity: tx?.loading ? 0.5 : 1 }}
                        >
                          {tx?.loading ? '···' : tx?.shown ? txHide : txTranslate}
                        </button>
                        {isTeacher && !isEditing && (
                          <>
                            <button
                              onClick={() => startEditing(post)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a2)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void deletePost(post.uuid)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c43c3c', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="thread-input-area">
            {showAiChips && (
              <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AI_DRAFTS.map(draft => (
                  <button key={draft} className="chip" style={{ fontSize: 11 }} onClick={() => { setReply(draft); setShowAiChips(false); }}>
                    {draft.slice(0, 40)}…
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {availableTags.map(tag => {
                const selected = selectedTagUuids.includes(tag.uuid);
                return (
                  <button
                    key={tag.uuid}
                    className="chip"
                    style={{ fontSize: 11, background: selected ? 'var(--a1)' : undefined, color: selected ? '#fff' : undefined }}
                    onClick={() => setSelectedTagUuids(prev => selected ? prev.filter(id => id !== tag.uuid) : [...prev, tag.uuid])}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <button
                className="chip"
                style={{ flexShrink: 0, fontSize: 12, background: showAiChips ? 'var(--a4)' : undefined, color: showAiChips ? '#fff' : undefined }}
                onClick={() => setShowAiChips(prev => !prev)}
              >
                ✦ AI Draft
              </button>
              <textarea
                className="input-field"
                style={{ flex: 1, resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, minHeight: 42 }}
                placeholder={activeParent ? `Reply to ${activeParent.display_name}…` : 'No parent linked'}
                value={reply}
                rows={2}
                disabled={!activeParent}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendReply(reply);
                  }
                }}
              />
              <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px', flexShrink: 0, alignSelf: 'flex-end' }} onClick={() => void sendReply(reply)} disabled={!reply.trim() || sending || !activeParent}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
