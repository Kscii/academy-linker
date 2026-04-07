import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { teacher as teacherApi } from '@/lib/api';
import type { ClassTimetableData } from '@/types/api';
import { WeeklyTimetable } from '@/components/timetable/WeeklyTimetable';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TeacherClassTimetableScreen() {
  const { t } = useTranslation(['app', 'common']);
  const navigate = useNavigate();
  const { classUuid } = useParams<{ classUuid: string }>();
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<ClassTimetableData | null>(null);

  useEffect(() => {
    if (!classUuid) return;
    teacherApi.getClassTimetable(classUuid, { date }).then(res => setData(res.data)).catch(() => setData(null));
  }, [classUuid, date]);

  return (
    <div>
      <button
        onClick={() => navigate(`/teacher/classes/${classUuid}`)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--tx2)', fontWeight: 700, fontFamily: 'var(--font-body)',
        }}
      >
        ← {t('teacherTimetable.backToClass')}
      </button>

      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('teacherTimetable.title')}</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {data ? t('teacherTimetable.subtitle', { className: data.class_info.name }) : t('teacherTimetable.subtitleFallback')}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
            {data?.effective_from
              ? t('app:teacherTimetable.effectiveRange', { from: data.effective_from, to: data.effective_to ?? t('common:ongoing') })
              : t('app:teacherTimetable.noEffectiveVersion')}
          </div>
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 180 }} />
        </div>

        <WeeklyTimetable entries={data?.entries ?? []} emptyText={t('app:teacherTimetable.empty')} />
      </div>
    </div>
  );
}
