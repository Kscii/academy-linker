"""
Admin 接口相关 DTO（Pydantic Schema）。

与 API 文档的对应关系：
  §11.1  UserListItem / PaginatedResponse[UserListItem]
  §11.2  CreateUserRequest / UserListItem
  §11.3  UpdateUserRequest / UserListItem
  §11.4  StudentListItem / PaginatedResponse[StudentListItem]
  §11.5  CreateStudentRequest / StudentListItem
  §11.6  UpdateStudentRequest / StudentListItem
  §11.7  BindingListItem / PaginatedResponse[BindingListItem]
  §11.8  CreateBindingRequest / BindingListItem
  §11.9  UpdateBindingRequest / BindingListItem
  §11.10 AssignmentListItem / PaginatedResponse[AssignmentListItem]
  §11.11 CreateAssignmentRequest / AssignmentListItem
  §11.12 UpdateAssignmentRequest / AssignmentListItem
  §11.13 SystemTagItem / list[SystemTagItem]
  §11.14 CreateSystemTagRequest / SystemTagItem
  §11.15 UpdateSystemTagRequest / SystemTagItem
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from ac_link.dto.auth import ApiResponse  # noqa: F401  复用 ApiResponse

T = TypeVar("T")

# ── 通用分页响应 ──────────────────────────────────────────────────────────────

class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    meta: PaginationMeta


# ── §11.1 / §11.2 / §11.3  用户管理 ─────────────────────────────────────────

class UserListItem(BaseModel):
    uuid: UUID
    role: str
    display_name: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


_PASSWORD_RE = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$')


def _validate_password(v: str) -> str:
    errors = []
    if len(v) < 8:
        errors.append("至少 8 个字符")
    if not re.search(r'[A-Z]', v):
        errors.append("至少包含 1 个大写字母")
    if not re.search(r'[a-z]', v):
        errors.append("至少包含 1 个小写字母")
    if not re.search(r'\d', v):
        errors.append("至少包含 1 个数字")
    if errors:
        raise ValueError("密码强度不足：" + "；".join(errors))
    return v


class CreateUserRequest(BaseModel):
    role: str
    display_name: str
    email: EmailStr
    phone_number: str | None = None
    password: str

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in ("parent", "teacher", "admin"):
            raise ValueError("role 必须是 parent / teacher / admin")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password(v)


class UpdateUserRequest(BaseModel):
    display_name: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None
    is_active: bool | None = None


# ── §11.4 / §11.5 / §11.6  学生管理 ─────────────────────────────────────────

class TeacherBrief(BaseModel):
    """班主任简要信息，嵌入 ClassListItem / ClassDetail 中使用。"""
    uuid: UUID
    display_name: str

    class Config:
        from_attributes = True


class StudentListItem(BaseModel):
    uuid: UUID
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
    class_uuid: UUID | None = None
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {'from_attributes': True}

    @classmethod
    def from_student(cls, s: object) -> 'StudentListItem':
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
            is_active=s.is_active,  # type: ignore[attr-defined]
            created_at=s.created_at,  # type: ignore[attr-defined]
        )


class CreateStudentRequest(BaseModel):
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
    class_uuid: UUID | None = None
    avatar_url: str | None = None
    date_of_birth: str | None = None


class UpdateStudentRequest(BaseModel):
    sid: str | None = None
    full_name: str | None = None
    preferred_name: str | None = None
    class_uuid: UUID | None = None
    avatar_url: str | None = None
    date_of_birth: str | None = None
    is_active: bool | None = None


# ── §11.7 / §11.8 / §11.9  Parent-Student 绑定 ───────────────────────────────

class BindingListItem(BaseModel):
    uuid: UUID
    parent_uuid: UUID
    student_uuid: UUID
    relationship_label: str | None = None
    is_primary: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CreateBindingRequest(BaseModel):
    parent_uuid: UUID
    student_uuid: UUID
    relationship_label: str | None = None
    is_primary: bool = False


class UpdateBindingRequest(BaseModel):
    relationship_label: str | None = None
    is_primary: bool | None = None
    is_active: bool | None = None


# ── §11.10 / §11.11 / §11.12  Teaching Assignment ────────────────────────────

class AssignmentListItem(BaseModel):
    uuid: UUID
    teacher_uuid: UUID
    student_uuid: UUID
    subject_uuid: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CreateAssignmentRequest(BaseModel):
    teacher_uuid: UUID
    student_uuid: UUID
    subject_uuid: UUID


class UpdateAssignmentRequest(BaseModel):
    is_active: bool | None = None


# ── §11.13 / §11.14 / §11.15  系统 Tag ───────────────────────────────────────

class SystemTagItem(BaseModel):
    uuid: UUID
    name: str
    scope: str
    is_selectable_by_parent: bool
    is_selectable_by_teacher: bool
    affects_business_logic: bool
    is_active: bool

    class Config:
        from_attributes = True


class CreateSystemTagRequest(BaseModel):
    name: str
    is_selectable_by_parent: bool = False
    is_selectable_by_teacher: bool = True
    affects_business_logic: bool = False


class UpdateSystemTagRequest(BaseModel):
    name: str | None = None
    is_selectable_by_parent: bool | None = None
    is_selectable_by_teacher: bool | None = None
    affects_business_logic: bool | None = None


# ── §11.16 / §11.17 / §11.18  班级管理 ───────────────────────────────────────

class HomeroomTeacherBrief(BaseModel):
    uuid: UUID
    display_name: str

    class Config:
        from_attributes = True


class ClassDetail(BaseModel):
    uuid: UUID
    name: str
    grade_level: str | None = None
    academic_year: str | None = None
    homeroom_teacher: HomeroomTeacherBrief | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_class(cls, c: object, student_count: int | None = None) -> 'ClassDetail':
        ht = getattr(c, 'homeroom_teacher', None)
        obj = cls(
            uuid=c.uuid,  # type: ignore[attr-defined]
            name=c.name,  # type: ignore[attr-defined]
            grade_level=c.grade_level,  # type: ignore[attr-defined]
            academic_year=c.academic_year,  # type: ignore[attr-defined]
            homeroom_teacher=HomeroomTeacherBrief(uuid=ht.uuid, display_name=ht.display_name) if ht else None,
            is_active=c.is_active,  # type: ignore[attr-defined]
            created_at=c.created_at,  # type: ignore[attr-defined]
        )
        return obj


class ClassListItem(ClassDetail):
    student_count: int = 0

    @classmethod
    def from_class(cls, c: object, student_count: int = 0) -> 'ClassListItem':  # type: ignore[override]
        ht = getattr(c, 'homeroom_teacher', None)
        return cls(
            uuid=c.uuid,  # type: ignore[attr-defined]
            name=c.name,  # type: ignore[attr-defined]
            grade_level=c.grade_level,  # type: ignore[attr-defined]
            academic_year=c.academic_year,  # type: ignore[attr-defined]
            homeroom_teacher=HomeroomTeacherBrief(uuid=ht.uuid, display_name=ht.display_name) if ht else None,
            is_active=c.is_active,  # type: ignore[attr-defined]
            created_at=c.created_at,  # type: ignore[attr-defined]
            student_count=student_count,
        )


class CreateClassRequest(BaseModel):
    name: str
    grade_level: str | None = None
    academic_year: str | None = None
    homeroom_teacher_uuid: UUID | None = None


class UpdateClassRequest(BaseModel):
    name: str | None = None
    grade_level: str | None = None
    academic_year: str | None = None
    homeroom_teacher_uuid: UUID | None = None
    is_active: bool | None = None


# ── §11.19  学生换班 ──────────────────────────────────────────────────────────

class TransferClassRequest(BaseModel):
    new_class_uuid: UUID


class TransferClassResult(BaseModel):
    student_uuid: UUID
    new_class_uuid: UUID
    deactivated_assignment_count: int
    created_assignment_count: int


# ── §11.0 Admin 首页总览 ──────────────────────────────────────────────────────

class AdminOverviewData(BaseModel):
    user_count: int
    teacher_count: int
    parent_count: int
    student_count: int
    class_count: int

