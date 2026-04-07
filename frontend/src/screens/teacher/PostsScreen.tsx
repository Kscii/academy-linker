// ============================================================
// Teacher PostsScreen — compose announcements and reports
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { AnnouncementCategory, AnnouncementDetail, CreateAnnouncementRequest, CreateReportRequest, ReportType, TeacherClass, TeacherStudentListItem } from '@/types/api';

type ComposeMode = 'announcement' | 'report';

const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = ['announcement', 'task'];
const REPORT_TYPES: ReportType[] = ['weekly', 'monthly', 'custom'];

export function TeacherPostsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'report' ? 'report' : 'announcement';
  const initialStudentUuid = searchParams.get('student') ?? '';
  const [mode, setMode] = useState<ComposeMode>(initialMode);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [allStudents, setAllStudents] = useState<TeacherStudentListItem[]>([]);
  const [target, setTarget] = useState<string>(initialStudentUuid ? `student:${initialStudentUuid}` : '');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectUuid, setSubjectUuid] = useState('');
  const [originalLanguage, setOriginalLanguage] = useState('en-AU');

  const [category, setCategory] = useState<AnnouncementCategory>('announcement');
  const [isImportant, setIsImportant] = useState(false);
  const [publishedAt, setPublishedAt] = useState('');
  const [dueAt, setDueAt] = useState('');

  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [announcements, setAnnouncements] = useState<AnnouncementDetail[]>([]);
  const [editingAnnouncementUuid, setEditingAnnouncementUuid] = useState('');

  useEffect(() => {
    Promise.all([
      teacherApi.getClasses(),
      teacherApi.getStudents({ page: 1, page_size: 100 }),
    ]).then(([classesRes, studentsRes]) => {
      setClasses(classesRes.data);
      setAllStudents(studentsRes.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('mode', mode);
    if (target.startsWith('student:')) {
      next.set('student', target.slice(8));
    }
    setSearchParams(next, { replace: true });
  }, [mode, setSearchParams, target]);

  const targetStudents: TeacherStudentListItem[] = useMemo(() => {
    if (!target) return [];
    if (target.startsWith('class:')) {
      const classUuid = target.slice(6);
      return allStudents.filter(student => student.class_uuid === classUuid);
    }
    if (target.startsWith('student:')) {
      const studentUuid = target.slice(8);
      const student = allStudents.find(item => item.uuid === studentUuid);
      return student ? [student] : [];
    }
    return [];
  }, [allStudents, target]);

  const selectedClass = target.startsWith('class:') ? classes.find(item => item.uuid === target.slice(6)) ?? null : null;
  const selectedStudent = target.startsWith('student:') ? allStudents.find(item => item.uuid === target.slice(8)) ?? null : null;

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSubjectUuid('');
    setPublishedAt('');
    setDueAt('');
    setIsImportant(false);
    setReportType('weekly');
    setPeriodStart('');
    setPeriodEnd('');
    setEditingAnnouncementUuid('');
  };

  const openAnnouncementEdit = (announcement: AnnouncementDetail) => {
    setMode('announcement');
    setTarget(`student:${selectedStudent?.uuid ?? ''}`);
    setEditingAnnouncementUuid(announcement.uuid);
    setTitle(announcement.title);
    setContent(announcement.original_content_markdown);
    setSubjectUuid(announcement.subject?.uuid ?? '');
    setOriginalLanguage(announcement.original_language);
    setCategory(announcement.category);
    setPublishedAt(announcement.published_at ? announcement.published_at.slice(0, 16) : '');
    setDueAt(announcement.due_at ? announcement.due_at.slice(0, 16) : '');
    setIsImportant(announcement.is_important);
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim() || !target || publishing) return;
    if (mode === 'report' && (!!periodStart !== !!periodEnd)) {
      setErrorMsg('Report period start and end must be provided together.');
      return;
    }

    setPublishing(true);
    setProgress('');
    setSuccessMsg('');
    setErrorMsg('');

    let done = 0;
    let failed = 0;
    setProgress(`Sending 0 / ${targetStudents.length}…`);

    const createdAnnouncements: AnnouncementDetail[] = [];

    await Promise.allSettled(
      targetStudents.map(async (student) => {
        try {
          if (mode === 'announcement') {
            if (editingAnnouncementUuid) {
              const res = await teacherApi.updateAnnouncement(editingAnnouncementUuid, {
                category,
                title: title.trim(),
                subject_uuid: subjectUuid.trim() || null,
                content_markdown: content.trim(),
                original_language: originalLanguage,
                published_at: publishedAt || null,
                due_at: dueAt || null,
                is_important: isImportant,
              });
              createdAnnouncements.push(res.data);
            } else {
              const body: CreateAnnouncementRequest = {
                category,
                title: title.trim(),
                subject_uuid: subjectUuid.trim() || null,
                content_markdown: content.trim(),
                original_language: originalLanguage,
                published_at: publishedAt || null,
                due_at: dueAt || null,
                is_important: isImportant,
              };
              const res = await teacherApi.createAnnouncement(student.uuid, body);
              createdAnnouncements.push(res.data);
            }
          } else {
            const body: CreateReportRequest = {
              title: title.trim(),
              report_type: reportType,
              subject_uuid: subjectUuid.trim() || null,
              period_start: periodStart || null,
              period_end: periodEnd || null,
              content_markdown: content.trim(),
              original_language: originalLanguage,
            };
            await teacherApi.createReport(student.uuid, body);
          }
          done++;
        } catch {
          failed++;
        }
        setProgress(`Sending ${done + failed} / ${targetStudents.length}…`);
      })
    );

    setPublishing(false);
    setProgress('');
    if (failed === 0) {
      setSuccessMsg(`${mode === 'announcement' ? 'Announcement' : 'Report'} sent to ${done} student${done !== 1 ? 's' : ''}.`);
      if (createdAnnouncements.length > 0) {
        setAnnouncements(prev => [...createdAnnouncements, ...prev.filter(item => !createdAnnouncements.some(created => created.uuid === item.uuid))]);
      }
      resetForm();
    } else {
      setErrorMsg(`${done} sent, ${failed} failed. Check your data and try again.`);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)' }}>Teacher Composer</div>
        <div style={{ fontSize: 13, color: 'var(--tx3)', marginTop: 4 }}>
          Create announcements, tasks, and reports using the teacher API contract
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="chip" style={{ background: mode === 'announcement' ? 'var(--a4)' : undefined, color: mode === 'announcement' ? '#fff' : undefined }} onClick={() => setMode('announcement')}>
          Announcement / Task
        </button>
        <button className="chip" style={{ background: mode === 'report' ? 'var(--a1)' : undefined, color: mode === 'report' ? '#fff' : undefined }} onClick={() => setMode('report')}>
          Report
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 340px', gap: 0, border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden', minHeight: 560 }}>
        <div style={{ background: 'var(--card)', borderRight: '1px solid var(--bd)', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd)' }}>
            Recipients
          </div>

          {classes.map(cls => {
            const classTarget = `class:${cls.uuid}`;
            const isActive = target === classTarget;
            const studentsInClass = allStudents.filter(student => student.class_uuid === cls.uuid);
            return (
              <div key={cls.uuid}>
                <div
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--bd)', borderLeft: isActive ? '3px solid var(--a1)' : '3px solid transparent', background: isActive ? 'var(--a1)10' : undefined }}
                  onClick={() => setTarget(classTarget)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--a1)', flexShrink: 0 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.name}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', paddingLeft: 14 }}>
                    All {studentsInClass.length} students
                  </div>
                </div>

                {studentsInClass.map(student => {
                  const studentTarget = `student:${student.uuid}`;
                  const isStudentActive = target === studentTarget;
                  return (
                    <div
                      key={student.uuid}
                      style={{ padding: '8px 16px 8px 28px', cursor: 'pointer', borderBottom: '1px solid var(--bd)', borderLeft: isStudentActive ? '3px solid var(--a2)' : '3px solid transparent', background: isStudentActive ? 'var(--a2)10' : undefined }}
                      onClick={() => setTarget(studentTarget)}
                    >
                      <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: isStudentActive ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.full_name}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ background: 'var(--bg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!target && (
            <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '60px 0' }}>
              Select a class or student to compose content.
            </div>
          )}

          {target && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--tx3)' }}>To:</span>
                <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'var(--a1)15', color: 'var(--a1)' }}>
                  {selectedClass ? `${selectedClass.name} — all ${targetStudents.length} students` : selectedStudent?.full_name}
                </span>
              </div>

              {mode === 'announcement' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {ANNOUNCEMENT_CATEGORIES.map(item => (
                    <button key={item} className="chip" style={{ fontSize: 12, background: category === item ? 'var(--a4)' : undefined, color: category === item ? '#fff' : undefined }} onClick={() => setCategory(item)}>
                      {item}
                    </button>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx2)', cursor: 'pointer', marginLeft: 8 }}>
                    <input type="checkbox" checked={isImportant} onChange={e => setIsImportant(e.target.checked)} style={{ width: 14, height: 14 }} />
                    Important
                  </label>
                </div>
              )}

              {mode === 'report' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {REPORT_TYPES.map(item => (
                    <button key={item} className="chip" style={{ fontSize: 12, background: reportType === item ? 'var(--a1)' : undefined, color: reportType === item ? '#fff' : undefined }} onClick={() => setReportType(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input-field" placeholder={mode === 'announcement' ? 'Announcement title…' : 'Report title…'} value={title} onChange={e => setTitle(e.target.value)} />
                <input className="input-field" placeholder="Subject UUID (optional)" value={subjectUuid} onChange={e => setSubjectUuid(e.target.value)} />
              </div>

              <textarea
                className="input-field"
                placeholder={mode === 'announcement' ? 'Write your announcement…' : 'Write your report…'}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={8}
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.65 }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <input className="input-field" placeholder="Original language" value={originalLanguage} onChange={e => setOriginalLanguage(e.target.value)} />
                {mode === 'announcement' ? (
                  <input type="datetime-local" className="input-field" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} />
                ) : (
                  <input type="date" className="input-field" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
                )}
                {mode === 'announcement' ? (
                  <input type="datetime-local" className="input-field" value={dueAt} onChange={e => setDueAt(e.target.value)} />
                ) : (
                  <input type="date" className="input-field" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
                )}
              </div>

              {progress && <div style={{ fontSize: 12, color: 'var(--a4)', fontWeight: 700 }}>✦ {progress}</div>}
              {successMsg && <div style={{ fontSize: 13, color: 'var(--ok)', fontWeight: 600 }}>✓ {successMsg}</div>}
              {errorMsg && <div style={{ fontSize: 12, color: 'var(--warn)' }}>{errorMsg}</div>}

              <div>
                <button
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 28px', fontSize: 13, opacity: (!title.trim() || !content.trim() || publishing) ? 0.45 : 1 }}
                  onClick={() => void handlePublish()}
                  disabled={!title.trim() || !content.trim() || publishing}
                >
                  {publishing ? 'Sending…' : editingAnnouncementUuid ? 'Update announcement' : `Send ${mode} to ${targetStudents.length} student${targetStudents.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ background: 'var(--card)', borderLeft: '1px solid var(--bd)', padding: 20, overflowY: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 12 }}>Session Announcements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {announcements.map(announcement => (
              <div key={announcement.uuid} className="card-sm">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{announcement.title}</div>
                  <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => openAnnouncementEdit(announcement)}>
                    Edit
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                  {announcement.category} · {announcement.subject?.name ?? 'All subjects'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6, lineHeight: 1.6 }}>
                  {announcement.display_content_markdown.slice(0, 140)}{announcement.display_content_markdown.length > 140 ? '…' : ''}
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                Announcements created in this session can be reopened here for updates.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
