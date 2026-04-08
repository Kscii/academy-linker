// ============================================================
// Parent Dashboard — greeting, banner, trend, activities, wellbeing
// ============================================================

import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { getSubjectColor } from '@/lib/constants';
import { parent as parentApi } from '@/lib/api';
import type { DashboardResponse, Announcement, LeaveRequest, LeaveRequestType, IncidentType, SubjectSummary, ClassTimetableEntry } from '@/types/api';
import { LineChart } from '@/components/charts/LineChart';

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' });
}

const CATEGORY_ICONS: Record<string, string> = {
  Event: '🎵', Interviews: '🤝', Excursion: '🚌', Default: '📌',
};
const CATEGORY_COLORS: Record<string, string> = {
  Event: 'var(--a1)', Interviews: 'var(--a2)', Excursion: 'var(--a3)', Default: 'var(--a4)',
};

// ── Birthday helpers ──────────────────────────────────────────

/** Returns days until next birthday (0 = today) */
function daysUntilBirthday(birthdayIso: string): number {
  const today = new Date();
  const bday = new Date(birthdayIso);
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400_000);
}

const LEAVE_TYPE_ICONS: Record<string, string> = {
  sick: '🤒', personal: '👤', family: '👪', other: '📋',
};
const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: 'var(--a3)', approved: 'var(--a2)', rejected: 'var(--warn)',
};

// ── Upcoming festivals (month is 0-indexed) ───────────────────

interface Festival {
  icon: string;
  nameKey: string;
  month: number;  // 0-indexed
  day: number;
}

const FESTIVALS: Festival[] = [
  { icon: '🐣', nameKey: 'easter',           month: 3,  day: 5  },
  { icon: '🎖️', nameKey: 'anzacDay',        month: 3,  day: 25 },
  { icon: '👩', nameKey: 'mothersDay',     month: 4,  day: 10 },
  { icon: '🐉', nameKey: 'dragonBoatFestival', month: 5, day: 2 },
  { icon: '👨', nameKey: 'fathersDay',     month: 8,  day: 6  },
  { icon: '🌕', nameKey: 'midAutumnFestival', month: 9, day: 6 },
  { icon: '🎃', nameKey: 'halloween',        month: 9,  day: 31 },
  { icon: '🎄', nameKey: 'christmas',        month: 11, day: 25 },
  { icon: '🎆', nameKey: 'newYear',         month: 11, day: 31 },
];

/** Returns the next festival within `within` days, or null */
function nextFestival(within = 14): (Festival & { daysLeft: number }) | null {
  const today = new Date();
  const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  let best: (Festival & { daysLeft: number }) | null = null;
  for (const f of FESTIVALS) {
    let d = new Date(today.getFullYear(), f.month, f.day);
    if (d.getTime() < todayTs) d = new Date(today.getFullYear() + 1, f.month, f.day);
    const daysLeft = Math.round((d.getTime() - todayTs) / 86400_000);
    if (daysLeft <= within && (best === null || daysLeft < best.daysLeft)) best = { ...f, daysLeft };
  }
  return best;
}

// ── Subject-based teaching suggestions ───────────────────────

function normalizeSubjectTipKey(code?: string | null): 'math' | 'english' | 'science' | 'hass' | 'pe' | 'arts' | null {
  if (!code) return null;
  const key = code.trim().toLowerCase();
  if (['math', 'mathematics', 'maths'].includes(key)) return 'math';
  if (['english', 'eng'].includes(key)) return 'english';
  if (['science', 'sci'].includes(key)) return 'science';
  if (['hass', 'history', 'his', 'geography', 'geo'].includes(key)) return 'hass';
  if (['pe', 'physical education', 'sport'].includes(key)) return 'pe';
  if (['arts', 'art', 'music', 'drama'].includes(key)) return 'arts';
  return null;
}

const WELLBEING_TIPS = [
  { icon: '🌱', titleKey: 'celebrateEffortTitle', bodyKey: 'celebrateEffortBody' },
  { icon: '📖', titleKey: 'readingTitle', bodyKey: 'readingBody' },
  { icon: '💬', titleKey: 'interestingTodayTitle', bodyKey: 'interestingTodayBody' },
  { icon: '😴', titleKey: 'sleepTitle', bodyKey: 'sleepBody' },
  { icon: '🎯', titleKey: 'smallGoalsTitle', bodyKey: 'smallGoalsBody' },
];

