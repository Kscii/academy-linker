"""
资源中心接口相关 DTO（Pydantic Schema）。

与 API 文档的对应关系：
  §12A.1  ResourceListItem / PaginatedResponse[ResourceListItem]
  §12A.2  CategoryItem / ApiResponse[list[CategoryItem]]
  §12A.3  ResourceDetail / ApiResponse[ResourceDetail]
  §12A.4  Admin 资源列表（复用 ResourceListItem）
  §12A.5  CreateResourceRequest / ApiResponse[ResourceDetail] 201
  §12A.6  UpdateResourceRequest / ApiResponse[ResourceDetail] 200
  §12A.7  DeleteResourceResult / ApiResponse[DeleteResourceResult] 200
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from ac_link.dto.admin import PaginatedResponse, PaginationMeta  # noqa: F401 — 供外部复用


# ── 翻译块（列表项） ────────────────────────────────────────────────────────────

class TranslationBlock(BaseModel):
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str | None = None
    translated_at: datetime | None = None


# ── §12A.1 / §12A.4  资源列表项 ───────────────────────────────────────────────

class ResourceListItem(BaseModel):
    uuid: UUID
    title: str
    summary: str | None = None
    category_key: str
    category_label: str
    audience_role: str
    cover_image_url: str | None = None
    external_url: str | None = None
    is_pinned: bool
    published_at: datetime | None = None
    translation: TranslationBlock

    class Config:
        from_attributes = True


# ── §12A.2  分类列表项 ─────────────────────────────────────────────────────────

class CategoryItem(BaseModel):
    key: str
    label: str
    resource_count: int


# ── §12A.3  资源详情 ───────────────────────────────────────────────────────────

class ResourceDetail(BaseModel):
    uuid: UUID
    title: str
    summary: str | None = None
    category_key: str
    category_label: str
    audience_role: str
    cover_image_url: str | None = None
    external_url: str | None = None
    is_pinned: bool
    published_at: datetime | None = None
    display_content_markdown: str
    original_content_markdown: str
    translated_content_markdown: str | None = None
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str | None = None
    translated_at: datetime | None = None

    class Config:
        from_attributes = True


# ── §12A.5  Admin 创建资源请求 ────────────────────────────────────────────────

class CreateResourceRequest(BaseModel):
    title: str
    summary: str | None = None
    content_markdown: str
    category_key: str
    category_label: str
    audience_role: str  # parent | teacher | all
    cover_image_url: str | None = None
    external_url: str | None = None
    is_pinned: bool = False
    is_published: bool = True
    published_at: datetime | None = None
    original_language: str = "en-AU"


# ── §12A.6  Admin 更新资源请求（全字段 Optional） ────────────────────────────

class UpdateResourceRequest(BaseModel):
    title: str | None = None
    summary: str | None = None
    content_markdown: str | None = None
    category_key: str | None = None
    category_label: str | None = None
    audience_role: str | None = None
    cover_image_url: str | None = None
    external_url: str | None = None
    is_pinned: bool | None = None
    is_published: bool | None = None
    published_at: datetime | None = None
    original_language: str | None = None


# ── §12A.7  Admin 删除资源响应 ────────────────────────────────────────────────

class DeleteResourceResult(BaseModel):
    success: bool = True
