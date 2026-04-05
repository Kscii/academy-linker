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

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator

from ac_link.dto.parent import AuthorBrief, SubjectBrief, SummaryCards


# ── §10.1 老师学生列表 ────────────────────────────────────────────────────────

class TeacherStudentListItem(BaseModel):
    """老师视角学生列表条目。score 字段在 student_metrics 表建好前始终为 null。"""
    uuid: UUID
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
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
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None

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
