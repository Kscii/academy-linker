// ============================================================
// Academy Linker — API Type Definitions
// Aligned with API Design Document v1
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

export interface SelectOption {
  value: string;
  label: string;
  meta?: Record<string, string | number | boolean | null>;
}

// ── Error ────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ── Translation ──────────────────────────────────────────────

export type TranslationStatus =
  | 'not_required'
  | 'pending'
  | 'completed'
  | 'failed'
  | 'stale';

export interface TranslationBlock {
  display_language: string;
  original_language: string;
  translated_language: string | null;
  translation_status: TranslationStatus;
  translated_at: string | null;
}

// ── Users ────────────────────────────────────────────────────

export type UserRole = 'parent' | 'teacher' | 'admin';

export interface UserSummary {
  uuid: string;
  role: UserRole;
  display_name: string;
  email: string;
  phone_number?: string | null;
  avatar_url?: string | null;
}

export interface Session {
  uuid: string;
  device_label: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
  is_current: boolean;
}

// ── Settings ─────────────────────────────────────────────────

export type ThemeOption = 'system' | 'light' | 'dark';
export type TimeRangeOption = 'all_time' | '7d' | '30d' | '90d';
export type AiChatStyle = 'default' | 'summary' | 'parent_friendly';

export interface UserSettings {
  language: string | null;
  timezone: string | null;
  theme: ThemeOption;
  high_contrast_mode: boolean;
  tts_enabled: boolean;
  email_digest_enabled: boolean;
  email_post_notification_enabled: boolean;
  default_report_time_range: TimeRangeOption;
  default_announcement_time_range: TimeRangeOption;
  ai_chat_style: AiChatStyle;
  ai_auto_translate_enabled: boolean;
}

export interface TtsAudioData {
  audio_uuid: string;
  audio_url: string;
  mime_type: string;
  source_language: string;
  voice_key: string;
  provider: string;
  cached: boolean;
}

// ── Students ─────────────────────────────────────────────────

export interface StudentSummary {
  uuid: string;
  sid: string | null;
  full_name: string;
  preferred_name: string | null;
  class_uuid: string | null;
  class_name: string | null;
  grade_level: string | null;
  avatar_url: string | null;
  date_of_birth?: string | null;
}

// ── Tags ─────────────────────────────────────────────────────

export interface PostTag {
  uuid: string;
  name: string;
  scope: 'system' | 'teacher_private';
  owner_teacher_uuid?: string | null;
  is_selectable_by_parent?: boolean;
  is_selectable_by_teacher?: boolean;
  affects_business_logic?: boolean;
}

export interface SystemTag {
  uuid: string;
  name: string;
  scope: 'system';
  is_selectable_by_parent: boolean;
  is_selectable_by_teacher: boolean;
  affects_business_logic: boolean;
}

// ── Subjects ─────────────────────────────────────────────────

export interface SubjectTeacherBrief {
  uuid: string;
  display_name: string;
  email?: string;
}

export interface SubjectSummary {
  uuid: string;
  name: string;
  code: string | null;
  teachers?: SubjectTeacherBrief[];
  /** Client-side injected from SUBJECT_COLORS — not returned by API */
  color?: string;
  /** Client-side injected from subject_statistics — not returned by subjects endpoint */
  score?: number;
  progress?: number;
}

// ── Dashboard (Parent) ───────────────────────────────────────

export interface DashboardSummaryItem {
  report_uuid: string;
  report_title: string;
  display_text: string;
  original_text: string;
  translated_text: string | null;
  display_language: string;
  original_language: string;
  translated_language: string | null;
  translation_status: TranslationStatus;
  translated_at: string | null;
}

export interface SubjectStatistic {
  subject_uuid: string;
  subject_name: string;
  subject_code: string | null;
  score: number;
  progress: number;
  assignment_completion_rate: number;
}

export interface ImportantPostBanner {
  post_uuid: string;
  teacher_uuid: string;
  teacher_display_name: string;
  title: string | null;
  preview_text: string;
  created_at: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  avg?: number;
}

