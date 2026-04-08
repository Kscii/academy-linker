// ============================================================
// Teacher PeriodMetricsScreen — view and upsert student metrics
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { SearchableSelect } from '@/components/forms/SearchableSelect';
import { teacher as teacherApi } from '@/lib/api';
import type { PeriodMetric, SelectOption } from '@/types/api';

type MetricForm = {
  subject_uuid: string;
  term: string;
  snapshot_date: string;
  progress: string;
  assignment_completion_rate: string;
  attendance_rate: string;
};

const EMPTY_FORM: MetricForm = {
  subject_uuid: '',
  term: '',
  snapshot_date: '',
  progress: '',
  assignment_completion_rate: '',
  attendance_rate: '',
};

export function TeacherPeriodMetricsScreen() {
  const { t } = useTranslation('portal');
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStudentUuid = searchParams.get('student') ?? '';
  const [students, setStudents] = useState<SelectOption[]>([]);
  const [studentUuid, setStudentUuid] = useState(requestedStudentUuid);
  const [subjects, setSubjects] = useState<SelectOption[]>([]);
  const [terms, setTerms] = useState<SelectOption[]>([]);
  const [metrics, setMetrics] = useState<PeriodMetric[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [form, setForm] = useState<MetricForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    teacherApi.getStudentOptions().then(res => {
      setStudents(res.data);
      setStudentUuid(prev => prev || requestedStudentUuid || res.data[0]?.value || '');
    }).catch(() => {});
  }, [requestedStudentUuid]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (studentUuid) next.set('student', studentUuid);
    setSearchParams(next, { replace: true });
  }, [setSearchParams, studentUuid]);

  useEffect(() => {
    if (!studentUuid) {
      setSubjects([]);
      setTerms([]);
      return;
    }
    teacherApi.getSubjectOptions({ student_uuid: studentUuid }).then(res => {
      setSubjects(res.data);
    }).catch(() => setSubjects([]));
  }, [studentUuid]);

  useEffect(() => {
    if (!studentUuid) {
      setTerms([]);
      return;
    }
    teacherApi.getTermOptions({ student_uuid: studentUuid, subject_uuid: subjectFilter || undefined }).then(res => {
      setTerms(res.data);
    }).catch(() => setTerms([]));
  }, [studentUuid, subjectFilter]);

  const loadMetrics = async () => {
    if (!studentUuid) return;
    const res = await teacherApi.getPeriodMetrics(studentUuid, {
      subject_uuid: subjectFilter || undefined,
      term: termFilter || undefined,
    });
    setMetrics(res.data);
  };

  useEffect(() => {
    void loadMetrics();
  }, [studentUuid, subjectFilter, termFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!studentUuid || !form.subject_uuid || !form.snapshot_date) {
      setError(t('studentSubjectSnapshotRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await teacherApi.createPeriodMetric(studentUuid, {
        subject_uuid: form.subject_uuid,
        term: form.term || null,
        snapshot_date: form.snapshot_date,
        progress: form.progress ? Number(form.progress) : null,
        assignment_completion_rate: form.assignment_completion_rate ? Number(form.assignment_completion_rate) : null,
        attendance_rate: form.attendance_rate ? Number(form.attendance_rate) : null,
      });
      setForm(EMPTY_FORM);
      await loadMetrics();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? t('failedSaveMetric'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('periodMetricsTitle')}</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('metricSnapshotsCount', { count: metrics.length })}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <SearchableSelect value={studentUuid} onChange={setStudentUuid} options={students} placeholder={t('selectStudent')} />
            <SearchableSelect value={subjectFilter} onChange={setSubjectFilter} options={subjects} placeholder={t('allSubjects')} allowClear />
            <SearchableSelect value={termFilter} onChange={setTermFilter} options={terms} placeholder={t('termFilter')} allowClear />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metrics.map(metric => (
              <div key={metric.uuid} className="card-sm">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{metric.subject.name}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                  {metric.term ?? t('noTerm')} · {metric.snapshot_date.slice(0, 10)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>
                  {t('progress')}: {Math.round(metric.progress * 100)}% · {t('completion')}: {Math.round(metric.assignment_completion_rate * 100)}% · {t('attendance')}: {Math.round(metric.attendance_rate * 100)}%
                </div>
              </div>
            ))}
            {metrics.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{t('noMetricsFound')}</div>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('createOrUpdateMetric')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <SearchableSelect value={form.subject_uuid} onChange={(value) => setForm(prev => ({ ...prev, subject_uuid: value }))} options={subjects} placeholder={t('selectSubject')} />
            <SearchableSelect value={form.term} onChange={(value) => setForm(prev => ({ ...prev, term: value }))} options={terms} placeholder={t('termOptional')} allowClear />
            <input className="input-field" type="date" value={form.snapshot_date} onChange={e => setForm(prev => ({ ...prev, snapshot_date: e.target.value }))} />
            <input className="input-field" placeholder={t('progressPlaceholder')} value={form.progress} onChange={e => setForm(prev => ({ ...prev, progress: e.target.value }))} />
            <input className="input-field" placeholder={t('completionPlaceholder')} value={form.assignment_completion_rate} onChange={e => setForm(prev => ({ ...prev, assignment_completion_rate: e.target.value }))} />
            <input className="input-field" placeholder={t('attendancePlaceholder')} value={form.attendance_rate} onChange={e => setForm(prev => ({ ...prev, attendance_rate: e.target.value }))} />
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common:loading') : t('saveMetric')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
