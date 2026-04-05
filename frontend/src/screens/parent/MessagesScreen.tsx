// ============================================================
// Parent MessagesScreen — list of teacher conversations
// ============================================================

import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { mockDiscussionTeachers } from '@/lib/mock-data';

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
  const { markThreadRead, readThreadIds: readThreads } = useApp();

  const handleOpen = (teacherUuid: string, subjectUuid: string) => {
    markThreadRead(teacherUuid);
    navigate(`/parent/students/${sid}/subjects/${subjectUuid}`);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          Messages
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Your conversations with Emily's teachers
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mockDiscussionTeachers.map(item => (
          <div
            key={item.teacher.uuid}
            className="card-sm"
            style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
            onClick={() => handleOpen(item.teacher.uuid, item.subject.uuid)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                className="avatar avatar-lg"
                style={{
                  background: item.subject.color + '20',
                  color: item.subject.color,
                  fontWeight: 700,
                }}
              >
                {initials(item.teacher.display_name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
                    {item.teacher.display_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                    {timeAgo(item.last_post_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span
                    className="subject-chip"
                    style={{ background: item.subject.color + '18', color: item.subject.color }}
                  >
                    {item.subject.name}
                  </span>
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--tx3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}>
                  {item.latest_message_preview?.replace(/\*\*(.*?)\*\*/g, '$1').slice(0, 80)}…
                </div>
              </div>

              {item.unread_count > 0 && !readThreads.has(item.teacher.uuid) && (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--a1)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {item.unread_count}
                </div>
              )}

              <span style={{ fontSize: 14, color: 'var(--tx3)' }}>›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
