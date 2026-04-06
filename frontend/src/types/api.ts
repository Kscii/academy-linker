// ============================================================
// Academy Linker — API Type Definitions
// ============================================================

// ── Pagination ──────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── Error ────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ── Translation block ────────────────────────────────────────

export interface TranslationBlock {
  zh?: string;
  en?: string;
  [lang: string]: string | undefined;
}

// ── Users ────────────────────────────────────────────────────

export type UserRole = 'parent' | 'teacher';

export interface UserSummary {
  uuid: string;
  role: UserRole;
  display_name: string;
  email: string;
  phone_number?: string;
  avatar_url?: string;
}

// ── Students ─────────────────────────────────────────────────

export interface StudentSummary {
  uuid: string;
  display_name: string;
  avatar_url?: string;
  grade?: string;
  class_name?: string;
  overall_score?: number;
}

// ── Teachers ─────────────────────────────────────────────────

export interface TeacherSummary {
  uuid: string;
  display_name: string;
  avatar_url?: string;
  subject?: string;
  email?: string;
}

// ── Subjects ─────────────────────────────────────────────────

export interface SubjectSummary {
  uuid: string;
  name: string;
  code: string;          // e.g. "math", "english"
  color: string;         // hex colour for the subject chip
  score?: number;        // latest score 0-100
  progress?: number;     // 0-100
  teacher?: TeacherSummary;
  icon?: string;
}

// ── Dashboard ────────────────────────────────────────────────

export interface SummaryCard {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'flat';
  color?: string;       // accent colour key: a1/a2/a3/a4
}

export interface ChartDataPoint {
  label: string;
  value: number;
  avg?: number;
}

export interface ImportantPostBanner {
  uuid: string;
  title: string;
  subject: string;
  teacher_name: string;
  created_at: string;
}

export interface DashboardResponse {
  student?: StudentSummary;          // returned by the real API
  summary_cards: SummaryCard[];
  subject_chart: ChartDataPoint[];   // bar chart data per subject
  trend_chart: ChartDataPoint[];     // line chart data over time
  important_post_banners: ImportantPostBanner[];
  subjects: SubjectSummary[];
}

// ── Subject Detail ───────────────────────────────────────────

export interface TimelineNode {
  uuid: string;
  title: string;
  description?: string;
  status: 'done' | 'current' | 'future';
  week?: number;
}

export interface AiSummary {
  summary: string;
  suggestions: string[];
  generated_at: string;
}

export interface SubjectDetailResponse {
  subject: SubjectSummary;
  overview: {
    current_score: number;
    term_avg: number;
    highest: number;
    lowest: number;
    class_avg: number;
  };
  trend_data: ChartDataPoint[];
  class_avg_data: ChartDataPoint[];
  timeline: TimelineNode[];
  posts: ThreadPost[];
  ai_summary?: AiSummary;
}

// ── Reports ──────────────────────────────────────────────────

export interface ReportSubjectSection {
  subject_uuid: string;
  subject_name: string;
  subject_color: string;
  score?: number;
  summary: string;
}

export interface Report {
  uuid: string;
  title: string;
  week: number;
  term: number;
  created_at: string;
  is_read: boolean;
  subjects: ReportSubjectSection[];
}

export interface ReportDetail extends Report {
  content_markdown: string;
  student: StudentSummary;
}

// ── Announcements ────────────────────────────────────────────

export interface Announcement {
  uuid: string;
  title: string;
  body_preview: string;
  created_at: string;
  is_read: boolean;
  author?: string;
  category?: string;
}

export interface AnnouncementDetail extends Announcement {
  content_markdown: string;
}

// ── Discussion / Posts ───────────────────────────────────────

export interface PostTag {
  uuid: string;
  label: string;
  color: string;
}

export interface ThreadPost {
  uuid: string;
  author: UserSummary;
  title?: string;
  content_markdown: string;
  tag_uuids?: string[];
  tags?: PostTag[];
  created_at: string;
  updated_at?: string;
  reply_to_post_uuid?: string | null;
  replies?: ThreadPost[];
  subject_uuid?: string;
  subject_name?: string;
  subject_color?: string;
}

export interface DiscussionTeacherItem {
  teacher: TeacherSummary;
  thread_uuid: string;
  last_post_at?: string;
  unread_count: number;
  subject: SubjectSummary;
  latest_message_preview?: string;
}

// ── Teacher-side ─────────────────────────────────────────────

export interface TeacherStudentItem {
  student: StudentSummary;
  overall_score: number;
  at_risk: boolean;
  unread_messages: number;
  subjects: SubjectSummary[];
}

export interface TeacherClass {
  uuid: string;
  name: string;
  subject: SubjectSummary;
  student_count: number;
  avg_score: number;
  at_risk_count: number;
  scores: number[];   // for mini bar chart
}

export interface TeacherDashboardResponse {
  summary_cards: SummaryCard[];
  classes: TeacherClass[];
}

// ── Request bodies ───────────────────────────────────────────

// ── Personalized class posts ─────────────────────────────────

export interface PostReply {
  uuid: string;
  author_name: string;
  role: 'parent' | 'teacher';
  text: string;
  sent_at: string;
}

/** A post published by a teacher to a class.
 *  Each student in the class gets their own AI-personalized version. */
export interface PersonalizedPost {
  uuid: string;
  title: string;
  original_content: string;
  target: 'all' | string;       // 'all' | classUuid
  target_label: string;
  subject_name?: string;
  subject_color?: string;
  created_at: string;
  /** studentUuid → personalized content */
  versions: Record<string, string>;
  /** studentUuid → reply list */
  replies: Record<string, PostReply[]>;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface CreatePostRequest {
  title?: string;
  content_markdown: string;
  tag_uuids?: string[];
  reply_to_post_uuid?: string | null;
}

export interface UpdatePostRequest {
  title?: string;
  content_markdown?: string;
  tag_uuids?: string[];
}
