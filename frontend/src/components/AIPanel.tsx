import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, Expand, Minimize2, MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Trash2, X } from 'lucide-react';

import { ai } from '@/lib/api';
import type { AiConversation, AiContextType, AiMessage } from '@/types/api';

interface AIPanelProps {
  studentUuid?: string;
  subjectUuid?: string;
}

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

let msgIdCounter = 0;
const genId = () => `msg-${++msgIdCounter}`;

function resolveContextType(studentUuid?: string, subjectUuid?: string): AiContextType {
  if (studentUuid && subjectUuid) return 'subject';
  if (studentUuid) return 'student';
  return 'global';
}

function toDisplayMessage(message: AiMessage): DisplayMessage {
  return {
    id: message.uuid || genId(),
    role: message.role,
    text: message.content_markdown,
  };
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    if (match[2] && match[3]) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="ai-markdown-link"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(
        <code key={`${keyPrefix}-code-${match.index}`} className="ai-inline-code">
          {match[4]}
        </code>,
      );
    } else if (match[5]) {
      nodes.push(<strong key={`${keyPrefix}-strong-${match.index}`}>{match[5]}</strong>);
    } else if (match[6]) {
      nodes.push(<em key={`${keyPrefix}-em-${match.index}`}>{match[6]}</em>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushCodeBlock = (key: number) => {
    if (!inCodeBlock) return;
    nodes.push(
      <pre key={`code-${key}`} className="ai-code-block">
        <code>{codeLines.join('\n')}</code>
      </pre>,
    );
    inCodeBlock = false;
    codeLines = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(i);
      } else {
        inCodeBlock = true;
        codeLines = [];
      }
      i += 1;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      i += 1;
      continue;
    }

    if (!line.trim()) {
      nodes.push(<div key={`space-${i}`} className="ai-markdown-space" />);
      i += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      nodes.push(<h4 key={`h4-${i}`}>{parseInline(line.slice(4), `h4-${i}`)}</h4>);
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      nodes.push(<h3 key={`h3-${i}`}>{parseInline(line.slice(3), `h3-${i}`)}</h3>);
      i += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      nodes.push(<h2 key={`h2-${i}`}>{parseInline(line.slice(2), `h2-${i}`)}</h2>);
      i += 1;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={`li-${i}`}>{parseInline(lines[i].slice(2), `li-${i}`)}</li>);
        i += 1;
      }
      nodes.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={`ol-li-${i}`}>{parseInline(lines[i].replace(/^\d+\.\s*/, ''), `ol-li-${i}`)}</li>);
        i += 1;
      }
      nodes.push(<ol key={`ol-${i}`}>{items}</ol>);
      continue;
    }

    nodes.push(<p key={`p-${i}`}>{parseInline(line, `p-${i}`)}</p>);
    i += 1;
  }

  flushCodeBlock(i);
  return <div className="ai-markdown">{nodes}</div>;
}

