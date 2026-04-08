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
  useRef,
  type ReactNode,
} from 'react';
import i18n from '@/i18n';
import type { UserSummary } from '@/types/api';
import { auth, parent as parentApi, settingsApi, setSessionExpiredHandler } from '@/lib/api';

// ── Local session persistence ─────────────────────────────────
const SESSION_KEY = 'academy_session';
const PREFERRED_LANGUAGE_KEY = 'al_pending_language';

interface StoredSession {
  user: UserSummary;
  firstStudentUuid: string;
}

function saveSession(user: UserSummary, firstStudentUuid: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ user, firstStudentUuid } satisfies StoredSession));
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function loadPendingLanguage(): string | null {
  try {
    return localStorage.getItem(PREFERRED_LANGUAGE_KEY);
  } catch {
    return null;
  }
}

function savePendingLanguage(lang: string) {
  localStorage.setItem(PREFERRED_LANGUAGE_KEY, lang);
}

// ── Context shape ─────────────────────────────────────────────

interface AppContextValue {
  /* Theme */
  theme: 'day' | 'night';
  toggleTheme: () => void;

  /* Role — kept in context so sidebar can determine which nav to show.
     Synced from URL by AppLayout (in App.tsx). */
  role: 'parent' | 'teacher' | 'admin';
  setRole: (r: 'parent' | 'teacher' | 'admin') => void;

  /* Auth */
  user: UserSummary | null;
  isLoggedIn: boolean;
  authChecked: boolean;
  firstStudentUuid: string;
  login: (
    email: string,
    password: string,
    rememberMe: boolean
  ) => Promise<{ role: 'parent' | 'teacher' | 'admin'; firstStudentUuid: string }>;
  logout: () => void;

  /* Language */
  language: string;
  setLanguage: (lang: string) => void;

  /* Unread messages — keyed by thread_uuid (parent) or student.uuid (teacher) */
  threadUnreadCounts: Record<string, number>;
  markThreadRead: (key: string) => void;
  updateThreadUnreadCounts: (counts: Record<string, number>) => void;
  unreadMessageCount: number;

  /* Unread announcements */
  readAnnouncementIds: Set<string>;
  markAnnouncementRead: (id: string) => void;
  unreadNoticeCount: number;
  setAnnouncementUuids: (ids: string[]) => void;
}

// ── Context ───────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

// ── localStorage persistence keys ────────────────────────────
const LS_READ_ANN    = 'al_read_ann_v3';
const LS_THREAD_CNTS = 'al_thread_counts_v3';

function lsLoadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function lsLoadRecord(key: string, defaults: Record<string, number>): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch { /* ignore */ }
  return defaults;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'day' | 'night'>(() => {
    const saved = localStorage.getItem('al_theme');
    if (saved === 'night' || saved === 'day') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
  });
  const [role, setRoleState] = useState<'parent' | 'teacher' | 'admin'>('parent');
  const [user, setUser] = useState<UserSummary | null>(null);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [firstStudentUuid, setFirstStudentUuid] = useState('');
  const [language, setLanguageState] = useState(loadPendingLanguage() || i18n.language?.slice(0, 2) || 'en');

  // Thread unread counts — persisted so read state survives refresh
  const [threadUnreadCounts, setThreadUnreadCounts] = useState<Record<string, number>>(() =>
    lsLoadRecord(LS_THREAD_CNTS, {})
  );
  useEffect(() => {
    localStorage.setItem(LS_THREAD_CNTS, JSON.stringify(threadUnreadCounts));
  }, [threadUnreadCounts]);

  // Tracks threads the user explicitly read — poll won't restore stale counts for 10s
  const recentlyReadRef = useRef<Map<string, number>>(new Map());

  const markThreadRead = useCallback((key: string) => {
    setThreadUnreadCounts(prev => ({ ...prev, [key]: 0 }));
    recentlyReadRef.current.set(key, Date.now());
  }, []);

  const updateThreadUnreadCounts = useCallback((counts: Record<string, number>) => {
    const now = Date.now();
    setThreadUnreadCounts(prev => {
      const next = { ...prev };
      for (const [key, count] of Object.entries(counts)) {
        const readAt = recentlyReadRef.current.get(key);
        if (readAt !== undefined && now - readAt < 10_000) {
          if (count === 0) recentlyReadRef.current.delete(key);
          continue;
        }
        if (count > (prev[key] ?? 0)) next[key] = count;
      }
      return next;
    });
  }, []);

  // Read announcement IDs — persisted
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(() =>
    lsLoadSet(LS_READ_ANN)
  );
  useEffect(() => {
    localStorage.setItem(LS_READ_ANN, JSON.stringify([...readAnnouncementIds]));
  }, [readAnnouncementIds]);

  const markAnnouncementRead = useCallback((id: string) => {
    setReadAnnouncementIds(prev => new Set([...prev, id]));
  }, []);

  // Track all known announcement UUIDs (fetched from API) so unread count is accurate
  const [announcementUuids, setAnnouncementUuids] = useState<string[]>([]);
  const unreadNoticeCount = announcementUuids.filter(id => !readAnnouncementIds.has(id)).length;

  // Total unread messages = sum of all persisted counts (populated by MessagesScreen API call)
  const unreadMessageCount = Object.values(threadUnreadCounts).reduce((sum, c) => sum + c, 0);

  // Background poll every 5s — keeps nav unread badge in sync for parent
  useEffect(() => {
    if (!user) return;
    const poll = () => {
      if (user.role === 'parent' && firstStudentUuid) {
        parentApi.getDiscussionTeachers(firstStudentUuid).then(res => {
          updateThreadUnreadCounts(
            Object.fromEntries(
              res.data
                .filter((t): t is typeof t & { thread_uuid: string } => t.thread_uuid != null)
                .map(t => [t.thread_uuid, t.unread_post_count])
            )
          );
        }).catch(() => {});
      }
    };
    poll();
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uuid, firstStudentUuid]);

  const applyLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    savePendingLanguage(lang);
    i18n.changeLanguage(lang);
  }, []);

  // Restore session on page load
  useEffect(() => {
    // 注册 refresh token 失效处理器：清除 localStorage 和 React state 中的过期 session
    // 避免页面在 /login 重复跳转自身导致无限重定向循环
    setSessionExpiredHandler(() => {
      clearSession();
      setUser(null);
    });

    const stored = loadSession();
    if (stored) {
      setUser(stored.user);
      setRoleState(stored.user.role as 'parent' | 'teacher' | 'admin');
      setFirstStudentUuid(stored.firstStudentUuid);
      setInitialCheckDone(true);
    }

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000)
    );
    Promise.race([auth.getMe(), timeout]).then(async (res) => {
      const u = res.data.user;
      setUser(u);
      setRoleState(u.role as 'parent' | 'teacher' | 'admin');
      try {
        const settingsRes = await settingsApi.get();
        const preferredLanguage = settingsRes.data.language?.slice(0, 2);
        if (preferredLanguage) {
          applyLanguage(preferredLanguage);
        }
      } catch { /* ignore settings fetch failures */ }
      let sid = stored?.firstStudentUuid ?? '';
      if (u.role === 'parent') {
        try {
          const studentsRes = await parentApi.getStudents();
          sid = studentsRes.data[0]?.uuid ?? sid;
        } catch { /* keep stored sid */ }
      }
      setFirstStudentUuid(sid);
      saveSession(u, sid);
    }).catch(() => {
      if (!stored) setInitialCheckDone(true);
    });
  }, [applyLanguage]);

  // Apply theme class to <html> and persist
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'night') {
      html.classList.add('night');
    } else {
      html.classList.remove('night');
    }
    localStorage.setItem('al_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'day' ? 'night' : 'day'));
  }, []);

  const setRole = useCallback((r: 'parent' | 'teacher' | 'admin') => {
    setRoleState(r);
  }, []);

  const setLanguage = useCallback((lang: string) => {
    applyLanguage(lang);
    if (user) {
      void settingsApi.update({ language: lang }).catch(() => {});
    }
  }, [applyLanguage, user]);

  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<{ role: 'parent' | 'teacher' | 'admin'; firstStudentUuid: string }> => {
    const res = await auth.login({ email, password, remember_me: rememberMe });
    const userFromApi = res.data.user;
    setUser(userFromApi);
    const apiRole = userFromApi.role as 'parent' | 'teacher' | 'admin';
    setRoleState(apiRole);
    const pendingLanguage = loadPendingLanguage() || language;
    if (pendingLanguage) {
      try {
        await settingsApi.update({ language: pendingLanguage });
      } catch { /* ignore settings sync failures */ }
    }
    try {
      const settingsRes = await settingsApi.get();
      const preferredLanguage = settingsRes.data.language?.slice(0, 2);
      if (preferredLanguage) {
        applyLanguage(preferredLanguage);
      }
    } catch { /* ignore settings fetch failures */ }
    let sid = '';
    if (apiRole === 'parent') {
      const studentsRes = await parentApi.getStudents();
      sid = studentsRes.data[0]?.uuid ?? '';
    }
    setFirstStudentUuid(sid);
    saveSession(userFromApi, sid);
    return { role: apiRole, firstStudentUuid: sid };
  }, [applyLanguage, language]);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value: AppContextValue = {
    theme,
    toggleTheme,
    role,
    setRole,
    user,
    isLoggedIn: user !== null,
    authChecked: initialCheckDone || user !== null,
    firstStudentUuid,
    login,
    logout,
    language,
    setLanguage,
    threadUnreadCounts,
    markThreadRead,
    updateThreadUnreadCounts,
    unreadMessageCount,
    readAnnouncementIds,
    markAnnouncementRead,
    unreadNoticeCount,
    setAnnouncementUuids,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
