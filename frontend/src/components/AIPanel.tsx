// ============================================================
// AIPanel — Floating AI assistant (bottom-right FAB, draggable)
// Uses /api/ai/conversations API (see API Design v1 §12)
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ai } from '@/lib/api';
import type { AiMessage, AiContextType } from '@/types/api';

interface AIPanelProps {
  studentUuid?: string;
  subjectUuid?: string;
}

let msgIdCounter = 0;
const genId = () => `msg-${++msgIdCounter}`;

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

function toDisplayMessage(m: AiMessage): DisplayMessage {
  return { id: genId(), role: m.role, text: m.content_markdown };
}

function resolveContextType(studentUuid?: string, subjectUuid?: string): AiContextType {
  if (studentUuid && subjectUuid) return 'subject';
  if (studentUuid) return 'student';
  return 'global';
}

export function AIPanel({ studentUuid, subjectUuid }: AIPanelProps) {
  const { t } = useTranslation('app');
  const [open, setOpen] = useState(false);

  const defaultGreeting = studentUuid
    ? t('aiPanel.greetingStudent')
    : t('aiPanel.greetingGlobal');

  const [messages, setMessages] = useState<DisplayMessage[]>([
    { id: genId(), role: 'assistant', text: defaultGreeting },
  ]);

  const txPlaceholder = t('aiPanel.placeholder');
  const txSend = t('actions.send');
  const txTitle = t('aiPanel.title');

  useEffect(() => {
    setMessages(prev => {
      if (prev[0]?.role === 'assistant') {
        return [{ ...prev[0], text: defaultGreeting }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [defaultGreeting]);

  // ── Quick chips ───────────────────────────────────────────────
  const baseChips = studentUuid
    ? [t('aiPanel.quickPerformance'), t('aiPanel.quickFocus'), t('aiPanel.quickTips')]
    : [t('aiPanel.quickHelp'), t('aiPanel.quickSummary'), t('aiPanel.quickReport')];
  const chips = baseChips;

  // ── Conversation state ────────────────────────────────────────
  const [conversationUuid, setConversationUuid] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create conversation lazily on first open
  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (conversationUuid) return conversationUuid;
    try {
      const res = await ai.createConversation({
        context_type: resolveContextType(studentUuid, subjectUuid),
        student_uuid: studentUuid || null,
        subject_uuid: subjectUuid || null,
      });
      setConversationUuid(res.data.uuid);
      return res.data.uuid;
    } catch {
      return null;
    }
  }, [conversationUuid, studentUuid, subjectUuid]);

  // Reset conversation when context changes (different student/subject)
  useEffect(() => {
    setConversationUuid(null);
    setMessages([{ id: genId(), role: 'assistant', text: defaultGreeting }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentUuid, subjectUuid]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: DisplayMessage = { id: genId(), role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const convUuid = await ensureConversation();
      if (!convUuid) throw new Error('no conversation');

      const res = await ai.sendMessage(convUuid, {
        message: text.trim(),
        preset: 'default',
      });
      const assistant = toDisplayMessage(res.data.assistant_message);
      setMessages(prev => [...prev, assistant]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: genId(), role: 'assistant', text: t('aiPanel.serviceUnavailable') },
      ]);
    } finally {
      setThinking(false);
    }
  };

  // ── Draggable ─────────────────────────────────────────────────
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const hasMoved   = useRef(false);
  const isDragging = useRef(false);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
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
                <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{t('aiPanel.poweredByAi')}</div>
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

      {/* FAB */}
      <button
        className="ai-fab"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        onClick={handleFabClick}
        aria-label={t('aiPanel.ariaLabel')}
      >
        ✦
      </button>
    </div>
  );
}
