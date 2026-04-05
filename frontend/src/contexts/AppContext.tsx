// ============================================================
// Academy Linker — App Context
// Global state: theme, role, user, language, unread messages
// Navigation is handled by react-router (useNavigate / useParams)
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import i18n from '@/i18n';
import type { UserSummary } from '@/types/api';
import { auth, parent as parentApi } from '@/lib/api';
import { mockParentUser, mockTeacherUser, mockDiscussionTeachers, mockTeacherStudents } from '@/lib/mock-data';

// Hardcoded demo credentials for fallback when backend is offline
const DEMO_CREDENTIALS: Record<string, { password: string; role: 'parent' | 'teacher' }> = {
  'li.wei@email.com':         { password: 'password123', role: 'parent' },
  'thompson@westside.edu.au': { password: 'password123', role: 'teacher' },
};

// ── Context shape ─────────────────────────────────────────────

interface AppContextValue {
  /* Theme */
  theme: 'day' | 'night';
  toggleTheme: () => void;

  /* Role — kept in context so sidebar can determine which nav to show.
     Synced from URL by AppLayout (in App.tsx). */
  role: 'parent' | 'teacher';
  setRole: (r: 'parent' | 'teacher') => void;

  /* Auth */
  user: UserSummary | null;
  isLoggedIn: boolean;
  authChecked: boolean;
  firstStudentUuid: string;
  login: (
    email: string,
    password: string,
    rememberMe: boolean
  ) => Promise<{ role: 'parent' | 'teacher'; firstStudentUuid: string }>;
  logout: () => void;

  /* Language */
  language: string;
  setLanguage: (lang: string) => void;

  /* Unread messages */
  readThreadIds: Set<string>;
  markThreadRead: (id: string) => void;
  unreadMessageCount: number;
}

// ── Context ───────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'day' | 'night'>('day');
  const [role, setRoleState] = useState<'parent' | 'teacher'>('parent');
  const [user, setUser] = useState<UserSummary | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [firstStudentUuid, setFirstStudentUuid] = useState('');
  const [language, setLanguageState] = useState(i18n.language?.slice(0, 2) || 'en');
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

  // Restore session from HttpOnly cookie on page load
  useEffect(() => {
    auth.getMe().then(async (res) => {
      const u = res.data.user;
      setUser(u);
      setRoleState(u.role as 'parent' | 'teacher');
      if (u.role === 'parent') {
        const studentsRes = await parentApi.getStudents();
        setFirstStudentUuid(studentsRes.data[0]?.uuid ?? '');
      }
    }).catch(() => {
      // Not logged in — stay on login page
    }).finally(() => {
      setAuthChecked(true);
    });
  }, []);

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
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<{ role: 'parent' | 'teacher'; firstStudentUuid: string }> => {
    // Try real backend first
    try {
      const res = await auth.login({ email, password, remember_me: rememberMe });
      const userFromApi = res.data.user;
      setUser(userFromApi);
      const apiRole = userFromApi.role as 'parent' | 'teacher';
      setRoleState(apiRole);
      let sid = '';
      if (apiRole === 'parent') {
        const studentsRes = await parentApi.getStudents();
        sid = studentsRes.data[0]?.uuid ?? '';
      }
      setFirstStudentUuid(sid);
      return { role: apiRole, firstStudentUuid: sid };
    } catch {
      // Backend offline — fall back to demo credential check
    }

    // Offline fallback: role derived from DEMO_CREDENTIALS (no user selection needed)
    const cred = DEMO_CREDENTIALS[email.toLowerCase()];
    if (!cred || cred.password !== password) {
      throw new Error('invalid_credentials');
    }
    const mockUser = cred.role === 'parent' ? mockParentUser : mockTeacherUser;
    setUser(mockUser);
    setRoleState(cred.role);
    const mockSid = cred.role === 'parent' ? 's-aiden-01' : '';
    setFirstStudentUuid(mockSid);
    return { role: cred.role, firstStudentUuid: mockSid };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value: AppContextValue = {
    theme,
    toggleTheme,
    role,
    setRole,
    user,
    isLoggedIn: user !== null,
    authChecked,
    firstStudentUuid,
    login,
    logout,
    language,
    setLanguage,
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
