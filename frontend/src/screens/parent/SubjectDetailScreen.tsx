// ============================================================
// SubjectDetailScreen — Score stats, line chart, learning timeline,
// post board with reply functionality (1 reply per post per parent)
// ============================================================

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart } from '@/components/charts/LineChart';
import { useApp } from '@/contexts/AppContext';
import { translateBatch } from '@/lib/translate';
import { parent as parentApi, ai as aiApi } from '@/lib/api';
import type { SubjectDetailResponse, ThreadPost } from '@/types/api';

function PostBoard({ posts, subjectColor }: { posts: ThreadPost[]; subjectColor: string }) {
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
              {post.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {post.tags.map(tag => (
                    <span key={tag.uuid} className="subject-chip" style={{ background: subjectColor + '18', color: subjectColor }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
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
          </div>
        );
      })}
    </div>
  );
}

// ── Subject Detail Screen ─────────────────────────────────────

export function SubjectDetailScreen() {
  const { sid, subjectId } = useParams<{ sid: string; subjectId: string }>();
  const { language } = useApp();
  const [showAvg, setShowAvg] = useState(false);
  const [period, setPeriod] = useState<'term' | 'year'>('term');

  const subjectUuid = subjectId ?? 'sub-math';

  // Fetch real subject detail from API
  const [detail, setDetail] = useState<SubjectDetailResponse | null>(null);
  useEffect(() => {
    if (!sid) return;
    parentApi.getSubjectDetail(sid, subjectUuid)
      .then(res => setDetail(res.data))
      .catch(() => {});
  }, [sid, subjectUuid]);

  // ── Translated content state ──────────────────────────────────
  const [txPosts, setTxPosts] = useState<SubjectDetailResponse['posts']>([]);
  const [txSubjectName, setTxSubjectName] = useState('');
  const [txPathway, setTxPathway] = useState<SubjectDetailResponse['learning_pathway']>([]);

  // ── Live AI Insight ───────────────────────────────────────────
  const [liveInsight, setLiveInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (!detail || !sid) { setInsightLoading(false); return; }
    setLiveInsight(null);
    setInsightLoading(true);
    aiApi.createConversation({
      context_type: 'subject',
      student_uuid: sid,
      subject_uuid: subjectUuid,
    })
      .then(res => aiApi.sendMessage(res.data.uuid, {
        message: `Please give a brief insight on this student's performance in ${detail.subject.name}. Current score: ${detail.overview.current_score}%, term average: ${detail.overview.term_avg}%. Include 2-3 actionable suggestions.`,
        preset: 'summary',
      }))
      .then(res => setLiveInsight(res.data.assistant_message.content_markdown))
      .catch(() => setLiveInsight(null))
      .finally(() => setInsightLoading(false));
  }, [detail, sid, subjectUuid]);

  useEffect(() => {
    if (!detail) return;
    const subject = detail.subject;
    setTxPosts(detail.posts);
    setTxSubjectName(subject.name);
    setTxPathway(detail.learning_pathway);

    if (language === 'en') return;

    const postTexts = detail.posts.flatMap(p => [p.title ?? '', p.content_markdown]);
    const metaTexts = [subject.name, ...detail.learning_pathway.map(n => n.title)];

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
      setTxPathway(
        detail.learning_pathway.map((n, i) => ({ ...n, title: metaResults[m + i] || n.title }))
      );
    });
  }, [language, detail]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!detail) return (
    <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>Loading…</div>
  );

  const subject = detail.subject;
  const subjectColor = subject.color ?? 'var(--a1)';

  return (
    <div>
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
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>{subject.teachers?.[0]?.display_name}</div>
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
            {txPathway.map(node => (
              <div key={node.uuid} className="timeline-node">
                <div className={`timeline-dot ${node.status}`} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: node.status === 'upcoming' ? 'var(--tx3)' : 'var(--tx)' }}>
                    {node.title}
                  </div>
                  {node.week && <div style={{ fontSize: 11, color: 'var(--tx3)' }}>Week {node.week}</div>}
                  {node.status === 'in_progress' && (
                    <span className="badge" style={{ background: subjectColor + '18', color: subjectColor, marginTop: 4, fontSize: 10 }}>In progress</span>
                  )}
                  {node.status === 'completed' && <span style={{ fontSize: 11, color: 'var(--a2)' }}>✓ Completed</span>}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 20, padding: '14px', borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(232,97,78,0.06), rgba(74,144,217,0.06))',
            border: '1px solid var(--bd)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✦</span> AI Insight
            </div>
            {insightLoading ? (
              <div style={{ fontSize: 12, color: 'var(--tx3)', opacity: 0.6 }}>Generating insight…</div>
            ) : liveInsight ? (
              <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {liveInsight}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--tx3)', opacity: 0.6 }}>Unable to load insight.</div>
            )}
          </div>
        </div>

        <div className="card" style={{ overflowY: 'auto', maxHeight: 600 }}>
          <PostBoard posts={txPosts} subjectColor={subjectColor} />
        </div>
      </div>
    </div>
  );
}
