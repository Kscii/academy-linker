import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { admin as adminApi } from '@/lib/api';
import { SearchableSelect } from '@/components/forms/SearchableSelect';
import type { AdminClass, ClassTimetableData, ClassTimetableEntry, ReplaceClassTimetableRequest } from '@/types/api';
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
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [classUuid, setClassUuid] = useState('');
  const [date, setDate] = useState(todayIso());
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [effectiveTo, setEffectiveTo] = useState('');
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [data, setData] = useState<ClassTimetableData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getClasses({ page: 1, page_size: 200, is_active: true }).then(res => {
      setClasses(res.data);
      setClassUuid(current => current || res.data[0]?.uuid || '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classUuid) return;
    adminApi.getClassTimetable(classUuid, { date }).then(res => {
      setData(res.data);
      setEffectiveFrom(res.data.effective_from ?? date);
      setEffectiveTo(res.data.effective_to ?? '');
      setRows(
        res.data.entries.map(item => ({
          weekday: item.weekday,
          period_index: item.period_index,
          subject_uuid: item.subject.uuid,
          teacher_uuid: item.teacher.uuid,
          room_label: item.room_label ?? '',
          start_time: item.start_time,
          end_time: item.end_time,
        }))
      );
      setError('');
    }).catch(() => {
      setData(null);
      setRows([]);
    });
  }, [classUuid, date]);

  const className = useMemo(
    () => classes.find(item => item.uuid === classUuid)?.name ?? '',
    [classes, classUuid]
  );
  const classOptions = useMemo(
    () => classes.map(item => ({ value: item.uuid, label: item.name, meta: { description: `${item.grade_level ?? '—'} · ${item.academic_year ?? '—'}` } })),
    [classes]
  );

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW, period_index: prev.length + 1 }]);

  const updateRow = (index: number, patch: Partial<TimetableRow>) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const previewEntries: ClassTimetableEntry[] = rows.length
    ? rows.map((row, index) => ({
        uuid: `draft-${index}`,
        weekday: row.weekday,
        period_index: row.period_index,
        room_label: row.room_label || null,
        start_time: row.start_time,
        end_time: row.end_time,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        is_active: true,
        subject: data?.available_subjects.find(item => item.uuid === row.subject_uuid) ?? { uuid: row.subject_uuid, name: '—', code: null },
        teacher: data?.available_teachers.find(item => item.uuid === row.teacher_uuid) ?? { uuid: row.teacher_uuid, display_name: '—' },
      }))
    : (data?.entries ?? []);

  const save = async () => {
    if (!classUuid || rows.length === 0) {
      setError(t('adminTimetable.validationRows'));
      return;
    }
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
      const res = await adminApi.replaceClassTimetable(classUuid, body);
      setData(res.data);
      setRows(
        res.data.entries.map(item => ({
          weekday: item.weekday,
          period_index: item.period_index,
          subject_uuid: item.subject.uuid,
          teacher_uuid: item.teacher.uuid,
          room_label: item.room_label ?? '',
          start_time: item.start_time,
          end_time: item.end_time,
        }))
      );
    } catch (e: unknown) {
      setError((e as { error?: { message?: string } })?.error?.message ?? t('adminTimetable.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, alignItems: 'start' }}>
      <div className="card">
        <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)', marginBottom: 16 }}>{t('adminTimetable.title')}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SearchableSelect value={classUuid} onChange={setClassUuid} options={classOptions} placeholder={t('adminTimetable.selectClass')} />
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
                <SearchableSelect
                  value={row.subject_uuid}
                  onChange={value => updateRow(index, { subject_uuid: value })}
                  options={(data?.available_subjects ?? []).map(item => ({ value: item.uuid, label: item.name, meta: { description: item.code ?? '' } }))}
                  placeholder={t('adminTimetable.selectSubject')}
                />
                <SearchableSelect
                  value={row.teacher_uuid}
                  onChange={value => updateRow(index, { teacher_uuid: value })}
                  options={(data?.available_teachers ?? []).map(item => ({ value: item.uuid, label: item.display_name }))}
                  placeholder={t('adminTimetable.selectTeacher')}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input className="input-field" type="time" step={60} value={row.start_time.slice(0, 5)} onChange={e => updateRow(index, { start_time: `${e.target.value}:00` })} />
                <input className="input-field" type="time" step={60} value={row.end_time.slice(0, 5)} onChange={e => updateRow(index, { end_time: `${e.target.value}:00` })} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input-field" value={row.room_label} onChange={e => updateRow(index, { room_label: e.target.value })} placeholder={t('adminTimetable.roomPlaceholder')} />
                <button className="btn-secondary" style={{ width: 'auto', padding: '8px 12px' }} onClick={() => setRows(prev => prev.filter((_, i) => i !== index))}>
                  {t('actions.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {error ? <div style={{ marginTop: 12, color: 'var(--warn)', fontSize: 12 }}>{error}</div> : null}

        <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => void save()} disabled={saving || !classUuid}>
          {saving ? t('common:saving') : t('app:adminTimetable.save')}
        </button>
      </div>

      <div className="card">
        <div className="font-serif" style={{ fontSize: 22, color: 'var(--tx)', marginBottom: 4 }}>
          {className || t('adminTimetable.previewTitle')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>
          {data?.effective_from
            ? t('app:adminTimetable.previewSubtitle', { from: data.effective_from, to: data.effective_to ?? t('common:ongoing') })
            : t('app:adminTimetable.noEffectiveVersion')}
        </div>

        <WeeklyTimetable entries={previewEntries} emptyText={t('app:adminTimetable.empty')} />
      </div>
    </div>
  );
}
