// ============================================================
// Academy Linker — API Client
// Aligned with API Design Document v1
// All requests use credentials:'include' (HttpOnly JWT cookies)
// Auto-refreshes access token on 401 access_token_expired
// ============================================================

import type {
  ApiResponse,
  ApiListResponse,
  UserSummary,
  UserSettings,
  Session,
  StudentSummary,
  SubjectSummary,
  DashboardResponse,
  SubjectDetailResponse,
  Report,
  ReportDetail,
  Announcement,
  AnnouncementDetail,
  DiscussionTeacherItem,
  DiscussionParentItem,
  ParentDiscussionThreadResponse,
  TeacherDiscussionThreadResponse,
  ThreadPost,
  TeacherStudentListItem,
  TeacherStudentDashboard,
  TeacherClass,
  TeacherClassStudentItem,
  ClassGradeStats,
  TeacherOverview,
  ExamScore,
  CreateExamScoreRequest,
  UpdateExamScoreRequest,
  PeriodMetric,
  CreatePeriodMetricRequest,
  CreateReportRequest,
  UpdateReportRequest,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  GenerateAiReportRequest,
  PostTag,
  AdminOverview,
  AdminUser,
  CreateUserRequest,
  UpdateUserRequest,
  AdminStudent,
  CreateStudentRequest,
  UpdateStudentRequest,
  AdminClass,
  AdminClassMutationResponse,
  CreateClassRequest,
  UpdateClassRequest,
  ParentStudentBinding,
  CreateBindingRequest,
  UpdateBindingRequest,
  TeachingAssignment,
  CreateTeachingAssignmentRequest,
  UpdateTeachingAssignmentRequest,
  SystemTag,
  CreateSystemTagRequest,
  UpdateSystemTagRequest,
  LoginRequest,
  CreatePostRequest,
  UpdatePostRequest,
  TranslationResolveRequest,
  TranslationResolveResponse,
  AiConversation,
  AiConversationDetail,
  CreateAiConversationRequest,
  SendAiMessageRequest,
  SendAiMessageResponse,
  LeaveRequest,
  CreateLeaveRequest,
  IncidentReport,
  CreateIncidentReport,
} from '@/types/api';

// ── Config ───────────────────────────────────────────────────

const API_BASE = '/api';

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// ── Core fetch wrapper ───────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // Attempt token refresh on 401 access_token_expired
  if (res.status === 401 && retry) {
    let errorBody: { error?: { code?: string } } = {};
    try {
      errorBody = await res.clone().json();
    } catch {
      // ignore parse error
    }
    if (errorBody?.error?.code === 'access_token_expired') {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = apiFetch<void>('/auth/refresh', { method: 'POST' }, false)
          .catch(() => {
            window.location.replace('/login');
          })
          .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
      }
      await refreshPromise;
      return apiFetch<T>(path, options, false);
    }
  }

  let errorBody;
  try {
    errorBody = await res.json();
  } catch {
    errorBody = { error: { code: 'unknown', message: res.statusText } };
  }
  throw errorBody;
}

// ── Auth ─────────────────────────────────────────────────────

