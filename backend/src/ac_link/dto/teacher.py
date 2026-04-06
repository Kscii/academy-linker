"""
教师端接口相关 DTO（Pydantic Schema）。

与 API 文档的对应关系：
  §10.1   TeacherStudentListItem / PaginatedResponse
  §10.2   TeacherDashboardData
  §10.12  ReportCreate / TeacherReportDetail
  §10.13  ReportUpdate
  §10.14  AnnouncementCreate / TeacherAnnouncementDetail
  §10.15  AnnouncementUpdate
"""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from ac_link.dto.parent import AuthorBrief, SubjectBrief, SummaryCards


# ── §10.1 老师学生列表 ────────────────────────────────────────────────────────

class TeacherStudentListItem(BaseModel):
    """老师视角学生列表条目。score 字段在 student_metrics 表建好前始终为 null。"""
    uuid: UUID
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
    class_uuid: UUID | None = None
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None
    score: float | None = None
    last_activity_at: datetime | None = None

    class Config:
        from_attributes = True


# ── §10.2 老师视角 Dashboard ──────────────────────────────────────────────────

class TeacherStudentBrief(BaseModel):
    uuid: UUID
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
    class_uuid: UUID | None = None
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None

    @classmethod
    def from_student(cls, s: object) -> 'TeacherStudentBrief':
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

    class Config:
        from_attributes = True


class TeacherDashboardData(BaseModel):
    student: TeacherStudentBrief
    unread_post_count: int
    summary_cards: SummaryCards


# ── §10.12 / §10.13 报告 ─────────────────────────────────────────────────────

_VALID_REPORT_TYPES = frozenset({"weekly", "monthly", "custom"})
_VALID_TRANSLATION_STATUSES = frozenset({
    "not_required", "pending", "completed", "failed", "stale"
})


class ReportCreate(BaseModel):
    title: str
    subject_uuid: UUID | None = None
    report_type: str
    content_markdown: str
    original_language: str
    translation_status: str = "not_required"
    translated_content_markdown: str | None = None
    translated_language: str | None = None
    translated_at: datetime | None = None

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, v: str) -> str:
        if v not in _VALID_REPORT_TYPES:
            raise ValueError(f"report_type 必须为 {_VALID_REPORT_TYPES}")
        return v

    @field_validator("translation_status")
    @classmethod
    def validate_translation_status(cls, v: str) -> str:
        if v not in _VALID_TRANSLATION_STATUSES:
            raise ValueError(f"translation_status 必须为 {_VALID_TRANSLATION_STATUSES}")
        return v


class ReportUpdate(BaseModel):
    """
    所有字段均可选。缺失字段不更新，显式传 null 的字段设为 null（对支持 null 的字段有效）。
    禁止修改 student（由 URL 路径决定）和 source_type（固定为创建时的值）。
    """
    title: str | None = None
    subject_uuid: UUID | None = None
    report_type: str | None = None
    content_markdown: str | None = None
    original_language: str | None = None
    translation_status: str | None = None
    translated_content_markdown: str | None = None
    translated_language: str | None = None
    translated_at: datetime | None = None

    @field_validator("report_type")
    @classmethod
    def validate_report_type(cls, v: str | None) -> str | None:
        if v is not None and v not in _VALID_REPORT_TYPES:
            raise ValueError(f"report_type 必须为 {_VALID_REPORT_TYPES}")
        return v

    @field_validator("translation_status")
    @classmethod
    def validate_translation_status(cls, v: str | None) -> str | None:
        if v is not None and v not in _VALID_TRANSLATION_STATUSES:
            raise ValueError(f"translation_status 必须为 {_VALID_TRANSLATION_STATUSES}")
        return v


class TeacherReportDetail(BaseModel):
    """
    老师视角报告详情（不含 is_read / is_archived 等家长状态字段）。
    display_content_markdown 由后端根据 translation_status 自动选择 original / translated。
    """
    uuid: UUID
    title: str
    report_type: str
    source_type: str
    subject: SubjectBrief | None = None
    author: AuthorBrief
    created_at: datetime
    published_at: datetime | None = None
    display_content_markdown: str
    original_content_markdown: str
    translated_content_markdown: str | None = None
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str
    translated_at: datetime | None = None


# ── §10.14 / §10.15 公告/任务 ────────────────────────────────────────────────

_VALID_ANNOUNCEMENT_CATEGORIES = frozenset({"announcement", "task"})


class AnnouncementCreate(BaseModel):
    category: str
    title: str
    subject_uuid: UUID | None = None
    content_markdown: str
    original_language: str
    translation_status: str = "not_required"
    translated_content_markdown: str | None = None
    translated_language: str | None = None
    translated_at: datetime | None = None
    published_at: datetime | None = None
    due_at: datetime | None = None
    is_important: bool = False

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in _VALID_ANNOUNCEMENT_CATEGORIES:
            raise ValueError(f"category 必须为 {_VALID_ANNOUNCEMENT_CATEGORIES}")
        return v

    @field_validator("translation_status")
    @classmethod
    def validate_translation_status(cls, v: str) -> str:
        if v not in _VALID_TRANSLATION_STATUSES:
            raise ValueError(f"translation_status 必须为 {_VALID_TRANSLATION_STATUSES}")
        return v


