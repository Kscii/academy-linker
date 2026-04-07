// ============================================================
// Parent ExamScoresScreen — read-only exam score explorer
// ============================================================

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { parent as parentApi } from '@/lib/api';
import type { ExamScore, PaginationMeta, SubjectSummary } from '@/types/api';

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

export function ParentExamScoresScreen() {
  const { sid } = useParams<{ sid: string }>();
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [subjectUuid, setSubjectUuid] = useState('');
  const [examDateFrom, setExamDateFrom] = useState('');
  const [examDateTo, setExamDateTo] = useState('');

  useEffect(() => {
    if (!sid) return;
    parentApi.getSubjects(sid).then(res => {
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
    }).catch(() => {});
  }, [examDateFrom, examDateTo, page, sid, subjectUuid]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>Exam Scores</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{meta.total} score record{meta.total !== 1 ? 's' : ''}</div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <select className="input-field" value={subjectUuid} onChange={e => { setPage(1); setSubjectUuid(e.target.value); }}>
            <option value="">All subjects</option>
            {subjects.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
          </select>
          <input className="input-field" type="date" value={examDateFrom} onChange={e => { setPage(1); setExamDateFrom(e.target.value); }} />
          <input className="input-field" type="date" value={examDateTo} onChange={e => { setPage(1); setExamDateTo(e.target.value); }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scores.map(score => (
            <div key={score.uuid} className="card-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{score.exam_name ?? 'Untitled exam'}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{score.exam_date.slice(0, 10)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{score.subject.name} · {score.author.display_name}</div>
              <div style={{ fontSize: 13, color: 'var(--tx)', marginTop: 8 }}>
                Score: <strong>{score.score}</strong> / {score.full_score}
              </div>
              {score.note && <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>{score.note}</div>}
            </div>
          ))}
          {scores.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--tx3)', textAlign: 'center', padding: '24px 0' }}>
              No exam scores found for the selected filters.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
            Previous
          </button>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
