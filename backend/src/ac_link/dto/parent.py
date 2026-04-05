"""
家长端接口相关 DTO（Pydantic Schema）。

与 API 文档的对应关系：
  §9.1  StudentOut / PaginatedResponse[StudentOut]
  §9.2  DashboardResponse
  §9.3  SubjectListItem / SubjectListResponse
  §9.4  SubjectDetailResponse
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from ac_link.dto.admin import PaginatedResponse, PaginationMeta  # noqa: F401


# ── 通用子 Schema ─────────────────────────────────────────────────────────────

class TeacherBrief(BaseModel):
    uuid: UUID
    display_name: str

    class Config:
        from_attributes = True


class TeacherDetail(BaseModel):
    uuid: UUID
    display_name: str
    email: str

    class Config:
        from_attributes = True


class StudentOut(BaseModel):
    uuid: UUID
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True


class StudentBrief(BaseModel):
    uuid: UUID
    sid: str | None = None
    full_name: str

    class Config:
        from_attributes = True


# ── §9.3 学科列表 ─────────────────────────────────────────────────────────────

class SubjectListItem(BaseModel):
    uuid: UUID
    name: str
    code: str | None = None
    teachers: list[TeacherBrief]


class SubjectListResponse(BaseModel):
    data: list[SubjectListItem]


# ── §9.4 学科详情 ─────────────────────────────────────────────────────────────

class SubjectWithTeachers(BaseModel):
    uuid: UUID
    name: str
    code: str | None = None
    teachers: list[TeacherDetail]


class SubjectOverview(BaseModel):
    score: float | None = None
    progress: float | None = None
    assignment_completion_rate: float | None = None
    attendance_rate: float | None = None


class TimelinePoint(BaseModel):
    label: str
    score: float | None = None
    progress: float | None = None


class ReportSummary(BaseModel):
    report_uuid: UUID
    report_title: str
    display_text: str
    original_text: str
    translated_text: str | None = None
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str
    translated_at: datetime | None = None


class SubjectDetailData(BaseModel):
    student: StudentBrief
    subject: SubjectWithTeachers
    overview: SubjectOverview
    timeline: list[TimelinePoint]
    summary: ReportSummary | None = None


# ── §9.2 Dashboard ────────────────────────────────────────────────────────────

class DashboardContext(BaseModel):
    selected_range: str
    unread_post_count: int
    unread_announcement_count: int


class SubjectStat(BaseModel):
    subject_uuid: UUID
    subject_name: str
    score: float | None = None
    progress: float | None = None
    assignment_completion_rate: float | None = None


class SummaryCards(BaseModel):
    overall_performance_index: float | None = None
    assignment_completion_rate: float | None = None
    attendance_rate: float | None = None
    summary: ReportSummary | None = None


class ChartPoint(BaseModel):
    subject_uuid: UUID
    subject_name: str
    value: float | None = None


class LearningProgressPoint(BaseModel):
    label: str
    value: float | None = None


class Charts(BaseModel):
    subject_score_bar_chart: list[ChartPoint]
    subject_completion_bar_chart: list[ChartPoint]
    learning_progress_chart: list[LearningProgressPoint]


class ImportantPostBanner(BaseModel):
    post_uuid: UUID
    teacher_uuid: UUID
    teacher_display_name: str
    title: str | None = None
    preview_text: str
    created_at: datetime


class DashboardData(BaseModel):
    student: StudentOut
    dashboard_context: DashboardContext
    summary_cards: SummaryCards
    subject_statistics: list[SubjectStat]
    charts: Charts
    important_post_banners: list[ImportantPostBanner]
