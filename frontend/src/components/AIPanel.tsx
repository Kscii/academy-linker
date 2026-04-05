// ============================================================
// AIPanel — Floating AI assistant (bottom-right FAB)
// Calls /api/ai/chat (DeepSeek backend)
// ============================================================

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface AIPanelProps {
  studentUuid?: string;  // 注入学生真实数据
  reportUuid?: string;   // 当前简报页时注入简报内容
  uiLanguage?: string;   // AI 默认回复语言
}

let msgIdCounter = 0;
const genId = () => `msg-${++msgIdCounter}`;

async function callAIChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  opts: { studentUuid?: string; reportUuid?: string; uiLanguage?: string } = {},
): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      context: {
        student_uuid: opts.studentUuid || undefined,
        report_uuid: opts.reportUuid || undefined,
        ui_language: opts.uiLanguage || 'en',
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data.reply as string;
}

async function loadChatHistory(): Promise<Message[]> {
  try {
    const res = await fetch('/api/ai/chat/history', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data as { role: string; content: string }[]).map(m => ({
      id: genId(),
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.content,
    }));
  } catch {
    return [];
  }
}

export function AIPanel({ studentUuid, reportUuid, uiLanguage = 'en' }: AIPanelProps) {
  const [open, setOpen] = useState(false);
  const defaultGreeting = reportUuid
    ? 'Hi! I have read this report. Ask me anything about it, or I can summarise it for you.'
    : "Hi! I'm your AI assistant. Ask me anything about your student's progress.";

  const [messages, setMessages] = useState<Message[]>([
    { id: genId(), role: 'assistant', text: defaultGreeting },
  ]);

  // Translate greeting when language changes
  useEffect(() => {
    if (uiLanguage === 'en') return;
    import('@/lib/translate').then(({ translateText }) =>
      translateText(defaultGreeting, uiLanguage)
    ).then(translated => {
      setMessages(prev => {
        if (prev.length === 1 && prev[0].role === 'assistant') {
          return [{ ...prev[0], text: translated }];
        }
        return prev;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiLanguage]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载历史记录
  useEffect(() => {
    loadChatHistory().then(hist => {
      if (hist.length > 0) setMessages(prev => [...prev, ...hist]);
    });
  }, []);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: Message = { id: genId(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    const history = [...messages.slice(1), userMsg].map(m => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const reply = await callAIChat(history, { studentUuid, reportUuid, uiLanguage });
      setMessages(prev => [...prev, { id: genId(), role: 'assistant', text: reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: genId(), role: 'assistant', text: 'Sorry, AI service is unavailable. Please try again later.' },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="ai-panel">
      {open && (
        <div className="ai-window">
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--bd)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--a1), var(--a4))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>✦</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>AI Assistant</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Powered by DeepSeek</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 18, lineHeight: 1 }}
            >×</button>
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {messages.map(msg => (
              <div key={msg.id} className={msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}>
                {msg.text}
              </div>
            ))}
            {thinking && (
              <div className="ai-msg-bot" style={{ opacity: 0.6 }}>
                <span style={{ letterSpacing: 2 }}>···</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips — only when no conversation yet */}
          {messages.length <= 1 && (
            <div className="ai-preset-chips">
              {(reportUuid
                ? ['Summarise this report', 'What needs attention?', 'Action items for this week']
                : ['Overall performance?', 'Which subject needs focus?', 'Tips to improve']
              ).map(chip => (
                <button
                  key={chip}
                  className="chip"
                  style={{ fontSize: 11 }}
                  onClick={() => sendMessage(chip)}
                  disabled={thinking}
                >{chip}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
              placeholder="Ask anything…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
              disabled={thinking}
            />
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '8px 14px', fontSize: 13 }}
              onClick={() => sendMessage(input)}
              disabled={thinking || !input.trim()}
            >Send</button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button className="ai-fab" onClick={() => setOpen(o => !o)} title="AI Assistant">
        <span style={{ fontSize: 20 }}>✦</span>
      </button>
    </div>
  );
}
