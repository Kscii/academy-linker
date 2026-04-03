import type {
  Post,
  Report,
  Subject,
  SubjectScore,
  StudentDashboardTimeRange,
  Task,
  Teacher,
  User,
} from "@/types"

export const mockParentUser = (email: string): User => ({
  id: "u-parent-001",
  name: "张女士",
  role: "parent",
  email,
  phone: "13800001234",
  avatarUrl: undefined,
  sidBindings: ["sid-001"],
})

export const mockTeachers: Teacher[] = [
  { tid: "t-001", name: "王老师", subject: "数学", unreadCount: 2 },
  { tid: "t-002", name: "李老师", subject: "语文", unreadCount: 0 },
  { tid: "t-003", name: "周老师", subject: "英语", unreadCount: 1 },
]

export const mockStudentBySid: Record<
  string,
  { sid: string; className: string; name: string }
> = {
  "sid-001": { sid: "sid-001", className: "高一1班", name: "李明" },
}

export const mockSubjectScoresByRange: Record<StudentDashboardTimeRange, SubjectScore[]> =
  {
    week: [
      { subjectId: "subject-001", name: "数学", score: 86 },
      { subjectId: "subject-002", name: "语文", score: 91 },
      { subjectId: "subject-003", name: "英语", score: 78 },
      { subjectId: "subject-004", name: "物理", score: 84 },
    ],
    month: [
      { subjectId: "subject-001", name: "数学", score: 82 },
      { subjectId: "subject-002", name: "语文", score: 88 },
      { subjectId: "subject-003", name: "英语", score: 81 },
      { subjectId: "subject-004", name: "物理", score: 86 },
    ],
  }

export const mockSubjectsById: Record<string, Subject> = {
  "subject-001": {
    subjectId: "subject-001",
    subjectName: "数学",
    teacher: "王老师",
    avgScore: 82,
    assignments: [
      { id: "a-001", title: "函数与图像练习（第 2 讲）", dueDate: "2026-04-08", status: "进行中" },
      { id: "a-002", title: "错题本整理（集合）", dueDate: "2026-04-05", status: "已提交" },
      { id: "a-003", title: "测验卷：基础计算", dueDate: "2026-04-02", status: "未提交" },
    ],
  },
  "subject-002": {
    subjectId: "subject-002",
    subjectName: "语文",
    teacher: "陈老师",
    avgScore: 88,
    assignments: [
      { id: "a-004", title: "阅读理解：说明文结构", dueDate: "2026-04-07", status: "进行中" },
      { id: "a-005", title: "作文：人物描写（初稿）", dueDate: "2026-04-06", status: "已提交" },
      { id: "a-006", title: "课文背诵与积累", dueDate: "2026-04-03", status: "已提交" },
    ],
  },
  "subject-003": {
    subjectId: "subject-003",
    subjectName: "英语",
    teacher: "刘老师",
    avgScore: 81,
    assignments: [
      { id: "a-007", title: "语法训练：时态复习", dueDate: "2026-04-09", status: "进行中" },
      { id: "a-008", title: "听力任务：短对话理解", dueDate: "2026-04-05", status: "已提交" },
      { id: "a-009", title: "写作：一段自我介绍", dueDate: "2026-04-02", status: "未提交" },
    ],
  },
  "subject-004": {
    subjectId: "subject-004",
    subjectName: "物理",
    teacher: "赵老师",
    avgScore: 86,
    assignments: [
      { id: "a-010", title: "力学专题：受力分析", dueDate: "2026-04-08", status: "进行中" },
      { id: "a-011", title: "实验报告：测量与误差", dueDate: "2026-04-06", status: "已提交" },
      { id: "a-012", title: "复习卡片：公式归纳", dueDate: "2026-04-03", status: "已提交" },
    ],
  },
}

export const mockReports: Report[] = [
  {
    id: "rpt-001",
    week: "第 1 周",
    createdAt: "2026-04-02",
    title: "第 1 周动态：学习表现与建议",
    statusDefault: "unread",
    type: "周简报",
    origin: "AI",
    summaryMarkdown:
      "# 第 1 周简报摘要\n\n- 作业完成情况：良好\n- 学习建议：重点巩固易错题\n\n## 本周亮点\n你在关键学科上进步明显，继续保持。",
    originalMarkdown:
      "# 第 1 周简报（原文）\n\n本周你在核心学科上稳步提升。以下是原文内容（mock）：\n\n## 关键点\n- 完成了本周作业\n- 针对薄弱环节做了复习\n\n> 注意：本阶段不接入任何后端接口。",
  },
  {
    id: "rpt-002",
    week: "第 2 周",
    createdAt: "2026-04-09",
    title: "第 2 周动态：节奏优化与复盘",
    statusDefault: "read",
    type: "周简报",
    origin: "teacher",
    summaryMarkdown:
      "# 第 2 周摘要\n\n- 建议：用错题本做周期复盘\n- 目标：下周提升时间利用率\n\n## 行动清单\n- 每天复盘 15 分钟",
    originalMarkdown:
      "# 第 2 周原文\n\n老师提交的周简报原文（mock）。\n\n## 建议\n1. 复盘错题\n2. 合理安排练习",
  },
  {
    id: "rpt-003",
    week: "第 3 周",
    createdAt: "2026-03-26",
    title: "第 3 周动态：阶段总结与归档",
    statusDefault: "archived",
    type: "阶段简报",
    origin: "AI",
    summaryMarkdown: "# 阶段摘要\n\n- 阶段表现：稳定\n- 后续建议：保持巩固",
    originalMarkdown:
      "# 阶段原文\n\n这里是归档简报原文（mock）。\n\n> 归档后会在列表中隐藏，仅在“历史简报”中可见。",
  },
]

export const mockTasks: Task[] = [
  {
    id: "task-001",
    title: "本周学习简报反馈",
    from: "学校",
    type: "通知",
    dueDate: "2026-04-10",
    createdAt: "2026-04-01",
  },
  {
    id: "task-002",
    title: "数学小测复习",
    from: "王老师",
    type: "作业",
    dueDate: "2026-03-20",
    createdAt: "2026-03-10",
  },
  {
    id: "task-003",
    title: "阅读打卡：说明文结构",
    from: "李老师",
    type: "任务",
    dueDate: "2026-04-06",
    createdAt: "2026-04-02",
  },
]

export const mockDefaultPostsByTid: Record<string, Post[]> = {
  "t-001": [
    {
      id: "p-001",
      tid: "t-001",
      title: "本周作业完成情况",
      body: "mock：这里是帖子正文。",
      tags: ["作业", "进度"],
      createdAt: "2026-04-01",
    },
    {
      id: "p-002",
      tid: "t-001",
      title: "错题整理建议",
      body: "mock：请把易错点按类型归类，每天 15 分钟复盘。",
      tags: ["错题本"],
      createdAt: "2026-04-02",
    },
  ],
  "t-002": [
    {
      id: "p-003",
      tid: "t-002",
      title: "课堂阅读任务",
      body: "mock：本周阅读理解练习。",
      tags: ["阅读"],
      createdAt: "2026-04-01",
    },
    {
      id: "p-004",
      tid: "t-002",
      title: "写作练习安排",
      body: "mock：完成初稿后再进行同伴互评。",
      tags: ["作文"],
      createdAt: "2026-04-02",
    },
  ],
  "t-003": [
    {
      id: "p-005",
      tid: "t-003",
      title: "口语练习任务",
      body: "mock：每天 10 分钟跟读与复述。",
      tags: ["口语"],
      createdAt: "2026-04-02",
    },
  ],
}

