// ============================================================
// Teacher MessagesScreen — 2-column: conversation list | thread
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { teacher as teacherApi, posts as postsApi } from '@/lib/api';
import type { TeacherStudentListItem, ThreadPost, DiscussionParentItem } from '@/types/api';
import { translateText, useTranslatedText } from '@/lib/translate';

const POLL_INTERVAL = 5_000;

const AI_DRAFTS = [
  "Thank you for reaching out. Emily is making great progress this term.",
  "I'd be happy to schedule a meeting to discuss this further.",
  "I recommend focusing on the recommended resources in the class portal.",
  "This is a common challenge at this stage. Here are my suggestions:",
];

interface DisplayMsg {
  uuid: string;
  sender: 'parent' | 'teacher';
  text: string;
  sent_at: string;
  author_name: string;
}

// Per-student sidebar info
interface StudentConvoSummary {
  threadUuid: string;
  parentUuid: string;
  parentName: string;
  preview: string | null;
  unread: number;
}

function toDisplayMsg(p: ThreadPost): DisplayMsg {
  return {
    uuid: p.uuid,
    sender: (p.author.role === 'teacher' ? 'teacher' : 'parent') as 'parent' | 'teacher',
    text: p.content_markdown,
    sent_at: p.created_at,
    author_name: p.author.display_name,
  };
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

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function StudentChartModal({
  student,
  onClose,
}: {
  student: TeacherStudentListItem;
  onClose: () => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={onClose}
    >
      <div className="card" style={{ width: 360, padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>{student.full_name} — Overview</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--tx3)' }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>
          Class: <strong style={{ color: 'var(--a1)' }}>{student.class_name ?? '—'}</strong>
          {student.score != null && <span style={{ marginLeft: 8, color: 'var(--tx3)' }}>Score: {student.score}%</span>}
        </div>
      </div>
    </div>
  );
}

export function TeacherMessagesScreen() {
  const { markThreadRead, threadUnreadCounts, language } = useApp();

  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [activeStudentUuid, setActiveStudentUuid] = useState('');

  // Sidebar summary per student (thread UUID, parent name, preview, unread)
  const [summaries, setSummaries] = useState<Record<string, StudentConvoSummary>>({});

  const [messages, setMessages] = useState<DisplayMsg[]>([]);
  const [msgTranslations, setMsgTranslations] = useState<Record<string, { text: string; loading: boolean; shown: boolean }>>({});
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [showAiChips, setShowAiChips] = useState(false);
  const [modalStudent, setModalStudent] = useState<TeacherStudentListItem | null>(null);

  const txTranslate = useTranslatedText('Translate', language);
  const txHide = useTranslatedText('Hide translation', language);

  // Clear translations when language or active student changes
  useEffect(() => { setMsgTranslations({}); }, [language, activeStudentUuid]);

  const handleTranslate = useCallback(async (msg: DisplayMsg) => {
    const id = msg.uuid;
    const existing = msgTranslations[id];
    if (existing?.text) {
      setMsgTranslations(prev => ({ ...prev, [id]: { ...prev[id], shown: !prev[id].shown } }));
      return;
    }
    setMsgTranslations(prev => ({ ...prev, [id]: { text: '', loading: true, shown: true } }));
    const translated = await translateText(msg.text, language);
    setMsgTranslations(prev => ({ ...prev, [id]: { text: translated, loading: false, shown: true } }));
  }, [msgTranslations, language]);

  // Load students from API on mount
  useEffect(() => {
    teacherApi.getStudents().then(res => {
      if (res.data.length > 0) {
        setStudents(res.data);
        setActiveStudentUuid(res.data[0].uuid);
      }
    }).catch(() => {});
  }, []);

  // Fetch sidebar summary for one student (parent name, preview, thread UUID)
  const fetchSummary = useCallback(async (studentUuid: string): Promise<StudentConvoSummary | null> => {
    try {
      const res = await teacherApi.getDiscussionParents(studentUuid);
      const first: DiscussionParentItem = res.data[0];
      if (!first) return null;
      const summary: StudentConvoSummary = {
        threadUuid: first.thread_uuid ?? '',
        parentUuid: first.uuid,
        parentName: first.display_name,
        preview: null,
        unread: first.unread_post_count,
      };
      setSummaries(prev => ({ ...prev, [studentUuid]: summary }));
      return summary;
    } catch { return null; }
  }, []);

  // Pre-fetch summaries for all students when student list changes
  useEffect(() => {
    for (const s of students) fetchSummary(s.uuid);
  }, [students, fetchSummary]);

  // Fetch messages for active thread
  const fetchMessages = useCallback(async (studentUuid: string, isEntry = false) => {
    let info = summaries[studentUuid];
    if (!info) {
      const fetched = await fetchSummary(studentUuid);
      if (!fetched) return;
      info = fetched;
    }
    if (isEntry) {
      fetch(`/api/threads/${info.threadUuid}/read`, { method: 'POST', credentials: 'include' }).catch(() => {});
    }
    try {
      const res = await teacherApi.getDiscussionThread(studentUuid, info.parentUuid);
      const msgs = res.data.posts.map(toDisplayMsg);
      setMessages(msgs);
      // Update preview from latest message
      const last = msgs[msgs.length - 1];
      if (last) {
        setSummaries(prev => prev[studentUuid]
          ? { ...prev, [studentUuid]: { ...prev[studentUuid], preview: last.text } }
          : prev
        );
      }
    } catch { /* keep current */ }
  }, [summaries, fetchSummary]);

  // When active student changes: clear messages immediately, then fetch
  useEffect(() => {
    setMessages([]);
    markThreadRead(activeStudentUuid);
    fetchMessages(activeStudentUuid, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudentUuid]);

  // Poll for new messages and refresh summaries
  useEffect(() => {
    const id = setInterval(async () => {
      await fetchMessages(activeStudentUuid, false);
      // Refresh all summaries for unread counts
      for (const s of students) fetchSummary(s.uuid);
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [activeStudentUuid, students, fetchMessages, fetchSummary]);

  const activeStudent = students.find(s => s.uuid === activeStudentUuid) ?? students[0];
  const activeSummary = summaries[activeStudentUuid];

  const sendReply = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setReply('');
    setShowAiChips(false);

    let info = summaries[activeStudentUuid];
    if (!info) {
      const fetched = await fetchSummary(activeStudentUuid);
      if (!fetched) { setSending(false); return; }
      info = fetched;
    }

    const optimistic: DisplayMsg = {
      uuid: `opt-${Date.now()}`,
      sender: 'teacher',
      text,
      sent_at: new Date().toISOString(),
      author_name: 'Ms. Thompson',
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      await postsApi.create(info.threadUuid, { content_markdown: text });
      await fetchMessages(activeStudentUuid, false);
    } catch { /* keep optimistic */ }
    setSending(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)' }}>Messages</div>
      </div>

      <div className="messages-split">
        {/* Conversation list */}
        <div className="conversation-list">
          <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd)' }}>
            Parent conversations
          </div>
          {students.map(item => {
            const summary = summaries[item.uuid];
            const unreadCount = threadUnreadCounts[item.uuid] ?? summary?.unread ?? 0;
            return (
              <div
                key={item.uuid}
                className={`convo-item ${activeStudentUuid === item.uuid ? 'active' : ''}`}
                onClick={() => setActiveStudentUuid(item.uuid)}
              >
                <div
                  className="avatar"
                  style={{ background: 'var(--a1)18', color: 'var(--a1)', flexShrink: 0, cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setModalStudent(item); }}
                  title="View student info"
                >
                  {initials(item.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{item.full_name}</div>
                    {summary?.threadUuid && (
                      <div style={{ fontSize: 10, color: 'var(--tx3)', flexShrink: 0 }}>
                        {timeAgo(summary.preview ? new Date().toISOString() : undefined)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {summary?.preview
                      ? summary.preview.slice(0, 40) + (summary.preview.length > 40 ? '…' : '')
                      : summary?.parentName
                        ? `Parent: ${summary.parentName}`
                        : item.class_name}
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

        {/* Message thread */}
        <div className="message-thread">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)' }}>
            <div className="avatar" style={{ background: 'var(--a1)', color: '#fff', cursor: 'pointer' }} onClick={() => activeStudent && setModalStudent(activeStudent)}>
              {activeStudent ? initials(activeStudent.full_name) : '?'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{activeStudent?.full_name ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                {activeSummary ? `Parent: ${activeSummary.parentName}` : activeStudent?.class_name ?? '—'}
              </div>
            </div>
          </div>

          <div className="thread-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '40px 0' }}>
                {activeSummary ? 'No messages yet.' : 'No parent linked to this student.'}
              </div>
            )}
            {messages.map(msg => {
              const isTeacher = msg.sender === 'teacher';
              const tx = msgTranslations[msg.uuid];
              return (
                <div key={msg.uuid} style={{ display: 'flex', gap: 10, flexDirection: isTeacher ? 'row-reverse' : 'row' }}>
                  <div className="avatar" style={{ flexShrink: 0, background: isTeacher ? 'var(--a4)' : 'var(--bg2)', color: isTeacher ? '#fff' : 'var(--tx2)', fontSize: 11 }}>
                    {initials(msg.author_name)}
                  </div>
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4, textAlign: isTeacher ? 'right' : 'left' }}>
                      {msg.author_name} · {timeAgo(msg.sent_at)}
                    </div>
                    <div style={{ background: isTeacher ? 'var(--a4)' : 'var(--card)', color: isTeacher ? '#fff' : 'var(--tx)', border: isTeacher ? 'none' : '1px solid var(--bd)', borderRadius: isTeacher ? '14px 14px 2px 14px' : '14px 14px 14px 2px', padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
                      {msg.text}
                    </div>
                    {tx?.shown && (
                      <div style={{ marginTop: 4, padding: '7px 12px', borderRadius: isTeacher ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isTeacher ? 'var(--a4)18' : 'var(--bg)', border: '1px solid var(--bd)', fontSize: 12, lineHeight: 1.55, color: 'var(--tx2)', fontStyle: 'italic' }}>
                        {tx.loading ? <span style={{ opacity: 0.5 }}>···</span> : tx.text}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: isTeacher ? 'flex-end' : 'flex-start', marginTop: 3 }}>
                      <button
                        onClick={() => handleTranslate(msg)}
                        disabled={tx?.loading}
                        style={{ background: 'none', border: 'none', cursor: tx?.loading ? 'default' : 'pointer', color: 'var(--a1)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)', opacity: tx?.loading ? 0.5 : 1 }}
                      >
                        {tx?.loading ? '···' : tx?.shown ? txHide : txTranslate}
                      </button>
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <button
                className="chip"
                style={{ flexShrink: 0, fontSize: 12, background: showAiChips ? 'var(--a4)' : undefined, color: showAiChips ? '#fff' : undefined }}
                onClick={() => setShowAiChips(s => !s)}
              >
                ✦ AI Draft
              </button>
              <textarea
                className="input-field"
                style={{ flex: 1, resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, minHeight: 42 }}
                placeholder={activeSummary ? `Reply to ${activeSummary.parentName}…` : 'No parent linked'}
                value={reply}
                rows={2}
                disabled={!activeSummary}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(reply); } }}
              />
              <button className="btn-primary" style={{ width: 'auto', padding: '8px 18px', flexShrink: 0, alignSelf: 'flex-end' }} onClick={() => sendReply(reply)} disabled={!reply.trim() || sending || !activeSummary}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalStudent && <StudentChartModal student={modalStudent} onClose={() => setModalStudent(null)} />}
    </div>
  );
}
