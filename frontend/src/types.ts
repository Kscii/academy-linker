export type UserRole = "parent" | "student" | "teacher"

export type User = {
  id: string
  name: string
  role: UserRole
  email: string
  phone?: string
  avatarUrl?: string
  sidBindings?: string[]
}

export type Teacher = {
  tid: string
  name: string
  subject: string
  unreadCount: number
}

export type AssignmentStatus = "已提交" | "未提交" | "进行中"

export type Assignment = {
  id: string
  title: string
  dueDate: string
  status: AssignmentStatus
}

export type Subject = {
  subjectId: string
  subjectName: string
  teacher: string
  avgScore: number
  assignments: Assignment[]
}

export type ReportStatus = "unread" | "read" | "archived"

export type ReportType = "周简报" | "阶段简报"

export type ReportOrigin = "AI" | "teacher"

export type Report = {
  id: string
  week: string
  createdAt: string
  title: string
  statusDefault: ReportStatus
  type: ReportType
  origin: ReportOrigin
  summaryMarkdown: string
  originalMarkdown: string
}

export type TaskType = "通知" | "作业" | "任务"

export type Task = {
  id: string
  title: string
  from: string
  type: TaskType
  dueDate: string
  createdAt: string
}

export type Post = {
  id: string
  tid: string
  title: string
  body: string
  tags: string[]
  replyToId?: string
  attachmentsNote?: string
  createdAt: string
}

export type StudentDashboardTimeRange = "week" | "month"

export type SubjectScore = {
  subjectId: string
  name: string
  score: number
}

