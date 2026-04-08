// ============================================================
// Teacher PostsScreen — class-level personalized posts
// Each published post gets an AI-generated version per student.
// Left: class selector. Right: post feed with per-student versions.
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { mockTeacherStudents, mockTeacherClasses, SUBJECT_COLORS } from '@/lib/mock-data';
import { apiFetch, translateBatch } from '@/lib/translate';
import { useApp } from '@/contexts/AppContext';
import type { PersonalizedPost, PostReply } from '@/types/api';
import type { TeacherStudentItem, TeacherClass } from '@/types/api';

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600_000);
  const d = Math.floor(diff / 86400_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

/** Return the students that belong to a given target class (or all). */
function getStudentsForTarget(target: 'all' | string): TeacherStudentItem[] {
  if (target === 'all') return mockTeacherStudents;
  const cls = mockTeacherClasses.find(c => c.uuid === target);
  if (!cls) return mockTeacherStudents;
  const classId = cls.name.match(/^(\d+[A-Z])/)?.[1];
  if (!classId) return mockTeacherStudents;
  return mockTeacherStudents.filter(s => s.student.class_name === classId);
}

// ── AI: personalise content for ONE student ───────────────────

async function personaliseForStudent(
  title: string,
  content: string,
  student: TeacherStudentItem,
  language: string,
): Promise<string> {
  const subjectList = student.subjects.map(s => `${s.name} (${s.score}%)`).join(', ');
  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: `Post title: "${title}"\n\nDraft:\n${content}` }],
      context: {
        student_uuid: student.student.uuid,
        ui_language: language,
        system_override:
          `You are a teacher assistant writing personalized class announcements to individual parents.\n` +
          `Student: ${student.student.display_name}, ${student.student.grade} ${student.student.class_name}, ` +
          `overall ${student.overall_score}%${student.at_risk ? ', at risk' : ''}.\n` +
          `Subjects: ${subjectList}.\n` +
          `Rewrite the draft to be specifically relevant to this student. ` +
          `Address the parent directly. Professional, warm, under 100 words. ` +
          `Reply in ${language === 'en' ? 'English' : language}.`,
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data.reply as string;
}

// ── PostsScreen ───────────────────────────────────────────────