function formatConversationTime(dateString: string | null, locale: string): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-AU', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function AIPanel({ studentUuid, subjectUuid }: AIPanelProps) {
  const { t, i18n } = useTranslation('app');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [conversationUuid, setConversationUuid] = useState<string | null>(null);
  const [currentArchived, setCurrentArchived] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMoved = useRef(false);
  const isDragging = useRef(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const contextType = useMemo(() => resolveContextType(studentUuid, subjectUuid), [studentUuid, subjectUuid]);
  const defaultGreeting = useMemo(
    () => (studentUuid ? t('aiPanel.greetingStudent') : t('aiPanel.greetingGlobal')),
    [studentUuid, t],
  );

  const resetComposer = useCallback(() => {
    setConversationUuid(null);
    setCurrentArchived(false);
    setMessages([]);
  }, []);

  useEffect(() => {
    resetComposer();
  }, [resetComposer, contextType, studentUuid, subjectUuid]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await ai.listConversations({
        page: 1,
        archived: showArchived,
        context_type: contextType,
        student_uuid: studentUuid,
        subject_uuid: subjectUuid,
        sort: 'updated_at_desc',
      });
      setConversations(res.data);
    } catch {
      setConversations([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [contextType, showArchived, studentUuid, subjectUuid]);

  useEffect(() => {
    if (!open) return;
    void loadHistory();
  }, [loadHistory, open]);

  useEffect(() => {
    if (!conversationUuid) return;
    const existsInCurrentFilter = conversations.some((conversation) => conversation.uuid === conversationUuid);
    if (!existsInCurrentFilter && currentArchived === showArchived) {
      setConversationUuid(null);
      setCurrentArchived(false);
      setMessages([]);
    }
  }, [conversationUuid, conversations, currentArchived, showArchived]);

  useEffect(() => {
    if (!open || !messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open, thinking]);

  const ensureConversation = useCallback(async () => {
    if (conversationUuid) return conversationUuid;
    const res = await ai.createConversation({
      context_type: contextType,
      student_uuid: studentUuid || null,
      subject_uuid: subjectUuid || null,
    });
    setConversationUuid(res.data.uuid);
    setCurrentArchived(false);
    return res.data.uuid;
  }, [contextType, conversationUuid, studentUuid, subjectUuid]);

  const openConversation = useCallback(async (uuid: string) => {
    setLoadingConversation(true);
    try {
      const res = await ai.getConversation(uuid);
      setConversationUuid(res.data.uuid);
      setCurrentArchived(res.data.is_archived);
      setMessages(res.data.messages.map(toDisplayMessage));
    } catch {
      setMessages([{ id: genId(), role: 'assistant', text: t('aiPanel.serviceUnavailable') }]);
    } finally {
      setLoadingConversation(false);
    }
  }, [t]);

  const sendMessage = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || thinking || currentArchived) return;

    const userMessage: DisplayMessage = { id: genId(), role: 'user', text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setThinking(true);

    try {
      const uuid = await ensureConversation();
      const res = await ai.sendMessage(uuid, { message: text, preset: 'default' });
      setConversationUuid(res.data.conversation_uuid);
      setMessages(prev => [...prev, toDisplayMessage(res.data.assistant_message)]);
      void loadHistory();
    } catch {
      setMessages(prev => [...prev, { id: genId(), role: 'assistant', text: t('aiPanel.serviceUnavailable') }]);
    } finally {
      setThinking(false);
    }
  }, [currentArchived, ensureConversation, loadHistory, t, thinking]);

  const handleArchiveToggle = useCallback(async () => {
    if (!conversationUuid) return;
    try {
      if (currentArchived) {
        await ai.unarchiveConversation(conversationUuid);
        setCurrentArchived(false);
        setShowArchived(false);
      } else {
        await ai.archiveConversation(conversationUuid);
        setCurrentArchived(true);
        setShowArchived(true);
      }
      await loadHistory();
    } catch {
      // ignore transient failure and keep current UI state
    }
  }, [conversationUuid, currentArchived, loadHistory]);

  const handleDeleteConversation = useCallback(async () => {
    if (!conversationUuid) return;
    if (!window.confirm(t('aiPanel.deleteConfirm'))) return;

    try {
      await ai.deleteConversation(conversationUuid);
      resetComposer();
      await loadHistory();
    } catch {
      // ignore transient failure and keep current UI state
    }
  }, [conversationUuid, loadHistory, resetComposer, t]);

  const quickChips = studentUuid
    ? [t('aiPanel.quickPerformance'), t('aiPanel.quickFocus'), t('aiPanel.quickTips')]
    : [t('aiPanel.quickHelp'), t('aiPanel.quickSummary'), t('aiPanel.quickReport')];

  const startDrag = (event: React.MouseEvent | React.TouchEvent) => {
    if (expanded) return;
    if ('button' in event && event.button !== 0) return;
    event.stopPropagation();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    isDragging.current = true;
    hasMoved.current = false;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const cx = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const cy = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      const dx = cx - clientX;
      const dy = cy - clientY;

      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
      if (!hasMoved.current) return;

      const panel = panelRef.current;
      const panelWidth = panel?.offsetWidth ?? 52;
      const panelHeight = panel?.offsetHeight ?? 52;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - panelWidth, rect.left + dx)),
        y: Math.max(0, Math.min(window.innerHeight - panelHeight, rect.top + dy)),
      });
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  };

  const handleFabClick = () => {
    if (hasMoved.current) return;
    setOpen(prev => !prev);
  };

  const panelStyle: CSSProperties = expanded
    ? { position: 'fixed', right: 24, bottom: 24, left: 'auto', top: 'auto', zIndex: 200 }
    : pos
      ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', zIndex: 200 }
      : {};

  const activeConversation = conversations.find((conversation) => conversation.uuid === conversationUuid) ?? null;

  return (
    <div ref={panelRef} className={`ai-panel ${expanded ? 'expanded' : ''}`} style={panelStyle}>
      {open && (
        <div className={`ai-window ${expanded ? 'expanded' : ''}`}>
          <div
            className="ai-window-header"
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          >
            <div className="ai-window-title">
              <div className="ai-window-badge">✦</div>
              <div>
                <div className="ai-window-heading">{t('aiPanel.title')}</div>
                <div className="ai-window-subtitle">{t('aiPanel.poweredByAi')}</div>
              </div>
            </div>
            <div className="ai-window-actions">
              <button
                type="button"
                className="ai-icon-button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => setHistoryOpen(prev => !prev)}
                aria-label={historyOpen ? t('aiPanel.hideHistory') : t('aiPanel.openHistory')}
                title={historyOpen ? t('aiPanel.hideHistory') : t('aiPanel.openHistory')}
              >
                {historyOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
              </button>
              <button
                type="button"
                className="ai-icon-button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => setExpanded(prev => !prev)}
                aria-label={expanded ? t('aiPanel.collapse') : t('aiPanel.expand')}
                title={expanded ? t('aiPanel.collapse') : t('aiPanel.expand')}
              >
                {expanded ? <Minimize2 size={16} /> : <Expand size={16} />}
              </button>
              <button
                type="button"
                className="ai-icon-button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => setOpen(false)}
                aria-label={t('actions.cancel')}
                title={t('actions.cancel')}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="ai-window-body">
            {historyOpen && (
              <aside className="ai-history">
                <div className="ai-history-toolbar">
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: '100%', padding: '10px 14px', fontSize: 12 }}
                    onClick={() => {
                      resetComposer();
                      setShowArchived(false);
                    }}
                  >
                    <MessageSquarePlus size={14} />
                    <span>{t('aiPanel.newChat')}</span>
                  </button>

                  <div className="ai-history-tabs">
                    <button
                      type="button"
                      className={`chip ${!showArchived ? 'active' : ''}`}
                      onClick={() => setShowArchived(false)}
                    >
                      {t('aiPanel.activeChats')}
                    </button>
                    <button
                      type="button"
                      className={`chip ${showArchived ? 'active' : ''}`}
                      onClick={() => setShowArchived(true)}
                    >
                      {t('aiPanel.archivedChats')}
                    </button>
                  </div>
                </div>

                <div className="ai-history-list">
                  {loadingHistory ? (
                    <div className="ai-history-empty">{t('common.loading')}</div>
                  ) : conversations.length === 0 ? (
                    <div className="ai-history-empty">{t('aiPanel.noHistory')}</div>
                  ) : (
                    conversations.map((conversation) => {
                      const selected = conversation.uuid === conversationUuid;
                      return (
                        <button
                          key={conversation.uuid}
                          type="button"
                          className={`ai-history-item ${selected ? 'selected' : ''}`}
                          onClick={() => void openConversation(conversation.uuid)}
                        >
                          <div className="ai-history-item-title">
                            {conversation.title?.trim() || t('common.untitled')}
                          </div>
                          <div className="ai-history-item-meta">
                            {formatConversationTime(conversation.last_message_at || conversation.updated_at, i18n.resolvedLanguage ?? i18n.language)}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>
            )}

            <section className="ai-chat">
              <div className="ai-chat-toolbar">
                <div>
                  <div className="ai-chat-title">
                    {activeConversation?.title?.trim() || t('aiPanel.title')}
                  </div>
                  {conversationUuid && (
                    <div className="ai-chat-meta">
                      {currentArchived ? t('aiPanel.archivedChats') : t('aiPanel.activeChats')}
                    </div>
                  )}
                </div>
                <div className="ai-chat-actions">
                  {conversationUuid && (
                    <>
                      <button
                        type="button"
                        className="ai-icon-button"
                        onClick={() => void handleArchiveToggle()}
                        aria-label={currentArchived ? t('actions.unarchive') : t('actions.archive')}
                        title={currentArchived ? t('actions.unarchive') : t('actions.archive')}
                      >
                        {currentArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                      </button>
                      <button
                        type="button"
                        className="ai-icon-button warn"
                        onClick={() => void handleDeleteConversation()}
                        aria-label={t('actions.delete')}
                        title={t('actions.delete')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="ai-messages">
                {loadingConversation ? (
                  <div className="ai-history-empty">{t('common.loading')}</div>
                ) : !conversationUuid && messages.length === 0 ? (
                  <div className="ai-empty-state">
                    <div className="ai-empty-badge">✦</div>
                    <p className="ai-empty-greeting">{defaultGreeting}</p>
                    <div className="ai-empty-chips">
                      {quickChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          className="chip"
                          style={{ fontSize: 11 }}
                          onClick={() => void sendMessage(chip)}
                          disabled={thinking}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div key={message.id} className={message.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}>
                        <MarkdownMessage text={message.text} />
                      </div>
                    ))}
                    {thinking && (
                      <div className="ai-msg-bot thinking">
                        <span style={{ letterSpacing: 2 }}>···</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {currentArchived && (
                <div className="ai-readonly-banner">
                  {t('aiPanel.archivedReadonly')}
                </div>
              )}

              <div className="ai-input-row">
                <input
                  className="input-field"
                  style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}
                  placeholder={t('aiPanel.placeholder')}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  disabled={thinking || currentArchived}
                />
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 14px', fontSize: 13 }}
                  onClick={() => void sendMessage(input)}
                  disabled={thinking || currentArchived || !input.trim()}
                >
                  {t('actions.send')}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      <button
        type="button"
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
