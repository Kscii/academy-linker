// ============================================================
// Parent PeriodMetricsScreen — read-only metric snapshots
// ============================================================

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { parent as parentApi } from '@/lib/api';
import type { PeriodMetric, SubjectSummary } from '@/types/api';

export function ParentPeriodMetricsScreen() {
  const { sid } = useParams<{ sid: string }>();
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [metrics, setMetrics] = useState<PeriodMetric[]>([]);
  const [subjectUuid, setSubjectUuid] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    if (!sid) return;
    parentApi.getSubjects(sid).then(res => {
      setSubjects(res.data);
    }).catch(() => {});
  }, [sid]);

  useEffect(() => {
    if (!sid) return;
    parentApi.getPeriodMetrics(sid, {
      subject_uuid: subjectUuid || undefined,
      term: term || undefined,
    }).then(res => {
      setMetrics(res.data);
    }).catch(() => {});
  }, [sid, subjectUuid, term]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>Period Metrics</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{metrics.length} metric snapshot{metrics.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <select className="input-field" value={subjectUuid} onChange={e => setSubjectUuid(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
          </select>
          <input className="input-field" placeholder="Term filter (e.g. 2025-T1)" value={term} onChange={e => setTerm(e.target.value)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {metrics.map(metric => (
            <div key={metric.uuid} className="card-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{metric.subject.name}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{metric.snapshot_date.slice(0, 10)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{metric.term ?? 'No term'} · {metric.author.display_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
                <div className="stat-box">
                  <div className="stat-label">Progress</div>
                  <div className="stat-value" style={{ color: 'var(--a1)' }}>{Math.round(metric.progress * 100)}%</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Completion</div>
                  <div className="stat-value" style={{ color: 'var(--a2)' }}>{Math.round(metric.assignment_completion_rate * 100)}%</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Attendance</div>
                  <div className="stat-value" style={{ color: 'var(--a3)' }}>{Math.round(metric.attendance_rate * 100)}%</div>
                </div>
              </div>
            </div>
          ))}
          {metrics.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--tx3)', textAlign: 'center', padding: '24px 0' }}>
              No metric snapshots found for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
