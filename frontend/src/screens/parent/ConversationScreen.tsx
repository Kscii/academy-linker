// ============================================================
// ConversationScreen — Discord-style 1:1 parent ↔ teacher chat
// Route: /parent/students/:sid/conversations/:threadUuid
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { mockDiscussionTeachers, SUBJECT_COLORS } from '@/lib/mock-data';
import type { DirectMessage } from '@/lib/mock-data';
import type { TeacherSummary, SubjectSummary } from '@/types/api';
import { useApp } from '@/contexts/AppContext';
import { translateText, useTranslatedText } from '@/lib/translate';

const MAX_CHARS = 300;

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
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

function groupByDay(messages: DirectMessage[]): { label: string; msgs: DirectMessage[] }[] {
  const groups: { label: string; msgs: DirectMessage[] }[] = [];
  let lastLabel = '';
  for (const msg of messages) {
    const label = formatDateLabel(msg.sent_at);
    if (label !== lastLabel) {
      groups.push({ label, msgs: [] });
      lastLabel = label;
    }
    groups[groups.length - 1].msgs.push(msg);
  }
  return groups;
}

interface MsgTx {
  text: string;
  loading: boolean;
  shown: boolean;
}

export function ConversationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sid, threadUuid } = useParams<{ sid: string; threadUuid: string }>();
  const { language, conversations, sendMessage, markThreadRead } = useApp();

  // Try mock lookup first (offline); fall back to navigation state passed from MessagesScreen
  const mockThread = mockDiscussionTeachers.find(t => t.thread_uuid === threadUuid);
  const navState = location.state as { teacher?: TeacherSummary; subject?: SubjectSummary } | null;
  const teacher = mockThread?.teacher ?? navState?.teacher;
  const subject = mockThread?.subject ?? navState?.subject;
  const subjectColor = subject?.color ?? SUBJECT_COLORS.math;

  const messages = conversations[threadUuid ?? ''] ?? [];
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [msgTranslations, setMsgTranslations] = useState<Record<string, MsgTx>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Clear per-message translations when language changes
  // Mark thread as read when entering the conversation
  useEffect(() => {
    if (threadUuid) markThreadRead(threadUuid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadUuid]);

  useEffect(() => {
    setMsgTranslations({});
  }, [language]);

  const txViewGrades = useTranslatedText('View grades', language);
  const txNoMessages = useTranslatedText(`No messages yet. Send a message to ${teacher?.display_name ?? ''}.`, language);
  const txTranslate = useTranslatedText('Translate', language);
  const txHide = useTranslatedText('Hide translation', language);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!teacher || !subject) {
    return <div style={{ padding: 32, color: 'var(--tx3)' }}>Conversation not found.</div>;
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    await sendMessage(threadUuid ?? '', 'parent', text, language);
    setSending(false);
  };

  const handleTranslate = async (msg: DirectMessage) => {
    const id = msg.uuid;
    const existing = msgTranslations[id];

    // Toggle visibility if already translated
    if (existing?.text) {
      setMsgTranslations(prev => ({ ...prev, [id]: { ...prev[id], shown: !prev[id].shown } }));
      return;
    }

    // Start translating
    setMsgTranslations(prev => ({ ...prev, [id]: { text: '', loading: true, shown: true } }));
    const translated = await translateText(msg.text, language);
    setMsgTranslations(prev => ({ ...prev, [id]: { text: translated, loading: false, shown: true } }));
  };

  const groups = groupByDay(messages);
  const charLeft = MAX_CHARS - draft.length;
  const isOverLimit = charLeft < 0;
  const showTranslateBtn = language !== 'en';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxHeight: 800 }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px', borderBottom: '1px solid var(--bd)',
        background: 'var(--card)', borderRadius: '12px 12px 0 0',
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(`/parent/students/${sid}/discussions`)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--tx3)', fontSize: 20, lineHeight: 1, padding: '0 4px',
            fontFamily: 'var(--font-body)',
          }}
        >
          ←
        </button>

        <div
          className="avatar avatar-lg"
          style={{ background: subjectColor + '20', color: subjectColor, fontWeight: 700, flexShrink: 0 }}
        >
          {initials(teacher.display_name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{teacher.display_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span
              className="subject-chip"
              style={{ background: subjectColor + '18', color: subjectColor, fontSize: 11 }}
            >
              {subject.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{teacher.email}</span>
          </div>
        </div>

        {/* View Grades button */}
        <button
          onClick={() => navigate(`/parent/students/${sid}/subjects/${subject.uuid}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 8, border: `1px solid ${subjectColor}30`,
            background: subjectColor + '10', color: subjectColor,
            fontWeight: 700, fontSize: 12, cursor: 'pointer',
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14 }}>📊</span>
          {txViewGrades}
        </button>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 20px 8px',
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, marginTop: 40 }}>
            {txNoMessages}
          </div>
        )}

        {groups.map(group => (
          <div key={group.label}>
            {/* Day separator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              margin: '16px 0 12px',
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
              <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {group.label}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
            </div>

            {group.msgs.map((msg, idx) => {
              const isParent = msg.sender === 'parent';
              const showAvatar = !isParent && (idx === 0 || group.msgs[idx - 1]?.sender !== 'teacher');
              const tx = msgTranslations[msg.uuid];

              return (
                <div
                  key={msg.uuid}
                  style={{
                    display: 'flex',
                    flexDirection: isParent ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  {/* Teacher avatar (only on first message in a run) */}
                  {!isParent && (
                    <div style={{ width: 32, flexShrink: 0 }}>
                      {showAvatar && (
                        <div
                          className="avatar"
                          style={{
                            width: 32, height: 32, fontSize: 11,
                            background: subjectColor + '20', color: subjectColor, fontWeight: 700,
                          }}
                        >
                          {initials(teacher.display_name)}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isParent ? 'flex-end' : 'flex-start' }}>
                    {/* Bubble */}
                    <div style={{
                      padding: '9px 14px',
                      borderRadius: isParent ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isParent ? subjectColor : 'var(--card)',
                      color: isParent ? '#fff' : 'var(--tx)',
                      fontSize: 13,
                      lineHeight: 1.55,
                      border: isParent ? 'none' : '1px solid var(--bd)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                      {msg.text}
                    </div>

                    {/* Translation block */}
                    {tx?.shown && (
                      <div style={{
                        marginTop: 4,
                        padding: '7px 12px',
                        borderRadius: isParent ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        background: isParent ? subjectColor + '18' : 'var(--bg)',
                        border: `1px solid ${isParent ? subjectColor + '30' : 'var(--bd)'}`,
                        fontSize: 12,
                        lineHeight: 1.55,
                        color: 'var(--tx2)',
                        fontStyle: 'italic',
                        maxWidth: '100%',
                      }}>
                        {tx.loading
                          ? <span style={{ opacity: 0.5 }}>···</span>
                          : tx.text
                        }
                      </div>
                    )}

                    {/* Time + Translate button */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 10, color: 'var(--tx3)', marginTop: 3,
                      paddingLeft: 2, paddingRight: 2,
                      flexDirection: isParent ? 'row-reverse' : 'row',
                    }}>
                      <span>{formatTime(msg.sent_at)}</span>
                      {showTranslateBtn && (
                        <>
                          <span style={{ opacity: 0.4 }}>·</span>
                          <button
                            onClick={() => handleTranslate(msg)}
                            disabled={tx?.loading}
                            style={{
                              background: 'none', border: 'none', cursor: tx?.loading ? 'default' : 'pointer',
                              color: 'var(--a1)', fontSize: 10, padding: 0,
                              fontFamily: 'var(--font-body)',
                              opacity: tx?.loading ? 0.5 : 1,
                            }}
                          >
                            {tx?.loading ? '···' : tx?.shown ? txHide : txTranslate}
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

      {/* ── Input ── */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--bd)',
        background: 'var(--card)',
        borderRadius: '0 0 12px 12px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea
              className="input-field"
              placeholder={`Message ${teacher.display_name}…`}
              value={draft}
              onChange={e => setDraft(e.target.value.slice(0, MAX_CHARS + 20))}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isOverLimit) handleSend();
                }
              }}
              rows={2}
              style={{
                resize: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                minHeight: 60,
                borderColor: isOverLimit ? 'var(--warn)' : undefined,
              }}
            />
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
              fontSize: 11, marginTop: 4,
              color: charLeft <= 30 ? (isOverLimit ? 'var(--warn)' : 'var(--a1)') : 'var(--tx3)',
            }}>
              {draft.length}/{MAX_CHARS}
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={handleSend}
            disabled={!draft.trim() || isOverLimit || sending}
            style={{
              width: 'auto', padding: '10px 18px', fontSize: 13,
              marginBottom: 22,
              opacity: (!draft.trim() || isOverLimit) ? 0.45 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
