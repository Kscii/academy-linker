"""
讨论区相关 DTO（Pydantic Schema）。

与 API 文档的对应关系：
  §9.13  DiscussionTeacherListItem  — 家长查看学生的教师列表
  §9.14  ParentDiscussionPageData   — 家长查看与某教师的讨论页
  §9.15  PostCreate                 — 创建帖子 body
  §9.16  PostUpdate                 — 编辑帖子 body
  §10.3  DiscussionParentListItem   — 教师查看学生的家长列表
  §10.4  TeacherDiscussionPageData  — 教师查看与某家长的讨论页
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator

from ac_link.dto.admin import PaginationMeta
from ac_link.dto.parent import AuthorBrief, StudentBrief, SubjectBrief


# ── 通用子 Schema ─────────────────────────────────────────────────────────────

class TagBrief(BaseModel):
    uuid: UUID
    name: str
    scope: str

    class Config:
        from_attributes = True


class TagDetail(BaseModel):
    """完整 tag 响应（§10.8-10.10），用于教师端 tag 列表和写操作响应。"""
    uuid: UUID
    name: str
    scope: str
    owner_teacher_uuid: UUID | None
    is_selectable_by_parent: bool
    is_selectable_by_teacher: bool
    affects_business_logic: bool


# ── Tag 写操作 Body ───────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("name 不能为空或纯空格")
        return stripped


class TagUpdate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("name 不能为空或纯空格")
        return stripped


class PostItem(BaseModel):
    """
    讨论帖子单条。
    is_deleted=True 时 content_markdown 固定为"[该帖子已删除]"，其余字段保留。
    """
    uuid: UUID
    author: AuthorBrief
    title: str | None
    content_markdown: str
    is_deleted: bool
    reply_to_post_uuid: UUID | None
    tags: list[TagBrief]
    created_at: datetime
    updated_at: datetime | None


# ── 列表项——教师/家长信息 ──────────────────────────────────────────────────────

class DiscussionTeacherListItem(BaseModel):
    """家长视角：与指定学生相关的单个教师条目（§9.13）。"""
    uuid: UUID
    display_name: str
    avatar_url: str | None
    subjects: list[SubjectBrief]
    thread_uuid: UUID | None
    last_post_at: datetime | None
    unread_post_count: int


class DiscussionParentListItem(BaseModel):
    """教师视角：与指定学生相关的单个家长条目（§10.3）。"""
    uuid: UUID
    display_name: str
    avatar_url: str | None
    thread_uuid: UUID | None
    last_post_at: datetime | None
    unread_post_count: int


# ── 讨论页聚合 ────────────────────────────────────────────────────────────────

class DiscussionTeacherInfo(BaseModel):
    """讨论页内嵌的教师信息（带学科列表）。"""
    uuid: UUID
    display_name: str
    avatar_url: str | None
    subjects: list[SubjectBrief]


class DiscussionParentInfo(BaseModel):
    """讨论页内嵌的家长信息。"""
    uuid: UUID
    display_name: str
    avatar_url: str | None


class ParentDiscussionPageData(BaseModel):
    """家长视角的讨论页聚合数据（§9.14）。"""
    thread_uuid: UUID
    student: StudentBrief
    teacher: DiscussionTeacherInfo
    posts: list[PostItem]
    meta: PaginationMeta


class TeacherDiscussionPageData(BaseModel):
    """教师视角的讨论页聚合数据（§10.4）。"""
    thread_uuid: UUID
    student: StudentBrief
    parent: DiscussionParentInfo
    posts: list[PostItem]
    meta: PaginationMeta


# ── 帖子写操作 Body ───────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    title: str | None = None
    content_markdown: str
    tag_uuids: list[UUID] = []
    reply_to_post_uuid: UUID | None = None

    @field_validator("content_markdown")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content_markdown 不能为空")
        return v


class PostUpdate(BaseModel):
    """PATCH 帖子——所有字段均可选。tag_uuids 若提供则整体替换现有标签。"""
    title: str | None = None
    content_markdown: str | None = None
    tag_uuids: list[UUID] | None = None

    @field_validator("content_markdown")
    @classmethod
    def content_not_empty(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("content_markdown 不能为空")
        return v


# ── 序列化辅助 ────────────────────────────────────────────────────────────────

_DELETED_PLACEHOLDER = "[该帖子已删除]"


def build_post_item(post: object) -> PostItem:  # type: ignore[type-arg]
    """将 Post ORM 对象转换为 PostItem DTO。

    - is_deleted=True 时 content_markdown 固定替换为占位文本
    - reply_to_post_uuid 取 reply_to_post 关系的 uuid
    """
    from ac_link.db.orm.communication import Post as PostORM  # 局部导入避免循环

    p: PostORM = post  # type: ignore[assignment]
    is_deleted = p.deleted_at is not None
    return PostItem(
        uuid=p.uuid,
        author=AuthorBrief(
            uuid=p.author_user.uuid,
            display_name=p.author_user.display_name,
            role=str(p.author_user.role),
        ),
        title=p.title,
        content_markdown=_DELETED_PLACEHOLDER if is_deleted else p.content_markdown,
        is_deleted=is_deleted,
        reply_to_post_uuid=p.reply_to_post.uuid if p.reply_to_post else None,
        tags=[
            TagBrief(uuid=bt.tag.uuid, name=bt.tag.name, scope=str(bt.tag.scope))
            for bt in p.post_tags
        ],
        created_at=p.created_at,
        updated_at=p.updated_at,
    )
