// ============================================================
// AIPanel — Floating AI assistant (bottom-right FAB)
// Chat interface with preset chips and simulated responses
// ============================================================

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

const PRESET_CHIPS = [
  'Summarise Emily\'s week',
  'Which subject needs focus?',
  'Tips to improve Maths',
  'How is attendance?',
];

const AI_RESPONSES: Record<string, string> = {
  'Summarise Emily\'s week':
    'Emily had a great week! She scored 82% in Maths and 88% in Science. Her athletics performance was outstanding — 2nd place in the 800m. Main focus area: Maths word problems ahead of the Chapter 4 test.',
  'Which subject needs focus?':
    'Based on current trends, **Humanities & Social Sciences** (70%) and **English** (75%) are the areas where Emily could most improve. I\'d recommend focusing on analytical writing and comprehension practice.',
  'Tips to improve Maths':
    'Here are 3 tips: (1) 20 min daily on Khan Academy linear equations, (2) Practice 5 word problems per night, (3) Attend Mr. Roberts\' optional help session on Thursdays. Emily is close to an 85%+ average!',
  'How is attendance?':
    'Emily\'s attendance is excellent at 96% this term — only 2 absences. Both were notified and she has caught up on missed work. Keep it up!',
};

const BOT_DELAY = 800;

let msgIdCounter = 0;
const genId = () => `msg-${++msgIdCounter}`;

export function AIPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: genId(), role: 'bot', text: 'Hi! I\'m your AI assistant. Ask me anything about Emily\'s progress, or tap a suggestion below.' },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: Message = { id: genId(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      const response =
        AI_RESPONSES[text.trim()] ??
        'That\'s a great question! Based on Emily\'s current performance data, I can see she\'s making steady progress across all subjects. For more specific insights, please check the individual subject pages.';
      setMessages(prev => [...prev, { id: genId(), role: 'bot', text: response }]);
      setThinking(false);
    }, BOT_DELAY);
  };

  return (
    <div className="ai-panel">
      {/* Chat window */}
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
              }}>
                ✦
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>AI Assistant</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Academy Linker</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: 18, lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={msg.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}
              >
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

          {/* Preset chips */}
          <div className="ai-preset-chips">
            {PRESET_CHIPS.map(chip => (
              <button
                key={chip}
                className="chip"
                style={{ fontSize: 11 }}
                onClick={() => sendMessage(chip)}
                disabled={thinking}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--bd)',
            display: 'flex',
            gap: 8,
          }}>
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
            >
              Send
            </button>
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
