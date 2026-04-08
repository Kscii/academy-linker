// ============================================================
// Parent PeriodMetricsScreen — read-only metric snapshots
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { SearchableSelect } from '@/components/forms/SearchableSelect';
import { parent as parentApi } from '@/lib/api';
import type { PeriodMetric, SelectOption } from '@/types/api';

export function ParentPeriodMetricsScreen() {
  const { t } = useTranslation('app');
  const { sid } = useParams<{ sid: string }>();
  const [subjects, setSubjects] = useState<SelectOption[]>([]);
  const [terms, setTerms] = useState<SelectOption[]>([]);
  const [metrics, setMetrics] = useState<PeriodMetric[]>([]);
  const [subjectUuid, setSubjectUuid] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    if (!sid) return;
    parentApi.getSubjectOptions(sid).then(res => {
      setSubjects(res.data);
    }).catch(() => {});
  }, [sid]);

  useEffect(() => {
    if (!sid) return;
    parentApi.getTermOptions(sid, { subject_uuid: subjectUuid || undefined }).then(res => {
      setTerms(res.data);
    }).catch(() => setTerms([]));
  }, [sid, subjectUuid]);

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
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('parentPeriodMetrics.title')}</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('parentPeriodMetrics.count', { count: metrics.length })}</div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <SearchableSelect value={subjectUuid} onChange={setSubjectUuid} options={subjects} placeholder={t('parentPeriodMetrics.allSubjects')} allowClear />
          <SearchableSelect value={term} onChange={setTerm} options={terms} placeholder={t('parentPeriodMetrics.termFilter')} allowClear />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {metrics.map(metric => (
            <div key={metric.uuid} className="card-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{metric.subject.name}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{metric.snapshot_date.slice(0, 10)}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{metric.term ?? t('parentPeriodMetrics.noTerm')} · {metric.author.display_name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
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
            </div>
          ))}
          {metrics.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--tx3)', textAlign: 'center', padding: '24px 0' }}>
              {t('parentPeriodMetrics.empty')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