export function TeacherPostsScreen() {
  const { language, classPosts, addClassPost, addPostReply, readPostReplies, markPostReplyRead } = useApp();

  const [selected, setSelected] = useState<'all' | string>('all');
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null); // postUuid:studentUuid
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // New post form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTarget, setNewTarget] = useState<'all' | string>('all');
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState('');
  const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
  const [aiPreviewError, setAiPreviewError] = useState('');

  // Collapse expanded post when class changes
  useEffect(() => { setExpandedPost(null); setExpandedStudent(null); }, [selected]);

  // Visible posts for selected class — stable reference so translation effect doesn't loop
  const visiblePosts = useMemo(
    () => classPosts.filter(p => selected === 'all' || p.target === selected || p.target === 'all'),
    [classPosts, selected],
  );

  // Translated copy of visible posts
  const [txPosts, setTxPosts] = useState<PersonalizedPost[]>(visiblePosts);

  useEffect(() => {
    if (language === 'en') { setTxPosts(visiblePosts); return; }
    if (visiblePosts.length === 0) { setTxPosts([]); return; }

    let cancelled = false;

    // Pre-compute ordered entries so we can reconstruct after translation
    const metas = visiblePosts.map(p => ({
      versionEntries: Object.entries(p.versions),
      replyEntries: Object.entries(p.replies).flatMap(([sid, replies]) =>
        replies.map(r => [sid, r] as [string, PostReply]),
      ),
    }));

    const texts = visiblePosts.flatMap((p, i) => {
      const m = metas[i];
      return [
        p.title,
        p.original_content,
        ...m.versionEntries.map(([, c]) => c),
        ...m.replyEntries.map(([, r]) => r.text),
      ];
    });

    translateBatch(texts, language).then(results => {
      if (cancelled) return;
      let cursor = 0;
      setTxPosts(visiblePosts.map((p, i) => {
        const m = metas[i];
        const txTitle    = results[cursor++] || p.title;
        const txOriginal = results[cursor++] || p.original_content;
        const txVersions: Record<string, string> = {};
        for (const [sid] of m.versionEntries) {
          txVersions[sid] = results[cursor++] || p.versions[sid];
        }
        const txRepliesMap: Record<string, PostReply[]> = {};
        for (const [sid, reply] of m.replyEntries) {
          if (!txRepliesMap[sid]) txRepliesMap[sid] = [];
          txRepliesMap[sid].push({ ...reply, text: results[cursor++] || reply.text });
        }
        return { ...p, title: txTitle, original_content: txOriginal, versions: txVersions, replies: txRepliesMap };
      }));
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePosts, language]);

  const selectedClass: TeacherClass | null =
    mockTeacherClasses.find(c => c.uuid === selected) ?? null;

  // ── Preview: AI-personalise a single draft example ───────────

  const handlePreview = async () => {
    if (!newContent.trim()) return;
    setAiPreviewLoading(true);
    setAiPreviewError('');
    try {
      // Preview uses the first student of the target class as representative
      const students = getStudentsForTarget(newTarget);
      const sample = students[0];
      if (!sample) return;
      const result = await personaliseForStudent(newTitle, newContent, sample, language);
      setNewContent(result);
    } catch {
      setAiPreviewError('AI unavailable — check backend.');
    } finally {
      setAiPreviewLoading(false);
    }
  };

  // ── Publish: generate personalized version per student ───────

  const handlePublish = async () => {
    if (!newContent.trim() || publishing) return;
    setPublishing(true);

    const students = getStudentsForTarget(newTarget);
    const targetClass = mockTeacherClasses.find(c => c.uuid === newTarget) ?? null;
    const targetLabel = newTarget === 'all' ? 'All Classes' : (targetClass?.name ?? newTarget);

    const versions: Record<string, string> = {};
    let done = 0;
    setPublishProgress(`Generating 0 / ${students.length}…`);

    await Promise.allSettled(
      students.map(async (student) => {
        try {
          const personalized = await personaliseForStudent(newTitle, newContent, student, language);
          versions[student.student.uuid] = personalized;
        } catch {
          // fallback: use original content
          versions[student.student.uuid] = newContent;
        }
        done++;
        setPublishProgress(`Generating ${done} / ${students.length}…`);
      })
    );

    const post: PersonalizedPost = {
      uuid: `cp-${Date.now()}`,
      title: newTitle || 'Update',
      original_content: newContent,
      target: newTarget,
      target_label: targetLabel,
      subject_name: targetClass?.subject.name,
      subject_color: targetClass?.subject.color ?? SUBJECT_COLORS.english,
      created_at: new Date().toISOString(),
      versions,
      replies: {},
    };

    addClassPost(post);
    setNewTitle('');
    setNewContent('');
    setNewTarget('all');
    setShowForm(false);
    setPublishing(false);
    setPublishProgress('');
  };

  // ── Reply ─────────────────────────────────────────────────────

  const handleReply = (postUuid: string, studentUuid: string) => {
    const key = `${postUuid}:${studentUuid}`;
    const text = (replyDrafts[key] ?? '').trim();
    if (!text) return;
    const reply: PostReply = {
      uuid: `pr-${Date.now()}`,
      author_name: 'Ms. Thompson',
      role: 'teacher',
      text,
      sent_at: new Date().toISOString(),
    };
    addPostReply(postUuid, studentUuid, reply);
    setReplyDrafts(prev => ({ ...prev, [key]: '' }));
    // Immediately show in current language (translation effect will update on next language change)
    setTxPosts(prev => prev.map(p =>
      p.uuid !== postUuid ? p : {
        ...p,
        replies: { ...p.replies, [studentUuid]: [...(p.replies[studentUuid] ?? []), reply] },
      }
    ));
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)' }}>Class Posts</div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '8px 20px', fontSize: 13 }}
          onClick={() => setShowForm(s => !s)}
        >
          {showForm ? '✕ Cancel' : '+ New Post'}
        </button>
      </div>

      {/* New post form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Target selector */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>Send to:</span>
            <button
              className="chip"
              style={{ fontSize: 12, background: newTarget === 'all' ? 'var(--a1)' : undefined, color: newTarget === 'all' ? '#fff' : undefined }}
              onClick={() => setNewTarget('all')}
            >
              All Classes
            </button>
            {mockTeacherClasses.map(cls => (
              <button
                key={cls.uuid}
                className="chip"
                style={{
                  fontSize: 12,
                  background: newTarget === cls.uuid ? cls.subject.color : cls.subject.color + '18',
                  color: newTarget === cls.uuid ? '#fff' : cls.subject.color,
                }}
                onClick={() => setNewTarget(cls.uuid)}
              >
                {cls.name}
              </button>
            ))}
          </div>

          {/* Student count hint */}
          <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
            Will generate personalized versions for{' '}
            <strong>{getStudentsForTarget(newTarget).length} students</strong>
            {newTarget !== 'all' && selectedClass && (
              <> in {mockTeacherClasses.find(c => c.uuid === newTarget)?.name}</>
            )}
          </div>

          <input
            className="input-field"
            placeholder="Post title…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{ fontSize: 13, padding: '9px 12px' }}
          />

          <textarea
            className="input-field"
            placeholder="Write your draft post — AI will personalize it for each student on publish…"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={5}
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.65 }}
          />

          {aiPreviewError && <div style={{ fontSize: 12, color: 'var(--warn)' }}>{aiPreviewError}</div>}
          {publishProgress && (
            <div style={{ fontSize: 12, color: 'var(--a4)', fontWeight: 700 }}>✦ {publishProgress}</div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              className="chip"
              style={{ fontSize: 12, flex: 1, opacity: (aiPreviewLoading || !newContent.trim()) ? 0.55 : 1 }}
              onClick={handlePreview}
              disabled={aiPreviewLoading || !newContent.trim()}
              title="Preview how AI personalizes this for one student"
            >
              {aiPreviewLoading ? '✦ Previewing…' : '✦ AI Preview (first student)'}
            </button>
            <button
              className="btn-primary"
              style={{ width: 'auto', padding: '9px 22px', fontSize: 13, opacity: (!newContent.trim() || publishing) ? 0.45 : 1 }}
              onClick={handlePublish}
              disabled={!newContent.trim() || publishing}
            >
              {publishing ? 'Publishing…' : 'Publish to All'}
            </button>
          </div>
        </div>
      )}

      {/* Split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden', minHeight: 500 }}>

        {/* Class sidebar */}
        <div style={{ background: 'var(--card)', borderRight: '1px solid var(--bd)', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--bd)' }}>
            Classes
          </div>

          {/* All */}
          <div
            style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--bd)', borderLeft: selected === 'all' ? '3px solid var(--a1)' : '3px solid transparent', background: selected === 'all' ? 'rgba(232,97,78,0.07)' : undefined, transition: 'background 0.12s' }}
            onClick={() => setSelected('all')}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>All Classes</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{classPosts.length} posts</div>
          </div>

          {mockTeacherClasses.map(cls => {
            const count = classPosts.filter(p => p.target === cls.uuid || p.target === 'all').length;
            const hasParentReply = classPosts
              .filter(p => p.target === cls.uuid || p.target === 'all')
              .some(p => Object.values(p.replies).flat().some(r => r.role === 'parent'));
            const isActive = selected === cls.uuid;
            return (
              <div
                key={cls.uuid}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--bd)', borderLeft: isActive ? `3px solid ${cls.subject.color}` : '3px solid transparent', background: isActive ? cls.subject.color + '10' : undefined, transition: 'background 0.12s' }}
                onClick={() => setSelected(cls.uuid)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cls.subject.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</div>
                  {hasParentReply && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--a1)', flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx3)', paddingLeft: 14 }}>
                  {cls.student_count} students · {count} post{count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Post feed */}
        <div style={{ background: 'var(--bg)', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {selectedClass && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="subject-chip" style={{ background: selectedClass.subject.color + '18', color: selectedClass.subject.color, fontSize: 12 }}>
                {selectedClass.name}
              </span>
              <span style={{ fontSize: 12, color: 'var(--tx3)' }}>
                {selectedClass.student_count} students · avg {selectedClass.avg_score}% · {selectedClass.at_risk_count} at-risk
              </span>
            </div>
          )}

          {txPosts.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--tx3)', fontSize: 13, padding: '60px 0' }}>
              No posts yet.{' '}
              <span style={{ cursor: 'pointer', color: 'var(--a1)', fontWeight: 600 }} onClick={() => setShowForm(true)}>
                Publish the first one.
              </span>
            </div>
          )}

          {txPosts.map(post => {
            const isOpen = expandedPost === post.uuid;
            const studentVersions = Object.entries(post.versions);
            const totalReplies = Object.values(post.replies).flat().length;

            return (
              <div key={post.uuid} style={{ background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Post header */}
                <div
                  style={{ padding: '14px 18px', cursor: 'pointer' }}
                  onClick={() => { setExpandedPost(isOpen ? null : post.uuid); setExpandedStudent(null); }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>{post.title}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: (post.subject_color ?? SUBJECT_COLORS.english) + '18', color: post.subject_color ?? SUBJECT_COLORS.english }}>
                          {post.target_label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{timeAgo(post.created_at)}</span>
                        <span style={{ fontSize: 11, color: 'var(--tx3)' }}>
                          {studentVersions.length} personalized version{studentVersions.length !== 1 ? 's' : ''}
                        </span>
                        {totalReplies > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}</span>
                        )}
                        {/* Red dot: any student thread with unread parent reply */}
                        {Object.entries(post.replies).some(([sUuid, replies]) =>
                          replies.some(r => r.role === 'parent') && !readPostReplies.has(`${post.uuid}:${sUuid}`)
                        ) && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--a1)', display: 'inline-block' }} />
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--tx3)', flexShrink: 0 }}>{isOpen ? '▴' : '▾'}</span>
                  </div>

                  {!isOpen && (
                    <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 8, lineHeight: 1.55 }}>
                      {post.original_content.slice(0, 110)}…
                    </div>
                  )}
                </div>

                {/* Expanded: per-student personalized versions */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--bd)' }}>
                    {/* Original draft (collapsed label) */}
                    <div style={{ padding: '8px 18px', background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 700 }}>ORIGINAL DRAFT</span>
                      <span style={{ fontSize: 11, color: 'var(--tx3)', flex: 1 }}>— {post.original_content.slice(0, 60)}…</span>
                    </div>

                    {/* Per-student versions */}
                    {studentVersions.length === 0 && (
                      <div style={{ padding: '20px 18px', fontSize: 12, color: 'var(--tx3)' }}>No personalized versions generated.</div>
                    )}

                    {studentVersions.map(([studentUuid, content]) => {
                      const student = mockTeacherStudents.find(s => s.student.uuid === studentUuid);
                      if (!student) return null;
                      const studentKey = `${post.uuid}:${studentUuid}`;
                      const isStudentOpen = expandedStudent === studentKey;
                      const studentReplies = post.replies[studentUuid] ?? [];
                      const studentName = student.student.display_name;
                      const hasUnreadReply = studentReplies.some(r => r.role === 'parent')
                        && !readPostReplies.has(`${post.uuid}:${studentUuid}`);

                      return (
                        <div key={studentUuid} style={{ borderBottom: '1px solid var(--bd)' }}>
                          {/* Student row header */}
                          <div
                            style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: isStudentOpen ? 'var(--bg2)' : undefined, transition: 'background 0.12s' }}
                            onClick={() => {
                              setExpandedStudent(isStudentOpen ? null : studentKey);
                              if (!isStudentOpen) markPostReplyRead(post.uuid, studentUuid);
                            }}
                          >
                            <div
                              className="avatar"
                              style={{ width: 28, height: 28, fontSize: 10, background: SUBJECT_COLORS.english + '20', color: SUBJECT_COLORS.english, flexShrink: 0 }}
                            >
                              {studentName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{studentName}</span>
                                {student.at_risk && <span className="badge badge-warn" style={{ fontSize: 9 }}>At Risk</span>}
                                {hasUnreadReply && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--a1)', display: 'inline-block' }} />}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                                {student.overall_score}% overall · {studentReplies.length} {studentReplies.length === 1 ? 'reply' : 'replies'}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{isStudentOpen ? '▴' : '▾'}</span>
                          </div>

                          {/* Personalized content + Reddit-style comments */}
                          {isStudentOpen && (
                            <div style={{ borderTop: '1px solid var(--bd)' }}>
                              {/* Personalized content */}
                              <div style={{ padding: '12px 18px 14px', fontSize: 13, color: 'var(--tx)', lineHeight: 1.7, background: SUBJECT_COLORS.english + '05' }}>
                                {content}
                              </div>

                              {/* Comments section */}
                              <div style={{ borderTop: '2px solid var(--bd)', padding: '0 18px' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '10px 0 8px' }}>
                                  {studentReplies.length} Comment{studentReplies.length !== 1 ? 's' : ''}
                                </div>

                                {studentReplies.map(reply => {
                                  const isTeacher = reply.role === 'teacher';
                                  const ini = reply.author_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                                  const ac = SUBJECT_COLORS.english;
                                  return (
                                    <div key={reply.uuid} style={{ display: 'flex', gap: 12, paddingBottom: 14 }}>
                                      <div style={{
                                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                        background: isTeacher ? ac + '20' : 'var(--a2)20',
                                        color: isTeacher ? ac : 'var(--a2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700, marginTop: 1,
                                      }}>
                                        {ini}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{reply.author_name}</span>
                                          {isTeacher && (
                                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: ac + '18', color: ac }}>Teacher</span>
                                          )}
                                          <span style={{ fontSize: 11, color: 'var(--tx3)' }}>· {timeAgo(reply.sent_at)}</span>
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--tx)', lineHeight: 1.65 }}>{reply.text}</div>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Add comment */}
                                <div style={{ display: 'flex', gap: 12, paddingBottom: 14 }}>
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: SUBJECT_COLORS.english + '20', color: SUBJECT_COLORS.english, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                                    MT
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <textarea
                                      className="input-field"
                                      placeholder={`Comment on ${studentName}'s thread…`}
                                      value={replyDrafts[studentKey] ?? ''}
                                      onChange={e => setReplyDrafts(prev => ({ ...prev, [studentKey]: e.target.value }))}
                                      rows={2}
                                      style={{ resize: 'none', fontFamily: 'var(--font-body)', fontSize: 12, borderRadius: 8, minHeight: 52 }}
                                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(post.uuid, studentUuid); } }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, gap: 8 }}>
                                      <button
                                        className="btn-primary"
                                        style={{ width: 'auto', padding: '6px 18px', fontSize: 12, borderRadius: 20, opacity: !(replyDrafts[studentKey] ?? '').trim() ? 0.4 : 1 }}
                                        onClick={() => handleReply(post.uuid, studentUuid)}
                                        disabled={!(replyDrafts[studentKey] ?? '').trim()}
                                      >
                                        Comment
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
