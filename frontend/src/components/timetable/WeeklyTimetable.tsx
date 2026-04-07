import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassTimetableEntry } from '@/types/api';

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

function formatClock(value: string): string {
  return value.slice(0, 5);
}

export function WeeklyTimetable({
  entries,
  emptyText,
}: {
  entries: ClassTimetableEntry[];
  emptyText: string;
}) {
  const { t } = useTranslation('app');

  const periods = useMemo(
    () => Array.from(new Set(entries.map(item => item.period_index))).sort((a, b) => a - b),
    [entries]
  );

  const bySlot = useMemo(() => {
    const map = new Map<string, ClassTimetableEntry>();
    entries.forEach(item => {
      map.set(`${item.weekday}:${item.period_index}`, item);
    });
    return map;
  }, [entries]);

  if (!entries.length) {
    return (
      <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 760, display: 'grid', gridTemplateColumns: '90px repeat(5, minmax(120px, 1fr))', gap: 8 }}>
        <div />
        {WEEKDAYS.map(day => (
          <div key={day} style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t(`timetable.weekdays.${day}`)}
          </div>
        ))}

        {periods.map(period => (
          <Fragment key={period}>
            <div style={{ paddingTop: 6, fontSize: 12, color: 'var(--tx2)', fontWeight: 700 }}>
              {t('timetable.periodLabel', { value: period })}
            </div>
            {WEEKDAYS.map(day => {
              const item = bySlot.get(`${day}:${period}`);
              return (
                <div
                  key={`${day}-${period}`}
                  style={{
                    minHeight: 112,
                    border: '1px solid var(--bd)',
                    borderRadius: 12,
                    background: item?.is_assigned_to_current_teacher ? 'rgba(232,97,78,0.05)' : 'var(--card)',
                    padding: 12,
                  }}
                >
                  {item ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{item.subject.name}</div>
                        {item.is_assigned_to_current_teacher ? (
                          <span className="badge" style={{ background: 'var(--a1)18', color: 'var(--a1)', fontSize: 10 }}>
                            {t('timetable.assignedToMe')}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 4 }}>
                        {formatClock(item.start_time)} - {formatClock(item.end_time)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4 }}>{item.teacher.display_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)' }}>
                        {item.room_label || t('timetable.noRoom')}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--tx3)', fontSize: 12 }}>{t('timetable.emptySlot')}</div>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
