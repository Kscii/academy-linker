import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { parent as parentApi } from '@/lib/api';
import type { ClassTimetableData } from '@/types/api';
import { WeeklyTimetable } from '@/components/timetable/WeeklyTimetable';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ParentTimetableScreen() {
  const { t } = useTranslation(['app', 'common']);
  const { sid } = useParams<{ sid: string }>();
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<ClassTimetableData | null>(null);

  useEffect(() => {
    if (!sid) return;
    parentApi.getTimetable(sid, { date }).then(res => setData(res.data)).catch(() => setData(null));
  }, [sid, date]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 26, color: 'var(--tx)', marginBottom: 4 }}>{t('parentTimetable.title')}</div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {data ? t('parentTimetable.subtitle', { className: data.class_info.name }) : t('parentTimetable.subtitleFallback')}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
            {data?.effective_from
              ? t('app:parentTimetable.effectiveRange', { from: data.effective_from, to: data.effective_to ?? t('common:ongoing') })
              : t('app:parentTimetable.noEffectiveVersion')}
          </div>
          <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} style={{ maxWidth: 180 }} />
        </div>

        <WeeklyTimetable entries={data?.entries ?? []} emptyText={t('app:parentTimetable.empty')} />
      </div>
    </div>
  );
}
