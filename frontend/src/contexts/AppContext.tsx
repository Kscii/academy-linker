// ============================================================
// Academy Linker — App Context
// Global state: theme, role, user, navigation, language
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { UserSummary } from '@/types/api';
import { auth } from '@/lib/api';
import { mockParentUser, mockTeacherUser, mockDiscussionTeachers, mockTeacherStudents } from '@/lib/mock-data';

// Hardcoded demo credentials for fallback when backend is offline
const DEMO_CREDENTIALS: Record<string, { password: string; role: 'parent' | 'teacher' }> = {
  'li.wei@email.com':          { password: 'password123', role: 'parent' },
  'thompson@westside.edu.au':  { password: 'password123', role: 'teacher' },
};

// ── Screen names ─────────────────────────────────────────────

export type ParentScreen =
  | 'dashboard'
  | 'subject-detail'
  | 'reports'
  | 'messages'
  | 'resources'
  | 'announcements';

export type TeacherScreen =
  | 'dashboard'
  | 'class-detail'
  | 'student-detail'
  | 'messages'
  | 'find-student';

export type AppScreen = ParentScreen | TeacherScreen;

// ── Context shape ─────────────────────────────────────────────

interface AppContextValue {
  /* Theme */
  theme: 'day' | 'night';
  toggleTheme: () => void;

  /* Role */
  role: 'parent' | 'teacher';
  setRole: (r: 'parent' | 'teacher') => void;

  /* Auth */
  user: UserSummary | null;
  isLoggedIn: boolean;
  login: (email: string, password: string, rememberMe: boolean, role: 'parent' | 'teacher') => Promise<void>;
  logout: () => void;

  /* Navigation */
  currentScreen: AppScreen;
  navigate: (screen: AppScreen, params?: NavigationParams) => void;

  /* Student context (parent view) */
  currentStudentUuid: string | null;
  setCurrentStudentUuid: (uuid: string | null) => void;

  /* Subject context */
  currentSubjectUuid: string | null;
  setCurrentSubjectUuid: (uuid: string | null) => void;

  /* Class / teacher context */
  currentClassUuid: string | null;
  setCurrentClassUuid: (uuid: string | null) => void;
  currentStudentDetailUuid: string | null;
  setCurrentStudentDetailUuid: (uuid: string | null) => void;

  /* Language */
  language: string;
  setLanguage: (lang: string) => void;

  /* Navigation params stack */
  navParams: NavigationParams;

  /* Unread messages */
  readThreadIds: Set<string>;
  markThreadRead: (id: string) => void;
  unreadMessageCount: number;
}

export interface NavigationParams {
  subjectUuid?: string;
  classUuid?: string;
  studentUuid?: string;
  [key: string]: string | undefined;
}

// ── Context ───────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'day' | 'night'>('day');
  const [role, setRoleState] = useState<'parent' | 'teacher'>('parent');
  const [user, setUser] = useState<UserSummary | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [currentStudentUuid, setCurrentStudentUuid] = useState<string | null>('student-001');
  const [currentSubjectUuid, setCurrentSubjectUuid] = useState<string | null>(null);
  const [currentClassUuid, setCurrentClassUuid] = useState<string | null>(null);
  const [currentStudentDetailUuid, setCurrentStudentDetailUuid] = useState<string | null>(null);
  const [language, setLanguage] = useState('en');
  const [navParams, setNavParams] = useState<NavigationParams>({});
  const [readThreadIds, setReadThreadIds] = useState<Set<string>>(new Set());

  const markThreadRead = useCallback((id: string) => {
    setReadThreadIds(prev => new Set([...prev, id]));
  }, []);

  // Total unread = sum of per-thread counts, minus those already read
  const unreadMessageCount =
    role === 'parent'
      ? mockDiscussionTeachers
          .filter(t => !readThreadIds.has(t.teacher.uuid) && t.unread_count > 0)
          .reduce((sum, t) => sum + t.unread_count, 0)
      : mockTeacherStudents
          .filter(s => !readThreadIds.has(s.student.uuid) && s.unread_messages > 0)
          .reduce((sum, s) => sum + s.unread_messages, 0);

  // Apply theme class to <html>
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'night') {
      html.classList.add('night');
    } else {
      html.classList.remove('night');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'day' ? 'night' : 'day'));
  }, []);

  const setRole = useCallback((r: 'parent' | 'teacher') => {
    setRoleState(r);
    setCurrentScreen('dashboard');
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean,
    loginRole: 'parent' | 'teacher'
  ) => {
    // Try real backend first
    try {
      const res = await auth.login({ email, password, remember_me: rememberMe });
      setUser(res.data.user);
      setRoleState(res.data.user.role as 'parent' | 'teacher');
      setCurrentScreen('dashboard');
      return;
    } catch {
      // Backend offline — fall back to demo credential check
    }

    // Offline fallback: validate against hardcoded demo credentials
    const cred = DEMO_CREDENTIALS[email.toLowerCase()];
    if (!cred || cred.password !== password) {
      throw new Error('invalid_credentials');
    }
    const mockUser = loginRole === 'parent' ? mockParentUser : mockTeacherUser;
    setUser(mockUser);
    setRoleState(loginRole);
    setCurrentScreen('dashboard');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCurrentScreen('dashboard');
  }, []);

  const navigate = useCallback((screen: AppScreen, params: NavigationParams = {}) => {
    setCurrentScreen(screen);
    setNavParams(params);
    if (params.subjectUuid) setCurrentSubjectUuid(params.subjectUuid);
    if (params.classUuid) setCurrentClassUuid(params.classUuid);
    if (params.studentUuid) setCurrentStudentDetailUuid(params.studentUuid);
  }, []);

  const value: AppContextValue = {
    theme,
    toggleTheme,
    role,
    setRole,
    user,
    isLoggedIn: user !== null,
    login,
    logout,
    currentScreen,
    navigate,
    currentStudentUuid,
    setCurrentStudentUuid,
    currentSubjectUuid,
    setCurrentSubjectUuid,
    currentClassUuid,
    setCurrentClassUuid,
    currentStudentDetailUuid,
    setCurrentStudentDetailUuid,
    language,
    setLanguage,
    navParams,
    readThreadIds,
    markThreadRead,
    unreadMessageCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
