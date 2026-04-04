// ============================================================
// App — top-level router using simple state navigation
// Shows LoginScreen if not authenticated, AppShell + screen otherwise
// ============================================================

import { AppProvider, useApp } from '@/contexts/AppContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoginScreen } from '@/screens/LoginScreen';
import { AIPanel } from '@/components/AIPanel';

// Parent screens
import { DashboardScreen as ParentDashboard } from '@/screens/parent/DashboardScreen';
import { SubjectDetailScreen } from '@/screens/parent/SubjectDetailScreen';
import { ReportScreen } from '@/screens/parent/ReportScreen';
import { MessagesScreen as ParentMessages } from '@/screens/parent/MessagesScreen';
import { ResourcesScreen } from '@/screens/parent/ResourcesScreen';
import { AnnouncementsScreen } from '@/screens/parent/AnnouncementsScreen';

// Teacher screens
import { TeacherDashboardScreen } from '@/screens/teacher/DashboardScreen';
import { ClassDetailScreen } from '@/screens/teacher/ClassDetailScreen';
import { StudentDetailScreen } from '@/screens/teacher/StudentDetailScreen';
import { TeacherMessagesScreen } from '@/screens/teacher/MessagesScreen';
import { FindStudentScreen } from '@/screens/teacher/FindStudentScreen';

// ── Screen renderer ───────────────────────────────────────────

function ScreenContent() {
  const { role, currentScreen } = useApp();

  if (role === 'parent') {
    switch (currentScreen) {
      case 'dashboard':      return <ParentDashboard />;
      case 'subject-detail': return <SubjectDetailScreen />;
      case 'reports':        return <ReportScreen />;
      case 'messages':       return <ParentMessages />;
      case 'resources':      return <ResourcesScreen />;
      case 'announcements':  return <AnnouncementsScreen />;
      default:               return <ParentDashboard />;
    }
  }

  // Teacher role
  switch (currentScreen) {
    case 'dashboard':      return <TeacherDashboardScreen />;
    case 'class-detail':   return <ClassDetailScreen />;
    case 'student-detail': return <StudentDetailScreen />;
    case 'messages':       return <TeacherMessagesScreen />;
    case 'find-student':   return <FindStudentScreen />;
    default:               return <TeacherDashboardScreen />;
  }
}

// ── Authenticated layout ──────────────────────────────────────

function AuthenticatedApp() {
  const { isLoggedIn } = useApp();

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <>
      <AppShell>
        <ScreenContent />
      </AppShell>
      <AIPanel />
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────

export default function App() {
  return (
    <AppProvider>
      <AuthenticatedApp />
    </AppProvider>
  );
}