export interface DashboardResponse {
  student: StudentSummary;
  dashboard_context: {
    selected_range: string;
    unread_post_count: number;
    unread_announcement_count: number;
  };
  summary_cards: {
    overall_performance_index: number | null;
    assignment_completion_rate: number | null;
    attendance_rate: number | null;
    summary: DashboardSummaryItem | null;
  };
  subject_statistics: SubjectStatistic[];
  charts: {
    subject_score_bar_chart: { subject_uuid: string; subject_name: string; value: number }[];
    subject_completion_bar_chart: { subject_uuid: string; subject_name: string; value: number }[];
    learning_progress_chart: ChartDataPoint[];
  };
  important_post_banners: ImportantPostBanner[];
}

// ── Subject Detail ───────────────────────────────────────────

export interface SubjectDetailOverview {
  current_score: number;
  term_avg: number;
  highest: number;
  lowest: number;
  class_avg: number;
  assignment_completion_rate: number;
  attendance_rate: number;
}

export interface LearningPathwayNode {
  uuid: string;
  title: string;
  description: string | null;
  status: 'completed' | 'in_progress' | 'upcoming';
  week: number | null;
}

export interface PostAuthorBrief {
  uuid: string;
  display_name: string;
  role: 'parent' | 'teacher' | 'admin';
}

export interface ThreadPost {
  uuid: string;
  author: PostAuthorBrief;
  title: string | null;
  content_markdown: string;
  original_content_markdown: string;
  translated_content_markdown: string | null;
  display_language: string;
  original_language: string;
  translated_language: string | null;
  translation_status: TranslationStatus;
  translated_at: string | null;
  is_deleted: boolean;
  reply_to_post_uuid: string | null;
  tags: PostTag[];
  created_at: string;
  updated_at: string | null;
}

export interface SubjectDetailResponse {
  student: { uuid: string; sid: string | null; full_name: string };
  subject: SubjectSummary;
  overview: SubjectDetailOverview;
  trend_data: ChartDataPoint[];
  class_avg_data: ChartDataPoint[];
  learning_pathway: LearningPathwayNode[];
  posts: ThreadPost[];
  summary: DashboardSummaryItem | null;
}

// ── Reports ──────────────────────────────────────────────────

export interface ReportSubject {
  uuid: string;
  name: string;
  code: string | null;
}

export type ReportType = 'weekly' | 'monthly' | 'custom';
export type ReportSourceType = 'ai' | 'teacher';

export interface Report {
  uuid: string;
  title: string;
  report_type: ReportType;
  source_type: ReportSourceType;
  period_start: string | null;
  period_end: string | null;
  subject: ReportSubject | null;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  published_at: string | null;
  translation: TranslationBlock;
}

export interface ParentReportDetail extends Omit<Report, 'translation'> {
  display_content_markdown: string;
  original_content_markdown: string;
  translated_content_markdown: string | null;
  display_language: string;
  original_language: string;
  translated_language: string | null;
  translation_status: TranslationStatus;
  translated_at: string | null;
}

export interface TeacherReportDetail extends ParentReportDetail {
  author: {
    uuid: string;
    display_name: string;
    role: 'teacher' | 'admin';
  };
}

// ── Announcements ────────────────────────────────────────────

export type AnnouncementCategory = 'announcement' | 'task';

export interface Announcement {
  uuid: string;
  category: AnnouncementCategory;
  title: string;
  subject: ReportSubject | null;
  is_important: boolean;
  is_read: boolean;
  read_at: string | null;
  created_at?: string;
  published_at: string;
  due_at: string | null;
  body_preview: string | null;
  translation: TranslationBlock;
}

export interface AnnouncementDetail extends Omit<Announcement, 'translation' | 'body_preview'> {
  author: {
    uuid: string;
    display_name: string;
    role: 'teacher' | 'admin';
  };
  display_content_markdown: string;
  original_content_markdown: string;
  translated_content_markdown: string | null;
  display_language: string;
  original_language: string;
  translated_language: string | null;
  translation_status: TranslationStatus;
  translated_at: string | null;
}

// ── Resources ────────────────────────────────────────────────

export type ResourceAudienceRole = 'parent' | 'teacher' | 'all';

export interface ResourceCategory {
  key: string;
  label: string;
  resource_count: number;
}

export interface ResourceListItem {
  uuid: string;
  title: string;
  summary: string | null;
  category_key: string;
  category_label: string;
  audience_role: ResourceAudienceRole;
  cover_image_url: string | null;
  external_url: string | null;
  is_pinned: boolean;
  published_at: string;
  translation: TranslationBlock;
}

