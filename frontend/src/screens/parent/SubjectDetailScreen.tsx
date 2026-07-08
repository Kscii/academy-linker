// ============================================================
// SubjectDetailScreen — subject context page aligned with API:
// subject header, latest published summary, recent teacher posts
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { parent as parentApi } from '@/lib/api';
import { LineChart } from '@/components/charts/LineChart';
import { getSubjectIcon } from '@/lib/constants';
import type { ChartDataPoint, ExamScore, PeriodMetric, SubjectDetailResponse, ThreadPost } from '@/types/api';

function formatPostTime(dateStr: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days === 0) return t('parentSubject.today');
  if (days === 1) return t('parentSubject.yesterday');
  return t('parentSubject.daysAgo', { count: days });
}

function initials(name: string): string {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

function PostBoard({
  posts,
  subjectColor,
  onOpenPost,
}: {
  posts: ThreadPost[];
  subjectColor: string;
  onOpenPost: (post: ThreadPost) => void;
}) {
  const { t } = useTranslation('app');

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>
            {t('parentSubject.recentTeacherUpdates')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 3 }}>
            {t('parentSubject.teacherPosts', { count: posts.length })}
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
          {t('parentSubject.noTeacherPosts')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post) => (
            <button
              key={post.uuid}
              type="button"
              onClick={() => onOpenPost(post)}
              className="post-card"
              style={{ textAlign: 'left', padding: 0, cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px' }}>
                <div
                  className="avatar"
                  style={{ background: `${subjectColor}22`, color: subjectColor, fontWeight: 700, flexShrink: 0 }}
                >
                  {initials(post.author.display_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {post.title?.trim() || t('common.untitled')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', flexShrink: 0 }}>
                      {formatPostTime(post.created_at, t)}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 6 }}>
                    {post.author.display_name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--tx2)',
                    lineHeight: 1.6,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {post.content_markdown.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </div>
                  {post.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                      {post.tags.map((tag) => (
                        <span
                          key={tag.uuid}
                          className="subject-chip"
                          style={{ background: `${subjectColor}18`, color: subjectColor, fontSize: 10 }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentExamScores({
  scores,
  subjectColor,
}: {
  scores: ExamScore[];
  subjectColor: string;
}) {
  const { t } = useTranslation('app');

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
        {t('parentSubject.recentExamScores')}
      </div>

      {scores.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
          {t('parentSubject.noRecentExamScores')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scores.map((score) => (
            <div key={score.uuid} className="card-sm" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
                  {score.exam_name ?? t('parentExamScores.untitledExam')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                  {score.exam_date.slice(0, 10)}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 8 }}>
                {score.author.display_name}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: subjectColor }}>
                {score.score}/{score.full_score}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentExamTrend({
  scores,
  subjectColor,
}: {
  scores: ExamScore[];
  subjectColor: string;
}) {
  const { t } = useTranslation('app');

  const chartData = useMemo<ChartDataPoint[]>(() => (
    [...scores]
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
      .map((score) => ({
        label: score.exam_date.slice(5, 10),
        value: score.full_score > 0 ? Math.round((score.score / score.full_score) * 100) : 0,
      }))
  ), [scores]);

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>
        {t('parentSubject.recentExamTrend')}
      </div>
      <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 14 }}>
        {t('parentSubject.recentExamTrendHelp')}
      </div>

      {chartData.length >= 3 ? (
        <LineChart
          data={chartData}
          color={subjectColor}
          height={180}
        />
      ) : chartData.length > 0 ? (
        <div style={{ padding: '6px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 8 }}>
            {t('parentSubject.notEnoughTrendData')}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: subjectColor }}>
            {chartData[chartData.length - 1].value}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4 }}>
            {t('parentSubject.singleExamPoint', { count: chartData.length })}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
          {t('parentSubject.noRecentExamScores')}
        </div>
      )}
    </div>
  );
}

function LatestMetricSnapshot({
  metric,
}: {
  metric: PeriodMetric | null;
}) {
  const { t } = useTranslation('app');

  return (
    <div className="card">
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
        {t('parentSubject.latestMetricSnapshot')}
      </div>

      {!metric ? (
        <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
          {t('parentSubject.noMetricSnapshot')}
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 12 }}>
            {metric.snapshot_date.slice(0, 10)}
            {metric.term ? ` · ${metric.term}` : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div className="stat-box">
              <div className="stat-label">{t('parentPeriodMetrics.progress')}</div>
              <div className="stat-value" style={{ color: 'var(--a1)' }}>{Math.round(metric.progress * 100)}%</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{t('parentPeriodMetrics.completion')}</div>
              <div className="stat-value" style={{ color: 'var(--a2)' }}>{Math.round(metric.assignment_completion_rate * 100)}%</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">{t('parentPeriodMetrics.attendance')}</div>
              <div className="stat-value" style={{ color: 'var(--a3)' }}>{Math.round(metric.attendance_rate * 100)}%</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function SubjectDetailScreen() {
  const { t } = useTranslation('app');
  const navigate = useNavigate();
  const { sid, subjectId } = useParams<{ sid: string; subjectId: string }>();
  const [detail, setDetail] = useState<SubjectDetailResponse | null>(null);
  const [recentScores, setRecentScores] = useState<ExamScore[]>([]);
  const [latestMetric, setLatestMetric] = useState<PeriodMetric | null>(null);

  const subjectUuid = subjectId ?? '';

  useEffect(() => {
    if (!sid || !subjectUuid) return;
    parentApi.getSubjectDetail(sid, subjectUuid)
      .then((res) => setDetail(res.data))
      .catch(() => {});
  }, [sid, subjectUuid]);

  useEffect(() => {
    if (!sid || !subjectUuid) return;
    parentApi.getExamScores(sid, {
      page: 1,
      page_size: 10,
      subject_uuid: subjectUuid,
    }).then((res) => {
      setRecentScores(res.data);
    }).catch(() => setRecentScores([]));
  }, [sid, subjectUuid]);

  useEffect(() => {
    if (!sid || !subjectUuid) return;
    parentApi.getPeriodMetrics(sid, {
      subject_uuid: subjectUuid,
    }).then((res) => {
      setLatestMetric(res.data[0] ?? null);
    }).catch(() => setLatestMetric(null));
  }, [sid, subjectUuid]);

  const summaryDate = useMemo(() => {
    if (!detail?.summary?.translated_at) return null;
    try {
      return new Date(detail.summary.translated_at).toLocaleDateString('en-AU');
    } catch {
      return detail.summary.translated_at;
    }
  }, [detail?.summary?.translated_at]);

  const recentScoreCards = useMemo(() => recentScores.slice(0, 3), [recentScores]);

  if (!detail) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>
        {t('common.loading')}
      </div>
    );
  }

  const subject = detail.subject;
  const subjectColor = subject.color ?? 'var(--a1)';
  const leadTeacher = subject.teachers?.[0]?.display_name ?? t('parentGrades.noTeacherAssigned');

  const openSummaryReport = () => {
    if (!sid || !detail.summary?.report_uuid) return;
    navigate(`/parent/students/${sid}/reports?report=${detail.summary.report_uuid}`);
  };

  const openPost = (post: ThreadPost) => {
    if (!sid) return;
    const teacherUuid = post.author.role === 'teacher' && subject.teachers?.some((teacher) => teacher.uuid === post.author.uuid)
      ? post.author.uuid
      : (subject.teachers?.[0]?.uuid ?? '');
    if (!teacherUuid) return;
    navigate(`/parent/students/${sid}/discussions/${teacherUuid}?post=${post.uuid}`);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => {
            if (!sid) return;
            navigate(`/parent/students/${sid}/grades`);
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--tx3)',
            fontSize: 20,
            lineHeight: 1,
            padding: '0 4px',
            fontFamily: 'var(--font-body)',
          }}
          aria-label={t('parentSubject.backToGrades')}
          title={t('parentSubject.backToGrades')}
        >
          ←
        </button>

        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: `${subjectColor}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}>
          {getSubjectIcon(subject.code)}
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="font-serif" style={{ fontSize: 24, color: 'var(--tx)' }}>
            {subject.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4 }}>
            {leadTeacher}
            {subject.code ? ` · ${subject.code}` : ''}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <button
          type="button"
          className="card"
          onClick={openSummaryReport}
          disabled={!detail.summary?.report_uuid}
          style={{ textAlign: 'left', cursor: detail.summary?.report_uuid ? 'pointer' : 'default' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>
                {t('parentSubject.latestSummary')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 3 }}>
                {t('parentSubject.latestSummaryHelp')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {detail.summary && (
                <>
                  <span className="badge" style={{ fontSize: 10 }}>{detail.summary.display_language}</span>
                  {detail.summary.translated_language && (
                    <span className="badge" style={{ fontSize: 10 }}>{detail.summary.translated_language}</span>
                  )}
                </>
              )}
            </div>
          </div>

          {detail.summary ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 8 }}>
                {detail.summary.report_title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                {detail.summary.display_text}
              </div>
              {summaryDate && (
                <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 12 }}>
                  {t('parentSubject.summaryTranslatedAt', { date: summaryDate })}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
              {t('parentSubject.noSummary')}
            </div>
          )}
        </button>

        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(232,97,78,0.06), rgba(74,144,217,0.06))',
          borderColor: `${subjectColor}25`,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 8 }}>
            {t('parentSubject.askAiTitle')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, marginBottom: 14 }}>
            {t('parentSubject.askAiBody', { subject: subject.name })}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="chip" style={{ fontSize: 11 }}>
              {t('parentSubject.aiPromptSummary', { subject: subject.name })}
            </span>
            <span className="chip" style={{ fontSize: 11 }}>
              {t('parentSubject.aiPromptSupport')}
            </span>
            <span className="chip" style={{ fontSize: 11 }}>
              {t('parentSubject.aiPromptQuestions')}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <RecentExamTrend scores={recentScores} subjectColor={subjectColor} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 16, alignItems: 'start', marginBottom: 16 }}>
        <RecentExamScores scores={recentScoreCards} subjectColor={subjectColor} />
        <LatestMetricSnapshot metric={latestMetric} />
      </div>

      <PostBoard posts={detail.posts} subjectColor={subjectColor} onOpenPost={openPost} />
    </div>
  );
}
