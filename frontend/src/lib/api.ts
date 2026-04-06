// ============================================================
// Academy Linker — API Client
// All requests use credentials:'include' (HttpOnly JWT cookies)
// Auto-refreshes access token on 401 access_token_expired
// ============================================================

import type {
  UserSummary,
  StudentSummary,
  DashboardResponse,
  SubjectSummary,
  SubjectDetailResponse,
  Report,
  ReportDetail,
  Announcement,
  AnnouncementDetail,
  DiscussionTeacherItem,
  ThreadPost,
  ApiResponse,
  ApiListResponse,
  LoginRequest,
  CreatePostRequest,
  UpdatePostRequest,
  TeacherDashboardResponse,
  TeacherStudentItem,
  AdminOverview,
  AdminTeacher,
  AdminClass,
  AdminStudent,
  AdminParent,
  CreateTeacherRequest,
  CreateClassRequest,
  CreateStudentRequest,
  CreateParentRequest,
  LeaveRequest,
  CreateLeaveRequest,
  CreateIncidentReport,
  ThreadDetailResponse,
  TeacherDiscussionParentItem,
  PaginationMeta,
} from '@/types/api';

// ── Config ───────────────────────────────────────────────────

const API_BASE = '/api';


let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

// ── Core fetch wrapper ───────────────────────────────────────

async function apiFetch<T>(
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
    return res.json() as Promise<T>;
  }

  // Attempt token refresh on 401
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
            // Refresh failed — redirect to login
            window.location.replace('/login');
          })
          .finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
      }
      await refreshPromise;
      // Retry original request once
      return apiFetch<T>(path, options, false);
    }
  }

  // Parse error body
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
    apiFetch<void>('/auth/refresh', { method: 'POST' }),

  logout: () =>
    apiFetch<void>('/auth/logout', { method: 'POST' }),

  getMe: () =>
    apiFetch<ApiResponse<{ user: UserSummary }>>('/me'),
};

// ── Parent ───────────────────────────────────────────────────

