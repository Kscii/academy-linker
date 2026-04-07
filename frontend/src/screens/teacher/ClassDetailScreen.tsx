// ============================================================
// ClassDetailScreen — class info and filtered student list
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { teacher as teacherApi } from '@/lib/api';
import type { ClassGradeStats, PaginationMeta, TeacherClass, TeacherClassStudentItem } from '@/types/api';

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

export function ClassDetailScreen() {
  const { t } = useTranslation('app');
  const navigate = useNavigate();
  const { classUuid } = useParams<{ classUuid: string }>();
  const [cls, setCls] = useState<TeacherClass | null>(null);
  const [students, setStudents] = useState<TeacherClassStudentItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [keyword, setKeyword] = useState('');
  const [subjectUuid, setSubjectUuid] = useState('');
  const [page, setPage] = useState(1);
  const [examDateFrom, setExamDateFrom] = useState('');
  const [examDateTo, setExamDateTo] = useState('');
  const [gradeStats, setGradeStats] = useState<ClassGradeStats | null>(null);

  const subjectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    students.forEach(student => {
      student.subjects.forEach(subject => {
        if (!seen.has(subject.uuid)) seen.set(subject.uuid, subject.name);
      });
    });
    return Array.from(seen.entries()).map(([uuid, name]) => ({ uuid, name }));
  }, [students]);

  useEffect(() => {
    if (!classUuid) return;
    Promise.all([
      teacherApi.getClasses(),
      teacherApi.getClassStudents(classUuid, {
        page,
        page_size: 20,
        subject_uuid: subjectUuid || undefined,
        keyword: keyword.trim() || undefined,
      }),
      teacherApi.getClassGradeStats(classUuid, {
        subject_uuid: subjectUuid || undefined,
        exam_date_from: examDateFrom || undefined,
        exam_date_to: examDateTo || undefined,
      }),
    ]).then(([classesRes, studentsRes, gradeStatsRes]) => {
      const found = classesRes.data.find(item => item.uuid === classUuid) ?? null;
      setCls(found);
      setStudents(studentsRes.data);
      setMeta(studentsRes.meta);
      setGradeStats(gradeStatsRes.data);
    }).catch(() => {});
  }, [classUuid, examDateFrom, examDateTo, keyword, page, subjectUuid]);

  if (!cls) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 14 }}>{t('common.loading')}</div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/teacher/dashboard')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontWeight: 700,
          fontFamily: 'var(--font-body)',
        }}
      >
        ← {t('teacherClassDetail.backToDashboard')}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--a1)18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          🏫
        </div>
        <div>
          <div className="font-serif" style={{ fontSize: 24, color: 'var(--tx)' }}>{cls.name}</div>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
            {t('teacherClassDetail.grade', { value: cls.grade_level ?? t('common.notAvailable') })} · {cls.academic_year ?? t('common.notAvailable')}
            {cls.is_homeroom && <span className="badge" style={{ marginLeft: 8, background: 'var(--a1)20', color: 'var(--a1)', fontSize: 10 }}>{t('teacherClassDetail.homeroom')}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="stat-box">
          <div className="stat-label">{t('teacherClassDetail.students')}</div>
          <div className="stat-value" style={{ color: 'var(--a1)' }}>{cls.student_count}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">{t('teacherClassDetail.pageTotal')}</div>
          <div className="stat-value" style={{ color: 'var(--a2)' }}>{meta.total}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => navigate(`/teacher/classes/${classUuid}/timetable`)}>
          {t('teacherClassDetail.viewTimetable')}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('teacherClassDetail.gradeStats')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(160px, 1fr) minmax(160px, 1fr)', gap: 10, marginBottom: 16 }}>
          <select className="input-field" value={subjectUuid} onChange={e => { setPage(1); setSubjectUuid(e.target.value); }}>
            <option value="">{t('teacherClassDetail.allSubjects')}</option>
            {subjectOptions.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
          </select>
          <input className="input-field" type="date" value={examDateFrom} onChange={e => setExamDateFrom(e.target.value)} />
          <input className="input-field" type="date" value={examDateTo} onChange={e => setExamDateTo(e.target.value)} />
        </div>

        {gradeStats ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
              <div className="stat-box">
                <div className="stat-label">{t('teacherClassDetail.average')}</div>
                <div className="stat-value" style={{ color: 'var(--a2)' }}>{gradeStats.summary.avg_score.toFixed(1)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">{t('teacherClassDetail.highest')}</div>
                <div className="stat-value" style={{ color: 'var(--a1)' }}>{gradeStats.summary.max_score.toFixed(1)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">{t('teacherClassDetail.lowest')}</div>
                <div className="stat-value" style={{ color: 'var(--a4)' }}>{gradeStats.summary.min_score.toFixed(1)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">{t('teacherClassDetail.exams')}</div>
                <div className="stat-value" style={{ color: 'var(--tx)' }}>{gradeStats.summary.exam_count}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gradeStats.students.length === 0 ? (
                <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                  {t('teacherClassDetail.noGradeStatsForFilters')}
                </div>
              ) : (
                gradeStats.students.map(student => (
                  <div key={student.student_uuid} style={{ border: '1px solid var(--bd)', borderRadius: 12, padding: 14, background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{student.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{student.sid ?? t('common.noSid', 'No SID')}</div>
                      </div>
                      <button className="chip" onClick={() => navigate(`/teacher/students/${student.student_uuid}`)}>
                        {t('teacherClassDetail.openStudent')}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                      {student.subject_scores.map(subject => (
                        <div key={subject.subject_uuid} style={{ border: '1px solid var(--bd)', borderRadius: 10, padding: 10, background: 'var(--card)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>{subject.subject_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{t('teacherClassDetail.averageValue', { value: subject.avg_score.toFixed(1) })}</div>
                          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{t('teacherClassDetail.latestValue', { value: subject.latest_score.toFixed(1) })}</div>
                          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{t('teacherClassDetail.examsValue', { value: subject.exam_count })}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
            {t('teacherClassDetail.noGradeStatsAvailable')}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.3fr) minmax(160px, 1fr) auto', gap: 10, marginBottom: 16 }}>
          <input className="input-field" placeholder={t('teacherClassDetail.searchPlaceholder')} value={keyword} onChange={e => { setPage(1); setKeyword(e.target.value); }} />
          <select className="input-field" value={subjectUuid} onChange={e => { setPage(1); setSubjectUuid(e.target.value); }}>
            <option value="">{t('teacherClassDetail.allSubjects')}</option>
            {subjectOptions.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
          </select>
          <div className="input-field" style={{ display: 'flex', alignItems: 'center' }}>
            {t('common.pageStatus', { page: meta.page, totalPages: Math.max(meta.total_pages, 1) })}
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>{t('teacherClassDetail.studentsSection')}</div>
        {students.length === 0 ? (
          <div style={{ color: 'var(--tx3)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
            {t('teacherClassDetail.noStudentsFound')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 32px', gap: 12, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd)' }}>
              <span>{t('teacherClassDetail.studentColumn')}</span><span>{t('teacherClassDetail.subjectsColumn')}</span><span />
            </div>

            {students.map(item => {
              const inits = item.full_name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div
                  key={item.uuid}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 180px 32px', gap: 12, padding: '10px 10px', cursor: 'pointer', borderRadius: 8, transition: 'background 0.12s', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => navigate(`/teacher/students/${item.uuid}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ background: 'var(--a1)18', color: 'var(--a1)', fontSize: 11 }}>
                      {inits}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{item.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{item.sid ?? t('common.noSid', 'No SID')}</div>
                      {item.preferred_name && (
                        <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{item.preferred_name}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                    {item.subjects.map(subject => subject.name).join(', ') || '—'}
                  </div>

                  <span style={{ fontSize: 14, color: 'var(--tx3)', textAlign: 'center' }}>›</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
          {t('actions.previous')}
        </button>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
          {t('actions.next')}
        </button>
      </div>
    </div>
  );
}
