// ============================================================
// SubjectDetailScreen — Score stats, line chart, learning timeline,
// post board with reply functionality (1 reply per post per parent)
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mockSubjectDetails } from '@/lib/mock-data';
import { LineChart } from '@/components/charts/LineChart';
import { useApp } from '@/contexts/AppContext';
import { translateBatch } from '@/lib/translate';
import type { ThreadPost } from '@/types/api';

// ── Post board ────────────────────────────────────────────────

interface ReplyState {
  [postUuid: string]: {
    text: string;
    submitted: boolean;
    submittedText?: string;
  };
}

function PostBoard({ posts, subjectColor }: { posts: ThreadPost[]; subjectColor: string }) {
  const [replyStates, setReplyStates] = useState<ReplyState>({});

  const getReply = (uuid: string) => replyStates[uuid] ?? { text: '', submitted: false };

  const setReplyText = (uuid: string, text: string) => {
    setReplyStates(prev => ({
      ...prev,
      [uuid]: { ...getReply(uuid), text: text.slice(0, 200) },
    }));
  };

  const submitReply = (uuid: string) => {
    const r = getReply(uuid);
    if (!r.text.trim()) return;
    setReplyStates(prev => ({
      ...prev,
      [uuid]: { text: '', submitted: true, submittedText: r.text },
    }));
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400_000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  }

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
        Teacher Posts ({posts.length})
      </div>

      {posts.map(post => {
        const reply = getReply(post.uuid);
        const charCount = reply.text.length;

        return (
          <div key={post.uuid} className="post-card">
            <div className="post-card-header">
              <div
                className="avatar"
                style={{ background: subjectColor + '22', color: subjectColor, fontWeight: 700 }}
              >
                {initials(post.author.display_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
                  {post.author.display_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{timeAgo(post.created_at)}</div>
              </div>
              {post.subject_name && (
                <span
                  className="subject-chip"
                  style={{ background: subjectColor + '18', color: subjectColor }}
                >
                  {post.subject_name}
                </span>
              )}
            </div>

            {post.title && (
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>
                {post.title}
              </div>
            )}

            <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 12 }}>
              {post.content_markdown.replace(/\*\*(.*?)\*\*/g, '$1')}
            </div>

            {reply.submitted && reply.submittedText && (
              <div style={{
                background: 'rgba(61,182,168,0.08)', border: '1px solid rgba(61,182,168,0.2)',
                borderRadius: 8, padding: '10px 12px', marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div className="avatar" style={{ width: 24, height: 24, fontSize: 10, background: 'var(--a2)', color: '#fff' }}>
                    You
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--a2)' }}>Your reply</div>
                  <span className="badge badge-ok" style={{ marginLeft: 'auto', fontSize: 10 }}>✓ Sent</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--tx)' }}>{reply.submittedText}</div>
              </div>
            )}

            {!reply.submitted && (
              <div>
                <textarea
                  className="input-field"
                  placeholder="Write a reply to this post… (max 200 characters)"
                  value={reply.text}
                  onChange={e => setReplyText(post.uuid, e.target.value)}
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 13, minHeight: 72 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: charCount >= 180 ? 'var(--warn)' : 'var(--tx3)' }}>
                    {charCount}/200 · 1 reply per post
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => submitReply(post.uuid)}
                    disabled={!reply.text.trim()}
                    style={{ width: 'auto', padding: '7px 16px', fontSize: 12, opacity: reply.text.trim() ? 1 : 0.5 }}
                  >
                    Reply
                  </button>
                </div>
              </div>
            )}

            {reply.submitted && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span className="badge badge-ok" style={{ fontSize: 11 }}>✓ Replied</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Subject Detail Screen ─────────────────────────────────────

export function SubjectDetailScreen() {
  const navigate = useNavigate();
  const { sid, subjectId } = useParams<{ sid: string; subjectId: string }>();
  const { language } = useApp();
  const [showAvg, setShowAvg] = useState(false);
  const [period, setPeriod] = useState<'term' | 'year'>('term');

  const subjectUuid = subjectId ?? 'sub-math';
  const detail = mockSubjectDetails[subjectUuid] ?? mockSubjectDetails['sub-math'];
  const subject = detail.subject;
  const subjectColor = subject.color ?? 'var(--a1)';

  // ── Translated content state ──────────────────────────────────
  const [txPosts, setTxPosts] = useState(detail.posts);
  const [txSubjectName, setTxSubjectName] = useState(subject.name);
  const [txAiSummary, setTxAiSummary] = useState(detail.ai_summary?.summary ?? '');
  const [txSuggestions, setTxSuggestions] = useState(detail.ai_summary?.suggestions ?? []);
  const [txTimeline, setTxTimeline] = useState(detail.timeline);

  useEffect(() => {
    setTxPosts(detail.posts);
    setTxSubjectName(subject.name);
    setTxAiSummary(detail.ai_summary?.summary ?? '');
    setTxSuggestions(detail.ai_summary?.suggestions ?? []);
    setTxTimeline(detail.timeline);

    if (language === 'en') return;

    const postTexts = detail.posts.flatMap(p => [p.title ?? '', p.content_markdown]);
    const metaTexts = [
      subject.name,
      detail.ai_summary?.summary ?? '',
      ...(detail.ai_summary?.suggestions ?? []),
      ...detail.timeline.map(n => n.title),
    ];

    translateBatch([...postTexts, ...metaTexts], language).then(results => {
      const postCount = postTexts.length;
      const postResults = results.slice(0, postCount);
      const metaResults = results.slice(postCount);

      setTxPosts(detail.posts.map((p, i) => ({
        ...p,
        title: postResults[i * 2] || p.title,
        content_markdown: postResults[i * 2 + 1] || p.content_markdown,
      })));

      let m = 0;
      setTxSubjectName(metaResults[m++] || subject.name);
      setTxAiSummary(metaResults[m++] || (detail.ai_summary?.summary ?? ''));
      const suggCount = detail.ai_summary?.suggestions?.length ?? 0;
      setTxSuggestions(
        (detail.ai_summary?.suggestions ?? []).map((s, i) => metaResults[m + i] || s)
      );
      m += suggCount;
      setTxTimeline(
        detail.timeline.map((n, i) => ({ ...n, title: metaResults[m + i] || n.title }))
      );
    });
  }, [language, subjectUuid]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <button
        onClick={() => navigate(`/parent/students/${sid}/dashboard`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontWeight: 700,
          fontFamily: 'var(--font-body)',
        }}
      >
        ← Back to Dashboard
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: subjectColor + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {subject.code === 'math' ? '📐' : subject.code === 'english' ? '📖' :
           subject.code === 'science' ? '🔬' : subject.code === 'hass' ? '🌍' :
           subject.code === 'pe' ? '⚽' : '🎨'}
        </div>
        <div>
          <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)' }}>{txSubjectName}</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{subject.teacher?.display_name}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div className="badge-score" style={{ background: subjectColor, fontSize: 20, padding: '6px 16px' }}>
            {detail.overview.current_score}%
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Current Score', value: detail.overview.current_score, color: subjectColor },
          { label: 'Term Average',  value: detail.overview.term_avg,      color: 'var(--a2)' },
          { label: 'Highest',       value: detail.overview.highest,        color: 'var(--a3)' },
          { label: 'Lowest',        value: detail.overview.lowest,         color: 'var(--tx2)' },
        ].map((s, i) => (
          <div key={i} className="stat-box">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}%</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Score Trend</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', background: 'var(--bg2)', borderRadius: 8, padding: 2 }}>
              {(['term', 'year'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    padding: '4px 12px', borderRadius: 6, border: 'none',
                    background: period === p ? subjectColor : 'transparent',
                    color: period === p ? '#fff' : 'var(--tx2)',
                    fontWeight: 700, fontSize: 11, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', textTransform: 'capitalize',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAvg(s => !s)}
              style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid var(--bd)',
                background: showAvg ? 'var(--a2)' : 'transparent',
                color: showAvg ? '#fff' : 'var(--tx2)',
                fontWeight: 700, fontSize: 11, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Class avg
            </button>
          </div>
        </div>
        <LineChart
          data={detail.trend_data}
          avgData={detail.class_avg_data}
          color={subjectColor}
          showAvg={showAvg}
          height={200}
        />
        {showAvg && (
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: 'var(--tx3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 16, height: 2, background: subjectColor, display: 'inline-block', borderRadius: 1 }} />
              Emily
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 16, height: 2, background: 'var(--a2)', display: 'inline-block', borderRadius: 1, opacity: 0.7 }} />
              Class average
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>Learning Pathway</div>
          <div className="timeline">
            {txTimeline.map(node => (
              <div key={node.uuid} className="timeline-node">
                <div className={`timeline-dot ${node.status}`} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: node.status === 'future' ? 'var(--tx3)' : 'var(--tx)' }}>
                    {node.title}
                  </div>
                  {node.week && <div style={{ fontSize: 11, color: 'var(--tx3)' }}>Week {node.week}</div>}
                  {node.status === 'current' && (
                    <span className="badge" style={{ background: subjectColor + '18', color: subjectColor, marginTop: 4, fontSize: 10 }}>In progress</span>
                  )}
                  {node.status === 'done' && <span style={{ fontSize: 11, color: 'var(--a2)' }}>✓ Completed</span>}
                </div>
              </div>
            ))}
          </div>

          {detail.ai_summary && (
            <div style={{
              marginTop: 20, padding: '14px', borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(232,97,78,0.06), rgba(74,144,217,0.06))',
              border: '1px solid var(--bd)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>✦</span> AI Insight
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 10 }}>
                {txAiSummary}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {txSuggestions.map((s, i) => (
                  <div key={i} style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', gap: 6 }}>
                    <span style={{ color: subjectColor }}>→</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ overflowY: 'auto', maxHeight: 600 }}>
          <PostBoard posts={txPosts} subjectColor={subjectColor} />
        </div>
      </div>
    </div>
  );
}
