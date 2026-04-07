// ============================================================
// FindStudentScreen — search input, student result cards
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { TeacherStudentListItem } from '@/types/api';

export function FindStudentScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TeacherStudentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      teacherApi.getStudents({ keyword: query.trim() || undefined })
        .then(res => setResults(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 6 }}>
          Find Student
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          Search across all your students
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 16, color: 'var(--tx3)',
        }}>
          🔍
        </span>
        <input
          className="input-field"
          style={{ paddingLeft: 40, fontSize: 15 }}
          placeholder="Search by name, class, or year level…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 14, fontWeight: 700 }}>
        {loading ? 'Searching…' : `${results.length} ${results.length === 1 ? 'student' : 'students'} found`}
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
                <div
                  className="avatar avatar-lg"
                  style={{ background: 'var(--a1)18', color: 'var(--a1)', fontWeight: 700 }}
                >
                  {initials(item.full_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 2 }}>
                    {item.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                    {item.grade_level ?? '—'} · {item.class_name ?? '—'}
                  </div>
                  {item.score != null && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${item.score}%`, background: 'var(--a1)' }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--a1)', width: 36 }}>
                        {item.score}%
                      </span>
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
          <div style={{ fontSize: 13, marginTop: 6 }}>Try a different name or class</div>
        </div>
      )}
    </div>
  );
}