export interface ResourceDetail extends Omit<ResourceListItem, 'translation'> {
  display_content_markdown: string;
  original_content_markdown: string;
  translated_content_markdown: string | null;
  display_language: string;
  original_language: string;
  translated_language: string | null;
  translation_status: TranslationStatus;
  translated_at: string | null;
}

// ── Timetable ────────────────────────────────────────────────

export interface TimetableSubjectInfo {
  uuid: string;
  name: string;
  code: string | null;
}

export interface TimetableTeacherInfo {
  uuid: string;
  display_name: string;
}

export interface ClassTimetableEntry {
  uuid: string;
  weekday: string;
  period_index: number;
  room_label: string | null;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  subject: TimetableSubjectInfo;
  teacher: TimetableTeacherInfo;
  is_assigned_to_current_teacher?: boolean | null;
}

export interface ClassTimetableData {
  class_info: {
    uuid: string;
    name: string;
    grade_level: string | null;
    academic_year: string | null;
  };
  selected_date: string;
  effective_from: string | null;
  effective_to: string | null;
  entries: ClassTimetableEntry[];
  available_subjects: TimetableSubjectInfo[];
  available_teachers: TimetableTeacherInfo[];
}

export interface ReplaceClassTimetableRequest {
  effective_from: string;
  effective_to?: string | null;
  entries: Array<{
    weekday: string;
    period_index: number;
    subject_uuid: string;
    teacher_uuid: string;
    room_label?: string | null;
    start_time: string;
    end_time: string;
  }>;
}

// ── Discussion (Parent view) ──────────────────────────────────

export interface DiscussionSubjectBrief {
  uuid: string;
  name: string;
  code: string | null;
}

export interface DiscussionTeacherItem {
  uuid: string;
  display_name: string;
  avatar_url: string | null;
  subjects: DiscussionSubjectBrief[];
  thread_uuid: string | null;
  last_post_at: string | null;
  unread_post_count: number;
  latest_message_preview: string | null;
}

export interface ParentDiscussionThreadResponse {
  thread_uuid: string;
  student: { uuid: string; sid: string | null; full_name: string };
  teacher: {
    uuid: string;
    display_name: string;
    avatar_url: string | null;
    subjects: DiscussionSubjectBrief[];
  };
  available_tags: PostTag[];
  posts: ThreadPost[];
  meta: PaginationMeta;
}

// ── Discussion (Teacher view) ─────────────────────────────────

export interface DiscussionParentItem {
  uuid: string;
  display_name: string;
  avatar_url: string | null;
  thread_uuid: string | null;
  last_post_at: string | null;
  unread_post_count: number;
}

export interface TeacherDiscussionThreadResponse {
  thread_uuid: string;
  student: { uuid: string; sid: string | null; full_name: string };
  parent: {
    uuid: string;
    display_name: string;
    avatar_url: string | null;
  };
  available_tags: PostTag[];
  posts: ThreadPost[];
  meta: PaginationMeta;
}

// ── Teacher API types ─────────────────────────────────────────

export interface TeacherStudentListItem {
  uuid: string;
  sid: string | null;
  full_name: string;
  preferred_name: string | null;
  class_uuid: string | null;
  class_name: string | null;
  grade_level: string | null;
  avatar_url: string | null;
  score: number | null;
  last_activity_at: string | null;
}

export interface TeacherStudentDashboard {
  student: StudentSummary;
  unread_post_count: number;
  summary_cards: {
    overall_performance_index: number | null;
    assignment_completion_rate: number | null;
    attendance_rate: number | null;
    summary: DashboardSummaryItem | null;
  };
}

export interface TeacherClass {
  uuid: string;
  name: string;
  grade_level: string | null;
  academic_year: string | null;
  is_homeroom: boolean;
  student_count: number;
}

export interface TeacherClassStudentItem {
  uuid: string;
  sid: string | null;
  full_name: string;
  preferred_name: string | null;
  avatar_url: string | null;
  subjects: { uuid: string; name: string }[];
}

export interface ClassGradeStats {
  class: { uuid: string; name: string; grade_level: string | null };
  summary: {
    student_count: number;
    avg_score: number;
    max_score: number;
    min_score: number;
    exam_count: number;
  };
  students: {
    student_uuid: string;
    full_name: string;
    sid: string | null;
    subject_scores: {
      subject_uuid: string;
      subject_name: string;
      avg_score: number;
      latest_score: number;
      exam_count: number;
    }[];
  }[];
}

