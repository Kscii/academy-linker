// ============================================================
// App — browser-router based navigation
// ============================================================

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  useParams,
} from 'react-router-dom';

import { AppProvider, useApp } from '@/contexts/AppContext';
import { LandingPage } from '@/screens/LandingPage';
import { AppShell } from '@/components/layout/AppShell';
import { LoginScreen } from '@/screens/LoginScreen';
import { AIPanel } from '@/components/AIPanel';
import { SettingsScreen } from '@/screens/SettingsScreen';

// Parent screens
import { DashboardScreen as ParentDashboard } from '@/screens/parent/DashboardScreen';
import { SubjectDetailScreen } from '@/screens/parent/SubjectDetailScreen';
import { GradesScreen } from '@/screens/parent/GradesScreen';
import { ReportScreen } from '@/screens/parent/ReportScreen';
import { MessagesScreen as ParentMessages } from '@/screens/parent/MessagesScreen';
import { ConversationScreen } from '@/screens/parent/ConversationScreen';
import { ResourcesScreen } from '@/screens/parent/ResourcesScreen';
import { AnnouncementsScreen } from '@/screens/parent/AnnouncementsScreen';
import { ParentExamScoresScreen } from '@/screens/parent/ExamScoresScreen';
import { ParentPeriodMetricsScreen } from '@/screens/parent/PeriodMetricsScreen';
import { ParentLeaveRequestsScreen } from '@/screens/parent/LeaveRequestsScreen';
import { ParentIncidentsScreen } from '@/screens/parent/IncidentsScreen';
import { ParentTimetableScreen } from '@/screens/parent/TimetableScreen';

// Admin screens
import { AdminOverviewScreen }  from '@/screens/admin/OverviewScreen';
import { AdminUsersScreen }     from '@/screens/admin/UsersScreen';
import { AdminTeachersScreen }  from '@/screens/admin/TeachersScreen';
import { AdminClassesScreen }   from '@/screens/admin/ClassesScreen';
import { AdminStudentsScreen }  from '@/screens/admin/StudentsScreen';
import { AdminParentsScreen }   from '@/screens/admin/ParentsScreen';
import { AdminTeachingAssignmentsScreen } from '@/screens/admin/TeachingAssignmentsScreen';
import { AdminSystemTagsScreen } from '@/screens/admin/SystemTagsScreen';
import { AdminTimetableScreen } from '@/screens/admin/TimetableScreen';

// Teacher screens
import { TeacherDashboardScreen } from '@/screens/teacher/DashboardScreen';
import { ClassDetailScreen } from '@/screens/teacher/ClassDetailScreen';
import { StudentDetailScreen } from '@/screens/teacher/StudentDetailScreen';
import { TeacherMessagesScreen } from '@/screens/teacher/MessagesScreen';
import { TeacherPostsScreen } from '@/screens/teacher/PostsScreen';
import { FindStudentScreen } from '@/screens/teacher/FindStudentScreen';
import { TeacherTagsScreen } from '@/screens/teacher/TagsScreen';
import { TeacherReportsScreen } from '@/screens/teacher/ReportsScreen';
import { TeacherExamScoresScreen } from '@/screens/teacher/ExamScoresScreen';
import { TeacherPeriodMetricsScreen } from '@/screens/teacher/PeriodMetricsScreen';
import { TeacherAIReportsScreen } from '@/screens/teacher/AIReportsScreen';
import { TeacherClassTimetableScreen } from '@/screens/teacher/ClassTimetableScreen';

// ── Auth guard ────────────────────────────────────────────────

