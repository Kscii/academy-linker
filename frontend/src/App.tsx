// ============================================================
// App — browser-router based navigation
// ============================================================

import { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import { AppProvider, useApp } from '@/contexts/AppContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoginScreen } from '@/screens/LoginScreen';
import { AIPanel } from '@/components/AIPanel';
import { SettingsScreen } from '@/screens/SettingsScreen';

// Parent screens
import { DashboardScreen as ParentDashboard } from '@/screens/parent/DashboardScreen';
import { SubjectDetailScreen } from '@/screens/parent/SubjectDetailScreen';
import { ReportScreen } from '@/screens/parent/ReportScreen';
import { MessagesScreen as ParentMessages } from '@/screens/parent/MessagesScreen';
import { ConversationScreen } from '@/screens/parent/ConversationScreen';
import { ResourcesScreen } from '@/screens/parent/ResourcesScreen';
import { AnnouncementsScreen } from '@/screens/parent/AnnouncementsScreen';

// Teacher screens
import { TeacherDashboardScreen } from '@/screens/teacher/DashboardScreen';
import { ClassDetailScreen } from '@/screens/teacher/ClassDetailScreen';
import { StudentDetailScreen } from '@/screens/teacher/StudentDetailScreen';
import { TeacherMessagesScreen } from '@/screens/teacher/MessagesScreen';
import { TeacherPostsScreen } from '@/screens/teacher/PostsScreen';
import { FindStudentScreen } from '@/screens/teacher/FindStudentScreen';

// ── Auth guard ────────────────────────────────────────────────

function ProtectedRoute() {
  const { isLoggedIn, authChecked } = useApp();
  if (!authChecked) return null; // 等待 /api/me 返回再决定跳转
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

// ── Root redirect ─────────────────────────────────────────────

function RootRedirect() {
  const { isLoggedIn, authChecked, role, firstStudentUuid } = useApp();
  if (!authChecked) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (role === 'parent') {
    return <Navigate to={`/parent/students/${firstStudentUuid}/dashboard`} replace />;
  }
  return <Navigate to="/teacher/dashboard" replace />;
}

// ── App layout (AppShell + AIPanel) ──────────────────────────
// Syncs role from URL path so sidebar shows correct nav items.

function AppLayout() {
  const { setRole, language } = useApp();
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/parent')) setRole('parent');
    else if (pathname.startsWith('/teacher')) setRole('teacher');
  }, [pathname, setRole]);

  // Extract student UUID from URL: /parent/students/:sid/...
  const sidMatch = pathname.match(/\/students\/([^/]+)/);
  const studentUuid = sidMatch?.[1] ?? '';

  // Extract report UUID from URL: .../reports/:rid
  const reportMatch = pathname.match(/\/reports\/([^/]+)/);
  const reportUuid = reportMatch?.[1] ?? '';

  return (
    <>
      <AppShell />
      <AIPanel
        studentUuid={studentUuid}
        reportUuid={reportUuid || undefined}
        uiLanguage={language}
      />
    </>
  );
}

// ── Routes ────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/settings" element={<SettingsScreen />} />

          {/* Parent routes */}
          <Route path="/parent/students/:sid/dashboard"            element={<ParentDashboard />} />
          <Route path="/parent/students/:sid/subjects/:subjectId"  element={<SubjectDetailScreen />} />
          <Route path="/parent/students/:sid/reports"              element={<ReportScreen />} />
          <Route path="/parent/students/:sid/discussions"                          element={<ParentMessages />} />
          <Route path="/parent/students/:sid/conversations/:threadUuid"           element={<ConversationScreen />} />
          <Route path="/parent/students/:sid/tasks"                element={<AnnouncementsScreen />} />
          <Route path="/parent/students/:sid/resources"            element={<ResourcesScreen />} />

          {/* Teacher routes */}
          <Route path="/teacher/dashboard"                         element={<TeacherDashboardScreen />} />
          <Route path="/teacher/messages"                          element={<TeacherMessagesScreen />} />
          <Route path="/teacher/posts"                             element={<TeacherPostsScreen />} />
          <Route path="/teacher/find-student"                      element={<FindStudentScreen />} />
          <Route path="/teacher/classes/:classUuid"                element={<ClassDetailScreen />} />
          <Route path="/teacher/students/:studentUuid"             element={<StudentDetailScreen />} />
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