export function DashboardScreen() {
  const navigate = useNavigate();
  const { sid } = useParams<{ sid: string }>();
  const { user } = useApp();
  const { t } = useTranslation(['dashboard', 'app']);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [studentName, setStudentName] = useState('');
  const [studentBirthday, setStudentBirthday] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<ClassTimetableEntry[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'sick' as LeaveRequestType, start_date: '', end_date: '', reason: '' });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Incident report state
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ incident_type: 'bullying' as IncidentType, description: '', is_anonymous: false });
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [incidentDone, setIncidentDone] = useState(false);

  useEffect(() => {
    if (!sid) return;
    parentApi.getDashboard(sid).then(res => {
      setDashboard(res.data);
      const s = res.data.student;
      if (s) setStudentName(s.preferred_name ?? s.full_name);
      if (res.data.student?.date_of_birth) setStudentBirthday(res.data.student.date_of_birth);
    }).catch(() => {});
    parentApi.getSubjects(sid).then(res => {
      setSubjects(res.data);
    }).catch(() => {});
    parentApi.getAnnouncements(sid).then(res => {
      setAnnouncements(res.data.slice(0, 4));
    }).catch(() => {});
    parentApi.getTimetable(sid).then(res => {
      setTimetableEntries(res.data.entries.slice(0, 5));
    }).catch(() => {});
    parentApi.getLeaveRequests(sid).then(res => {
      setLeaveRequests(res.data.slice(0, 3));
    }).catch(() => {});
  }, [sid]);

  async function submitIncident() {
    if (!sid || !incidentForm.description.trim()) return;
    setIncidentSubmitting(true);
    try {
      await parentApi.createIncidentReport(sid, incidentForm);
      setIncidentDone(true);
      setShowIncidentForm(false);
      setIncidentForm({ incident_type: 'bullying', description: '', is_anonymous: false });
    } finally {
      setIncidentSubmitting(false);
    }
  }

  async function submitLeave() {
    if (!sid || !leaveForm.start_date || !leaveForm.end_date) return;
    setLeaveSubmitting(true);
    try {
      const res = await parentApi.createLeaveRequest(sid, leaveForm);
      setLeaveRequests(prev => [res.data, ...prev].slice(0, 3));
      setShowLeaveForm(false);
      setLeaveForm({ type: 'sick', start_date: '', end_date: '', reason: '' });
    } finally {
      setLeaveSubmitting(false);
    }
  }

  // Wellbeing tip of the day (rotates by day-of-week)
  const tip = WELLBEING_TIPS[new Date().getDay() % WELLBEING_TIPS.length];
  const txTipTitle = t(`app:parentDashboard.wellbeingTips.${tip.titleKey}`);
  const txTipBody  = t(`app:parentDashboard.wellbeingTips.${tip.bodyKey}`);

  const txTrendLabel    = t('app:parentDashboard.overallLearningTrend');
  const txActivityLabel = t('app:parentDashboard.upcomingActivities');
  const txViewAll       = t('app:parentDashboard.viewAll');
  const txWellbeing     = t('app:parentDashboard.wellbeing');
  const txScheduleLabel = t('app:parentDashboard.scheduleLabel');

  // Leave request labels
  const txLeaveTitle       = t('app:parentDashboard.leaveRequestsTitle');
  const txLeaveNew         = t('app:parentDashboard.newLeave');
  const txLeaveCancel      = t('app:parentDashboard.cancelLeave');
  const txLeaveSubmit      = t('app:parentDashboard.submitRequest');
  const txLeaveSubmitting  = t('app:parentDashboard.submitting');
  const txLeaveNoData      = t('app:parentDashboard.noLeaveRequests');
  const txLeaveReason      = t('app:parentDashboard.reasonOptional');
  const txLeaveSick        = t('app:parentDashboard.sickLeave');
  const txLeavePersonal    = t('app:parentDashboard.personalLeave');
  const txLeaveFamily      = t('app:parentDashboard.familyLeave');
  const txLeaveOther       = t('app:parentDashboard.otherLeave');
  const txLeaveSickLabel   = t('app:parentDashboard.sickLeaveLabel');
  const txLeavePersonalLabel = t('app:parentDashboard.personalLeaveLabel');
  const txLeaveFamilyLabel = t('app:parentDashboard.familyLeaveLabel');
  const txLeaveOtherLabel  = t('app:parentDashboard.otherLeaveLabel');
  const txPending          = t('app:parentDashboard.pending');
  const txApproved         = t('app:parentDashboard.approved');
  const txRejected         = t('app:parentDashboard.rejected');

  // Birthday labels
  const txBirthdayTitle    = t('app:parentDashboard.birthday');
  const txNoBirthday       = t('app:parentDashboard.noBirthday');
  const txHappyBirthday    = t('app:parentDashboard.happyBirthday', { name: studentName.split(' ')[0] });
  const txBirthdayWish     = t('app:parentDashboard.birthdayWish');
  const txNoUpcoming       = t('app:parentDashboard.noUpcomingActivities');

  const txDaysToGoTemplate  = t('app:parentDashboard.daysToGo', { count: '{{count}}' });
  const txInDaysTemplate    = t('app:parentDashboard.inDays', { count: '{{count}}' });
  const txDaysUntilTemplate = t('app:parentDashboard.daysUntilFestival', { count: '{{count}}', festival: '{{festival}}' });
  const txTodayIs           = t('app:parentDashboard.todayIsFestival', { festival: '{festival}' });
  const txBirthdayOf        = t('app:parentDashboard.birthdayOf', { name: '{name}' });

  // Teaching suggestions labels
  const txSuggestTitle  = t('app:parentDashboard.teachingSuggestions');
  const txForSubject    = t('app:parentDashboard.forSubject', { subject: '{subject}' });

  // Incident report labels
  const txIncidentTitle    = t('app:parentDashboard.reportIncident');
  const txIncidentSubtitle = t('app:parentDashboard.incidentSubtitle');
  const txIncidentCancel   = t('app:parentDashboard.cancelIncident');
  const txIncidentReport   = t('app:parentDashboard.report');
  const txIncidentSending  = t('app:parentDashboard.sending');
  const txIncidentDone     = t('app:parentDashboard.incidentDone');
  const txIncidentDesc     = t('app:parentDashboard.incidentDescription');
  const txAnonymous        = t('app:parentDashboard.submitAnonymously');
  const txIncidentBullying = t('app:parentDashboard.incidentBullying');
  const txIncidentDrugs    = t('app:parentDashboard.incidentDrugs');
  const txIncidentMisconduct = t('app:parentDashboard.incidentMisconduct');
  const txIncidentOther    = t('app:parentDashboard.incidentOther');

  // Determine what to show in the celebration banner
  const birthdayDays = studentBirthday ? daysUntilBirthday(studentBirthday) : null;
  const upcomingFest = (birthdayDays === null || birthdayDays > 7) ? nextFestival(14) : null;

  const leaveTypeLabel: Record<string, string> = {
    sick: txLeaveSickLabel, personal: txLeavePersonalLabel,
    family: txLeaveFamilyLabel, other: txLeaveOtherLabel,
  };
  const leaveStatusLabel: Record<string, string> = {
    pending: txPending, approved: txApproved, rejected: txRejected,
  };

  return (
    <div>
      {/* Loading skeleton */}
      {!dashboard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 0' }}>
          {[100, 80, 60, 90].map((w, i) => (
            <div key={i} style={{ height: 14, borderRadius: 6, background: 'var(--bg2)', width: `${w}%` }} />
          ))}
        </div>
      )}
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 28, color: 'var(--tx)', marginBottom: 4 }}>
          {t('goodMorning', { name: user?.display_name?.split(' ')[0] ?? 'Parent' })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {t('studentUpdateToday', { student: studentName })} — <strong>{t('app:parentDashboard.weekTerm')}</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="stat-box">
          <div className="stat-label">{t('app:parentDashboard.overallPerformance')}</div>
          <div className="stat-value" style={{ color: 'var(--a1)' }}>
            {dashboard?.summary_cards.overall_performance_index != null ? `${Math.round(dashboard.summary_cards.overall_performance_index)}%` : '—'}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">{t('app:parentDashboard.assignments')}</div>
          <div className="stat-value" style={{ color: 'var(--a2)' }}>
            {dashboard?.summary_cards.assignment_completion_rate != null ? `${Math.round(dashboard.summary_cards.assignment_completion_rate * 100)}%` : '—'}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">{t('app:parentDashboard.unreadPosts')}</div>
          <div className="stat-value" style={{ color: 'var(--a3)' }}>
            {dashboard?.dashboard_context.unread_post_count ?? 0}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">{t('app:parentDashboard.unreadNotices')}</div>
          <div className="stat-value" style={{ color: 'var(--a4)' }}>
            {dashboard?.dashboard_context.unread_announcement_count ?? 0}
          </div>
        </div>
      </div>

      {dashboard?.important_post_banners?.length ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 12 }}>{t('app:parentDashboard.importantMessages')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dashboard.important_post_banners.slice(0, 3).map(item => (
              <button
                key={item.post_uuid}
                className="btn-secondary"
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px' }}
                onClick={() => navigate(`/parent/students/${sid}/discussions`)}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>{item.title ?? item.teacher_display_name}</div>
                <div style={{ fontSize: 12, color: 'var(--tx2)' }}>{item.preview_text}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Celebration banner — birthday (≤7d) or upcoming festival (≤14d) */}
      {(birthdayDays !== null && birthdayDays <= 7) ? (
        <div className="announcement-banner" style={{
          marginBottom: 24,
          background: birthdayDays === 0
            ? 'linear-gradient(120deg, #e8614e, #f0a732)'
            : 'linear-gradient(120deg, #a855f7, #ec4899)',
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>{birthdayDays === 0 ? '🎉' : '🎈'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 2 }}>
              {birthdayDays === 0 ? txHappyBirthday : txDaysToGoTemplate.replace('{N}', String(birthdayDays))}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {birthdayDays === 0 ? txBirthdayWish : txBirthdayOf.replace('{name}', studentName.split(' ')[0])}
            </div>
          </div>
        </div>
      ) : upcomingFest ? (
        <div className="announcement-banner" style={{
          marginBottom: 24,
          background: 'linear-gradient(120deg, #3b82f6, #06b6d4)',
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>{upcomingFest.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginBottom: 2 }}>
              {upcomingFest.daysLeft === 0
                ? txTodayIs.replace('{festival}', t(`app:parentDashboard.festivals.${upcomingFest.nameKey}`))
                : txDaysUntilTemplate.replace('{N}', String(upcomingFest.daysLeft)).replace('{festival}', t(`app:parentDashboard.festivals.${upcomingFest.nameKey}`))}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>
              {new Date(new Date().getFullYear(), upcomingFest.month, upcomingFest.day)
                .toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Overall trend chart — full width */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
          {txTrendLabel}
        </div>
        <LineChart
          data={dashboard?.charts.learning_progress_chart ?? []}
          avgData={dashboard?.charts.learning_progress_chart ?? []}
          color="var(--a1)"
          avgColor="var(--a2)"
          showAvg
          height={160}
        />
      </div>

      {/* Activities + Schedule row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Upcoming activities */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{txActivityLabel}</div>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--a1)', fontFamily: 'var(--font-body)', padding: 0 }}
              onClick={() => navigate(`/parent/students/${sid}/announcements`)}
            >
              {txViewAll} ›
            </button>
          </div>
          {announcements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {announcements.map(ann => {
                const color = CATEGORY_COLORS[ann.category ?? 'Default'] ?? CATEGORY_COLORS.Default;
                const icon  = CATEGORY_ICONS[ann.category ?? 'Default'] ?? CATEGORY_ICONS.Default;
                return (
                  <div
                    key={ann.uuid}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}
                    onClick={() => navigate(`/parent/students/${sid}/announcements`)}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3 }}>{ann.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{formatShortDate(ann.published_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>{txNoUpcoming}</div>
          )}
        </div>

        {/* Weekly schedule */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{txScheduleLabel}</div>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--a1)', fontFamily: 'var(--font-body)', padding: 0 }}
              onClick={() => navigate(`/parent/students/${sid}/timetable`)}
            >
              {txViewAll} ›
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {timetableEntries.length > 0 ? timetableEntries.map((entry) => {
              const color = getSubjectColor(entry.subject.code) || 'var(--a1)';
              return (
                <div key={entry.uuid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 54, fontSize: 11, color: 'var(--tx3)', fontWeight: 600, flexShrink: 0 }}>
                    {t(`app:timetable.weekdays.${entry.weekday}`)}
                  </div>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{entry.subject.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                {t('app:parentTimetable.empty')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wellbeing / Growth card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--a2)10, var(--a3)08)', borderColor: 'var(--a2)30', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>{tip.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--a2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {txWellbeing}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>{txTipTitle}</div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7 }}>{txTipBody}</div>
          </div>
        </div>
      </div>

      {/* Bottom row: Leave + Birthday */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Leave request card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>🗒️ {txLeaveTitle}</div>
            <button
              onClick={() => setShowLeaveForm(v => !v)}
              style={{
                background: showLeaveForm ? 'var(--bg2)' : 'var(--a1)', color: showLeaveForm ? 'var(--tx2)' : '#fff',
                border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {showLeaveForm ? txLeaveCancel : txLeaveNew}
            </button>
          </div>

          {showLeaveForm && (
            <div style={{ marginBottom: 14, padding: 12, background: 'var(--bg2)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                value={leaveForm.type}
                onChange={e => setLeaveForm(f => ({ ...f, type: e.target.value as LeaveRequestType }))}
                style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx)', fontSize: 13, fontFamily: 'var(--font-body)' }}
              >
                <option value="sick">🤒 {txLeaveSick}</option>
                <option value="personal">👤 {txLeavePersonal}</option>
                <option value="family">👪 {txLeaveFamily}</option>
                <option value="other">📋 {txLeaveOther}</option>
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx)', fontSize: 13, fontFamily: 'var(--font-body)' }} />
                <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx)', fontSize: 13, fontFamily: 'var(--font-body)' }} />
              </div>
              <textarea
                placeholder={txLeaveReason}
                value={leaveForm.reason}
                onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                rows={2}
                style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx)', fontSize: 13, resize: 'none', fontFamily: 'var(--font-body)' }}
              />
              <button
                onClick={submitLeave}
                disabled={leaveSubmitting || !leaveForm.start_date || !leaveForm.end_date}
                style={{
                  background: 'var(--a1)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  opacity: leaveSubmitting ? 0.6 : 1,
                }}
              >
                {leaveSubmitting ? txLeaveSubmitting : txLeaveSubmit}
              </button>
            </div>
          )}

          {leaveRequests.length === 0 && !showLeaveForm ? (
            <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>{txLeaveNoData}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {leaveRequests.map(lr => (
                <div key={lr.uuid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{LEAVE_TYPE_ICONS[lr.type] ?? '📋'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{leaveTypeLabel[lr.type] ?? lr.type}</div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{lr.start_date}{lr.start_date !== lr.end_date ? ` – ${lr.end_date}` : ''}</div>
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: LEAVE_STATUS_COLORS[lr.status] + '20', color: LEAVE_STATUS_COLORS[lr.status],
                  }}>
                    {leaveStatusLabel[lr.status] ?? lr.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Birthday card */}
        <div className="card" style={{
          background: studentBirthday && daysUntilBirthday(studentBirthday) === 0
            ? 'linear-gradient(135deg, var(--a1)18, var(--a3)12)'
            : undefined,
          borderColor: studentBirthday && daysUntilBirthday(studentBirthday) <= 7
            ? 'var(--a1)40' : undefined,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>🎂 {txBirthdayTitle}</div>
          {!studentBirthday ? (
            <div style={{ color: 'var(--tx3)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>{txNoBirthday}</div>
          ) : (() => {
            const days = daysUntilBirthday(studentBirthday);
            const bday = new Date(studentBirthday);
            const formatted = bday.toLocaleDateString('en-AU', { day: 'numeric', month: 'long' });
            if (days === 0) return (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--a1)' }}>{txHappyBirthday}</div>
                <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4 }}>{txBirthdayWish}</div>
              </div>
            );
            if (days <= 7) return (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎈</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{txDaysToGoTemplate.replace('{N}', String(days))}</div>
                <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4 }}>{formatted}</div>
              </div>
            );
            return (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🗓️</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>{formatted}</div>
                <div style={{ fontSize: 13, color: 'var(--tx3)', marginTop: 4 }}>{txInDaysTemplate.replace('{N}', String(days))}</div>
              </div>
            );
          })()}
        </div>

      </div>

      {/* Teaching Suggestions + Incident Report */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>

        {/* Teaching Suggestions */}
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>
            💡 {txSuggestTitle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {subjects.slice(0, 3).map(sub => {
              const tipKey = normalizeSubjectTipKey(sub.code);
              if (!tipKey) return null;
              const stat = dashboard?.subject_statistics?.find(s => s.subject_uuid === sub.uuid);
              const score = stat?.score ?? sub.score ?? 100;
              const color = getSubjectColor(sub.code) || sub.color || 'var(--a1)';
              const isBelow = score < 70;
              const tip = t(`app:parentDashboard.subjectTips.${tipKey}.${isBelow ? 'below' : 'good'}`);
              return (
                <div key={sub.uuid} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', background: color,
                    flexShrink: 0, marginTop: 5,
                  }} />
                  <div style={{ flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/parent/students/${sid}/subjects/${sub.uuid}`)}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color,
                        marginBottom: 2,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        textAlign: 'left',
                      }}
                    >
                      {txForSubject.replace('{subject}', sub.name)}
                    </button>
                    <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>{tip}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Incident Report */}
        <div className="card" style={{
          borderColor: showIncidentForm ? 'var(--warn)30' : undefined,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>🚨 {txIncidentTitle}</div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{txIncidentSubtitle}</div>
            </div>
            {!incidentDone && (
              <button
                onClick={() => setShowIncidentForm(v => !v)}
                style={{
                  background: showIncidentForm ? 'var(--bg2)' : 'var(--warn)',
                  color: showIncidentForm ? 'var(--tx2)' : '#fff',
                  border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}
              >
                {showIncidentForm ? txIncidentCancel : txIncidentReport}
              </button>
            )}
          </div>

          {incidentDone && (
            <div style={{
              background: 'var(--a2)12', border: '1px solid var(--a2)30',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--a2)', lineHeight: 1.6,
            }}>
              {txIncidentDone}
            </div>
          )}

          {showIncidentForm && !incidentDone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <select
                value={incidentForm.incident_type}
                onChange={e => setIncidentForm(f => ({ ...f, incident_type: e.target.value as IncidentType }))}
                style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx)', fontSize: 13, fontFamily: 'var(--font-body)' }}
              >
                <option value="bullying">🤜 {txIncidentBullying}</option>
                <option value="drugs">💊 {txIncidentDrugs}</option>
                <option value="misconduct">⚠️ {txIncidentMisconduct}</option>
                <option value="other">📋 {txIncidentOther}</option>
              </select>
              <textarea
                placeholder={txIncidentDesc}
                value={incidentForm.description}
                onChange={e => setIncidentForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--bd)', background: 'var(--card)', color: 'var(--tx)', fontSize: 13, resize: 'none', fontFamily: 'var(--font-body)' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--tx2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={incidentForm.is_anonymous}
                  onChange={e => setIncidentForm(f => ({ ...f, is_anonymous: e.target.checked }))}
                />
                {txAnonymous}
              </label>
              <button
                onClick={submitIncident}
                disabled={incidentSubmitting || !incidentForm.description.trim()}
                style={{
                  background: 'var(--warn)', color: '#fff', border: 'none', borderRadius: 7,
                  padding: '8px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', opacity: incidentSubmitting ? 0.6 : 1,
                }}
              >
                {incidentSubmitting ? txIncidentSending : txIncidentReport}
              </button>
            </div>
          )}

          {!showIncidentForm && !incidentDone && (
            <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.7 }}>
              {t('app:parentDashboard.confidentialIncidentHint')}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
