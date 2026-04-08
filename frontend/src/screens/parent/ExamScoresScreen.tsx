// ============================================================
// Parent ExamScoresScreen — read-only exam score explorer
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { SearchableSelect } from '@/components/forms/SearchableSelect';
import { parent as parentApi } from '@/lib/api';
import type { ExamScore, PaginationMeta, SelectOption } from '@/types/api';

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

export function ParentExamScoresScreen() {
  const { t } = useTranslation('app');
  const { sid } = useParams<{ sid: string }>();
  const [subjects, setSubjects] = useState<SelectOption[]>([]);
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [subjectUuid, setSubjectUuid] = useState('');
  const [examDateFrom, setExamDateFrom] = useState('');
  const [examDateTo, setExamDateTo] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!sid) return;
    parentApi.getSubjectOptions(sid).then(res => {
      setSubjects(res.data);
    }).catch(() => {});
  }, [sid]);

  useEffect(() => {
    if (!sid) return;
    parentApi.getExamScores(sid, {
      page,
      page_size: 20,
      subject_uuid: subjectUuid || undefined,
      exam_date_from: examDateFrom || undefined,
      exam_date_to: examDateTo || undefined,
    }).then(res => {
      setScores(res.data);
      setMeta(res.meta);
    }).catch(() => {}).finally(() => setInitialized(true));
  }, [examDateFrom, examDateTo, page, sid, subjectUuid]);

  if (!initialized) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <div className="skel" style={{ height: 28, width: '52%', marginBottom: 8 }} />
          <div className="skel" style={{ height: 13, width: '28%' }} />
        </div>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div className="skel" style={{ height: 36 }} />
            <div className="skel" style={{ height: 36 }} />
            <div className="skel" style={{ height: 36 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div className="skel" style={{ height: 14, width: '50%' }} />
                  <div className="skel" style={{ height: 12, width: '16%' }} />
                </div>
                <div className="skel" style={{ height: 11, width: '38%', marginBottom: 8 }} />
                <div className="skel" style={{ height: 13, width: '32%' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('parentExamScores.title')}</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('parentExamScores.count', { count: meta.total })}</div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <SearchableSelect value={subjectUuid} onChange={(value) => { setPage(1); setSubjectUuid(value); }} options={subjects} placeholder={t('parentExamScores.allSubjects')} allowClear />
          <input className="input-field" type="date" value={examDateFrom} onChange={e => { setPage(1); setExamDateFrom(e.target.value); }} />
          <input className="input-field" type="date" value={examDateTo} onChange={e => { setPage(1); setExamDateTo(e.target.value); }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scores.map(score => (
            <div key={score.uuid} className="card-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{score.exam_name ?? t('parentExamScores.untitledExam')}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{score.exam_date.slice(0, 10)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{score.subject.name} · {score.author.display_name}</div>
              <div style={{ fontSize: 13, color: 'var(--tx)', marginTop: 8 }}>
                {t('parentExamScores.scoreLine', { score: score.score, fullScore: score.full_score })}
              </div>
              {score.note && <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>{score.note}</div>}
            </div>
          ))}
          {scores.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--tx3)', textAlign: 'center', padding: '24px 0' }}>
              {t('parentExamScores.empty')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
            {t('actions.previous')}
          </button>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
            {t('actions.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
