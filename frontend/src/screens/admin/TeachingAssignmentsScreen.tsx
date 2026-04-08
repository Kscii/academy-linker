// ============================================================
// Admin TeachingAssignmentsScreen — manage teaching assignments
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/forms/SearchableSelect';
import { admin as adminApi } from '@/lib/api';
import type { PaginationMeta, SelectOption, TeachingAssignment } from '@/types/api';

type AssignmentForm = {
  teacher_uuid: string;
  student_uuid: string;
  subject_uuid: string;
};

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

const EMPTY_FORM: AssignmentForm = {
  teacher_uuid: '',
  student_uuid: '',
  subject_uuid: '',
};

export function AdminTeachingAssignmentsScreen() {
  const { t } = useTranslation('portal');
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [teachers, setTeachers] = useState<SelectOption[]>([]);
  const [students, setStudents] = useState<SelectOption[]>([]);
  const [subjects, setSubjects] = useState<SelectOption[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [teacherUuid, setTeacherUuid] = useState('');
  const [studentUuid, setStudentUuid] = useState('');
  const [subjectUuid, setSubjectUuid] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<AssignmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadAssignments = async () => {
    const [assignmentsRes, teachersRes, studentsRes, subjectsRes] = await Promise.all([
      adminApi.getTeachingAssignments({
        page,
        page_size: 20,
        teacher_uuid: teacherUuid || undefined,
        student_uuid: studentUuid || undefined,
        subject_uuid: subjectUuid || undefined,
        is_active: status === 'all' ? undefined : status === 'active',
      }),
      adminApi.getTeacherOptions(),
      adminApi.getStudentOptions(),
      adminApi.getSubjectOptions(),
    ]);
    setAssignments(assignmentsRes.data);
    setTeachers(teachersRes.data);
    setStudents(studentsRes.data);
    setSubjects(subjectsRes.data);
    setMeta(assignmentsRes.meta);
  };

  useEffect(() => {
    void loadAssignments();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!form.teacher_uuid || !form.student_uuid || !form.subject_uuid) {
      setError(t('teacherStudentSubjectRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminApi.createTeachingAssignment({
        teacher_uuid: form.teacher_uuid,
        student_uuid: form.student_uuid,
        subject_uuid: form.subject_uuid,
      });
      setForm(EMPTY_FORM);
      await loadAssignments();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? t('failedCreateTeachingAssignment'));
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignment = async (assignment: TeachingAssignment) => {
    await adminApi.updateTeachingAssignment(assignment.uuid, { is_active: !assignment.is_active });
    await loadAssignments();
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('teachingAssignmentsTitle')}</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{t('assignmentsCount', { count: meta.total })}</div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr)) auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('selectTeacher')}</label>
            <SearchableSelect value={teacherUuid} onChange={setTeacherUuid} options={teachers} placeholder={t('allTeachers')} allowClear />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('selectStudent')}</label>
            <SearchableSelect value={studentUuid} onChange={setStudentUuid} options={students} placeholder={t('allStudents')} allowClear />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('subjectUuid')}</label>
            <SearchableSelect value={subjectUuid} onChange={setSubjectUuid} options={subjects} placeholder={t('subjectUuid')} allowClear />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('status')}</label>
            <select className="input-field" value={status} onChange={e => setStatus(e.target.value as typeof status)}>
              <option value="all">{t('allTags')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => { setPage(1); void loadAssignments(); }}>
            {t('apply')}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('newAssignment')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('selectTeacher')}</label>
            <SearchableSelect value={form.teacher_uuid} onChange={(value) => setForm(prev => ({ ...prev, teacher_uuid: value }))} options={teachers} placeholder={t('selectTeacher')} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('selectStudent')}</label>
            <SearchableSelect value={form.student_uuid} onChange={(value) => setForm(prev => ({ ...prev, student_uuid: value }))} options={students} placeholder={t('selectStudent')} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('subjectUuid')}</label>
            <SearchableSelect value={form.subject_uuid} onChange={(value) => setForm(prev => ({ ...prev, subject_uuid: value }))} options={subjects} placeholder={t('subjectUuid')} />
          </div>
          <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => void handleCreate()} disabled={saving}>
            {saving ? t('common:loading') : t('create')}
          </button>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--a1)' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {assignments.map(assignment => {
          const teacher = teachers.find(item => item.value === assignment.teacher_uuid);
          const student = students.find(item => item.value === assignment.student_uuid);
          const subject = subjects.find(item => item.value === assignment.subject_uuid);
          return (
            <div key={assignment.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
                  {teacher?.label ?? assignment.teacher_uuid} → {student?.label ?? assignment.student_uuid}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{t('subjectUuid')}: {subject?.label ?? assignment.subject_uuid}</div>
              </div>
              <span className="badge" style={{ background: assignment.is_active ? 'var(--a3)18' : 'var(--tx3)18', color: assignment.is_active ? 'var(--a3)' : 'var(--tx3)', fontSize: 10 }}>
                {assignment.is_active ? t('active') : t('inactive')}
              </span>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => void toggleAssignment(assignment)}>
                {assignment.is_active ? t('deactivate') : t('activate')}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
          {t('previous')}
        </button>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
          {t('next')}
        </button>
      </div>
    </div>
  );
}
