// ============================================================
// Admin TimetableScreen — manage class timetables
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/forms/SearchableSelect';
import { admin as adminApi, getApiErrorMessage } from '@/lib/api';
import type { ClassTimetableData, ClassTimetableEntry, ReplaceClassTimetableRequest, SelectOption } from '@/types/api';
import { WeeklyTimetable } from '@/components/timetable/WeeklyTimetable';

type TimetableRow = {
  weekday: string;
  period_index: number;
  subject_uuid: string;
  teacher_uuid: string;
  room_label: string;
  start_time: string;
  end_time: string;
};

const EMPTY_ROW: TimetableRow = {
  weekday: 'monday',
  period_index: 1,
  subject_uuid: '',
  teacher_uuid: '',
  room_label: '',
  start_time: '09:00:00',
  end_time: '09:50:00',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AdminTimetableScreen() {
  const { t } = useTranslation(['app', 'common']);
  const [classes, setClasses] = useState<SelectOption[]>([]);
  const [classUuid, setClassUuid] = useState('');
  const [date, setDate] = useState(todayIso());
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [effectiveTo, setEffectiveTo] = useState('');
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [data, setData] = useState<ClassTimetableData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getClassOptions({ is_active: true }).then(res => {
      setClasses(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classUuid) { setData(null); return; }
    adminApi.getClassTimetable(classUuid, { date }).then(res => {
      setData(res.data);
    }).catch(() => setData(null));
  }, [classUuid, date]);

  const entryToRow = (entry: ClassTimetableEntry): TimetableRow => ({
    weekday: entry.weekday,
    period_index: entry.period_index,
    subject_uuid: entry.subject?.uuid ?? '',
    teacher_uuid: entry.teacher?.uuid ?? '',
    room_label: entry.room_label ?? '',
    start_time: entry.start_time ?? '09:00:00',
    end_time: entry.end_time ?? '09:50:00',
  });

  const loadFromCurrent = () => {
    if (!data) return;
    setRows(data.entries.map(entryToRow));
    if (data.effective_from) setEffectiveFrom(data.effective_from.slice(0, 10));
    if (data.effective_to) setEffectiveTo(data.effective_to.slice(0, 10));
  };

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW }]);

  const updateRow = (index: number, patch: Partial<TimetableRow>) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
  };

  const removeRow = (index: number) => setRows(prev => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!classUuid) { setError(t('adminTimetable.classRequired')); return; }
    setSaving(true);
    setError('');
    try {
      const body: ReplaceClassTimetableRequest = {
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        entries: rows.map(row => ({
          weekday: row.weekday,
          period_index: row.period_index,
          subject_uuid: row.subject_uuid,
          teacher_uuid: row.teacher_uuid,
          room_label: row.room_label || null,
          start_time: row.start_time,
          end_time: row.end_time,
        })),
      };
      await adminApi.replaceClassTimetable(classUuid, body);
      adminApi.getClassTimetable(classUuid, { date }).then(res => setData(res.data)).catch(() => {});
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, t('adminTimetable.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const weekdayEntries = useMemo(() => {
    if (!data) return null;
    return data.entries;
  }, [data]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
      <div>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)', marginBottom: 16 }}>{t('adminTimetable.title')}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SearchableSelect value={classUuid} onChange={setClassUuid} options={classes} placeholder={t('adminTimetable.selectClass')} />
            <input className="input-field" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input className="input-field" type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
            <input className="input-field" type="date" value={effectiveTo} onChange={e => setEffectiveTo(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{t('adminTimetable.rows')}</div>
            <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={addRow}>
              + {t('adminTimetable.addRow')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 540, overflowY: 'auto' }}>
            {rows.map((row, index) => (
              <div key={`${row.weekday}-${row.period_index}-${index}`} style={{ border: '1px solid var(--bd)', borderRadius: 12, padding: 12, background: 'var(--bg)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, marginBottom: 8 }}>
                  <select className="input-field" value={row.weekday} onChange={e => updateRow(index, { weekday: e.target.value })}>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                      <option key={day} value={day}>{t(`timetable.weekdays.${day}`)}</option>
                    ))}
                  </select>
                  <input className="input-field" type="number" min={1} value={row.period_index} onChange={e => updateRow(index, { period_index: Number(e.target.value) || 1 })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 8 }}>
                  <SearchableSelect value={row.subject_uuid} onChange={(value) => updateRow(index, { subject_uuid: value })} options={(data?.available_subjects ?? []).map(item => ({ value: item.uuid, label: item.name, meta: { code: item.code } }))} placeholder={t('adminTimetable.selectSubject')} />
                  <SearchableSelect value={row.teacher_uuid} onChange={(value) => updateRow(index, { teacher_uuid: value })} options={(data?.available_teachers ?? []).map(item => ({ value: item.uuid, label: item.display_name }))} placeholder={t('adminTimetable.selectTeacher')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input className="input-field" type="time" step={60} value={row.start_time.slice(0, 5)} onChange={e => updateRow(index, { start_time: `${e.target.value}:00` })} />
                  <input className="input-field" type="time" step={60} value={row.end_time.slice(0, 5)} onChange={e => updateRow(index, { end_time: `${e.target.value}:00` })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input-field" placeholder={t('adminTimetable.roomLabel')} value={row.room_label} onChange={e => updateRow(index, { room_label: e.target.value })} style={{ flex: 1 }} />
                  <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', fontSize: 12, color: 'var(--warn)' }} onClick={() => removeRow(index)}>
                    {t('common:delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--warn)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn-primary" onClick={() => void handleSave()} disabled={saving || !classUuid}>
              {saving ? t('common:loading') : t('adminTimetable.save')}
            </button>
            {data && (
              <button className="btn-secondary" style={{ width: 'auto', padding: '8px 14px' }} onClick={loadFromCurrent}>
                {t('adminTimetable.loadCurrent')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        {weekdayEntries ? (
          <WeeklyTimetable entries={weekdayEntries} emptyText={t('adminTimetable.empty')} />
        ) : (
          <div className="card" style={{ fontSize: 13, color: 'var(--tx3)', textAlign: 'center', padding: '40px 0' }}>
            {t('adminTimetable.selectClassHint')}
          </div>
        )}
      </div>
    </div>
  );
}
