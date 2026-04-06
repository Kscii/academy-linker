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
import type { UserSummary, PersonalizedPost, PostReply } from '@/types/api';
import { auth, parent as parentApi, teacher as teacherApi } from '@/lib/api';
import { mockParentUser, mockTeacherUser, mockAnnouncements, SUBJECT_COLORS } from '@/lib/mock-data';

// Hardcoded demo credentials for fallback when backend is offline
const DEMO_CREDENTIALS: Record<string, { password: string; role: 'parent' | 'teacher' }> = {
  'li.wei@email.com':         { password: 'password123', role: 'parent' },
  'thompson@westside.edu.au': { password: 'password123', role: 'teacher' },
};

// ── Local session persistence ─────────────────────────────────
const SESSION_KEY = 'academy_session';

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

  /* Unread class posts (teacher → personalized parent posts) */
  readPostIds: Set<string>;
  markPostRead: (id: string) => void;

  /* Personalized class posts (teacher publishes → parents read own version) */
  classPosts: PersonalizedPost[];
  addClassPost: (post: PersonalizedPost) => void;
  addPostReply: (postUuid: string, studentUuid: string, reply: PostReply) => void;
}

// ── Context ───────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

// ── localStorage persistence keys ────────────────────────────
const LS_READ_ANN    = 'al_read_ann_v3';
const LS_READ_POSTS  = 'al_read_posts_v3';
const LS_THREAD_CNTS = 'al_thread_counts_v3';