function ProtectedRoute() {
  const { isLoggedIn, authChecked } = useApp();
  if (!authChecked) return null; // 等待 /api/me 返回再决定跳转
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

function RoleRoute({ allowed }: { allowed: Array<'parent' | 'teacher' | 'admin'> }) {
  const { role, authChecked, firstStudentUuid } = useApp();
  if (!authChecked) return null;
  if (allowed.includes(role)) return <Outlet />;
  if (role === 'parent') return <Navigate to={`/parent/students/${firstStudentUuid}/dashboard`} replace />;
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/teacher/dashboard" replace />;
}

// ── Root redirect ─────────────────────────────────────────────

function RootRedirect() {
  const { isLoggedIn, authChecked, role, firstStudentUuid } = useApp();
  if (!authChecked) return null;
  if (!isLoggedIn) return <Navigate to="/home" replace />;
  if (role === 'parent') return <Navigate to={`/parent/students/${firstStudentUuid}/dashboard`} replace />;
  if (role === 'admin')  return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/teacher/dashboard" replace />;
}

function LegacyParentDiscussionRedirect() {
  const { sid, teacherUuid } = useParams<{ sid: string; teacherUuid: string }>();
  return <Navigate to={`/parent/students/${sid}/discussions/${teacherUuid}`} replace />;
}

function LegacyParentAnnouncementsRedirect() {
  const { sid } = useParams<{ sid: string }>();
  return <Navigate to={`/parent/students/${sid}/announcements`} replace />;
}

// ── App layout (AppShell + AIPanel) ──────────────────────────
// Syncs role from URL path so sidebar shows correct nav items.

function AppLayout() {
  const { pathname } = useLocation();

  // Extract student UUID from URL: /parent/students/:sid/... or /teacher/students/:sid/...
  const sidMatch = pathname.match(/\/students\/([^/]+)/);
  const studentUuid = sidMatch?.[1] ?? '';

  // Extract subject UUID from URL: .../subjects/:subjectUuid
  const subjectMatch = pathname.match(/\/subjects\/([^/]+)/);
  const subjectUuid = subjectMatch?.[1] ?? '';

  return (
    <>
      <AppShell />
      <AIPanel
        studentUuid={studentUuid || undefined}
        subjectUuid={subjectUuid || undefined}
      />
    </>
  );
}

// ── Routes ────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      <Route path="/home" element={<LandingPage />} />
      <Route path="/login" element={<LoginScreen />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/settings" element={<SettingsScreen />} />

          <Route element={<RoleRoute allowed={['parent']} />}>
            <Route path="/parent/students/:sid/dashboard"           element={<ParentDashboard />} />
            <Route path="/parent/students/:sid/subjects/:subjectId" element={<SubjectDetailScreen />} />
            <Route path="/parent/students/:sid/grades"              element={<GradesScreen />} />
            <Route path="/parent/students/:sid/reports"             element={<ReportScreen />} />
            <Route path="/parent/students/:sid/discussions"         element={<ParentMessages />} />
            <Route path="/parent/students/:sid/discussions/:teacherUuid" element={<ConversationScreen />} />
            <Route path="/parent/students/:sid/conversations/:teacherUuid" element={<LegacyParentDiscussionRedirect />} />
            <Route path="/parent/students/:sid/announcements"       element={<AnnouncementsScreen />} />
            <Route path="/parent/students/:sid/tasks"               element={<LegacyParentAnnouncementsRedirect />} />
            <Route path="/parent/students/:sid/exam-scores"         element={<ParentExamScoresScreen />} />
            <Route path="/parent/students/:sid/period-metrics"      element={<ParentPeriodMetricsScreen />} />
            <Route path="/parent/students/:sid/timetable"           element={<ParentTimetableScreen />} />
            <Route path="/parent/students/:sid/leave"               element={<ParentLeaveRequestsScreen />} />
            <Route path="/parent/students/:sid/incidents"           element={<ParentIncidentsScreen />} />
            <Route path="/parent/students/:sid/resources"           element={<ResourcesScreen />} />
          </Route>

          <Route element={<RoleRoute allowed={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminOverviewScreen />} />
            <Route path="/admin/users"     element={<AdminUsersScreen />} />
            <Route path="/admin/teachers"  element={<AdminTeachersScreen />} />
            <Route path="/admin/classes"   element={<AdminClassesScreen />} />
            <Route path="/admin/students"  element={<AdminStudentsScreen />} />
            <Route path="/admin/parents"   element={<AdminParentsScreen />} />
            <Route path="/admin/assignments/teaching" element={<AdminTeachingAssignmentsScreen />} />
            <Route path="/admin/tags/system" element={<AdminSystemTagsScreen />} />
            <Route path="/admin/timetable" element={<AdminTimetableScreen />} />
          </Route>

          <Route element={<RoleRoute allowed={['teacher']} />}>
            <Route path="/teacher/dashboard"                      element={<TeacherDashboardScreen />} />
            <Route path="/teacher/messages"                       element={<TeacherMessagesScreen />} />
            <Route path="/teacher/posts"                          element={<TeacherPostsScreen />} />
            <Route path="/teacher/tags"                           element={<TeacherTagsScreen />} />
            <Route path="/teacher/reports"                        element={<TeacherReportsScreen />} />
            <Route path="/teacher/exam-scores"                    element={<TeacherExamScoresScreen />} />
            <Route path="/teacher/period-metrics"                 element={<TeacherPeriodMetricsScreen />} />
            <Route path="/teacher/ai-reports"                     element={<TeacherAIReportsScreen />} />
            <Route path="/teacher/find-student"                   element={<FindStudentScreen />} />
            <Route path="/teacher/classes/:classUuid"             element={<ClassDetailScreen />} />
            <Route path="/teacher/classes/:classUuid/timetable"   element={<TeacherClassTimetableScreen />} />
            <Route path="/teacher/students/:studentUuid"          element={<StudentDetailScreen />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all → redirect */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

// ── Root ──────────────────────────────────────────────────────

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
