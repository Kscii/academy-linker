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

class StudentListItem(BaseModel):
    uuid: UUID
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CreateStudentRequest(BaseModel):
    sid: str | None = None
    full_name: str
    preferred_name: str | None = None
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None


class UpdateStudentRequest(BaseModel):
    sid: str | None = None
    full_name: str | None = None
    preferred_name: str | None = None
    class_name: str | None = None
    grade_level: str | None = None
    avatar_url: str | None = None
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
    is_homeroom: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CreateAssignmentRequest(BaseModel):
    teacher_uuid: UUID
    student_uuid: UUID
    subject_uuid: UUID
    is_homeroom: bool = False


class UpdateAssignmentRequest(BaseModel):
    is_homeroom: bool | None = None
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
