// ============================================================
// Teacher MessagesScreen — split layout: conversation list + thread
// Reply input with AI draft chip, avatar modal with chart
// ============================================================

import { useState } from 'react';
import { mockTeacherStudents, mockTeacherThread, SUBJECT_COLORS } from '@/lib/mock-data';
import { LineChart } from '@/components/charts/LineChart';
import type { ThreadPost } from '@/types/api';

const AI_DRAFTS = [
  "Thank you for reaching out. Emily is making great progress this term.",
  "I'd be happy to schedule a meeting to discuss this further.",
  "I recommend focusing on the recommended resources in the class portal.",
  "This is a common challenge at this stage. Here are my suggestions:",
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600_000);
  const days = Math.floor(diff / 86400_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// Modal showing student mini chart
function StudentChartModal({
  student,
  onClose,
}: {
  student: typeof mockTeacherStudents[0];
  onClose: () => void;
}) {
  const mathDetail = { trend_data: [
    { label: 'Wk1', value: 65 }, { label: 'Wk2', value: 68 }, { label: 'Wk3', value: 64 },
    { label: 'Wk4', value: 70 }, { label: 'Wk5', value: 69 }, { label: 'Wk6', value: 72 },
    { label: 'Wk7', value: 71 }, { label: 'Wk8', value: student.overall_score },
  ]};

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 360, padding: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>
            {student.student.display_name} — Overview
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--tx3)' }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>
          Overall score: <strong style={{ color: 'var(--a1)' }}>{student.overall_score}%</strong>
          {student.at_risk && (
            <span className="badge badge-warn" style={{ marginLeft: 8, fontSize: 10 }}>At Risk</span>
          )}
        </div>
        <LineChart
          data={mathDetail.trend_data}
          color={SUBJECT_COLORS.math}
          height={140}
          label="Score trend (Maths)"
        />
      </div>
    </div>
  );
}

export function TeacherMessagesScreen() {
  const [activeStudentUuid, setActiveStudentUuid] = useState(mockTeacherStudents[0].student.uuid);
  const [messages, setMessages] = useState<ThreadPost[]>(mockTeacherThread);
  const [reply, setReply] = useState('');
  const [showAiChips, setShowAiChips] = useState(false);
  const [modalStudent, setModalStudent] = useState<typeof mockTeacherStudents[0] | null>(null);

  const activeStudent = mockTeacherStudents.find(s => s.student.uuid === activeStudentUuid) ?? mockTeacherStudents[0];

  const sendReply = (text: string) => {
    if (!text.trim()) return;
    const newPost: ThreadPost = {
      uuid: `msg-${Date.now()}`,
      author: {
        uuid: 'teacher-001',
        role: 'teacher',
        display_name: 'Ms. Thompson',
        email: 'thompson@westside.edu.au',
      },
      content_markdown: text,
      created_at: new Date().toISOString(),
    };
    setMessages(m => [...m, newPost]);
    setReply('');
    setShowAiChips(false);
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
          {mockTeacherStudents.map(item => (
            <div
              key={item.student.uuid}
              className={`convo-item ${activeStudentUuid === item.student.uuid ? 'active' : ''}`}
              onClick={() => setActiveStudentUuid(item.student.uuid)}
            >
              {/* Clickable avatar → opens modal */}
              <div
                className="avatar"
                style={{
                  background: SUBJECT_COLORS.math + '18',
                  color: SUBJECT_COLORS.math,
                  flexShrink: 0, cursor: 'pointer',
                }}
                onClick={e => {
                  e.stopPropagation();
                  setModalStudent(item);
                }}
                title="View student chart"
              >
                {initials(item.student.display_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
                  {item.student.display_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Parent: Li Wei
                </div>
              </div>
              {item.unread_messages > 0 && (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'var(--a1)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {item.unread_messages}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Message thread */}
        <div className="message-thread">
          {/* Thread header */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--bd)',
            display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)',
          }}>
            <div
              className="avatar"
              style={{ background: 'var(--a1)', color: '#fff', cursor: 'pointer' }}
              onClick={() => setModalStudent(activeStudent)}
            >
              {initials(activeStudent.student.display_name)}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
                {activeStudent.student.display_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                Parent: Li Wei · {activeStudent.student.class_name}
              </div>
            </div>
            {activeStudent.at_risk && (
              <span className="badge badge-warn" style={{ marginLeft: 'auto', fontSize: 11 }}>⚠ At Risk</span>
            )}
          </div>

          {/* Messages */}
          <div className="thread-messages">
            {messages.map(msg => {
              const isTeacher = msg.author.role === 'teacher';
              return (
                <div
                  key={msg.uuid}
                  style={{
                    display: 'flex', gap: 10,
                    flexDirection: isTeacher ? 'row-reverse' : 'row',
                  }}
                >
                  <div
                    className="avatar"
                    style={{
                      flexShrink: 0,
                      background: isTeacher ? 'var(--a4)' : 'var(--bg2)',
                      color: isTeacher ? '#fff' : 'var(--tx2)',
                      fontSize: 11,
                    }}
                  >
                    {initials(msg.author.display_name)}
                  </div>
                  <div style={{ maxWidth: '70%' }}>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4, textAlign: isTeacher ? 'right' : 'left' }}>
                      {msg.author.display_name} · {timeAgo(msg.created_at)}
                    </div>
                    <div style={{
                      background: isTeacher ? 'var(--a4)' : 'var(--card)',
                      color: isTeacher ? '#fff' : 'var(--tx)',
                      border: isTeacher ? 'none' : '1px solid var(--bd)',
                      borderRadius: isTeacher ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
                    }}>
                      {msg.content_markdown.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input area */}
          <div className="thread-input-area">
            {/* AI draft chips */}
            {showAiChips && (
              <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {AI_DRAFTS.map(draft => (
                  <button
                    key={draft}
                    className="chip"
                    style={{ fontSize: 11 }}
                    onClick={() => {
                      setReply(draft);
                      setShowAiChips(false);
                    }}
                  >
                    {draft.slice(0, 40)}…
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              {/* AI draft button */}
              <button
                className="chip"
                style={{ flexShrink: 0, fontSize: 12, background: showAiChips ? 'var(--a4)' : undefined, color: showAiChips ? '#fff' : undefined }}
                onClick={() => setShowAiChips(s => !s)}
                title="AI draft suggestions"
              >
                ✦ AI Draft
              </button>

              <textarea
                className="input-field"
                style={{ flex: 1, resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, minHeight: 42 }}
                placeholder="Write a reply…"
                value={reply}
                rows={2}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply(reply);
                  }
                }}
              />
              <button
                className="btn-primary"
                style={{ width: 'auto', padding: '8px 18px', flexShrink: 0, alignSelf: 'flex-end' }}
                onClick={() => sendReply(reply)}
                disabled={!reply.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student chart modal */}
      {modalStudent && (
        <StudentChartModal student={modalStudent} onClose={() => setModalStudent(null)} />
      )}
    </div>
  );
}
