// ============================================================
// Teacher MessagesScreen — WeChat desktop-style 1:1 chat
// Left: student list  |  Right: chat thread
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { mockTeacherStudents } from '@/lib/mock-data';
import { teacher as teacherApi, posts as postsApi } from '@/lib/api';
import type { TeacherStudentItem, ThreadPost, TeacherDiscussionParentItem } from '@/types/api';
import { translateText, useTranslatedText } from '@/lib/translate';

const POLL_INTERVAL = 3_000; // 3 s — feels real-time

interface DisplayMsg {
  uuid: string;
  sender: 'parent' | 'teacher';
  text: string;
  sent_at: string;
  author_name: string;
}

interface ConvoMeta {
  threadUuid: string;
  parentUuid: string;
  parentName: string;
  preview: string | null;
  unread: number;
}

function toMsg(p: ThreadPost): DisplayMsg {
  return {
    uuid: p.uuid,
    sender: p.author.role === 'teacher' ? 'teacher' : 'parent',
    text: p.content_markdown,
    sent_at: p.created_at,
    author_name: p.author.display_name,
  };
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso?: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return '刚刚';
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Show timestamp divider when gap > 5 minutes
function needsTimeDivider(prev: DisplayMsg | undefined, cur: DisplayMsg): boolean {
  if (!prev) return true;
  return new Date(cur.sent_at).getTime() - new Date(prev.sent_at).getTime() > 5 * 60_000;
}

function fmtDivider(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (d.toDateString() === yesterday.toDateString())
    return `Yesterday ${d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  return d.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function TeacherMessagesScreen() {
  const { markThreadRead, threadUnreadCounts, language } = useApp();

  const [students, setStudents] = useState<TeacherStudentItem[]>(mockTeacherStudents);
  const [activeUuid, setActiveUuid] = useState(mockTeacherStudents[0].student.uuid);
  const [convos, setConvos] = useState<Record<string, ConvoMeta>>({});
  const [messages, setMessages] = useState<DisplayMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Per-message translation
  const [txMap, setTxMap] = useState<Record<string, { text: string; loading: boolean; shown: boolean }>>({});
  const txTranslate = useTranslatedText('Translate', language);
  const txHide = useTranslatedText('Hide', language);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Ref always holds the latest activeUuid — used to discard stale async results
  const activeUuidRef = useRef(activeUuid);
  useEffect(() => { activeUuidRef.current = activeUuid; }, [activeUuid]);

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Reset translations on language or student change
  useEffect(() => { setTxMap({}); }, [language, activeUuid]);

  // Load students from API
  useEffect(() => {
    teacherApi.getStudents().then(res => {
      if (res.data.length > 0) {
        setStudents(res.data);
        setActiveUuid(res.data[0].student.uuid);
      }
    }).catch(() => {});
  }, []);

  // Fetch sidebar meta for one student
  const fetchMeta = useCallback(async (studentUuid: string): Promise<ConvoMeta | null> => {
    try {
      const res = await teacherApi.getDiscussionParentsList(studentUuid);
      const first: TeacherDiscussionParentItem = res.data[0];
      if (!first) return null;
      const meta: ConvoMeta = {
        threadUuid: first.thread.uuid,
        parentUuid: first.parent.uuid,
        parentName: first.parent.display_name,
        preview: first.latest_message_preview ?? null,
        unread: first.thread.unread_post_count,
      };
      setConvos(prev => ({ ...prev, [studentUuid]: meta }));
      return meta;
    } catch { return null; }
  }, []);

  // Pre-load all student metas
  useEffect(() => {
    for (const s of students) fetchMeta(s.student.uuid);
  }, [students, fetchMeta]);

  // Fetch messages for active thread
  const fetchMessages = useCallback(async (studentUuid: string) => {
    let meta = convos[studentUuid];
    if (!meta) {
      const fetched = await fetchMeta(studentUuid);
      if (!fetched) return;
      meta = fetched;
    }
    try {
      const res = await teacherApi.getDiscussionThread(studentUuid, meta.parentUuid);
      // Discard result if user has switched away from this student
      if (studentUuid !== activeUuidRef.current) return;
      const msgs = res.data.posts.map(toMsg);
      setMessages(msgs);
      // Update sidebar preview
      const last = msgs[msgs.length - 1];
      if (last) {
        setConvos(prev => prev[studentUuid]
          ? { ...prev, [studentUuid]: { ...prev[studentUuid], preview: last.text } }
          : prev
        );
      }
    } catch { /* keep current */ }
  }, [convos, fetchMeta]);

  // On student switch
  useEffect(() => {
    setMessages([]);
    setDraft('');
    markThreadRead(activeUuid);
    fetchMessages(activeUuid);
    fetch(`/api/threads/${convos[activeUuid]?.threadUuid}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionStorage.getItem('al_at') ?? ''}` },
    }).catch(() => {});
    inputRef.current?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUuid]);

  // Poll
  useEffect(() => {
    const id = setInterval(() => {
      fetchMessages(activeUuid);
      for (const s of students) fetchMeta(s.student.uuid);
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [activeUuid, students, fetchMessages, fetchMeta]);

  const activeMeta = convos[activeUuid];
  const activeStudent = students.find(s => s.student.uuid === activeUuid) ?? students[0];

  const sendReply = async (text: string) => {
    if (!text.trim() || sending || !activeMeta) return;
    setSending(true);
    setDraft('');

    // Optimistic append
    const opt: DisplayMsg = {
      uuid: `opt-${Date.now()}`,
      sender: 'teacher',
      text,
      sent_at: new Date().toISOString(),
      author_name: 'Ms. Thompson',
    };
    setMessages(prev => [...prev, opt]);

    try {
      await postsApi.create(activeMeta.threadUuid, { content_markdown: text });
      await fetchMessages(activeUuid);
    } catch { /* keep optimistic */ }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleTranslate = useCallback(async (msg: DisplayMsg) => {
    const id = msg.uuid;
    const ex = txMap[id];
    if (ex?.text) {
      setTxMap(prev => ({ ...prev, [id]: { ...prev[id], shown: !prev[id].shown } }));
      return;
    }
    setTxMap(prev => ({ ...prev, [id]: { text: '', loading: true, shown: true } }));
    const t = await translateText(msg.text, language);
    setTxMap(prev => ({ ...prev, [id]: { text: t, loading: false, shown: true } }));
  }, [txMap, language]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)', background: 'var(--bg)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--bd)' }}>

      {/* ── LEFT: Contact list ──────────────────────────────── */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: '1px solid var(--bd)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--card)',
      }}>
        <div style={{ padding: '16px 16px 10px', fontSize: 15, fontWeight: 700, color: 'var(--tx)', borderBottom: '1px solid var(--bd)' }}>
          Messages
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {students.map(item => {
            const meta = convos[item.student.uuid];
            const unread = threadUnreadCounts[item.student.uuid] ?? meta?.unread ?? 0;
            const active = item.student.uuid === activeUuid;
            return (
              <div
                key={item.student.uuid}
                onClick={() => setActiveUuid(item.student.uuid)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: active ? 'var(--a1)12' : 'transparent',
                  borderLeft: `3px solid ${active ? 'var(--a1)' : 'transparent'}`,
                  transition: 'background 0.12s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: active ? 'var(--a1)' : 'var(--bg2)',
                  color: active ? '#fff' : 'var(--tx2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                }}>
                  {initials(item.student.display_name)}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 110 }}>
                      {item.student.display_name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)', flexShrink: 0, marginLeft: 4 }}>
                      {timeAgo(meta?.preview ? new Date().toISOString() : undefined)}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta?.preview
                      ? meta.preview.slice(0, 28) + (meta.preview.length > 28 ? '…' : '')
                      : meta?.parentName ? `${meta.parentName}` : item.student.class_name}
                  </div>
                </div>

                {unread > 0 && (
                  <div style={{
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: 'var(--a1)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0, padding: '0 4px',
                  }}>
                    {unread}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Chat area ────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--bd)',
          background: 'var(--card)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'var(--a1)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 12,
          }}>
            {initials(activeStudent.student.display_name)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
              {activeStudent.student.display_name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
              {activeMeta ? `Parent: ${activeMeta.parentName}` : activeStudent.student.class_name}
              {' · '}{activeStudent.student.class_name}
            </div>
          </div>
          {activeStudent.at_risk && (
            <span className="badge badge-warn" style={{ marginLeft: 'auto', fontSize: 11 }}>⚠ At Risk</span>
          )}
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 2,
            background: 'var(--bg)',
          }}
        >
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
              {activeMeta
                ? `Start a conversation with ${activeMeta.parentName}`
                : 'No parent linked to this student.'}
            </div>
          )}

          {messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const isTeacher = msg.sender === 'teacher';
            const sameAsPrev = prev?.sender === msg.sender;
            const tx = txMap[msg.uuid];

            return (
              <div key={msg.uuid}>
                {/* Time divider */}
                {needsTimeDivider(prev, msg) && (
                  <div style={{
                    textAlign: 'center', fontSize: 11, color: 'var(--tx3)',
                    margin: '10px 0 6px', userSelect: 'none',
                  }}>
                    {fmtDivider(msg.sent_at)}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  flexDirection: isTeacher ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: 8,
                  marginBottom: sameAsPrev && !needsTimeDivider(prev, msg) ? 2 : 8,
                }}>
                  {/* Avatar (only first in run) */}
                  <div style={{ width: 34, flexShrink: 0 }}>
                    {!sameAsPrev || needsTimeDivider(prev, msg) ? (
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: isTeacher ? 'var(--a4)' : 'var(--a2)20',
                        color: isTeacher ? '#fff' : 'var(--a2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 11,
                      }}>
                        {initials(msg.author_name)}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ maxWidth: '60%', display: 'flex', flexDirection: 'column', alignItems: isTeacher ? 'flex-end' : 'flex-start' }}>
                    {/* Name (only first in run) */}
                    {(!sameAsPrev || needsTimeDivider(prev, msg)) && (
                      <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 3, paddingLeft: 2, paddingRight: 2 }}>
                        {msg.author_name}
                      </div>
                    )}

                    {/* Bubble */}
                    <div style={{
                      padding: '9px 13px',
                      borderRadius: isTeacher
                        ? (sameAsPrev && !needsTimeDivider(prev, msg) ? '14px 4px 4px 14px' : '14px 4px 14px 14px')
                        : (sameAsPrev && !needsTimeDivider(prev, msg) ? '4px 14px 14px 4px' : '4px 14px 14px 14px'),
                      background: isTeacher ? 'var(--a1)' : 'var(--card)',
                      color: isTeacher ? '#fff' : 'var(--tx)',
                      border: isTeacher ? 'none' : '1px solid var(--bd)',
                      fontSize: 13, lineHeight: 1.55,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      wordBreak: 'break-word',
                    }}>
                      {msg.text}
                    </div>

                    {/* Translation */}
                    {tx?.shown && (
                      <div style={{
                        marginTop: 3, padding: '7px 12px',
                        borderRadius: 10,
                        background: isTeacher ? 'rgba(255,255,255,0.12)' : 'var(--bg)',
                        border: `1px solid ${isTeacher ? 'rgba(255,255,255,0.2)' : 'var(--bd)'}`,
                        fontSize: 12, lineHeight: 1.5, color: isTeacher ? 'rgba(255,255,255,0.85)' : 'var(--tx2)',
                        fontStyle: 'italic', maxWidth: '100%',
                      }}>
                        {tx.loading ? <span style={{ opacity: 0.5 }}>···</span> : tx.text}
                      </div>
                    )}

                    {/* Time + translate */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginTop: 3,
                      fontSize: 10, color: 'var(--tx3)',
                      flexDirection: isTeacher ? 'row-reverse' : 'row',
                      paddingLeft: 2, paddingRight: 2,
                    }}>
                      <span>{fmtTime(msg.sent_at)}</span>
                      <span style={{ opacity: 0.4 }}>·</span>
                      <button
                        onClick={() => handleTranslate(msg)}
                        disabled={tx?.loading}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a1)', fontSize: 10, padding: 0, fontFamily: 'var(--font-body)' }}
                      >
                        {tx?.loading ? '···' : tx?.shown ? txHide : txTranslate}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Input ── */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--bd)',
          background: 'var(--card)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              className="input-field"
              placeholder={activeMeta ? `Reply to ${activeMeta.parentName}…` : 'No parent linked'}
              value={draft}
              disabled={!activeMeta || sending}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendReply(draft);
                }
              }}
              rows={2}
              style={{
                flex: 1, resize: 'none',
                fontFamily: 'var(--font-body)', fontSize: 13,
                minHeight: 44, maxHeight: 120,
                borderRadius: 10,
              }}
            />
            <button
              className="btn-primary"
              onClick={() => sendReply(draft)}
              disabled={!draft.trim() || sending || !activeMeta}
              style={{
                width: 'auto', padding: '10px 20px',
                fontSize: 13, flexShrink: 0, alignSelf: 'flex-end',
                borderRadius: 10,
                opacity: (!draft.trim() || !activeMeta) ? 0.4 : 1,
              }}
            >
              {sending ? '···' : 'Send'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 5, paddingLeft: 2 }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
