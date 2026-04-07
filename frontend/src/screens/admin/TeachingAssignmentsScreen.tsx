// ============================================================
// Admin TeachingAssignmentsScreen — manage teaching assignments
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin as adminApi } from '@/lib/api';
import type { AdminStudent, AdminUser, PaginationMeta, TeachingAssignment } from '@/types/api';

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
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
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
    const [assignmentsRes, teachersRes, studentsRes] = await Promise.all([
      adminApi.getTeachingAssignments({
        page,
        page_size: 20,
        teacher_uuid: teacherUuid || undefined,
        student_uuid: studentUuid || undefined,
        subject_uuid: subjectUuid.trim() || undefined,
        is_active: status === 'all' ? undefined : status === 'active',
      }),
      adminApi.getUsers({ page: 1, page_size: 200, role: 'teacher', sort: 'display_name_asc' }),
      adminApi.getStudents({ page: 1, page_size: 200 }),
    ]);
    setAssignments(assignmentsRes.data);
    setTeachers(teachersRes.data);
    setStudents(studentsRes.data);
    setMeta(assignmentsRes.meta);
  };

  useEffect(() => {
    void loadAssignments();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!form.teacher_uuid || !form.student_uuid || !form.subject_uuid.trim()) {
      setError(t('teacherStudentSubjectRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await adminApi.createTeachingAssignment({
        teacher_uuid: form.teacher_uuid,
        student_uuid: form.student_uuid,
        subject_uuid: form.subject_uuid.trim(),
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
            <select className="input-field" value={teacherUuid} onChange={e => setTeacherUuid(e.target.value)}>
              <option value="">{t('allTeachers')}</option>
              {teachers.map(teacher => <option key={teacher.uuid} value={teacher.uuid}>{teacher.display_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('selectStudent')}</label>
            <select className="input-field" value={studentUuid} onChange={e => setStudentUuid(e.target.value)}>
              <option value="">{t('allStudents')}</option>
              {students.map(student => <option key={student.uuid} value={student.uuid}>{student.full_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('subjectUuid')}</label>
            <input className="input-field" value={subjectUuid} onChange={e => setSubjectUuid(e.target.value)} />
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
            <select className="input-field" value={form.teacher_uuid} onChange={e => setForm(prev => ({ ...prev, teacher_uuid: e.target.value }))}>
              <option value="">{t('selectTeacher')}</option>
              {teachers.map(teacher => <option key={teacher.uuid} value={teacher.uuid}>{teacher.display_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('selectStudent')}</label>
            <select className="input-field" value={form.student_uuid} onChange={e => setForm(prev => ({ ...prev, student_uuid: e.target.value }))}>
              <option value="">{t('selectStudent')}</option>
              {students.map(student => <option key={student.uuid} value={student.uuid}>{student.full_name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--tx3)', display: 'block', marginBottom: 4 }}>{t('subjectUuid')}</label>
            <input className="input-field" value={form.subject_uuid} onChange={e => setForm(prev => ({ ...prev, subject_uuid: e.target.value }))} />
          </div>
          <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => void handleCreate()} disabled={saving}>
            {saving ? t('common:loading') : t('create')}
          </button>
        </div>
        {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--a1)' }}>{error}</div>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {assignments.map(assignment => {
          const teacher = teachers.find(item => item.uuid === assignment.teacher_uuid);
          const student = students.find(item => item.uuid === assignment.student_uuid);
          return (
            <div key={assignment.uuid} className="card-sm" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
                  {teacher?.display_name ?? assignment.teacher_uuid} → {student?.full_name ?? assignment.student_uuid}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{t('subjectUuid')}: {assignment.subject_uuid}</div>
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