export interface TeacherOverview {
  summary: {
    student_count: number;
    class_count: number;
    unread_message_count: number;
  };
  classes: TeacherClass[];
}

// ── Exam Scores ───────────────────────────────────────────────

export interface ExamScore {
  uuid: string;
  subject: { uuid: string; name: string };
  exam_name: string | null;
  exam_date: string;
  score: number;
  full_score: number;
  note: string | null;
  author: { uuid: string; display_name: string };
  created_at: string;
  updated_at?: string;
}

export interface CreateExamScoreRequest {
  subject_uuid: string;
  exam_name?: string | null;
  exam_date: string;
  score: number;
  full_score?: number;
  note?: string | null;
}

export interface UpdateExamScoreRequest {
  exam_name?: string | null;
  exam_date?: string | null;
  score?: number | null;
  full_score?: number | null;
  note?: string | null;
}

// ── Period Metrics ────────────────────────────────────────────

export interface PeriodMetric {
  uuid: string;
  subject: { uuid: string; name: string };
  term: string | null;
  snapshot_date: string;
  progress: number;
  assignment_completion_rate: number;
  attendance_rate: number;
  author: { uuid: string; display_name: string };
  created_at: string;
}

export interface CreatePeriodMetricRequest {
  subject_uuid: string;
  term?: string | null;
  snapshot_date: string;
  progress?: number | null;
  assignment_completion_rate?: number | null;
  attendance_rate?: number | null;
}

// ── Teacher create/update request bodies ─────────────────────

export interface CreateReportRequest {
  title: string;
  report_type: ReportType;
  subject_uuid?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  content_markdown: string;
  original_language: string;
}

export interface UpdateReportRequest {
  title?: string | null;
  report_type?: ReportType | null;
  subject_uuid?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  content_markdown?: string | null;
  original_language?: string | null;
}

export interface CreateAnnouncementRequest {
  category: AnnouncementCategory;
  title: string;
  subject_uuid?: string | null;
  content_markdown: string;
  original_language: string;
  published_at?: string | null;
  due_at?: string | null;
  is_important?: boolean;
}

export interface UpdateAnnouncementRequest {
  category?: AnnouncementCategory | null;
  title?: string | null;
  subject_uuid?: string | null;
  content_markdown?: string | null;
  original_language?: string | null;
  published_at?: string | null;
  due_at?: string | null;
  is_important?: boolean | null;
}

export interface GenerateAiReportRequest {
  report_type: ReportType;
  subject_uuid?: string | null;
  period_start: string;
  period_end: string;
  extra_instruction?: string | null;
}

// ── Admin ─────────────────────────────────────────────────────

export interface AdminOverview {
  user_count: number;
  teacher_count: number;
  parent_count: number;
  student_count: number;
  class_count: number;
}

