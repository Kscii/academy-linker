"""
认证与账户相关 DTO（Pydantic Schema）。

命名规范：
  - *Request  → 请求 body schema
  - *Response → 响应 data schema（嵌套在 {"data": ...} 中）

与 API 文档的对应关系：
  §7.1  LoginRequest / LoginResponse
  §7.2  RefreshResponse（无请求 body）
  §7.3  （无 body，响应用 SuccessResponse）
  §7.4  （无 body，响应用 SuccessResponse）
  §7.5  MeResponse
  §7.6  UpdateMeRequest / MeResponse
  §7.7  ChangePasswordRequest / SuccessResponse
  §7.8  SessionItem / SessionListResponse
  §7.9  （无 body，响应用 SuccessResponse）

后续开发注意：
  - 所有响应 Schema 应严格对应 API 文档中的字段，字段增减必须同步更新文档
  - 密码字段（含 current_password / new_password）仅存在于 Request 中，
    绝不出现在任何 Response 中
  - datetime 字段统一用 datetime 类型，FastAPI 会自动序列化为 ISO 8601 字符串
"""

from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """统一响应信封，对应所有接口的 {"data": ...} 外层结构。"""
    data: T


# ── 通用 ─────────────────────────────────────────────────────────────────────

class SuccessResponse(BaseModel):
    """用于无实质数据的成功响应。"""
    success: bool = True


# ── 用户信息 Schema（复用于多个响应）──────────────────────────────────────────

class UserOut(BaseModel):
    """
    对外暴露的用户信息字段。
    对应 API 文档 §7.5 / §7.6 / §7.1 登录响应中的 user 对象。
    注意：phone_number 只在 GET /api/me 中返回，登录响应中没有。
    """
    uuid: UUID
    role: str
    display_name: str
    email: EmailStr
    phone_number: str | None = None
    avatar_url: str | None = None

    class Config:
        from_attributes = True  # 支持从 ORM 对象直接构造


class UserOutBrief(BaseModel):
    """
    登录成功后返回的精简用户信息（不含 phone_number）。
    对应 API 文档 §7.1 Success 响应体中的 user 字段。
    """
    uuid: UUID
    role: str
    display_name: str
    email: EmailStr
    avatar_url: str | None = None

    class Config:
        from_attributes = True


# ── §7.1 登录 ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    # remember_me=True 时 refresh_token 有效期从 3 天延长到 7 天
    remember_me: bool = False


class LoginResponse(BaseModel):
    user: UserOutBrief


# ── §7.5 获取当前用户信息 ────────────────────────────────────────────────────

class MeResponse(BaseModel):
    user: UserOut


# ── §7.6 更新当前用户资料 ─────────────────────────────────────────────────────

class UpdateMeRequest(BaseModel):
    """
    PATCH /api/me 请求体。
    全部字段均为可选，仅传入需要更新的字段。
    注意：email / role 不允许用户自行修改，不在此 schema 中暴露。
    """
    display_name: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None


# ── §7.7 修改密码 ─────────────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_min_length(cls, v: str) -> str:
        """
        密码最小长度校验。当前设为 8 位。
        后续如需更复杂的密码策略（大小写、特殊字符等），在此处扩展。
        """
        if len(v) < 8:
            raise ValueError("新密码长度不能少于 8 位")
        return v


# ── §7.8 会话列表 ─────────────────────────────────────────────────────────────

class SessionItem(BaseModel):
    """
    单个会话信息。
    is_current 由 service 层根据当前请求携带的 session_uuid 与列表比对填入。
    """
    uuid: UUID
    device_label: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime
    last_used_at: datetime
    is_current: bool = False

    class Config:
        from_attributes = True
