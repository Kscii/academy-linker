// ============================================================
// Teacher AIReportsScreen — generate AI reports
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import { SearchableSelect } from '@/components/forms/SearchableSelect';
import type { TeacherReportDetail, ReportType, TeacherClassStudentItem, TeacherStudentListItem } from '@/types/api';

const REPORT_TYPES: ReportType[] = ['weekly', 'monthly', 'custom'];

type AiForm = {
  report_type: ReportType;
  subject_uuid: string;
  period_start: string;
  period_end: string;
  extra_instruction: string;
};

const EMPTY_FORM: AiForm = {
  report_type: 'weekly',
  subject_uuid: '',
  period_start: '',
  period_end: '',
  extra_instruction: '',
};

export function TeacherAIReportsScreen() {
  const { t } = useTranslation('portal');
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStudentUuid = searchParams.get('student') ?? '';
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [studentUuid, setStudentUuid] = useState(requestedStudentUuid);
  const [subjects, setSubjects] = useState<TeacherClassStudentItem['subjects']>([]);
  const [form, setForm] = useState<AiForm>(EMPTY_FORM);
  const [reports, setReports] = useState<TeacherReportDetail[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeStudent = students.find(student => student.uuid === studentUuid) ?? null;
  const studentOptions = students.map(student => ({ value: student.uuid, label: student.full_name, meta: { description: student.sid ?? student.class_name ?? '' } }));
  const subjectOptions = subjects.map(subject => ({ value: subject.uuid, label: subject.name }));

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

  const handleGenerate = async () => {
    if (!studentUuid || !form.period_start || !form.period_end) {
      setError(t('studentPeriodRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await teacherApi.generateAiReport(studentUuid, {
        report_type: form.report_type,
        subject_uuid: form.subject_uuid || null,
        period_start: form.period_start,
        period_end: form.period_end,
        extra_instruction: form.extra_instruction || null,
      });
      setReports(prev => [res.data, ...prev.filter(item => item.uuid !== res.data.uuid)]);
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? t('failedGenerateAiReport'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('aiReportsTitle')}</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('aiReportsSubtitle')}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <SearchableSelect value={studentUuid} onChange={setStudentUuid} options={studentOptions} placeholder={t('selectStudent')} />
            <select className="input-field" value={form.report_type} onChange={e => setForm(prev => ({ ...prev, report_type: e.target.value as ReportType }))}>
              {REPORT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <SearchableSelect value={form.subject_uuid} onChange={value => setForm(prev => ({ ...prev, subject_uuid: value }))} options={subjectOptions} placeholder={t('selectSubject')} clearLabel={t('wholeStudent')} />
            <input className="input-field" type="date" value={form.period_start} onChange={e => setForm(prev => ({ ...prev, period_start: e.target.value }))} />
            <input className="input-field" type="date" value={form.period_end} onChange={e => setForm(prev => ({ ...prev, period_end: e.target.value }))} />
          </div>
          <textarea className="input-field" rows={8} placeholder={t('extraInstruction')} value={form.extra_instruction} onChange={e => setForm(prev => ({ ...prev, extra_instruction: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => void handleGenerate()} disabled={saving}>
              {saving ? t('generating') : t('generateAIReport')}
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('generatedThisSession')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map(report => (
              <div key={report.uuid} className="card-sm">
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{report.title}</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4 }}>
                  {report.report_type} · {report.source_type} · {report.subject?.name ?? t('wholeStudent')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 8, lineHeight: 1.6 }}>
                  {report.display_content_markdown.slice(0, 220)}{report.display_content_markdown.length > 220 ? '…' : ''}
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
                {t('aiReportsSessionHint')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
