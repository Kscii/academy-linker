"""
家长端接口相关 DTO（Pydantic Schema）。

与 API 文档的对应关系：
  §9.1  StudentOut / PaginatedResponse[StudentOut]
  §9.2  DashboardResponse
  §9.3  SubjectListItem / SubjectListResponse
  §9.4  SubjectDetailResponse
"""

from __future__ import annotations

from datetime import date, datetime
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
    class_uuid: UUID | None = None
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True

    @classmethod
    def from_student(cls, s: object) -> 'StudentOut':
        c = getattr(s, 'class_obj', None)
        return cls(
            uuid=s.uuid,  # type: ignore[attr-defined]
            sid=s.sid,  # type: ignore[attr-defined]
            full_name=s.full_name,  # type: ignore[attr-defined]
            preferred_name=s.preferred_name,  # type: ignore[attr-defined]
            class_uuid=c.uuid if c else None,
            class_name=c.name if c else None,
            grade_level=c.grade_level if c else None,
            avatar_url=s.avatar_url,  # type: ignore[attr-defined]
        )


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
    translation_status: str | None = None
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


# ── 通用翻译块（复用于 report / announcement 列表项）────────────────────────────

class TranslationBlock(BaseModel):
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str | None = None
    translated_at: datetime | None = None


# ── 学科简要（列表项用）──────────────────────────────────────────────────────────

class SubjectBrief(BaseModel):
    uuid: UUID
    name: str
    code: str | None = None

    class Config:
        from_attributes = True


# ── §9.5 报告列表 ─────────────────────────────────────────────────────────────

class ReportListItem(BaseModel):
    uuid: UUID
    title: str
    report_type: str
    source_type: str
    period_start: date | None = None
    period_end: date | None = None
    subject: SubjectBrief | None = None
    is_read: bool
    read_at: datetime | None = None
    is_archived: bool
    archived_at: datetime | None = None
    created_at: datetime
    published_at: datetime | None = None
    translation: TranslationBlock


# ── §9.6 报告详情 ────────────────────────────────────────────────────────────

class ReportDetail(BaseModel):
    """
    报告完整详情（元信息 + 正文）。
    display_content_markdown 由后端根据 resource_translations 选择 original / translated 版本。
    """
    uuid: UUID
    title: str
    report_type: str
    source_type: str
    period_start: date | None = None
    period_end: date | None = None
    subject: SubjectBrief | None = None
    is_read: bool
    read_at: datetime | None = None
    is_archived: bool
    archived_at: datetime | None = None
    created_at: datetime
    published_at: datetime | None = None
    display_content_markdown: str
    original_content_markdown: str
    translated_content_markdown: str | None = None
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str | None = None
    translated_at: datetime | None = None


# ── §9.10 公告/任务列表 ───────────────────────────────────────────────────────

class AnnouncementListItem(BaseModel):
    uuid: UUID
    category: str
    title: str
    subject: SubjectBrief | None = None
    is_important: bool
    is_read: bool
    read_at: datetime | None = None
    published_at: datetime
    due_at: datetime | None = None
    translation: TranslationBlock


# ── §9.11 公告/任务详情 ──────────────────────────────────────────────────────

class AuthorBrief(BaseModel):
    uuid: UUID
    display_name: str
    role: str

    class Config:
        from_attributes = True


# ── §9.18 家长视角考试成绩 ────────────────────────────────────────────────────

class ParentExamScoreItem(BaseModel):
    uuid: UUID
    subject: SubjectBrief
    exam_name: str | None = None
    exam_date: date
    score: float
    full_score: float
    note: str | None = None
    author: AuthorBrief
    created_at: datetime

    @classmethod
    def from_orm_obj(cls, s: object) -> 'ParentExamScoreItem':
        return cls(
            uuid=s.uuid,  # type: ignore[attr-defined]
            subject=SubjectBrief.model_validate(s.subject),  # type: ignore[attr-defined]
            exam_name=s.exam_name,  # type: ignore[attr-defined]
            exam_date=s.exam_date,  # type: ignore[attr-defined]
            score=s.score,  # type: ignore[attr-defined]
            full_score=s.full_score,  # type: ignore[attr-defined]
            note=s.note,  # type: ignore[attr-defined]
            author=AuthorBrief(
                uuid=s.author_user.uuid,  # type: ignore[attr-defined]
                display_name=s.author_user.display_name,  # type: ignore[attr-defined]
                role=str(s.author_user.role),  # type: ignore[attr-defined]
            ),
            created_at=s.created_at,  # type: ignore[attr-defined]
        )


# ── §9.19 家长视角周期指标 ────────────────────────────────────────────────────

class ParentPeriodMetricItem(BaseModel):
    uuid: UUID
    subject: SubjectBrief
    term: str | None = None
    snapshot_date: date
    progress: float | None = None
    assignment_completion_rate: float | None = None
    attendance_rate: float | None = None
    author: AuthorBrief
    created_at: datetime

    @classmethod
    def from_orm_obj(cls, m: object) -> 'ParentPeriodMetricItem':
        return cls(
            uuid=m.uuid,  # type: ignore[attr-defined]
            subject=SubjectBrief.model_validate(m.subject),  # type: ignore[attr-defined]
            term=m.term,  # type: ignore[attr-defined]
            snapshot_date=m.snapshot_date,  # type: ignore[attr-defined]
            progress=m.progress,  # type: ignore[attr-defined]
            assignment_completion_rate=m.assignment_completion_rate,  # type: ignore[attr-defined]
            attendance_rate=m.attendance_rate,  # type: ignore[attr-defined]
            author=AuthorBrief(
                uuid=m.author_user.uuid,  # type: ignore[attr-defined]
                display_name=m.author_user.display_name,  # type: ignore[attr-defined]
                role=str(m.author_user.role),  # type: ignore[attr-defined]
            ),
            created_at=m.created_at,  # type: ignore[attr-defined]
        )


class AnnouncementDetail(BaseModel):
    """
    公告完整详情（元信息 + 正文）。
    display_content_markdown 由后端根据 resource_translations 计算。
    """
    uuid: UUID
    category: str
    title: str
    subject: SubjectBrief | None = None
    is_important: bool
    is_read: bool
    read_at: datetime | None = None
    published_at: datetime
    due_at: datetime | None = None
    author: AuthorBrief
    display_content_markdown: str
    original_content_markdown: str
    translated_content_markdown: str | None = None
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str | None = None
    translated_at: datetime | None = None