class AnnouncementUpdate(BaseModel):
    """
    所有字段可选。缺失字段不更新，显式传 null 的字段设为 null（仅对 nullable 字段有效）。
    禁止修改 student（由 URL 路径决定）和 author。
    """
    category: str | None = None
    title: str | None = None
    subject_uuid: UUID | None = None
    content_markdown: str | None = None
    original_language: str | None = None
    translation_status: str | None = None
    translated_content_markdown: str | None = None
    translated_language: str | None = None
    translated_at: datetime | None = None
    published_at: datetime | None = None
    due_at: datetime | None = None
    is_important: bool | None = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str | None) -> str | None:
        if v is not None and v not in _VALID_ANNOUNCEMENT_CATEGORIES:
            raise ValueError(f"category 必须为 {_VALID_ANNOUNCEMENT_CATEGORIES}")
        return v

    @field_validator("translation_status")
    @classmethod
    def validate_translation_status(cls, v: str | None) -> str | None:
        if v is not None and v not in _VALID_TRANSLATION_STATUSES:
            raise ValueError(f"translation_status 必须为 {_VALID_TRANSLATION_STATUSES}")
        return v


class TeacherAnnouncementDetail(BaseModel):
    """
    老师视角公告详情。
    display_content_markdown 由后端根据 translation_status 自动选择 original / translated。
    """
    uuid: UUID
    category: str
    title: str
    subject: SubjectBrief | None = None
    is_important: bool
    author: AuthorBrief
    published_at: datetime
    due_at: datetime | None = None
    created_at: datetime
    display_content_markdown: str
    original_content_markdown: str
    translated_content_markdown: str | None = None
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str
    translated_at: datetime | None = None


# ── §10.16 老师班级列表 ────────────────────────────────────────────────────────

class TeacherClassItem(BaseModel):
    uuid: UUID
    name: str
    grade_level: str | None = None
    academic_year: str | None = None
    is_homeroom: bool
    student_count: int


class ClassStudentItem(BaseModel):
    uuid: UUID
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
    avatar_url: str | None = None
    subjects: list[SubjectBrief]


# ── §10.18 班级成绩统计 ────────────────────────────────────────────────────────

class GradeStatsClassInfo(BaseModel):
    uuid: UUID
    name: str
    grade_level: str | None = None


class GradeStatsSummary(BaseModel):
    student_count: int
    avg_score: float | None = None
    max_score: float | None = None
    min_score: float | None = None
    exam_count: int


class StudentSubjectScore(BaseModel):
    subject_uuid: UUID
    subject_name: str
    avg_score: float | None = None
    latest_score: float | None = None
    exam_count: int


class GradeStatsStudent(BaseModel):
    student_uuid: UUID
    full_name: str
    sid: str | None = None
    subject_scores: list[StudentSubjectScore]


class GradeStatsData(BaseModel):
    """§10.18 成绩统计聚合。JSON 序列化时 class_info 输出为 \"class\" key。"""
    model_config = ConfigDict(populate_by_name=True)
    class_info: GradeStatsClassInfo = Field(alias="class")
    summary: GradeStatsSummary
    students: list[GradeStatsStudent]


# ── §10.19–10.22 考试成绩 ──────────────────────────────────────────────────────

class ExamScoreItem(BaseModel):
    uuid: UUID
    subject: SubjectBrief
    exam_name: str | None = None
    exam_date: date
    score: float
    full_score: float
    note: str | None = None
    author: AuthorBrief
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_obj(cls, s: object) -> 'ExamScoreItem':
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
            updated_at=s.updated_at,  # type: ignore[attr-defined]
        )


class CreateExamScoreRequest(BaseModel):
    subject_uuid: UUID
    exam_name: str | None = None
    exam_date: str  # YYYY-MM-DD
    score: float
    full_score: float = 100.0
    note: str | None = None


class UpdateExamScoreRequest(BaseModel):
    """所有字段可选，未传字段不更新。"""
    exam_name: str | None = None
    exam_date: str | None = None
    score: float | None = None
    full_score: float | None = None
    note: str | None = None


# ── §10.23–10.24 周期指标 ──────────────────────────────────────────────────────

class PeriodMetricItem(BaseModel):
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
    def from_orm_obj(cls, m: object) -> 'PeriodMetricItem':
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


class UpsertPeriodMetricRequest(BaseModel):
    subject_uuid: UUID
    term: str | None = None
    snapshot_date: str  # YYYY-MM-DD
    progress: float | None = None
    assignment_completion_rate: float | None = None
    attendance_rate: float | None = None
