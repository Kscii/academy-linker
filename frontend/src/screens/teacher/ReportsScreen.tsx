// ============================================================
// Teacher ReportsScreen — create and update teacher reports
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { TeacherReportDetail, ReportType, TeacherClassStudentItem, TeacherStudentListItem } from '@/types/api';

const REPORT_TYPES: ReportType[] = ['weekly', 'monthly', 'custom'];

type ReportForm = {
  title: string;
  report_type: ReportType;
  subject_uuid: string;
  period_start: string;
  period_end: string;
  original_language: string;
  content_markdown: string;
};

const EMPTY_FORM: ReportForm = {
  title: '',
  report_type: 'weekly',
  subject_uuid: '',
  period_start: '',
  period_end: '',
  original_language: 'en-AU',
  content_markdown: '',
};

export function TeacherReportsScreen() {
  const { t } = useTranslation('portal');
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStudentUuid = searchParams.get('student') ?? '';
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [studentUuid, setStudentUuid] = useState(requestedStudentUuid);
  const [subjects, setSubjects] = useState<TeacherClassStudentItem['subjects']>([]);
  const [reports, setReports] = useState<TeacherReportDetail[]>([]);
  const [editingUuid, setEditingUuid] = useState('');
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeStudent = useMemo(
    () => students.find(student => student.uuid === studentUuid) ?? null,
    [studentUuid, students]
  );

  useEffect(() => {
    teacherApi.getStudents({ page: 1, page_size: 100, sort: 'full_name_asc' }).then(res => {
      setStudents(res.data);
      setStudentUuid(prev => prev || requestedStudentUuid || res.data[0]?.uuid || '');
    }).catch(() => {});
  }, [requestedStudentUuid]);

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

  useEffect(() => {
    const next = new URLSearchParams();
    if (studentUuid) next.set('student', studentUuid);
    setSearchParams(next, { replace: true });
  }, [setSearchParams, studentUuid]);

  const openCreate = () => {
    setEditingUuid('');
    setForm(EMPTY_FORM);
    setError('');
  };

  const openEdit = (report: TeacherReportDetail) => {
    setEditingUuid(report.uuid);
    setForm({
      title: report.title,
      report_type: report.report_type,
      subject_uuid: report.subject?.uuid ?? '',
      period_start: report.period_start?.slice(0, 10) ?? '',
      period_end: report.period_end?.slice(0, 10) ?? '',
      original_language: report.original_language,
      content_markdown: report.original_content_markdown,
    });
    setError('');
  };

  const handleSave = async () => {
    if (!studentUuid || !form.title.trim() || !form.content_markdown.trim()) {
      setError(t('studentTitleContentRequired'));
      return;
    }
    if (!!form.period_start !== !!form.period_end) {
      setError(t('periodBothRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingUuid) {
        const res = await teacherApi.updateReport(editingUuid, {
          title: form.title.trim(),
          report_type: form.report_type,
          subject_uuid: form.subject_uuid || null,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          original_language: form.original_language,
          content_markdown: form.content_markdown.trim(),
        });
        setReports(prev => prev.map(item => item.uuid === editingUuid ? res.data : item));
      } else {
        const res = await teacherApi.createReport(studentUuid, {
          title: form.title.trim(),
          report_type: form.report_type,
          subject_uuid: form.subject_uuid || null,
          period_start: form.period_start || null,
          period_end: form.period_end || null,
          original_language: form.original_language,
          content_markdown: form.content_markdown.trim(),
        });
        setReports(prev => [res.data, ...prev]);
      }
      openCreate();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? t('failedSaveReport'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('reportsTitle')}</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('reportsSubtitle')}</div>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={openCreate}>
          {t('newReport')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <select className="input-field" value={studentUuid} onChange={e => setStudentUuid(e.target.value)}>
              <option value="">{t('selectStudent')}</option>
              {students.map(student => <option key={student.uuid} value={student.uuid}>{student.full_name}</option>)}
            </select>
            <select className="input-field" value={form.report_type} onChange={e => setForm(prev => ({ ...prev, report_type: e.target.value as ReportType }))}>
              {REPORT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <input className="input-field" placeholder={t('reportTitle')} value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
            <select className="input-field" value={form.subject_uuid} onChange={e => setForm(prev => ({ ...prev, subject_uuid: e.target.value }))}>
              <option value="">{t('allSubjects')}</option>
              {subjects.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
            </select>
            <input className="input-field" type="date" value={form.period_start} onChange={e => setForm(prev => ({ ...prev, period_start: e.target.value }))} />
            <input className="input-field" type="date" value={form.period_end} onChange={e => setForm(prev => ({ ...prev, period_end: e.target.value }))} />
            <input className="input-field" placeholder={t('originalLanguage')} value={form.original_language} onChange={e => setForm(prev => ({ ...prev, original_language: e.target.value }))} />
          </div>
          <textarea className="input-field" rows={12} placeholder={t('reportMarkdown')} value={form.content_markdown} onChange={e => setForm(prev => ({ ...prev, content_markdown: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? t('common:loading') : editingUuid ? t('updateReport') : t('createReport')}
            </button>
            {editingUuid && (
              <button className="btn-secondary" onClick={openCreate}>
                {t('cancelEdit')}
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('sessionReports')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map(report => (
              <div key={report.uuid} className="card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{report.title}</div>
                  <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => openEdit(report)}>
                    {t('common:edit')}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 6 }}>
                  {report.report_type} · {report.subject?.name ?? t('allSubjects')} · {report.author.display_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>
                  {report.display_content_markdown.slice(0, 180)}{report.display_content_markdown.length > 180 ? '…' : ''}
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--tx3)' }}>
                {t('reportsSessionHint')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
