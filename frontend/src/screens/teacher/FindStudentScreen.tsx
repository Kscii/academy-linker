// ============================================================
// FindStudentScreen — search and filter teacher students
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { PaginationMeta, TeacherClass, TeacherStudentListItem } from '@/types/api';

const EMPTY_META: PaginationMeta = {
  page: 1,
  page_size: 20,
  total: 0,
  total_pages: 1,
};

export function FindStudentScreen() {
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState('');
  const [selectedClassUuid, setSelectedClassUuid] = useState('');
  const [sort, setSort] = useState<'full_name_asc' | 'full_name_desc' | 'sid_asc' | 'sid_desc' | 'score_desc' | 'score_asc' | 'last_activity_at_desc'>('full_name_asc');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<TeacherStudentListItem[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(EMPTY_META);
  const [loading, setLoading] = useState(false);

  const loadStudents = async (keyword = query) => {
    setLoading(true);
    try {
      const [studentsRes, classesRes] = await Promise.all([
        teacherApi.getStudents({
          page,
          page_size: 20,
          keyword: keyword.trim() || undefined,
          class_uuid: selectedClassUuid || undefined,
          sort,
        }),
        teacherApi.getClasses(),
      ]);
      setResults(studentsRes.data);
      setMeta(studentsRes.meta);
      setClasses(classesRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, selectedClassUuid]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      void loadStudents(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function initials(name: string) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          Find Student
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Search across all your assigned students
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.5fr) repeat(3, minmax(140px, 1fr))', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--tx3)' }}>
              🔍
            </span>
            <input
              className="input-field"
              style={{ paddingLeft: 40, fontSize: 15 }}
              placeholder="Search by name or SID…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <select className="input-field" value={selectedClassUuid} onChange={e => setSelectedClassUuid(e.target.value)}>
            <option value="">All classes</option>
            {classes.map(item => <option key={item.uuid} value={item.uuid}>{item.name}</option>)}
          </select>
          <select className="input-field" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
            <option value="full_name_asc">Name A-Z</option>
            <option value="full_name_desc">Name Z-A</option>
            <option value="sid_asc">SID A-Z</option>
            <option value="sid_desc">SID Z-A</option>
            <option value="score_desc">Score High-Low</option>
            <option value="score_asc">Score Low-High</option>
            <option value="last_activity_at_desc">Latest Activity</option>
          </select>
          <div className="input-field" style={{ display: 'flex', alignItems: 'center' }}>
            Page {meta.page} / {Math.max(meta.total_pages, 1)}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 14, fontWeight: 700 }}>
        {loading ? 'Searching…' : `${meta.total} ${meta.total === 1 ? 'student' : 'students'} found`}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {results.map(item => (
          <div
            key={item.uuid}
            className="card-sm"
            style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
            onClick={() => navigate(`/teacher/students/${item.uuid}`)}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--a1)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="avatar avatar-lg" style={{ background: 'var(--a1)18', color: 'var(--a1)', fontWeight: 700 }}>
                {initials(item.full_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>
                  {item.full_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                  {item.sid ?? 'No SID'} · {item.grade_level ?? '—'} · {item.class_name ?? '—'}
                </div>
                {item.preferred_name && (
                  <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>
                    Preferred name: {item.preferred_name}
                  </div>
                )}
                {item.score != null && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${item.score}%`, background: 'var(--a1)' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--a1)', width: 36 }}>
                      {item.score}%
                    </span>
                  </div>
                )}
                {item.last_activity_at && (
                  <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 4 }}>
                    Last activity: {new Date(item.last_activity_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--tx3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>No students found</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Try a different name, SID, or class filter</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page <= 1} onClick={() => setPage(prev => prev - 1)}>
          Previous
        </button>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} disabled={page >= meta.total_pages} onClick={() => setPage(prev => prev + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
