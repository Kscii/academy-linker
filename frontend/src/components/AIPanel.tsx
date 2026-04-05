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
  reportUuid?: string; // 当前简报页时传入，自动注入上下文
}

let msgIdCounter = 0;
const genId = () => `msg-${++msgIdCounter}`;

async function callAIChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  reportUuid?: string,
): Promise<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      context: reportUuid ? { report_uuid: reportUuid } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data.reply as string;
}

export function AIPanel({ reportUuid }: AIPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: genId(),
      role: 'assistant',
      text: reportUuid
        ? 'Hi! I have read this report. Ask me anything about it, or I can summarise it for you.'
        : "Hi! I'm your AI assistant. Ask me anything about your student's progress.",
    },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // 构建历史消息（排除初始欢迎语）
    const history = [...messages.slice(1), userMsg].map(m => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const reply = await callAIChat(history, reportUuid);
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
