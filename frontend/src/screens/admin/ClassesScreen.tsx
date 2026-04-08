// ============================================================
// Admin ClassesScreen — list, create, edit, manage classes
// ============================================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/forms/SearchableSelect';
import { admin as adminApi, getApiErrorMessage } from '@/lib/api';
import type { AdminClass, AdminStudent, CreateClassRequest, PaginationMeta, SelectOption, UpdateClassRequest } from '@/types/api';

type ClassForm = {
  uuid?: string;
  name: string;
  grade_level: string;
  academic_year: string;
  homeroom_teacher_uuid: string;
  is_active: boolean;
};

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

const EMPTY_FORM: ClassForm = {
  name: '',
  grade_level: '',
  academic_year: '',
  homeroom_teacher_uuid: '',
  is_active: true,
};

export function AdminClassesScreen() {
  const { t } = useTranslation('app');
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [teachers, setTeachers] = useState<SelectOption[]>([]);
  const [allStudents, setAllStudents] = useState<AdminStudent[]>([]);
  const [gradeLevels, setGradeLevels] = useState<SelectOption[]>([]);
  const [academicYears, setAcademicYears] = useState<SelectOption[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [gradeLevel, setGradeLevel] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [form, setForm] = useState<ClassForm>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addSid, setAddSid] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = async () => {
    const [classesRes, teachersRes, studentsRes, gradeLevelsRes, academicYearsRes] = await Promise.all([
      adminApi.getClasses({
        page,
        page_size: 20,
        grade_level: gradeLevel || undefined,
        academic_year: academicYear || undefined,
        is_active: status === 'all' ? undefined : status === 'active',
      }),
      adminApi.getTeacherOptions(),
      adminApi.getStudents({ page: 1, page_size: 200 }),
      adminApi.getGradeLevelOptions(),
      adminApi.getAcademicYearOptions(),
    ]);
    setClasses(classesRes.data);
    setTeachers(teachersRes.data);
    setAllStudents(studentsRes.data);
    setGradeLevels(gradeLevelsRes.data);
    setAcademicYears(academicYearsRes.data);
    setMeta(classesRes.meta);
  };

  useEffect(() => {
    void loadData();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = classes.find(item => item.uuid === selected) ?? null;
  const classStudents = allStudents.filter(student => student.class_uuid === selected);
  const enrollable = allStudents.filter(student => student.class_uuid !== selected);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(false);
    setError('');
    setShowForm(true);
  };

  const openEdit = (item: AdminClass) => {
    setForm({
      uuid: item.uuid,
      name: item.name,
      grade_level: item.grade_level ?? '',
      academic_year: item.academic_year ?? '',
      homeroom_teacher_uuid: item.homeroom_teacher?.uuid ?? '',
      is_active: item.is_active,
    });
    setEditing(true);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError(t('adminClasses.classNameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing && form.uuid) {
        const body: UpdateClassRequest = {
          name: form.name.trim(),
          grade_level: form.grade_level.trim() || null,
          academic_year: form.academic_year.trim() || null,
          homeroom_teacher_uuid: form.homeroom_teacher_uuid || null,
          is_active: form.is_active,
        };
        await adminApi.updateClass(form.uuid, body);
      } else {
        const body: CreateClassRequest = {
          name: form.name.trim(),
          grade_level: form.grade_level.trim() || null,
          academic_year: form.academic_year.trim() || null,
          homeroom_teacher_uuid: form.homeroom_teacher_uuid || null,
        };
        await adminApi.createClass(body);
      }
      setShowForm(false);
      await loadData();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t('adminClasses.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selected || !addSid) return;
    setAdding(true);
    setError('');
    try {
      await adminApi.transferClass(addSid, selected);
      setAddSid('');
      await loadData();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t('adminClasses.saveFailed')));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStudent = async (studentUuid: string) => {
    setError('');
    try {
      await adminApi.updateStudent(studentUuid, { class_uuid: null });
      await loadData();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t('adminClasses.saveFailed')));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)' }}>{t('adminClasses.title')}</div>
          <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={openCreate}>
            + {t('adminClasses.new')}
          </button>
        </div>

        <div className="card" style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 8 }}>{t('adminClasses.total', { count: meta.total })}</div>
          <div style={{ marginBottom: 8 }}>
            <SearchableSelect value={gradeLevel} onChange={setGradeLevel} options={gradeLevels} placeholder={t('adminClasses.gradeLevelPlaceholder')} allowClear />
          </div>
          <div style={{ marginBottom: 8 }}>
            <SearchableSelect value={academicYear} onChange={setAcademicYear} options={academicYears} placeholder={t('adminClasses.academicYearPlaceholder')} allowClear />
          </div>
          <select className="input-field" value={status} onChange={e => setStatus(e.target.value as typeof status)} style={{ marginBottom: 8 }}>
            <option value="all">{t('adminClasses.allStatuses')}</option>
            <option value="active">{t('adminClasses.activeOnly')}</option>
            <option value="inactive">{t('adminClasses.inactiveOnly')}</option>
          </select>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => { setPage(1); void loadData(); }}>
            {t('actions.applyFilters')}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 12, padding: 14 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t('adminClasses.className')}</label>
              <input className="input-field" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t('adminClasses.gradeLevel')}</label>
              <SearchableSelect value={form.grade_level} onChange={(value) => setForm(prev => ({ ...prev, grade_level: value }))} options={gradeLevels} placeholder={t('adminClasses.gradeLevelPlaceholder')} allowClear />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t('adminClasses.academicYear')}</label>
              <SearchableSelect value={form.academic_year} onChange={(value) => setForm(prev => ({ ...prev, academic_year: value }))} options={academicYears} placeholder={t('adminClasses.academicYearPlaceholder')} allowClear />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t('adminClasses.homeroomTeacher')}</label>
              <SearchableSelect value={form.homeroom_teacher_uuid} onChange={(value) => setForm(prev => ({ ...prev, homeroom_teacher_uuid: value }))} options={teachers} placeholder={t('adminClasses.none')} allowClear />
            </div>
            {editing && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--tx3)', display: 'block', marginBottom: 3 }}>{t('adminClasses.status')}</label>
                <select className="input-field" value={String(form.is_active)} onChange={e => setForm(prev => ({ ...prev, is_active: e.target.value === 'true' }))}>
                  <option value="true">{t('common.active')}</option>
                  <option value="false">{t('common.inactive')}</option>
                </select>
              </div>
            )}
            {error && <div style={{ fontSize: 12, color: 'var(--a1)', marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={() => void handleSave()} disabled={saving}>
                {saving ? '…' : t('actions.save')}
              </button>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => setShowForm(false)}>{t('actions.cancel')}</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {classes.map(item => (
            <div key={item.uuid} className="card-sm" style={{ cursor: 'pointer', borderColor: selected === item.uuid ? 'var(--a1)' : 'var(--bd)', background: selected === item.uuid ? 'rgba(232,97,78,0.04)' : 'var(--card)' }} onClick={() => setSelected(item.uuid)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>{item.grade_level ?? t('adminClasses.noGrade')} · {t('adminClasses.studentsCount', { count: item.student_count })}</div>
                  {item.homeroom_teacher && <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 1 }}>{t('adminClasses.hr', { name: item.homeroom_teacher.display_name })}</div>}
                </div>
                <span className="badge" style={{ background: item.is_active ? 'var(--a3)18' : 'var(--tx3)18', color: item.is_active ? 'var(--a3)' : 'var(--tx3)', fontSize: 10, height: 'fit-content' }}>
                  {item.is_active ? t('common.active') : t('common.inactive')}
                </span>
              </div>
              <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12, marginTop: 8 }} onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
                {t('actions.edit')}
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
            {t('actions.previous')}
          </button>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
            {t('actions.next')}
          </button>
        </div>
      </div>

      {current ? (
        <div className="card">
          <div className="font-serif" style={{ fontSize: 20, color: 'var(--tx)', marginBottom: 4 }}>{current.name}</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 4 }}>{current.grade_level ?? t('adminClasses.noGradeLevel')}</div>
          <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 20 }}>{t('adminClasses.academicYearLabel', { value: current.academic_year ?? t('common.notAvailable') })}</div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {t('adminClasses.studentsSection', { count: current.student_count })}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select className="input-field" value={addSid} onChange={e => setAddSid(e.target.value)} style={{ flex: 1 }}>
              <option value="">{`— ${t('adminClasses.addStudent')} —`}</option>
              {enrollable.map(student => <option key={student.uuid} value={student.uuid}>{student.full_name}{student.sid ? ` (${student.sid})` : ''}</option>)}
            </select>
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12, flexShrink: 0, opacity: addSid ? 1 : 0.4 }} onClick={() => void handleAddStudent()} disabled={!addSid || adding}>
              {adding ? '…' : t('adminClasses.addStudent')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {classStudents.map(student => (
              <div key={student.uuid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8 }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: 'var(--a2)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {student.full_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{student.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{student.sid ?? t('common.noSid')}</div>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--a1)', fontSize: 16, padding: '2px 4px' }} title={t('adminClasses.addStudent')} onClick={() => void handleRemoveStudent(student.uuid)}>
                  ×
                </button>
              </div>
            ))}
            {classStudents.length === 0 && (
              <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{t('adminClasses.noStudentsEnrolled')}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--tx3)', fontSize: 14 }}>
          {t('adminClasses.selectClassToManage')}
        </div>
      )}
    </div>
  );
}
