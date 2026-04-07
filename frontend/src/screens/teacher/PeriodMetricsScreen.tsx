// ============================================================
// Teacher PeriodMetricsScreen — view and upsert student metrics
// ============================================================

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { PeriodMetric, TeacherClassStudentItem, TeacherStudentListItem } from '@/types/api';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStudentUuid = searchParams.get('student') ?? '';
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [studentUuid, setStudentUuid] = useState(requestedStudentUuid);
  const [subjects, setSubjects] = useState<TeacherClassStudentItem['subjects']>([]);
  const [metrics, setMetrics] = useState<PeriodMetric[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [form, setForm] = useState<MetricForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeStudent = students.find(student => student.uuid === studentUuid) ?? null;

  useEffect(() => {
    teacherApi.getStudents({ page: 1, page_size: 100, sort: 'full_name_asc' }).then(res => {
      setStudents(res.data);
      setStudentUuid(prev => prev || requestedStudentUuid || res.data[0]?.uuid || '');
    }).catch(() => {});
  }, [requestedStudentUuid]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (studentUuid) next.set('student', studentUuid);
    setSearchParams(next, { replace: true });
  }, [setSearchParams, studentUuid]);

  useEffect(() => {
    if (!studentUuid || !activeStudent?.class_uuid) {
      setSubjects([]);
      return;
    }
    teacherApi.getClassStudents(activeStudent.class_uuid, { page: 1, page_size: 100 }).then(res => {
      const student = res.data.find(item => item.uuid === studentUuid);
      setSubjects(student?.subjects ?? []);
    }).catch(() => setSubjects([]));
  }, [activeStudent?.class_uuid, studentUuid]);

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
      setError('Student, subject, and snapshot date are required.');
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
      setError(msg ?? 'Failed to save period metric.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>Period Metrics</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{metrics.length} metric snapshot{metrics.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <select className="input-field" value={studentUuid} onChange={e => setStudentUuid(e.target.value)}>
              <option value="">Select student</option>
              {students.map(student => <option key={student.uuid} value={student.uuid}>{student.full_name}</option>)}
            </select>
            <select className="input-field" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
            </select>
            <input className="input-field" placeholder="Term filter (e.g. 2025-T1)" value={termFilter} onChange={e => setTermFilter(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metrics.map(metric => (
              <div key={metric.uuid} className="card-sm">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{metric.subject.name}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                  {metric.term ?? 'No term'} · {metric.snapshot_date.slice(0, 10)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>
                  Progress: {Math.round(metric.progress * 100)}% · Completion: {Math.round(metric.assignment_completion_rate * 100)}% · Attendance: {Math.round(metric.attendance_rate * 100)}%
                </div>
              </div>
            ))}
            {metrics.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--tx3)' }}>No metrics found for the current filters.</div>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>Create / Update Metric</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select className="input-field" value={form.subject_uuid} onChange={e => setForm(prev => ({ ...prev, subject_uuid: e.target.value }))}>
              <option value="">Select subject</option>
              {subjects.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
            </select>
            <input className="input-field" placeholder="Term (optional)" value={form.term} onChange={e => setForm(prev => ({ ...prev, term: e.target.value }))} />
            <input className="input-field" type="date" value={form.snapshot_date} onChange={e => setForm(prev => ({ ...prev, snapshot_date: e.target.value }))} />
            <input className="input-field" placeholder="Progress (0.0 - 1.0)" value={form.progress} onChange={e => setForm(prev => ({ ...prev, progress: e.target.value }))} />
            <input className="input-field" placeholder="Completion rate (0.0 - 1.0)" value={form.assignment_completion_rate} onChange={e => setForm(prev => ({ ...prev, assignment_completion_rate: e.target.value }))} />
            <input className="input-field" placeholder="Attendance rate (0.0 - 1.0)" value={form.attendance_rate} onChange={e => setForm(prev => ({ ...prev, attendance_rate: e.target.value }))} />
          </div>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : 'Save Metric'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
