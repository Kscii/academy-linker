// ============================================================
// Teacher ExamScoresScreen — manage exam scores
// ============================================================

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { ExamScore, PaginationMeta, TeacherClassStudentItem, TeacherStudentListItem, UpdateExamScoreRequest } from '@/types/api';

type ScoreForm = {
  uuid?: string;
  subject_uuid: string;
  exam_name: string;
  exam_date: string;
  score: string;
  full_score: string;
  note: string;
};

const EMPTY_FORM: ScoreForm = {
  subject_uuid: '',
  exam_name: '',
  exam_date: '',
  score: '',
  full_score: '100',
  note: '',
};

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

export function TeacherExamScoresScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedStudentUuid = searchParams.get('student') ?? '';
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [studentUuid, setStudentUuid] = useState(requestedStudentUuid);
  const [subjects, setSubjects] = useState<TeacherClassStudentItem['subjects']>([]);
  const [scores, setScores] = useState<ExamScore[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [page, setPage] = useState(1);
  const [filterSubjectUuid, setFilterSubjectUuid] = useState('');
  const [examDateFrom, setExamDateFrom] = useState('');
  const [examDateTo, setExamDateTo] = useState('');
  const [form, setForm] = useState<ScoreForm>(EMPTY_FORM);
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

  const loadScores = async () => {
    if (!studentUuid) return;
    const res = await teacherApi.getExamScores(studentUuid, {
      page,
      page_size: 20,
      subject_uuid: filterSubjectUuid || undefined,
      exam_date_from: examDateFrom || undefined,
      exam_date_to: examDateTo || undefined,
    });
    setScores(res.data);
    setMeta(res.meta);
  };

  useEffect(() => {
    void loadScores();
  }, [examDateFrom, examDateTo, filterSubjectUuid, page, studentUuid]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = (score: ExamScore) => {
    setForm({
      uuid: score.uuid,
      subject_uuid: score.subject.uuid,
      exam_name: score.exam_name ?? '',
      exam_date: score.exam_date.slice(0, 10),
      score: String(score.score),
      full_score: String(score.full_score),
      note: score.note ?? '',
    });
    setError('');
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setError('');
  };

  const handleSave = async () => {
    if (!studentUuid) {
      setError('Student is required.');
      return;
    }
    if (!form.subject_uuid || !form.exam_date || !form.score) {
      setError('Subject, exam date, and score are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (form.uuid) {
        const body: UpdateExamScoreRequest = {
          exam_name: form.exam_name || null,
          exam_date: form.exam_date || null,
          score: form.score ? Number(form.score) : null,
          full_score: form.full_score ? Number(form.full_score) : null,
          note: form.note || null,
        };
        await teacherApi.updateExamScore(studentUuid, form.uuid, body);
      } else {
        await teacherApi.createExamScore(studentUuid, {
          subject_uuid: form.subject_uuid,
          exam_name: form.exam_name || null,
          exam_date: form.exam_date,
          score: Number(form.score),
          full_score: Number(form.full_score || 100),
          note: form.note || null,
        });
      }
      resetForm();
      await loadScores();
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      setError(msg ?? 'Failed to save exam score.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scoreUuid: string) => {
    if (!studentUuid) return;
    await teacherApi.deleteExamScore(studentUuid, scoreUuid);
    await loadScores();
    if (form.uuid === scoreUuid) resetForm();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>Exam Scores</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{meta.total} score record{meta.total !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <select className="input-field" value={studentUuid} onChange={e => setStudentUuid(e.target.value)}>
              <option value="">Select student</option>
              {students.map(student => <option key={student.uuid} value={student.uuid}>{student.full_name}</option>)}
            </select>
            <select className="input-field" value={filterSubjectUuid} onChange={e => setFilterSubjectUuid(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
            </select>
            <input className="input-field" type="date" value={examDateFrom} onChange={e => setExamDateFrom(e.target.value)} />
            <input className="input-field" type="date" value={examDateTo} onChange={e => setExamDateTo(e.target.value)} />
          </div>
          <div className="input-field" style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            Page {meta.page} / {Math.max(meta.total_pages, 1)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scores.map(score => (
              <div key={score.uuid} className="card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{score.exam_name ?? 'Untitled Exam'}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => openEdit(score)}>
                      Edit
                    </button>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12, color: 'var(--warn)' }} onClick={() => void handleDelete(score.uuid)}>
                      Delete
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                  {score.subject.name} · {score.exam_date.slice(0, 10)} · {score.score}/{score.full_score}
                </div>
                {score.note && <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>{score.note}</div>}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
              Previous
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
              Next
            </button>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 16 }}>
            {form.uuid ? 'Edit Score' : 'Create Score'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <select className="input-field" value={form.subject_uuid} onChange={e => setForm(prev => ({ ...prev, subject_uuid: e.target.value }))}>
              <option value="">Select subject</option>
              {subjects.map(subject => <option key={subject.uuid} value={subject.uuid}>{subject.name}</option>)}
            </select>
            <input className="input-field" placeholder="Exam name" value={form.exam_name} onChange={e => setForm(prev => ({ ...prev, exam_name: e.target.value }))} />
            <input className="input-field" type="date" value={form.exam_date} onChange={e => setForm(prev => ({ ...prev, exam_date: e.target.value }))} />
            <input className="input-field" placeholder="Score" value={form.score} onChange={e => setForm(prev => ({ ...prev, score: e.target.value }))} />
            <input className="input-field" placeholder="Full score" value={form.full_score} onChange={e => setForm(prev => ({ ...prev, full_score: e.target.value }))} />
          </div>
          <textarea className="input-field" rows={5} placeholder="Note" value={form.note} onChange={e => setForm(prev => ({ ...prev, note: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }} />
          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving…' : form.uuid ? 'Update Score' : 'Create Score'}
            </button>
            {form.uuid && <button className="btn-secondary" onClick={resetForm}>Cancel Edit</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