export interface AdminUser {
  uuid: string;
  role: UserRole;
  display_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface UpdateUserRequest {
  display_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  is_active?: boolean | null;
}

export interface CreateUserRequest {
  role: UserRole;
  display_name: string;
  email: string;
  phone_number?: string | null;
  password: string;
}

export interface AdminStudent {
  uuid: string;
  sid: string | null;
  full_name: string;
  preferred_name: string | null;
  class_uuid: string | null;
  class_name: string | null;
  grade_level: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateStudentRequest {
  sid?: string | null;
  full_name: string;
  preferred_name?: string | null;
  class_uuid?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
}

export interface UpdateStudentRequest {
  sid?: string | null;
  full_name?: string | null;
  preferred_name?: string | null;
  class_uuid?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  is_active?: boolean | null;
}

export interface AdminClass {
  uuid: string;
  name: string;
  grade_level: string | null;
  academic_year: string | null;
  homeroom_teacher: { uuid: string; display_name: string } | null;
  student_count: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminClassMutationResponse {
  uuid: string;
  name: string;
  grade_level: string | null;
  academic_year: string | null;
  homeroom_teacher: { uuid: string; display_name: string } | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateClassRequest {
  name: string;
  grade_level?: string | null;
  academic_year?: string | null;
  homeroom_teacher_uuid?: string | null;
}

export interface UpdateClassRequest {
  name?: string | null;
  grade_level?: string | null;
  academic_year?: string | null;
  homeroom_teacher_uuid?: string | null;
  is_active?: boolean | null;
}

export interface ParentStudentBinding {
  uuid: string;
  parent_uuid: string;
  student_uuid: string;
  relationship_label: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CreateBindingRequest {
  parent_uuid: string;
  student_uuid: string;
  relationship_label?: string | null;
  is_primary?: boolean;
}

export interface UpdateBindingRequest {
  relationship_label?: string | null;
  is_primary?: boolean | null;
  is_active?: boolean | null;
}

export interface TeachingAssignment {
  uuid: string;
  teacher_uuid: string;
  student_uuid: string;
  subject_uuid: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateTeachingAssignmentRequest {
  teacher_uuid: string;
  student_uuid: string;
  subject_uuid: string;
}

export interface UpdateTeachingAssignmentRequest {
  is_active?: boolean | null;
}

export interface CreateSystemTagRequest {
  name: string;
  is_selectable_by_parent?: boolean;
  is_selectable_by_teacher?: boolean;
  affects_business_logic?: boolean;
}

export interface UpdateSystemTagRequest {
  name?: string | null;
  is_selectable_by_parent?: boolean | null;
  is_selectable_by_teacher?: boolean | null;
  affects_business_logic?: boolean | null;
}

// ── Request bodies ────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  remember_me: boolean;
}

export interface CreatePostRequest {
  title?: string | null;
  content_markdown: string;
  original_language?: string | null;
  tag_uuids?: string[];
  reply_to_post_uuid?: string | null;
}

export interface UpdatePostRequest {
  title?: string | null;
  content_markdown?: string | null;
  original_language?: string | null;
  tag_uuids?: string[];
}
// ── Translation resolve ───────────────────────────────────────

export interface TranslationResolveRequest {
  resource_type: 'report' | 'announcement' | 'post' | 'resource';
  resource_uuid: string;
}

export interface TranslationResolveResponse {
  resource_type: string;
  resource_uuid: string;
  display_content_markdown: string;
  original_content_markdown: string;
  translated_content_markdown: string | null;
  display_language: string;
  original_language: string;
  translated_language: string | null;
  translation_status: TranslationStatus;
  translated_at: string | null;
}

// ── AI Conversations ──────────────────────────────────────────

export type AiContextType = 'global' | 'student' | 'subject';
export type AiMessageRole = 'user' | 'assistant';
export type AiMessagePreset = 'default' | 'summary' | 'parent_friendly';

export interface AiConversation {
  uuid: string;
  title: string | null;
  context_type: AiContextType;
  student_uuid: string | null;
  subject_uuid: string | null;
  is_archived: boolean;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  uuid: string;
  role: AiMessageRole;
  preset: AiMessagePreset | null;
  content_markdown: string;
  created_at: string;
}

export interface AiConversationDetail extends AiConversation {
  messages: AiMessage[];
}

export interface CreateAiConversationRequest {
  context_type: AiContextType;
  student_uuid?: string | null;
  subject_uuid?: string | null;
  title?: string | null;
}

export interface SendAiMessageRequest {
  message: string;
  preset: AiMessagePreset;
}

export interface SendAiMessageResponse {
  conversation_uuid: string;
  user_message: AiMessage;
  assistant_message: AiMessage;
}

// ── Leave Requests ───────────────────────────────────────────

export type LeaveRequestType = 'sick' | 'personal' | 'family' | 'other';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  uuid: string;
  student_uuid: string;
  type: LeaveRequestType;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveRequestStatus;
  school_note: string | null;
  submitted_at: string;
}

export interface CreateLeaveRequest {
  type: LeaveRequestType;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

// ── Incident Reports ─────────────────────────────────────────

export type IncidentType = 'bullying' | 'drugs' | 'misconduct' | 'other';
export type IncidentStatus = 'submitted' | 'investigating' | 'resolved';

export interface IncidentReport {
  uuid: string;
  student_uuid: string;
  incident_type: IncidentType;
  description: string;
  is_anonymous: boolean;
  status: IncidentStatus;
  submitted_at: string;
}

export interface CreateIncidentReport {
  incident_type: IncidentType;
  description: string;
  is_anonymous: boolean;
}