export const auth = {
  login: (body: LoginRequest) =>
    apiFetch<ApiResponse<{ user: UserSummary }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  refresh: () =>
    apiFetch<ApiResponse<{ success: boolean }>>('/auth/refresh', { method: 'POST' }),

  logout: () =>
    apiFetch<ApiResponse<{ success: boolean }>>('/auth/logout', { method: 'POST' }),

  logoutAll: () =>
    apiFetch<ApiResponse<{ success: boolean }>>('/auth/logout_all', { method: 'POST' }),

  getMe: () =>
    apiFetch<ApiResponse<{ user: UserSummary }>>('/me'),

  updateMe: (body: { display_name?: string | null; phone_number?: string | null; avatar_url?: string | null }) =>
    apiFetch<ApiResponse<{ user: UserSummary }>>('/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  changePassword: (body: { current_password: string; new_password: string }) =>
    apiFetch<ApiResponse<{ success: boolean }>>('/me/change_password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getSessions: () =>
    apiFetch<ApiResponse<Session[]>>('/me/sessions'),

  deleteSession: (sessionUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/me/sessions/${sessionUuid}`, {
      method: 'DELETE',
    }),
};

// ── Settings ─────────────────────────────────────────────────

export const settingsApi = {
  get: () =>
    apiFetch<ApiResponse<UserSettings>>('/settings'),

  update: (body: Partial<UserSettings>) =>
    apiFetch<ApiResponse<UserSettings>>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

// ── Parent ───────────────────────────────────────────────────

export const parent = {
  getStudents: (page = 1) =>
    apiFetch<ApiListResponse<StudentSummary>>(`/parents/me/students?page=${page}`),

  getDashboard: (studentUuid: string, range = '30d') =>
    apiFetch<ApiResponse<DashboardResponse>>(
      `/parents/me/students/${studentUuid}/dashboard?range=${range}`
    ),

  getSubjects: (studentUuid: string) =>
    apiFetch<ApiResponse<SubjectSummary[]>>(
      `/parents/me/students/${studentUuid}/subjects`
    ),

  getSubjectDetail: (studentUuid: string, subjectUuid: string, range = '30d') =>
    apiFetch<ApiResponse<SubjectDetailResponse>>(
      `/parents/me/students/${studentUuid}/subjects/${subjectUuid}?range=${range}`
    ),

  getReports: (studentUuid: string, params: { page?: number; status?: string; read_state?: string; sort?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.status) q.set('status', params.status);
    if (params.read_state) q.set('read_state', params.read_state);
    if (params.sort) q.set('sort', params.sort);
    return apiFetch<ApiListResponse<Report>>(
      `/parents/me/students/${studentUuid}/reports?${q.toString()}`
    );
  },

  getReport: (studentUuid: string, reportUuid: string) =>
    apiFetch<ApiResponse<ReportDetail>>(
      `/parents/me/students/${studentUuid}/reports/${reportUuid}`
    ),

  markReportRead: (reportUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/reports/${reportUuid}/read`, {
      method: 'POST',
    }),

  archiveReport: (reportUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/reports/${reportUuid}/archive`, {
      method: 'POST',
    }),

  unarchiveReport: (reportUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/reports/${reportUuid}/unarchive`, {
      method: 'POST',
    }),

  getAnnouncements: (studentUuid: string, params: { page?: number; category?: string; active_only?: boolean; sort?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.category) q.set('category', params.category);
    if (params.active_only !== undefined) q.set('active_only', String(params.active_only));
    if (params.sort) q.set('sort', params.sort);
    return apiFetch<ApiListResponse<Announcement>>(
      `/parents/me/students/${studentUuid}/announcements?${q.toString()}`
    );
  },

  getAnnouncement: (announcementUuid: string) =>
    apiFetch<ApiResponse<AnnouncementDetail>>(
      `/announcements/${announcementUuid}`
    ),

  markAnnouncementRead: (announcementUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/announcements/${announcementUuid}/read`, {
      method: 'POST',
    }),

  getDiscussionTeachers: (studentUuid: string) =>
    apiFetch<ApiResponse<DiscussionTeacherItem[]>>(
      `/parents/me/students/${studentUuid}/discussions/teachers`
    ),

  getDiscussionThread: (studentUuid: string, teacherUuid: string, params: { page?: number; sort?: string; tag?: string; keyword?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.sort) q.set('sort', params.sort);
    if (params.tag) q.set('tag', params.tag);
    if (params.keyword) q.set('keyword', params.keyword);
    return apiFetch<ApiResponse<ParentDiscussionThreadResponse>>(
      `/parents/me/students/${studentUuid}/discussions/teachers/${teacherUuid}?${q.toString()}`
    );
  },

  getExamScores: (studentUuid: string, params: { subject_uuid?: string; page?: number; exam_date_from?: string; exam_date_to?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.exam_date_from) q.set('exam_date_from', params.exam_date_from);
    if (params.exam_date_to) q.set('exam_date_to', params.exam_date_to);
    return apiFetch<ApiListResponse<ExamScore>>(
      `/parents/me/students/${studentUuid}/exam-scores?${q.toString()}`
    );
  },

  getPeriodMetrics: (studentUuid: string, params: { subject_uuid?: string; term?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.term) q.set('term', params.term);
    return apiFetch<ApiResponse<PeriodMetric[]>>(
      `/parents/me/students/${studentUuid}/period-metrics?${q.toString()}`
    );
  },

  getLeaveRequests: (studentUuid: string, params: { page?: number; status?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.status) q.set('status', params.status);
    return apiFetch<ApiListResponse<LeaveRequest>>(
      `/parents/me/students/${studentUuid}/leave?${q.toString()}`
    );
  },

  createLeaveRequest: (studentUuid: string, body: CreateLeaveRequest) =>
    apiFetch<ApiResponse<LeaveRequest>>(
      `/parents/me/students/${studentUuid}/leave`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  getIncidentReports: (studentUuid: string, page = 1) =>
    apiFetch<ApiListResponse<IncidentReport>>(
      `/parents/me/students/${studentUuid}/incidents?page=${page}`
    ),

  createIncidentReport: (studentUuid: string, body: CreateIncidentReport) =>
    apiFetch<ApiResponse<{ uuid: string; status: string }>>(
      `/parents/me/students/${studentUuid}/incidents`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
};

// ── Teacher ──────────────────────────────────────────────────

export const teacher = {
  getOverview: () =>
    apiFetch<ApiResponse<TeacherOverview>>('/teachers/me/overview'),

  getStudents: (params: { page?: number; page_size?: number; class_uuid?: string; subject_uuid?: string; keyword?: string; sort?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.class_uuid) q.set('class_uuid', params.class_uuid);
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.sort) q.set('sort', params.sort);
    return apiFetch<ApiListResponse<TeacherStudentListItem>>(
      `/teachers/me/students?${q.toString()}`
    );
  },

  getStudentDashboard: (studentUuid: string, range = '30d') =>
    apiFetch<ApiResponse<TeacherStudentDashboard>>(
      `/teachers/me/students/${studentUuid}/dashboard?range=${range}`
    ),

  getDiscussionParents: (studentUuid: string, params: { sort?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.sort) q.set('sort', params.sort);
    return apiFetch<ApiResponse<DiscussionParentItem[]>>(
      `/teachers/me/students/${studentUuid}/discussions/parents${q.toString() ? `?${q.toString()}` : ''}`
    );
  },

  getDiscussionThread: (studentUuid: string, parentUuid: string, params: { page?: number; page_size?: number; sort?: string; tag?: string; keyword?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.sort) q.set('sort', params.sort);
    if (params.tag) q.set('tag', params.tag);
    if (params.keyword) q.set('keyword', params.keyword);
    return apiFetch<ApiResponse<TeacherDiscussionThreadResponse>>(
      `/teachers/me/students/${studentUuid}/discussions/parents/${parentUuid}?${q.toString()}`
    );
  },

  getClasses: () =>
    apiFetch<ApiResponse<TeacherClass[]>>('/teachers/me/classes'),

  getClassStudents: (classUuid: string, params: { page?: number; page_size?: number; subject_uuid?: string; keyword?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.keyword) q.set('keyword', params.keyword);
    return apiFetch<ApiListResponse<TeacherClassStudentItem>>(
      `/teachers/me/classes/${classUuid}/students?${q.toString()}`
    );
  },

  getClassGradeStats: (classUuid: string, params: { subject_uuid?: string; exam_date_from?: string; exam_date_to?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.exam_date_from) q.set('exam_date_from', params.exam_date_from);
    if (params.exam_date_to) q.set('exam_date_to', params.exam_date_to);
    return apiFetch<ApiResponse<ClassGradeStats>>(
      `/teachers/me/classes/${classUuid}/grade-stats?${q.toString()}`
    );
  },

  getExamScores: (studentUuid: string, params: { subject_uuid?: string; page?: number; page_size?: number; exam_date_from?: string; exam_date_to?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.exam_date_from) q.set('exam_date_from', params.exam_date_from);
    if (params.exam_date_to) q.set('exam_date_to', params.exam_date_to);
    return apiFetch<ApiListResponse<ExamScore>>(
      `/teachers/me/students/${studentUuid}/exam-scores?${q.toString()}`
    );
  },

  createExamScore: (studentUuid: string, body: CreateExamScoreRequest) =>
    apiFetch<ApiResponse<ExamScore>>(
      `/teachers/me/students/${studentUuid}/exam-scores`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  updateExamScore: (studentUuid: string, scoreUuid: string, body: UpdateExamScoreRequest) =>
    apiFetch<ApiResponse<ExamScore>>(
      `/teachers/me/students/${studentUuid}/exam-scores/${scoreUuid}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    ),

  deleteExamScore: (studentUuid: string, scoreUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(
      `/teachers/me/students/${studentUuid}/exam-scores/${scoreUuid}`,
      { method: 'DELETE' }
    ),

  getPeriodMetrics: (studentUuid: string, params: { subject_uuid?: string; term?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.term) q.set('term', params.term);
    return apiFetch<ApiResponse<PeriodMetric[]>>(
      `/teachers/me/students/${studentUuid}/period-metrics?${q.toString()}`
    );
  },

  createPeriodMetric: (studentUuid: string, body: CreatePeriodMetricRequest) =>
    apiFetch<ApiResponse<PeriodMetric>>(
      `/teachers/me/students/${studentUuid}/period-metrics`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  getTags: (scope: 'all' | 'system' | 'teacher_private' = 'all') =>
    apiFetch<ApiResponse<PostTag[]>>(`/teachers/me/tags?scope=${scope}`),

  createTag: (name: string) =>
    apiFetch<ApiResponse<PostTag>>('/teachers/me/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  updateTag: (tagUuid: string, name: string) =>
    apiFetch<ApiResponse<PostTag>>(`/teachers/me/tags/${tagUuid}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  deleteTag: (tagUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/teachers/me/tags/${tagUuid}`, {
      method: 'DELETE',
    }),

  createReport: (studentUuid: string, body: CreateReportRequest) =>
    apiFetch<ApiResponse<ReportDetail>>(
      `/teachers/me/students/${studentUuid}/reports`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  updateReport: (reportUuid: string, body: UpdateReportRequest) =>
    apiFetch<ApiResponse<ReportDetail>>(`/reports/${reportUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  createAnnouncement: (studentUuid: string, body: CreateAnnouncementRequest) =>
    apiFetch<ApiResponse<AnnouncementDetail>>(
      `/teachers/me/students/${studentUuid}/announcements`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  updateAnnouncement: (announcementUuid: string, body: UpdateAnnouncementRequest) =>
    apiFetch<ApiResponse<AnnouncementDetail>>(`/announcements/${announcementUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  generateAiReport: (studentUuid: string, body: GenerateAiReportRequest) =>
    apiFetch<ApiResponse<ReportDetail>>(
      `/teachers/me/students/${studentUuid}/ai-reports`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
};

// ── Admin ─────────────────────────────────────────────────────

export const admin = {
  getOverview: () =>
    apiFetch<ApiResponse<AdminOverview>>('/admin/overview'),

  getUsers: (params: { page?: number; page_size?: number; role?: string; keyword?: string; sort?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.role) q.set('role', params.role);
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.sort) q.set('sort', params.sort);
    return apiFetch<ApiListResponse<AdminUser>>(`/admin/users?${q.toString()}`);
  },

  createUser: (body: CreateUserRequest) =>
    apiFetch<ApiResponse<AdminUser>>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateUser: (userUuid: string, body: UpdateUserRequest) =>
    apiFetch<ApiResponse<AdminUser>>(`/admin/users/${userUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getStudents: (params: { page?: number; page_size?: number; keyword?: string; class_uuid?: string; is_active?: boolean; sort?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.keyword) q.set('keyword', params.keyword);
    if (params.class_uuid) q.set('class_uuid', params.class_uuid);
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    if (params.sort) q.set('sort', params.sort);
    return apiFetch<ApiListResponse<AdminStudent>>(`/admin/students?${q.toString()}`);
  },

  createStudent: (body: CreateStudentRequest) =>
    apiFetch<ApiResponse<AdminStudent>>('/admin/students', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateStudent: (studentUuid: string, body: UpdateStudentRequest) =>
    apiFetch<ApiResponse<AdminStudent>>(`/admin/students/${studentUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  transferClass: (studentUuid: string, newClassUuid: string) =>
    apiFetch<ApiResponse<{ student_uuid: string; new_class_uuid: string; deactivated_assignment_count: number; created_assignment_count: number }>>(
      `/admin/students/${studentUuid}/transfer-class`,
      { method: 'POST', body: JSON.stringify({ new_class_uuid: newClassUuid }) }
    ),

  getClasses: (params: { page?: number; page_size?: number; grade_level?: string; is_active?: boolean; academic_year?: string; homeroom_teacher_uuid?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.grade_level) q.set('grade_level', params.grade_level);
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    if (params.academic_year) q.set('academic_year', params.academic_year);
    if (params.homeroom_teacher_uuid) q.set('homeroom_teacher_uuid', params.homeroom_teacher_uuid);
    return apiFetch<ApiListResponse<AdminClass>>(`/admin/classes?${q.toString()}`);
  },

  createClass: (body: CreateClassRequest) =>
    apiFetch<ApiResponse<AdminClassMutationResponse>>('/admin/classes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateClass: (classUuid: string, body: UpdateClassRequest) =>
    apiFetch<ApiResponse<AdminClassMutationResponse>>(`/admin/classes/${classUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getBindings: (params: { page?: number; page_size?: number; parent_uuid?: string; student_uuid?: string; is_active?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.page !== undefined) q.set('page', String(params.page));
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.parent_uuid) q.set('parent_uuid', params.parent_uuid);
    if (params.student_uuid) q.set('student_uuid', params.student_uuid);
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    return apiFetch<ApiListResponse<ParentStudentBinding>>(
      `/admin/bindings/parent_student?${q.toString()}`
    );
  },

  createBinding: (body: CreateBindingRequest) =>
    apiFetch<ApiResponse<ParentStudentBinding>>('/admin/bindings/parent_student', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateBinding: (bindingUuid: string, body: UpdateBindingRequest) =>
    apiFetch<ApiResponse<ParentStudentBinding>>(`/admin/bindings/parent_student/${bindingUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getTeachingAssignments: (params: { page?: number; page_size?: number; teacher_uuid?: string; student_uuid?: string; subject_uuid?: string; is_active?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.page !== undefined) q.set('page', String(params.page));
    if (params.page_size !== undefined) q.set('page_size', String(params.page_size));
    if (params.teacher_uuid) q.set('teacher_uuid', params.teacher_uuid);
    if (params.student_uuid) q.set('student_uuid', params.student_uuid);
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.is_active !== undefined) q.set('is_active', String(params.is_active));
    return apiFetch<ApiListResponse<TeachingAssignment>>(
      `/admin/assignments/teaching?${q.toString()}`
    );
  },

  createTeachingAssignment: (body: CreateTeachingAssignmentRequest) =>
    apiFetch<ApiResponse<TeachingAssignment>>('/admin/assignments/teaching', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTeachingAssignment: (assignmentUuid: string, body: UpdateTeachingAssignmentRequest) =>
    apiFetch<ApiResponse<TeachingAssignment>>(`/admin/assignments/teaching/${assignmentUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  getSystemTags: () =>
    apiFetch<ApiResponse<SystemTag[]>>('/admin/tags/system'),

  createSystemTag: (body: CreateSystemTagRequest) =>
    apiFetch<ApiResponse<SystemTag>>('/admin/tags/system', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateSystemTag: (tagUuid: string, body: UpdateSystemTagRequest) =>
    apiFetch<ApiResponse<SystemTag>>(`/admin/tags/system/${tagUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

// ── Posts ─────────────────────────────────────────────────────

export const posts = {
  create: (threadUuid: string, body: CreatePostRequest) =>
    apiFetch<ApiResponse<ThreadPost>>(`/threads/${threadUuid}/posts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (postUuid: string, body: UpdatePostRequest) =>
    apiFetch<ApiResponse<ThreadPost>>(`/posts/${postUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (postUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/posts/${postUuid}`, {
      method: 'DELETE',
    }),
};

// ── Translations ──────────────────────────────────────────────

export const translations = {
  resolve: (body: TranslationResolveRequest) =>
    apiFetch<ApiResponse<TranslationResolveResponse>>('/translations/resolve', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── AI Conversations ──────────────────────────────────────────

export const ai = {
  listConversations: (params: { page?: number; archived?: boolean; context_type?: string; student_uuid?: string; subject_uuid?: string; sort?: string } = {}) => {
    const q = new URLSearchParams({ page: String(params.page ?? 1) });
    if (params.archived !== undefined) q.set('archived', String(params.archived));
    if (params.context_type) q.set('context_type', params.context_type);
    if (params.student_uuid) q.set('student_uuid', params.student_uuid);
    if (params.subject_uuid) q.set('subject_uuid', params.subject_uuid);
    if (params.sort) q.set('sort', params.sort);
    return apiFetch<ApiListResponse<AiConversation>>(`/ai/conversations?${q.toString()}`);
  },

  createConversation: (body: CreateAiConversationRequest) =>
    apiFetch<ApiResponse<AiConversation>>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getConversation: (conversationUuid: string) =>
    apiFetch<ApiResponse<AiConversationDetail>>(`/ai/conversations/${conversationUuid}`),

  sendMessage: (conversationUuid: string, body: SendAiMessageRequest) =>
    apiFetch<ApiResponse<SendAiMessageResponse>>(
      `/ai/conversations/${conversationUuid}/messages`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  archiveConversation: (conversationUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/ai/conversations/${conversationUuid}/archive`, {
      method: 'POST',
    }),

  unarchiveConversation: (conversationUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/ai/conversations/${conversationUuid}/unarchive`, {
      method: 'POST',
    }),

  deleteConversation: (conversationUuid: string) =>
    apiFetch<ApiResponse<{ success: boolean }>>(`/ai/conversations/${conversationUuid}`, {
      method: 'DELETE',
    }),
};
