// ============================================================
// Parent MessagesScreen — list of teacher conversations
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { parent as parentApi } from '@/lib/api';
import type { DiscussionTeacherItem } from '@/types/api';
import { translateBatch, useTranslatedText } from '@/lib/translate';
import { SUBJECT_COLORS } from '@/lib/constants';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400_000);
  const hours = Math.floor(diff / 3600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function MessagesScreen() {
  const navigate = useNavigate();
  const { sid } = useParams<{ sid: string }>();
  const { markThreadRead, updateThreadUnreadCounts, threadUnreadCounts, language } = useApp();

  const [items, setItems] = useState<DiscussionTeacherItem[]>([]);
  const [txItems, setTxItems] = useState<DiscussionTeacherItem[]>([]);
  const [sort, setSort] = useState<'last_post_at_desc' | 'display_name_asc'>('last_post_at_desc');

  useEffect(() => {
    if (!sid) return;
    parentApi.getDiscussionTeachers(sid, { sort }).then(res => {
      setItems(res.data);
      updateThreadUnreadCounts(
        Object.fromEntries(
          res.data
            .filter(t => t.thread_uuid != null)
            .map(t => [t.thread_uuid!, t.unread_post_count])
        )
      );
    }).catch(() => {});
  }, [sid, sort, updateThreadUnreadCounts]);

  useEffect(() => {
    setTxItems(items);
    if (language === 'en') return;
    const texts = items.flatMap(i => [
      i.subjects[0]?.name ?? '',
      i.latest_message_preview ?? '',
    ]);
    translateBatch(texts, language).then(results => {
      setTxItems(items.map((item, i) => ({
        ...item,
        subjects: item.subjects.length > 0
          ? [{ ...item.subjects[0], name: results[i * 2] || item.subjects[0].name }, ...item.subjects.slice(1)]
          : item.subjects,
        latest_message_preview: results[i * 2 + 1] || item.latest_message_preview,
      })));
    });
  }, [language, items]);

  const txTitle = useTranslatedText('Messages', language);
  const txSubtitle = useTranslatedText("Your conversations with your student's teachers", language);

  const handleOpen = (item: DiscussionTeacherItem) => {
    if (item.thread_uuid) markThreadRead(item.thread_uuid);
    navigate(`/parent/students/${sid}/conversations/${item.uuid}`, {
      state: {
        teacher: { uuid: item.uuid, display_name: item.display_name },
        subjectCode: item.subjects[0]?.code,
        subjectName: item.subjects[0]?.name,
        subjectUuid: item.subjects[0]?.uuid,
      },
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          {txTitle}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {txSubtitle}
        </div>
      </div>

      <div style={{ maxWidth: 220, marginBottom: 16 }}>
        <select className="input-field" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
          <option value="last_post_at_desc">Recent activity</option>
          <option value="display_name_asc">Teacher name</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {txItems.map(item => {
          const subjectCode = item.subjects[0]?.code ?? '';
          const subjectName = item.subjects[0]?.name ?? '';
          const subjectColor = SUBJECT_COLORS[subjectCode] ?? 'var(--a1)';
          return (
          <div
            key={item.uuid}
            className="card-sm"
            style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
            onClick={() => handleOpen(item)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                className="avatar avatar-lg"
                style={{
                  background: subjectColor + '20',
                  color: subjectColor,
                  fontWeight: 700,
                }}
              >
                {initials(item.display_name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
                    {item.display_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                    {timeAgo(item.last_post_at ?? undefined)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span
                    className="subject-chip"
                    style={{ background: subjectColor + '18', color: subjectColor }}
                  >
                    {subjectName}
                  </span>
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--tx3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}>
                  {item.latest_message_preview?.replace(/\*\*(.*?)\*\*/g, '$1').slice(0, 80) ?? ''}{(item.latest_message_preview?.length ?? 0) > 80 ? '…' : ''}
                </div>
              </div>

              {(threadUnreadCounts[item.thread_uuid ?? ''] ?? item.unread_post_count) > 0 && (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--a1)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {threadUnreadCounts[item.thread_uuid ?? ''] ?? item.unread_post_count}
                </div>
              )}

              <span style={{ fontSize: 14, color: 'var(--tx3)' }}>›</span>
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