export const parent = {
  getStudents: () =>
    apiFetch<ApiResponse<StudentSummary[]>>('/parents/me/students'),

  getDashboard: (studentUuid: string, range = '30d') =>
    apiFetch<ApiResponse<DashboardResponse>>(
      `/parents/me/students/${studentUuid}/dashboard?range=${range}`
    ),

  getSubjects: (studentUuid: string) =>
    apiFetch<ApiResponse<SubjectSummary[]>>(
      `/parents/me/students/${studentUuid}/subjects`
    ),

  getSubjectDetail: (studentUuid: string, subjectUuid: string) =>
    apiFetch<ApiResponse<SubjectDetailResponse>>(
      `/parents/me/students/${studentUuid}/subjects/${subjectUuid}`
    ),

  getReports: (studentUuid: string, page = 1) =>
    apiFetch<ApiListResponse<Report>>(
      `/parents/me/students/${studentUuid}/reports?page=${page}`
    ),

  getReport: (studentUuid: string, reportUuid: string) =>
    apiFetch<ApiResponse<ReportDetail>>(
      `/parents/me/students/${studentUuid}/reports/${reportUuid}`
    ),

  markReportRead: (reportUuid: string) =>
    apiFetch<void>(`/reports/${reportUuid}/read`, { method: 'POST' }),

  generateReport: (reportUuid: string, language: string) =>
    apiFetch<ApiResponse<{ content_markdown: string; cached: boolean }>>(
      `/reports/${reportUuid}/generate`,
      { method: 'POST', body: JSON.stringify({ language }) },
    ),

  getAnnouncements: (studentUuid: string, page = 1) =>
    apiFetch<ApiListResponse<Announcement>>(
      `/parents/me/students/${studentUuid}/announcements?page=${page}`
    ),

  getAnnouncement: (announcementUuid: string) =>
    apiFetch<ApiResponse<AnnouncementDetail>>(
      `/announcements/${announcementUuid}`
    ),

  markAnnouncementRead: (announcementUuid: string) =>
    apiFetch<void>(`/announcements/${announcementUuid}/read`, { method: 'POST' }),

  markThreadRead: (threadUuid: string) =>
    apiFetch<void>(`/threads/${threadUuid}/read`, { method: 'POST' }),

  getDiscussionTeachers: (studentUuid: string) =>
    apiFetch<ApiResponse<DiscussionTeacherItem[]>>(
      `/parents/me/students/${studentUuid}/discussions/teachers`
    ),

  getDiscussionThread: (studentUuid: string, teacherUuid: string) =>
    apiFetch<{ data: ThreadDetailResponse; meta: PaginationMeta }>(
      `/parents/me/students/${studentUuid}/discussions/teachers/${teacherUuid}`
    ),

  getLeaveRequests: (studentUuid: string) =>
    apiFetch<ApiListResponse<LeaveRequest>>(
      `/parents/me/students/${studentUuid}/leave`
    ),

  createLeaveRequest: (studentUuid: string, body: CreateLeaveRequest) =>
    apiFetch<ApiResponse<LeaveRequest>>(
      `/parents/me/students/${studentUuid}/leave`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  createIncidentReport: (studentUuid: string, body: CreateIncidentReport) =>
    apiFetch<ApiResponse<{ uuid: string; status: string }>>(
      `/parents/me/students/${studentUuid}/incidents`,
      { method: 'POST', body: JSON.stringify(body) }
    ),
};

// ── Teacher ──────────────────────────────────────────────────

export const teacher = {
  getStudents: (page = 1, search = '') =>
    apiFetch<ApiListResponse<TeacherStudentItem>>(
      `/teachers/me/students?page=${page}&search=${encodeURIComponent(search)}`
    ),

  getDashboard: (studentUuid: string) =>
    apiFetch<ApiResponse<TeacherDashboardResponse>>(
      `/teachers/me/students/${studentUuid}/dashboard`
    ),

  markThreadRead: (threadUuid: string) =>
    apiFetch<void>(`/threads/${threadUuid}/read`, { method: 'POST' }),

  getDiscussionParents: (studentUuid: string) =>
    apiFetch<ApiResponse<DiscussionTeacherItem[]>>(
      `/teachers/me/students/${studentUuid}/discussions/parents`
    ),

  getDiscussionParentsList: (studentUuid: string) =>
    apiFetch<ApiResponse<TeacherDiscussionParentItem[]>>(
      `/teachers/me/students/${studentUuid}/discussions/parents`
    ),

  getDiscussionThread: (studentUuid: string, parentUuid: string) =>
    apiFetch<{ data: ThreadDetailResponse; meta: PaginationMeta }>(
      `/teachers/me/students/${studentUuid}/discussions/parents/${parentUuid}`
    ),
};

// ── Admin ────────────────────────────────────────────────────

export const admin = {
  getOverview: () =>
    apiFetch<ApiResponse<AdminOverview>>('/admin/overview'),

  getTeachers: () =>
    apiFetch<ApiResponse<AdminTeacher[]>>('/admin/teachers'),

  createTeacher: (body: CreateTeacherRequest) =>
    apiFetch<ApiResponse<AdminTeacher>>('/admin/teachers', {
      method: 'POST', body: JSON.stringify(body),
    }),

  updateTeacher: (uuid: string, body: Partial<CreateTeacherRequest>) =>
    apiFetch<ApiResponse<AdminTeacher>>(`/admin/teachers/${uuid}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),

  getClasses: () =>
    apiFetch<ApiResponse<AdminClass[]>>('/admin/classes'),

  createClass: (body: CreateClassRequest) =>
    apiFetch<ApiResponse<AdminClass>>('/admin/classes', {
      method: 'POST', body: JSON.stringify(body),
    }),

  updateClass: (uuid: string, body: Record<string, unknown>) =>
    apiFetch<ApiResponse<AdminClass>>(`/admin/classes/${uuid}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),

  getStudents: () =>
    apiFetch<ApiResponse<AdminStudent[]>>('/admin/students'),

  createStudent: (body: CreateStudentRequest) =>
    apiFetch<ApiResponse<AdminStudent>>('/admin/students', {
      method: 'POST', body: JSON.stringify(body),
    }),

  getParents: () =>
    apiFetch<ApiResponse<AdminParent[]>>('/admin/parents'),

  createParent: (body: CreateParentRequest) =>
    apiFetch<ApiResponse<AdminParent>>('/admin/parents', {
      method: 'POST', body: JSON.stringify(body),
    }),

  bindStudent: (parent_uuid: string, student_uuid: string) =>
    apiFetch<ApiResponse<{ parent_uuid: string; student_uuid: string }>>('/admin/bindings', {
      method: 'POST', body: JSON.stringify({ parent_uuid, student_uuid }),
    }),

  unbindStudent: (parent_uuid: string, student_uuid: string) =>
    apiFetch<ApiResponse<{ removed: boolean }>>('/admin/bindings', {
      method: 'DELETE', body: JSON.stringify({ parent_uuid, student_uuid }),
    }),
};

// ── Posts ────────────────────────────────────────────────────

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
    apiFetch<void>(`/posts/${postUuid}`, { method: 'DELETE' }),
};