function lsLoadSet(key: string, defaults: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set(defaults);
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
  const [language, setLanguageState] = useState(i18n.language?.slice(0, 2) || 'en');

  // Thread unread counts — persisted so read state survives refresh
  // Default is empty: real counts come from the API (MessagesScreen)
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
    fetch(`/api/threads/${key}/read`, { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  const updateThreadUnreadCounts = useCallback((counts: Record<string, number>) => {
    const now = Date.now();
    setThreadUnreadCounts(prev => {
      const next = { ...prev };
      for (const [key, count] of Object.entries(counts)) {
        const readAt = recentlyReadRef.current.get(key);
        if (readAt !== undefined && now - readAt < 10_000) {
          // Within 10s grace period — server confirms read when it returns 0
          if (count === 0) recentlyReadRef.current.delete(key);
          // Don't let stale server count restore the badge
          continue;
        }
        if (count > (prev[key] ?? 0)) next[key] = count;
      }
      return next;
    });
  }, []);

  // Read announcement IDs — persisted
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(() =>
    lsLoadSet(LS_READ_ANN, mockAnnouncements.filter(a => a.is_read).map(a => a.uuid).concat(['ann-003']))
  );
  useEffect(() => {
    localStorage.setItem(LS_READ_ANN, JSON.stringify([...readAnnouncementIds]));
  }, [readAnnouncementIds]);

  const markAnnouncementRead = useCallback((id: string) => {
    setReadAnnouncementIds(prev => new Set([...prev, id]));
  }, []);

  // Class post read IDs — persisted
  const [readPostIds, setReadPostIds] = useState<Set<string>>(() =>
    lsLoadSet(LS_READ_POSTS, ['cp-seed-1', 'cp-seed-2'])
  );
  useEffect(() => {
    localStorage.setItem(LS_READ_POSTS, JSON.stringify([...readPostIds]));
  }, [readPostIds]);

  const markPostRead = useCallback((id: string) => {
    setReadPostIds(prev => new Set([...prev, id]));
  }, []);

  // Track all known announcement UUIDs (mock + API-fetched) so unread count is accurate
  const [announcementUuids, setAnnouncementUuids] = useState<string[]>(
    mockAnnouncements.map(a => a.uuid)
  );
  // computed after classPosts is declared (see below)
  const unreadAnnCount = announcementUuids.filter(id => !readAnnouncementIds.has(id)).length;


  // ── Personalized class posts seed ────────────────────────────
  const [classPosts, setClassPosts] = useState<PersonalizedPost[]>([
    {
      uuid: 'cp-seed-1',
      title: 'Creative Writing Assignment Feedback',
      original_content: "Student's short story submission was creative and well-structured. The narrative voice was distinctive — the main growth area is varied sentence structure to improve flow. Encourage reading widely this term.",
      target: 'class-8b-eng',
      target_label: '8B English',
      subject_name: 'English',
      subject_color: SUBJECT_COLORS.english,
      created_at: new Date(Date.now() - 86400_000).toISOString(),
      versions: {
        's-aiden-01': "Emily's short story submission was creative and well-structured. She received 75/100. Her narrative voice is distinctive — her main growth area is varied sentence structure to improve flow. Encourage her to read widely this term.",
      },
      replies: {
        's-aiden-01': [
          { uuid: 'pr-s1-1', author_name: 'Li Wei', role: 'parent', text: "Thank you so much, Ms. Thompson! We'll encourage Emily to read more novels this month. Are there any specific genres you'd recommend?", sent_at: new Date(Date.now() - 20 * 3600_000).toISOString() },
        ],
      },
    },
    {
      uuid: 'cp-seed-2',
      title: 'Reading Log Reminder',
      original_content: "A reminder that reading logs are due every Friday. The next comprehension task covers persuasive texts, so non-fiction reading at home is especially helpful.",
      target: 'class-8b-eng',
      target_label: '8B English',
      subject_name: 'English',
      subject_color: SUBJECT_COLORS.english,
      created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
      versions: {
        's-aiden-01': "Hi Li Wei! A reminder that Emily's reading logs are due every Friday. She has been consistent — keep it up! The next comprehension task covers persuasive texts, so non-fiction reading (like newspaper articles) at home is especially helpful for Emily.",
      },
      replies: {
        's-aiden-01': [
          { uuid: 'pr-s2-1', author_name: 'Li Wei', role: 'parent', text: "Noted! We've been reading a newspaper together on weekends — would that count as non-fiction practice?", sent_at: new Date(Date.now() - 4 * 86400_000).toISOString() },
          { uuid: 'pr-s2-2', author_name: 'Ms. Thompson', role: 'teacher', text: "Absolutely! Newspaper articles are excellent for persuasive text comprehension. Keep it up!", sent_at: new Date(Date.now() - 3 * 86400_000 - 12 * 3600_000).toISOString() },
        ],
      },
    },
  ]);

  const addClassPost = useCallback((post: PersonalizedPost) => {
    setClassPosts(prev => [post, ...prev]);
  }, []);

  const unreadNoticeCount = unreadAnnCount + classPosts.filter(p => !readPostIds.has(p.uuid)).length;

  const addPostReply = useCallback((postUuid: string, studentUuid: string, reply: PostReply) => {
    setClassPosts(prev => prev.map(p =>
      p.uuid === postUuid
        ? { ...p, replies: { ...p.replies, [studentUuid]: [...(p.replies[studentUuid] ?? []), reply] } }
        : p
    ));
  }, []);

  // Total unread = sum of all persisted counts (populated by MessagesScreen API call)
  const unreadMessageCount = Object.values(threadUnreadCounts).reduce((sum, c) => sum + c, 0);

  // Background poll every 5s — keeps nav unread badge in sync for both roles
  useEffect(() => {
    if (!user) return;
    const poll = () => {
      if (user.role === 'parent' && firstStudentUuid) {
        parentApi.getDiscussionTeachers(firstStudentUuid).then(res => {
          updateThreadUnreadCounts(
            Object.fromEntries(res.data.map((t: { thread_uuid: string; unread_count: number }) => [t.thread_uuid, t.unread_count]))
          );
        }).catch(() => {});
      } else if (user.role === 'teacher') {
        teacherApi.getStudents().then(res => {
          const counts: Record<string, number> = {};
          for (const item of res.data) counts[item.student.uuid] = item.unread_messages;
          updateThreadUnreadCounts(counts);
        }).catch(() => {});
      }
    };
    poll();
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uuid, firstStudentUuid]);

  // Restore session on page load:
  // 1. Immediately restore from localStorage (works offline, no flash)
  // 2. Silently verify with backend in background; update if session changed
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setUser(stored.user);
      setRoleState(stored.user.role as 'parent' | 'teacher' | 'admin');
      setFirstStudentUuid(stored.firstStudentUuid);
      setInitialCheckDone(true);   // show app immediately
    }

    // Background sync with backend (best-effort, 3s timeout)
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000)
    );
    Promise.race([auth.getMe(), timeout]).then(async (res) => {
      const u = res.data.user;
      setUser(u);
      setRoleState(u.role as 'parent' | 'teacher' | 'admin');
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
      if (!stored) setInitialCheckDone(true); // no stored session → go to login
    });
  }, []);

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
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<{ role: 'parent' | 'teacher' | 'admin'; firstStudentUuid: string }> => {
    // Try real backend first
    try {
      const res = await auth.login({ email, password, remember_me: rememberMe });
      const userFromApi = res.data.user;
      setUser(userFromApi);
      const apiRole = userFromApi.role as 'parent' | 'teacher' | 'admin';
      setRoleState(apiRole);
      let sid = '';
      if (apiRole === 'parent') {
        const studentsRes = await parentApi.getStudents();
        sid = studentsRes.data[0]?.uuid ?? '';
      }
      setFirstStudentUuid(sid);
      saveSession(userFromApi, sid);
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
    saveSession(mockUser, mockSid);
    return { role: cred.role, firstStudentUuid: mockSid };
  }, []);

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
    readPostIds,
    markPostRead,
    classPosts,
    addClassPost,
    addPostReply,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
