// ============================================================
// Parent Dashboard — greeting, banner, trend, activities, wellbeing
// ============================================================

import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { translateBatch, useTranslatedText } from '@/lib/translate';
import { mockParentDashboard, mockStudents } from '@/lib/mock-data';
import { parent as parentApi } from '@/lib/api';
import type { DashboardResponse, Announcement, LeaveRequest, LeaveRequestType, IncidentType } from '@/types/api';
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
  name: string;
  month: number;  // 0-indexed
  day: number;
}

const FESTIVALS: Festival[] = [
  { icon: '🐣', name: 'Easter',           month: 3,  day: 5  },
  { icon: '🎖️', name: 'ANZAC Day',        month: 3,  day: 25 },
  { icon: '👩', name: "Mother's Day",     month: 4,  day: 10 },
  { icon: '🐉', name: 'Dragon Boat Festival', month: 5, day: 2 },
  { icon: '👨', name: "Father's Day",     month: 8,  day: 6  },
  { icon: '🌕', name: 'Mid-Autumn Festival', month: 9, day: 6 },
  { icon: '🎃', name: 'Halloween',        month: 9,  day: 31 },
  { icon: '🎄', name: 'Christmas',        month: 11, day: 25 },
  { icon: '🎆', name: 'New Year',         month: 11, day: 31 },
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

const SUBJECT_TIPS: Record<string, { below: string; good: string }> = {
  math:    { below: 'Try 10 min of Khan Academy together each evening — short worked examples beat long homework sessions.', good: 'Keep the momentum with puzzle games or coding challenges to deepen logical thinking.' },
  english: { below: 'Read aloud together for 15 min nightly. Discussing the story builds both vocabulary and comprehension.', good: 'Encourage a short personal journal — writing freely builds fluency and voice.' },
  science: { below: 'Relate lessons to everyday life: cooking = chemistry, weather = physics. Curiosity beats memorisation.', good: 'Science podcasts or YouTube channels like Kurzgesagt make concepts stick outside the classroom.' },
  hass:    { below: 'Watch a 5-min documentary clip on the current topic together and discuss one thing that surprised you.', good: 'Visiting a local museum or cultural event brings history and geography to life.' },
  pe:      { below: 'Encourage 30 min of active play daily — sport participation builds confidence alongside fitness.', good: 'Celebrate personal bests, not just wins. Growth mindset in PE transfers to all subjects.' },
  arts:    { below: 'Set aside time to create together — even simple drawing reinforces fine motor skills and self-expression.', good: 'Attend a local performance or exhibition together to show that the arts are valued.' },
};

const WELLBEING_TIPS = [
  { icon: '🌱', title: 'Celebrate effort, not just results', body: 'Praising the process — trying hard, persisting through difficulty — builds a growth mindset that lasts a lifetime.' },
  { icon: '📖', title: '20 minutes of reading a day', body: 'Daily reading, even on weekends, is one of the strongest predictors of long-term academic success across all subjects.' },
  { icon: '💬', title: 'Ask "What was interesting today?"', body: 'Open-ended questions spark reflection. Children who narrate their day retain learning better and feel more connected.' },
  { icon: '😴', title: 'Sleep is a study tool', body: 'The brain consolidates memories during sleep. Consistent bedtimes improve focus, mood, and test performance.' },
  { icon: '🎯', title: 'Small goals, big wins', body: 'Breaking study into 25-minute focused sessions with short breaks (Pomodoro) reduces anxiety and improves retention.' },
];

export function DashboardScreen() {
  const navigate = useNavigate();
  const { sid } = useParams<{ sid: string }>();
  const { user, language } = useApp();
  const { t } = useTranslation('dashboard');

  const [dashboard, setDashboard] = useState<DashboardResponse>(mockParentDashboard);
  const [studentName, setStudentName] = useState(mockStudents[0].display_name);
  const [studentBirthday, setStudentBirthday] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'sick' as LeaveRequestType, start_date: '', end_date: '', reason: '' });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  // Incident report state
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({ type: 'bullying' as IncidentType, description: '', is_anonymous: false });
  const [incidentSubmitting, setIncidentSubmitting] = useState(false);
  const [incidentDone, setIncidentDone] = useState(false);

  useEffect(() => {
    if (!sid) return;
    parentApi.getDashboard(sid).then(res => {
      setDashboard(res.data);
      if (res.data.student?.display_name) setStudentName(res.data.student.display_name);
      if (res.data.student?.birthday) setStudentBirthday(res.data.student.birthday);
    }).catch(() => {});
    parentApi.getAnnouncements(sid).then(res => {
      setAnnouncements(res.data.slice(0, 4));
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
      setIncidentForm({ type: 'bullying', description: '', is_anonymous: false });
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

  // Translate activity titles
  const [txAnn, setTxAnn] = useState<Announcement[]>([]);
  useEffect(() => {
    setTxAnn(announcements);
    if (language === 'en' || announcements.length === 0) return;
    translateBatch(announcements.map(a => a.title), language).then(results => {
      setTxAnn(announcements.map((a, i) => ({ ...a, title: results[i] || a.title })));
    });
  }, [language, announcements]);

  // Wellbeing tip of the day (rotates by day-of-week)
  const tip = WELLBEING_TIPS[new Date().getDay() % WELLBEING_TIPS.length];
  const txTipTitle = useTranslatedText(tip.title, language);
  const txTipBody  = useTranslatedText(tip.body, language);

  const txTrendLabel    = useTranslatedText('Overall Learning Trend', language);
  const txActivityLabel = useTranslatedText('Upcoming Activities', language);
  const txViewAll       = useTranslatedText('View all', language);
  const txWellbeing     = useTranslatedText('Growth & Wellbeing', language);
  const txScheduleLabel = useTranslatedText("This Week's Schedule", language);

  // Leave request labels
  const txLeaveTitle       = useTranslatedText('Leave Requests', language);
  const txLeaveNew         = useTranslatedText('+ New', language);
  const txLeaveCancel      = useTranslatedText('✕ Cancel', language);
  const txLeaveSubmit      = useTranslatedText('Submit Request', language);
  const txLeaveSubmitting  = useTranslatedText('Submitting…', language);
  const txLeaveNoData      = useTranslatedText('No leave requests', language);
  const txLeaveReason      = useTranslatedText('Reason (optional)', language);
  const txLeaveSick        = useTranslatedText('Sick Leave', language);
  const txLeavePersonal    = useTranslatedText('Personal', language);
  const txLeaveFamily      = useTranslatedText('Family', language);
  const txLeaveOther       = useTranslatedText('Other', language);
  const txLeaveSickLabel   = useTranslatedText('sick leave', language);
  const txLeavePersonalLabel = useTranslatedText('personal leave', language);
  const txLeaveFamilyLabel = useTranslatedText('family leave', language);
  const txLeaveOtherLabel  = useTranslatedText('other leave', language);
  const txPending          = useTranslatedText('Pending', language);
  const txApproved         = useTranslatedText('Approved', language);
  const txRejected         = useTranslatedText('Rejected', language);

  // Birthday labels
  const txBirthdayTitle    = useTranslatedText('Birthday', language);
  const txNoBirthday       = useTranslatedText('No birthday info', language);
  const txHappyBirthday    = useTranslatedText(`Happy Birthday, ${studentName.split(' ')[0]}!`, language);
  const txBirthdayWish     = useTranslatedText('Wishing a wonderful day!', language);
  const txNoUpcoming       = useTranslatedText('No upcoming activities', language);

  const txDaysToGoTemplate  = useTranslatedText('{N} days to go!', language);
  const txInDaysTemplate    = useTranslatedText('in {N} days', language);
  const txDaysUntilTemplate = useTranslatedText('{N} days until {festival}', language);
  const txTodayIs           = useTranslatedText("Today is {festival}! 🎉", language);
  const txBirthdayOf        = useTranslatedText("{name}'s birthday", language);

  // Teaching suggestions labels
  const txSuggestTitle  = useTranslatedText('Teaching Suggestions', language);
  const txForSubject    = useTranslatedText('For {subject}', language);

  // Incident report labels
  const txIncidentTitle    = useTranslatedText('Report an Incident', language);
  const txIncidentSubtitle = useTranslatedText('Bullying · Drugs · Misconduct', language);
  const txIncidentCancel   = useTranslatedText('✕ Cancel', language);
  const txIncidentReport   = useTranslatedText('Report', language);
  const txIncidentSending  = useTranslatedText('Sending…', language);
  const txIncidentDone     = useTranslatedText('✓ Report received. School staff will follow up confidentially.', language);
  const txIncidentDesc     = useTranslatedText('Describe what happened…', language);
  const txAnonymous        = useTranslatedText('Submit anonymously', language);
  const txIncidentBullying = useTranslatedText('Bullying', language);
  const txIncidentDrugs    = useTranslatedText('Drug / Substance', language);
  const txIncidentMisconduct = useTranslatedText('Inappropriate Behavior', language);
  const txIncidentOther    = useTranslatedText('Other', language);

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
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div className="font-serif" style={{ fontSize: 28, color: 'var(--tx)', marginBottom: 4 }}>
          {t('goodMorning', { name: user?.display_name?.split(' ')[0] ?? 'Parent' })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
          {t('studentUpdateToday', { student: studentName })} — <strong>Week 8, Term 2</strong>
        </div>
      </div>

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
                ? txTodayIs.replace('{festival}', upcomingFest.name)
                : txDaysUntilTemplate.replace('{N}', String(upcomingFest.daysLeft)).replace('{festival}', upcomingFest.name)}
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
          data={dashboard.trend_chart}
          avgData={dashboard.trend_chart}
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
              onClick={() => navigate(`/parent/students/${sid}/tasks`)}
            >
              {txViewAll} ›
            </button>
          </div>
          {txAnn.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {txAnn.map(ann => {
                const color = CATEGORY_COLORS[ann.category ?? 'Default'] ?? CATEGORY_COLORS.Default;
                const icon  = CATEGORY_ICONS[ann.category ?? 'Default'] ?? CATEGORY_ICONS.Default;
                return (
                  <div
                    key={ann.uuid}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}
                    onClick={() => navigate(`/parent/students/${sid}/tasks`)}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3 }}>{ann.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>{formatShortDate(ann.created_at)}</div>
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
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>{txScheduleLabel}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dashboard.subjects.slice(0, 5).map((sub, i) => {
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
              const times = ['9:00', '10:30', '11:00', '13:00', '14:30'];
              return (
                <div key={sub.uuid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, fontSize: 11, color: 'var(--tx3)', fontWeight: 600, flexShrink: 0 }}>{days[i]}</div>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: sub.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{sub.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)' }}>{times[i]}</div>
                  </div>
                </div>
              );
            })}
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
            {dashboard.subjects.slice(0, 3).map(sub => {
              const tips = SUBJECT_TIPS[sub.code];
              if (!tips) return null;
              const isBelow = (sub.score ?? 100) < 70;
              const tip = isBelow ? tips.below : tips.good;
              return (
                <div key={sub.uuid} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', background: sub.color,
                    flexShrink: 0, marginTop: 5,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: sub.color, marginBottom: 2 }}>
                      {txForSubject.replace('{subject}', sub.name)}
                    </div>
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
                value={incidentForm.type}
                onChange={e => setIncidentForm(f => ({ ...f, type: e.target.value as IncidentType }))}
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
              If you have concerns about your child's safety or wellbeing at school, you can report them here. All reports are handled confidentially by school staff.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
