// ============================================================
// SubjectDetailScreen — Score stats, line chart, learning timeline,
// post board with reply functionality (1 reply per post per parent)
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mockSubjectDetails } from '@/lib/mock-data';
import { LineChart } from '@/components/charts/LineChart';
import { useApp } from '@/contexts/AppContext';
import { translateBatch, useTranslatedText, apiFetch } from '@/lib/translate';
import { parent as parentApi } from '@/lib/api';
import type { SubjectDetailResponse, ThreadPost } from '@/types/api';

// ── Post board (Reddit-style) ─────────────────────────────────

function PostBoard({ posts, subjectColor }: { posts: ThreadPost[]; subjectColor: string }) {
  // draft per post uuid
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // submitted comments per post uuid (local optimistic)
  const [localComments, setLocalComments] = useState<Record<string, { author: string; text: string; time: string }[]>>({});
  const [expanded, setExpanded] = useState<string | null>(posts[0]?.uuid ?? null);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(diff / 86_400_000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  }

  const ini = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const submit = (postUuid: string) => {
    const text = (drafts[postUuid] ?? '').trim();
    if (!text) return;
    setLocalComments(prev => ({
      ...prev,
      [postUuid]: [...(prev[postUuid] ?? []), { author: 'Li Wei', text, time: new Date().toISOString() }],
    }));
    setDrafts(prev => ({ ...prev, [postUuid]: '' }));
  };

  // Combine api replies with local optimistic comments
  const allReplies = (post: ThreadPost) => {
    const apiReplies = (post.replies ?? []).map(r => ({
      uuid: r.uuid,
      author: r.author.display_name,
      role: r.author.role,
      text: r.content_markdown,
      time: r.created_at,
    }));
    const local = (localComments[post.uuid] ?? []).map((c, i) => ({
      uuid: `local-${i}`,
      author: c.author,
      role: 'parent' as const,
      text: c.text,
      time: c.time,
    }));
    return [...apiReplies, ...local];
  };

  if (posts.length === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '32px 0' }}>No posts yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {posts.map((post, idx) => {
        const replies = allReplies(post);
        const isOpen = expanded === post.uuid;
        const draft = drafts[post.uuid] ?? '';
        const isLast = idx === posts.length - 1;

        return (
          <div key={post.uuid} style={{ borderBottom: isLast ? 'none' : '1px solid var(--bd)' }}>

            {/* ── Post header (clickable to expand) ── */}
            <div
              style={{ padding: '14px 0', cursor: 'pointer' }}
              onClick={() => setExpanded(isOpen ? null : post.uuid)}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: subjectColor + '18', color: subjectColor }}>
                  {post.subject_name ?? post.author.display_name}
                </span>
                <span style={{ fontSize: 11, color: 'var(--tx3)' }}>
                  posted by {post.author.display_name} · {timeAgo(post.created_at)}
                </span>
                <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 'auto' }}>
                  💬 {replies.length}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.3, marginBottom: isOpen ? 0 : 4 }}>
                {post.title || post.content_markdown.slice(0, 60)}
              </div>
              {!isOpen && post.title && (
                <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4, lineHeight: 1.5 }}>
                  {post.content_markdown.replace(/\*\*(.*?)\*\*/g, '$1').slice(0, 100)}…
                </div>
              )}
            </div>

            {/* ── Expanded body + comments ── */}
            {isOpen && (
              <div>
                {/* Post body */}
                <div style={{ padding: '0 0 14px', fontSize: 13, color: 'var(--tx)', lineHeight: 1.75 }}>
                  {post.content_markdown.replace(/\*\*(.*?)\*\*/g, '$1')}
                </div>

                {/* Comments */}
                <div style={{ borderTop: '2px solid var(--bd)', paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                    {replies.length} Comment{replies.length !== 1 ? 's' : ''}
                  </div>

                  {replies.map(r => (
                    <div key={r.uuid} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: r.role === 'teacher' ? subjectColor + '20' : 'var(--a2)20',
                        color: r.role === 'teacher' ? subjectColor : 'var(--a2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, marginTop: 1,
                      }}>
                        {ini(r.author)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{r.author}</span>
                          {r.role === 'teacher' && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: subjectColor + '18', color: subjectColor }}>Teacher</span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>· {timeAgo(r.time)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--tx)', lineHeight: 1.65 }}>{r.text}</div>
                      </div>
                    </div>
                  ))}

                  {/* Add comment */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--a2)20', color: 'var(--a2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                      LW
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea
                        className="input-field"
                        placeholder="Add a comment…"
                        value={draft}
                        onChange={e => setDrafts(prev => ({ ...prev, [post.uuid]: e.target.value }))}
                        rows={2}
                        style={{ resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 8, minHeight: 60 }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(post.uuid); } }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, gap: 8 }}>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--tx3)', fontFamily: 'var(--font-body)', padding: '5px 10px' }}
                          onClick={() => setDrafts(prev => ({ ...prev, [post.uuid]: '' }))}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn-primary"
                          style={{ width: 'auto', padding: '6px 18px', fontSize: 12, borderRadius: 20, opacity: draft.trim() ? 1 : 0.4 }}
                          onClick={() => submit(post.uuid)}
                          disabled={!draft.trim()}
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
  const { language, classPosts, markPostRead } = useApp();
  const txBack = useTranslatedText('← Back', language);
  const [showAvg, setShowAvg] = useState(false);
  const [period, setPeriod] = useState<'term' | 'year'>('term');

  const subjectUuid = subjectId ?? 'sub-math';

  // Initialize with mock data (offline fallback); replaced by API data when available
  const [detail, setDetail] = useState<SubjectDetailResponse>(
    mockSubjectDetails[subjectUuid] ?? mockSubjectDetails['sub-math']
  );

  // Mark class posts for this subject as read when entering the page
  useEffect(() => {
    classPosts
      .filter(p => p.subject_name === detail.subject.name || p.target?.includes(subjectUuid))
      .forEach(p => markPostRead(p.uuid));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectUuid]);

  // Fetch real subject detail from API
  useEffect(() => {
    if (!sid) return;
    parentApi.getSubjectDetail(sid, subjectUuid)
      .then(res => setDetail(res.data))
      .catch(() => { /* keep mock fallback */ });
  }, [sid, subjectUuid]);

  const subject = detail.subject;
  const subjectColor = subject.color ?? 'var(--a1)';

  // Merge classPosts (PersonalizedPost) that belong to this student + subject into ThreadPost format
  const classPostsForSubject = classPosts
    .filter(p => sid && p.versions[sid] !== undefined && (
      !p.subject_name || p.subject_name === subject.name
    ))
    .map(p => ({
      uuid: p.uuid,
      author: { uuid: 'teacher', display_name: p.subject_name ? `${p.subject_name} Teacher` : 'Your Teacher', role: 'teacher' as const, email: '' },
      title: p.title,
      content_markdown: p.versions[sid!],
      created_at: p.created_at,
      subject_name: p.subject_name,
      subject_color: p.subject_color,
    }));

  // ── Translated content state ──────────────────────────────────
  const [txPosts, setTxPosts] = useState([...classPostsForSubject, ...detail.posts]);
  const [txSubjectName, setTxSubjectName] = useState(subject.name);
  const [txTimeline, setTxTimeline] = useState(detail.timeline);

  // ── Live AI Insight ───────────────────────────────────────────
  interface LiveInsight { summary: string; suggestions: string[] }
  const [liveInsight, setLiveInsight] = useState<LiveInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    setLiveInsight(null);
    setInsightLoading(true);
    apiFetch('/api/ai/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_name: detail.subject.name,
        current_score: detail.overview.current_score,
        term_avg: detail.overview.term_avg,
        student_uuid: sid,
        ui_language: language,
      }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        const d = data.data;
        if (d && typeof d.summary === 'string') {
          setLiveInsight({ summary: d.summary, suggestions: Array.isArray(d.suggestions) ? d.suggestions : [] });
        }
      })
      .catch(() => setLiveInsight(null))
      .finally(() => setInsightLoading(false));
  }, [subjectUuid, language]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const allPosts = [...classPostsForSubject, ...detail.posts];
    setTxPosts(allPosts);
    setTxSubjectName(subject.name);
    setTxTimeline(detail.timeline);

    if (language === 'en') return;

    const postTexts = allPosts.flatMap(p => [p.title ?? '', p.content_markdown]);
    const metaTexts = [subject.name, ...detail.timeline.map(n => n.title)];

    translateBatch([...postTexts, ...metaTexts], language).then(results => {
      const postCount = postTexts.length;
      const postResults = results.slice(0, postCount);
      const metaResults = results.slice(postCount);

      setTxPosts(allPosts.map((p, i) => ({
        ...p,
        title: postResults[i * 2] || p.title,
        content_markdown: postResults[i * 2 + 1] || p.content_markdown,
      })));

      let m = 0;
      setTxSubjectName(metaResults[m++] || subject.name);
      setTxTimeline(
        detail.timeline.map((n, i) => ({ ...n, title: metaResults[m + i] || n.title }))
      );
    });
  }, [language, detail]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontWeight: 700,
          fontFamily: 'var(--font-body)',
        }}
      >
        {txBack}
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
              <>
                <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 10 }}>
                  {liveInsight.summary}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {liveInsight.suggestions.map((s: string, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', gap: 6 }}>
                      <span style={{ color: subjectColor }}>→</span>
                      {s}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--tx3)', opacity: 0.6 }}>Unable to load insight.</div>
            )}
          </div>
        </div>

        <div className="card">
          <PostBoard posts={txPosts} subjectColor={subjectColor} />
        </div>
      </div>
    </div>
  );
}
