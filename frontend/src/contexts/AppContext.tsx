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
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, firstStudentUuid } satisfies StoredSession));
}

function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
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

  /* Teacher: tracks which post+student threads have been read (red dot logic) */
  readPostReplies: Set<string>;  // key = `${postUuid}:${studentUuid}`
  markPostReplyRead: (postUuid: string, studentUuid: string) => void;

  /* Personalized class posts (teacher publishes → parents read own version) */
  classPosts: PersonalizedPost[];
  addClassPost: (post: PersonalizedPost) => void;
  addPostReply: (postUuid: string, studentUuid: string, reply: PostReply) => void;

  /* Teacher notes — persisted to localStorage, keyed by studentUuid */
  teacherNotes: Record<string, string[]>;
  addTeacherNote: (studentUuid: string, note: string) => void;
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
    fetch(`/api/threads/${key}/read`, { method: 'POST', headers: { Authorization: `Bearer ${sessionStorage.getItem('al_at') ?? ''}` } }).catch(() => {});
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
    lsLoadSet(LS_READ_POSTS, ['cp-seed-1', 'cp-seed-2', 'cp-seed-3'])
  );
  useEffect(() => {
    localStorage.setItem(LS_READ_POSTS, JSON.stringify([...readPostIds]));
  }, [readPostIds]);

  const markPostRead = useCallback((id: string) => {
    setReadPostIds(prev => new Set([...prev, id]));
  }, []);

  // Teacher notes — persisted to localStorage, keyed by studentUuid
  const [teacherNotes, setTeacherNotes] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem('al_teacher_notes');
      return raw ? JSON.parse(raw) as Record<string, string[]> : {};
    } catch { return {}; }
  });
  useEffect(() => {
    localStorage.setItem('al_teacher_notes', JSON.stringify(teacherNotes));
  }, [teacherNotes]);

  const addTeacherNote = useCallback((studentUuid: string, note: string) => {
    setTeacherNotes(prev => ({
      ...prev,
      [studentUuid]: [...(prev[studentUuid] ?? []), note],
    }));
  }, []);

  // Teacher: track which post+student threads have been viewed (unread parent reply dot)
  const [readPostReplies, setReadPostReplies] = useState<Set<string>>(new Set());

  const markPostReplyRead = useCallback((postUuid: string, studentUuid: string) => {
    setReadPostReplies(prev => new Set([...prev, `${postUuid}:${studentUuid}`]));
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
    {
      uuid: 'cp-seed-3',
      title: 'Oral Presentation — Week 10',
      original_content: "Oral presentations are scheduled for Week 10. Students will present a 3–4 minute persuasive speech. Practising at home in front of family makes a significant difference to confidence on the day.",
      target: 'class-8b-eng',
      target_label: '8B English',
      subject_name: 'English',
      subject_color: SUBJECT_COLORS.english,
      created_at: new Date(Date.now() - 10 * 86400_000).toISOString(),
      versions: {
        's-aiden-01': "Hi Li Wei! Just a heads-up that Emily's oral presentation is scheduled for Week 10. She's chosen a great topic and has solid ideas — practising out loud at home a few times will make a real difference to her confidence on the day. Rubric details are on the portal.",
      },
      replies: { 's-aiden-01': [] },
    },
    {
      uuid: 'cp-seed-4',
      title: 'Chapter 4 Test — Next Thursday',
      original_content: "We have a Chapter 4 assessment on quadratic expressions next Thursday. Students should review factoring techniques and the quadratic formula. Past papers are on the portal.",
      target: 'class-7a-math',
      target_label: '7A Mathematics',
      subject_name: 'Mathematics',
      subject_color: SUBJECT_COLORS.math,
      created_at: new Date(Date.now() - 7 * 86400_000).toISOString(),
      versions: {
        's-aiden-01': "Hi Li Wei! Emily has a Chapter 4 Maths test next Thursday on quadratic expressions. Based on her recent quiz results (82%), she's in a good position — I'd focus revision on factoring and the quadratic formula. I'm running a lunchtime session Wednesday if she'd like to attend.",
      },
      replies: {
        's-aiden-01': [
          { uuid: 'pr-s4-1', author_name: 'Li Wei', role: 'parent', text: "Thanks Mr. Roberts! She'll definitely come to the Wednesday session. Is there anything she should bring?", sent_at: new Date(Date.now() - 6 * 86400_000).toISOString() },
          { uuid: 'pr-s4-2', author_name: 'Mr. Roberts', role: 'teacher', text: "Just her exercise book and a pencil. I'll provide the practice problems. Great to hear she's coming!", sent_at: new Date(Date.now() - 5 * 86400_000 - 20 * 3600_000).toISOString() },
        ],
      },
    },
    {
      uuid: 'cp-seed-5',
      title: 'Science Fair — Final Week!',
      original_content: "Science fair final submissions are due this Friday. Students should have their display board, data tables, and written report ready. Judging takes place Monday Week 9.",
      target: 'class-7a-sci',
      target_label: '7A Science',
      subject_name: 'Science',
      subject_color: SUBJECT_COLORS.science,
      created_at: new Date(Date.now() - 3 * 86400_000).toISOString(),
      versions: {
        's-aiden-01': "Hi Li Wei! Quick reminder that Emily's science fair project is due this Friday. Her plant growth experiment is looking fantastic — she just needs to finalise her discussion section and mount everything on the display board. The school provides the board and printing. Judging is Monday Week 9 — very exciting!",
      },
      replies: {
        's-aiden-01': [
          { uuid: 'pr-s5-1', author_name: 'Li Wei', role: 'parent', text: "She's been working so hard on it! We're really proud. Is there anything specific the judges look for?", sent_at: new Date(Date.now() - 2 * 86400_000 - 10 * 3600_000).toISOString() },
          { uuid: 'pr-s5-2', author_name: 'Dr. Chen', role: 'teacher', text: "The judges look for: a clear hypothesis, rigorous data collection, honest analysis (including limitations), and confidence answering questions. Emily's data collection has been excellent. Make sure she can explain *why* red light produced faster growth — that will impress the panel.", sent_at: new Date(Date.now() - 2 * 86400_000 - 3 * 3600_000).toISOString() },
        ],
      },
    },
    {
      uuid: 'cp-seed-6',
      title: 'Athletics Carnival — Great Results!',
      original_content: "What a fantastic athletics carnival! The students showed tremendous school spirit and personal bests were broken across multiple events. We are very proud of everyone's effort.",
      target: 'all',
      target_label: 'All Classes',
      subject_name: 'Physical Education',
      subject_color: SUBJECT_COLORS.pe,
      created_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
      versions: {
        's-aiden-01': "Hi Li Wei! What a day — Emily was absolutely brilliant at the athletics carnival. She placed 2nd in the 800m with a personal best time, and her relay contribution was outstanding. Her fitness improvement this term has been remarkable. You should be very proud!",
      },
      replies: { 's-aiden-01': [] },
    },
  ]);

  const addClassPost = useCallback((post: PersonalizedPost) => {
    setClassPosts(prev => {
      if (prev.some(p => p.uuid === post.uuid)) return prev; // dedup
      return [post, ...prev];
    });
    // Broadcast new post to other tabs
    try {
      const key = 'al_new_posts';
      const posts: PersonalizedPost[] = JSON.parse(localStorage.getItem(key) ?? '[]');
      posts.push(post);
      localStorage.setItem(key, JSON.stringify(posts));
    } catch { /* ignore */ }
  }, []);

  const unreadNoticeCount = unreadAnnCount + classPosts.filter(p => !readPostIds.has(p.uuid)).length;

  const applyReplyEvent = useCallback((postUuid: string, studentUuid: string, reply: PostReply) => {
    setClassPosts(prev => prev.map(p => {
      if (p.uuid !== postUuid) return p;
      const existing = p.replies[studentUuid] ?? [];
      if (existing.some(r => r.uuid === reply.uuid)) return p; // dedup
      return { ...p, replies: { ...p.replies, [studentUuid]: [...existing, reply] } };
    }));
  }, []);

  const addPostReply = useCallback((postUuid: string, studentUuid: string, reply: PostReply) => {
    applyReplyEvent(postUuid, studentUuid, reply);
    // Broadcast to other tabs via localStorage storage event
    try {
      const key = 'al_reply_events';
      const events: { postUuid: string; studentUuid: string; reply: PostReply }[] =
        JSON.parse(localStorage.getItem(key) ?? '[]');
      events.push({ postUuid, studentUuid, reply });
      // Keep last 200 events to avoid unbounded growth
      if (events.length > 200) events.splice(0, events.length - 200);
      localStorage.setItem(key, JSON.stringify(events));
    } catch { /* storage unavailable */ }
  }, [applyReplyEvent]);

  // Listen for cross-tab reply broadcasts
  useEffect(() => {
    // Apply any existing events from other tabs (e.g. teacher already replied before parent opened)
    try {
      const events: { postUuid: string; studentUuid: string; reply: PostReply }[] =
        JSON.parse(localStorage.getItem('al_reply_events') ?? '[]');
      for (const { postUuid, studentUuid, reply } of events) {
        applyReplyEvent(postUuid, studentUuid, reply);
      }
    } catch { /* ignore */ }

    // Apply any new posts published in another tab
    try {
      const posts: PersonalizedPost[] = JSON.parse(localStorage.getItem('al_new_posts') ?? '[]');
      for (const post of posts) {
        setClassPosts(prev => prev.some(p => p.uuid === post.uuid) ? prev : [post, ...prev]);
      }
    } catch { /* ignore */ }

    const handler = (e: StorageEvent) => {
      if (e.key === 'al_reply_events' && e.newValue) {
        try {
          const events: { postUuid: string; studentUuid: string; reply: PostReply }[] = JSON.parse(e.newValue);
          const latest = events[events.length - 1];
          if (latest) applyReplyEvent(latest.postUuid, latest.studentUuid, latest.reply);
        } catch { /* ignore */ }
      }
      if (e.key === 'al_new_posts' && e.newValue) {
        try {
          const posts: PersonalizedPost[] = JSON.parse(e.newValue);
          const latest = posts[posts.length - 1];
          if (latest) setClassPosts(prev => prev.some(p => p.uuid === latest.uuid) ? prev : [latest, ...prev]);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [applyReplyEvent]);

  // On mount: mark all pre-seeded parent replies as already read
  // Use a ref to capture initial classPosts without causing re-renders
  useEffect(() => {
    setClassPosts(curr => {
      const initial = new Set<string>();
      for (const post of curr) {
        for (const [studentUuid, replies] of Object.entries(post.replies)) {
          if ((replies as PostReply[]).some((r: PostReply) => r.role === 'parent')) {
            initial.add(`${post.uuid}:${studentUuid}`);
          }
        }
      }
      setReadPostReplies(initial);
      return curr; // no change to classPosts
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    readPostReplies,
    markPostReplyRead,
    classPosts,
    addClassPost,
    addPostReply,
    teacherNotes,
    addTeacherNote,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
