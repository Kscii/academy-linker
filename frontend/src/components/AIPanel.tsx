// ============================================================
// AIPanel — Floating AI assistant (bottom-right FAB, draggable)
// Calls /api/ai/chat (AI backend)
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { apiFetch, translateBatch, useTranslatedText } from '@/lib/translate';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface AIPanelProps {
  studentUuid?: string;
  reportUuid?: string;
  uiLanguage?: string;
}

let msgIdCounter = 0;
const genId = () => `msg-${++msgIdCounter}`;

async function callAIChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  opts: { studentUuid?: string; reportUuid?: string; uiLanguage?: string } = {},
): Promise<string> {
  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
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


export function AIPanel({ studentUuid, reportUuid, uiLanguage = 'en' }: AIPanelProps) {
  const [open, setOpen] = useState(false);

  const defaultGreeting = reportUuid
    ? 'Hi! I have read this report. Ask me anything about it, or I can summarise it for you.'
    : "Hi! I'm your AI assistant. Ask me anything about your student's progress.";

  const [messages, setMessages] = useState<Message[]>([
    { id: genId(), role: 'assistant', text: defaultGreeting },
  ]);

  // ── Translated static UI ──────────────────────────────────────
  const txPlaceholder = useTranslatedText('Ask anything…', uiLanguage);
  const txSend        = useTranslatedText('Send', uiLanguage);
  const txTitle       = useTranslatedText('AI Assistant', uiLanguage);

  // ── Reset chat and translate greeting on language change ─────
  useEffect(() => {
    const greeting: Message = { id: genId(), role: 'assistant', text: defaultGreeting };
    if (uiLanguage === 'en') {
      setMessages([greeting]);
      return;
    }
    import('@/lib/translate').then(({ translateText }) =>
      translateText(defaultGreeting, uiLanguage)
    ).then(translated => {
      setMessages([{ ...greeting, text: translated }]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiLanguage]);

  // ── Translated quick chips ────────────────────────────────────
  const baseChips = reportUuid
    ? ['Summarise this report', 'What needs attention?', 'Action items for this week']
    : ['Overall performance?', 'Which subject needs focus?', 'Tips to improve'];
  const [chips, setChips] = useState(baseChips);

  useEffect(() => {
    if (uiLanguage === 'en') { setChips(baseChips); return; }
    translateBatch(baseChips, uiLanguage).then(setChips);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiLanguage]);

  // ── Chat state ────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // History intentionally not loaded across sessions — avoids language mismatch

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

  // ── Draggable ─────────────────────────────────────────────────
  // pos = {x, y} in viewport pixels (top-left of the panel).
  // null = use default CSS (bottom: 24px, right: 24px).
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef  = useRef<HTMLDivElement>(null);
  const hasMoved  = useRef(false);
  const isDragging = useRef(false);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    // Only left-button for mouse
    if ('button' in e && e.button !== 0) return;
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = panelRef.current!.getBoundingClientRect();
    const startPosX = rect.left;
    const startPosY = rect.top;

    isDragging.current = true;
    hasMoved.current = false;

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const cx = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const dx = cx - clientX;
      const dy = cy - clientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
      if (!hasMoved.current) return;
      const panel = panelRef.current;
      const pw = panel?.offsetWidth  ?? 52;
      const ph = panel?.offsetHeight ?? 52;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - pw, startPosX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - ph, startPosY + dy)),
      });
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.removeEventListener('touchend',  onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchend',  onUp);
  };

  // FAB: toggle only if user didn't drag
  const handleFabClick = () => {
    if (hasMoved.current) return;
    setOpen(o => !o);
  };

  const panelStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, bottom: 'auto', right: 'auto', zIndex: 200 }
    : {};

  return (
    <div
      ref={panelRef}
      className="ai-panel"
      style={panelStyle}
    >
      {open && (
        <div className="ai-window">
          {/* Header — drag handle */}
          <div
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--bd)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--card)',
              cursor: 'grab',
              userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--a1), var(--a4))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>✦</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{txTitle}</div>
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>Powered by AI</div>
              </div>
            </div>
            <button
              onMouseDown={e => e.stopPropagation()}
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

          {/* Quick chips */}
          {messages.length <= 1 && (
            <div className="ai-preset-chips">
              {chips.map((chip, i) => (
                <button
                  key={i}
                  className="chip"
                  style={{ fontSize: 11 }}
                  onClick={() => sendMessage(baseChips[i])}
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
              placeholder={txPlaceholder}
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
            >{txSend}</button>
          </div>
        </div>
      )}

      {/* FAB — also a drag handle when window is closed */}
      <button
        className="ai-fab"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onClick={handleFabClick}
        title="AI Assistant"
        style={{ cursor: 'grab' }}
      >
        <span style={{ fontSize: 20 }}>✦</span>
      </button>
    </div>
  );
}
