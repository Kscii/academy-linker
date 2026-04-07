// ============================================================
// Teacher AnnouncementsScreen — create announcements for students
// Left: class/student selector. Right: compose form.
// ============================================================

import { useState, useEffect } from 'react';
import { teacher as teacherApi } from '@/lib/api';
import type { TeacherStudentListItem, TeacherClass, AnnouncementCategory, CreateAnnouncementRequest } from '@/types/api';

const CATEGORIES: AnnouncementCategory[] = ['announcement', 'task'];

const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  announcement: 'Announcement',
  task:         'Task',
};

// ── TeacherAnnouncementsScreen ────────────────────────────────

export function TeacherPostsScreen() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [allStudents, setAllStudents] = useState<TeacherStudentListItem[]>([]);

  useEffect(() => {
    teacherApi.getClasses().then(res => setClasses(res.data)).catch(() => {});
    teacherApi.getStudents().then(res => setAllStudents(res.data)).catch(() => {});
  }, []);

  // Target: 'class:<uuid>' | 'student:<uuid>'
  const [target, setTarget] = useState<string>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('announcement');
  const [isImportant, setIsImportant] = useState(false);
  const [dueAt, setDueAt] = useState('');

  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const targetStudents: TeacherStudentListItem[] = (() => {
    if (!target) return [];
    if (target.startsWith('class:')) {
      const classUuid = target.slice(6);
      return allStudents.filter(s => s.class_uuid === classUuid);
    }
    if (target.startsWith('student:')) {
      const studentUuid = target.slice(8);
      const s = allStudents.find(s => s.uuid === studentUuid);
      return s ? [s] : [];
    }
    return [];
  })();

  const handlePublish = async () => {
    if (!title.trim() || !content.trim() || !target || publishing) return;
    setPublishing(true);
    setSuccessMsg('');
    setErrorMsg('');

    const body: CreateAnnouncementRequest = {
      category,
      title: title.trim(),
      content_markdown: content.trim(),
      original_language: 'en',
      is_important: isImportant,
      due_at: dueAt || null,
    };

    let done = 0;
    let failed = 0;
    setProgress(`Sending 0 / ${targetStudents.length}…`);

    await Promise.allSettled(
      targetStudents.map(async (student) => {
        try {
          await teacherApi.createAnnouncement(student.uuid, body);
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
      setSuccessMsg(`Sent to ${done} student${done !== 1 ? 's' : ''}.`);
      setTitle('');
      setContent('');
      setDueAt('');
      setIsImportant(false);
    } else {
      setErrorMsg(`${done} sent, ${failed} failed. Check your connection and try again.`);
    }
  };

  const selectedClass = target.startsWith('class:')
    ? classes.find(c => c.uuid === target.slice(6)) ?? null
    : null;
  const selectedStudent = target.startsWith('student:')
    ? allStudents.find(s => s.uuid === target.slice(8)) ?? null
    : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)' }}>Announcements</div>
        <div style={{ fontSize: 13, color: 'var(--tx3)', marginTop: 4 }}>
          Send an announcement to a class or individual student
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden', minHeight: 500 }}>

        {/* Sidebar — class & student selector */}
        <div style={{ background: 'var(--card)', borderRight: '1px solid var(--bd)', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd)' }}>
            Recipients
          </div>

          {classes.map(cls => {
            const classTarget = `class:${cls.uuid}`;
            const isActive = target === classTarget;
            const studentsInClass = allStudents.filter(s => s.class_uuid === cls.uuid);
            return (
              <div key={cls.uuid}>
                {/* Class row */}
                <div
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--bd)', borderLeft: isActive ? '3px solid var(--a1)' : '3px solid transparent', background: isActive ? 'var(--a1)10' : undefined, transition: 'background 0.12s' }}
                  onClick={() => setTarget(classTarget)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--a1)', flexShrink: 0 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.name}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', paddingLeft: 14 }}>
                    All {cls.student_count} students
                  </div>
                </div>

                {/* Individual students */}
                {studentsInClass.map(student => {
                  const studentTarget = `student:${student.uuid}`;
                  const isStudentActive = target === studentTarget;
                  return (
                    <div
                      key={student.uuid}
                      style={{ padding: '8px 16px 8px 28px', cursor: 'pointer', borderBottom: '1px solid var(--bd)', borderLeft: isStudentActive ? '3px solid var(--a2)' : '3px solid transparent', background: isStudentActive ? 'var(--a2)10' : undefined, transition: 'background 0.12s' }}
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

        {/* Compose panel */}
        <div style={{ background: 'var(--bg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {!target && (
            <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '60px 0' }}>
              Select a class or student to send an announcement.
            </div>
          )}

          {target && (
            <>
              {/* Recipient info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--tx3)' }}>To:</span>
                <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'var(--a1)15', color: 'var(--a1)' }}>
                  {selectedClass
                    ? `${selectedClass.name} — all ${targetStudents.length} students`
                    : selectedStudent?.full_name}
                </span>
              </div>

              {/* Category + important */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className="chip"
                    style={{ fontSize: 12, background: category === cat ? 'var(--a4)' : undefined, color: category === cat ? '#fff' : undefined }}
                    onClick={() => setCategory(cat)}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx2)', cursor: 'pointer', marginLeft: 8 }}>
                  <input
                    type="checkbox"
                    checked={isImportant}
                    onChange={e => setIsImportant(e.target.checked)}
                    style={{ width: 14, height: 14 }}
                  />
                  Important
                </label>
              </div>

              {/* Title */}
              <input
                className="input-field"
                placeholder="Announcement title…"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ fontSize: 13, padding: '9px 12px' }}
              />

              {/* Content */}
              <textarea
                className="input-field"
                placeholder="Write your announcement…"
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={7}
                style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.65 }}
              />

              {/* Due date (optional) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--tx3)', flexShrink: 0 }}>Due date (optional):</span>
                <input
                  type="date"
                  className="input-field"
                  value={dueAt}
                  onChange={e => setDueAt(e.target.value)}
                  style={{ fontSize: 13, padding: '7px 10px', width: 'auto' }}
                />
              </div>

              {/* Feedback */}
              {progress && <div style={{ fontSize: 12, color: 'var(--a4)', fontWeight: 700 }}>✦ {progress}</div>}
              {successMsg && <div style={{ fontSize: 13, color: 'var(--ok)', fontWeight: 600 }}>✓ {successMsg}</div>}
              {errorMsg && <div style={{ fontSize: 12, color: 'var(--warn)' }}>{errorMsg}</div>}

              {/* Submit */}
              <div>
                <button
                  className="btn-primary"
                  style={{ width: 'auto', padding: '10px 28px', fontSize: 13, opacity: (!title.trim() || !content.trim() || publishing) ? 0.45 : 1 }}
                  onClick={handlePublish}
                  disabled={!title.trim() || !content.trim() || publishing}
                >
                  {publishing ? 'Sending…' : `Send to ${targetStudents.length} student${targetStudents.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
