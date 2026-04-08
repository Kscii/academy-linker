import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PostTag, ThreadPost } from '@/types/api';

type ComposerMode = 'create' | 'reply' | 'edit';
type ComposerRole = 'parent' | 'teacher';

interface PostComposerDrawerProps {
  open: boolean;
  mode: ComposerMode;
  role: ComposerRole;
  availableTags: PostTag[];
  replyTarget?: ThreadPost | null;
  initialTitle?: string;
  initialContent?: string;
  initialTagUuids?: string[];
  busy?: boolean;
  maxChars?: number;
  aiDrafts?: string[];
  onClose: () => void;
  onSubmit: (payload: {
    title: string | null;
    content: string;
    tagUuids: string[];
  }) => Promise<void> | void;
}

function titleForMode(
  mode: ComposerMode,
  t: (key: string, options?: Record<string, unknown>) => string,
  keyPrefix: string,
): string {
  if (mode === 'reply') return t(`${keyPrefix}.reply`);
  if (mode === 'edit') return t('actions.edit');
  return t(`${keyPrefix}.newPost`);
}

function submitLabelForMode(
  mode: ComposerMode,
  t: (key: string, options?: Record<string, unknown>) => string,
  keyPrefix: string,
): string {
  if (mode === 'reply') return t(`${keyPrefix}.postReply`);
  if (mode === 'edit') return t('actions.save');
  return t(`${keyPrefix}.newPost`);
}

export function PostComposerDrawer({
  open,
  mode,
  role,
  availableTags,
  replyTarget = null,
  initialTitle = '',
  initialContent = '',
  initialTagUuids = [],
  busy = false,
  maxChars,
  aiDrafts,
  onClose,
  onSubmit,
}: PostComposerDrawerProps) {
  const { t } = useTranslation('app');
  const keyPrefix = role === 'teacher' ? 'teacherMessages' : 'parentConversation';

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [selectedTagUuids, setSelectedTagUuids] = useState<string[]>(initialTagUuids);
  const [showAiChips, setShowAiChips] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setContent(initialContent);
    setSelectedTagUuids(initialTagUuids);
    setShowAiChips(false);
  }, [initialContent, initialTagUuids, initialTitle, open]);

  const charLeft = useMemo(
    () => (typeof maxChars === 'number' ? maxChars - content.length : null),
    [content.length, maxChars],
  );
  const isOverLimit = typeof charLeft === 'number' && charLeft < 0;

  if (!open) return null;

  return (
    <div className="composer-overlay" onClick={onClose}>
      <aside
        className="composer-drawer"
        onClick={(event) => event.stopPropagation()}
        aria-modal="true"
        role="dialog"
      >
        <div className="composer-header">
          <div>
            <div className="composer-kicker">{titleForMode(mode, t, keyPrefix)}</div>
            {replyTarget && (
              <div className="composer-meta">
                {t(`${keyPrefix}.replyingTo`, { title: replyTarget.title?.trim() || t('common.untitled') })}
              </div>
            )}
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} onClick={onClose}>
            {t('actions.cancel')}
          </button>
        </div>

        <div className="composer-body">
          {replyTarget && (
            <div className="composer-reply-preview">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>
                {replyTarget.title?.trim() || t('common.untitled')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.55 }}>
                {replyTarget.original_content_markdown.slice(0, 180)}
              </div>
            </div>
          )}

          {role === 'teacher' && aiDrafts && aiDrafts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="chip"
                style={{ width: 'fit-content', fontSize: 12, background: showAiChips ? 'var(--a4)' : undefined, color: showAiChips ? '#fff' : undefined }}
                onClick={() => setShowAiChips(prev => !prev)}
              >
                ✦ {t('teacherMessages.aiDraft')}
              </button>
              {showAiChips && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {aiDrafts.map(draft => (
                    <button
                      key={draft}
                      className="chip"
                      style={{ fontSize: 11 }}
                      onClick={() => {
                        setContent(draft);
                        setShowAiChips(false);
                      }}
                    >
                      {draft.slice(0, 44)}…
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <input
            className="input-field"
            placeholder={t(`${keyPrefix}.optionalTitle`)}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <textarea
            className="input-field"
            placeholder={t(`${keyPrefix}.bodyPlaceholder`)}
            value={content}
            onChange={(event) => {
              const next = event.target.value;
              setContent(typeof maxChars === 'number' ? next.slice(0, maxChars + 20) : next);
            }}
            rows={10}
            style={{
              resize: 'vertical',
              minHeight: 220,
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              lineHeight: 1.65,
              borderColor: isOverLimit ? 'var(--warn)' : undefined,
            }}
          />

          {typeof charLeft === 'number' && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: 11,
              color: charLeft <= 30 ? (isOverLimit ? 'var(--warn)' : 'var(--a1)') : 'var(--tx3)',
            }}>
              {content.length}/{maxChars}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {availableTags.map((tag) => {
              const selected = selectedTagUuids.includes(tag.uuid);
              return (
                <button
                  key={tag.uuid}
                  className="chip"
                  style={{ fontSize: 11, background: selected ? 'var(--a1)' : undefined, color: selected ? '#fff' : undefined }}
                  onClick={() => setSelectedTagUuids(prev => (
                    selected ? prev.filter(id => id !== tag.uuid) : [...prev, tag.uuid]
                  ))}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="composer-footer">
          <button className="btn-secondary" style={{ width: 'auto', padding: '10px 14px' }} onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 18px' }}
            disabled={!content.trim() || isOverLimit || busy}
            onClick={() => void onSubmit({
              title: title.trim() || null,
              content: content.trim(),
              tagUuids: selectedTagUuids,
            })}
          >
            {busy ? t(`${keyPrefix}.saving`) : submitLabelForMode(mode, t, keyPrefix)}
          </button>
        </div>
      </aside>
    </div>
  );
}
