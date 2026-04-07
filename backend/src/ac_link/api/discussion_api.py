"""
讨论区帖子操作接口（家长、教师共用）：/api/threads/* 和 /api/posts/*

包含：
  POST   /api/threads/{thread_uuid}/posts  — 创建帖子（§9.15 / §10.5）
  PATCH  /api/posts/{post_uuid}            — 编辑帖子（§9.16 / §10.6）
  DELETE /api/posts/{post_uuid}            — 删除帖子（§9.17 / §10.7）

权限规则：
  - 访问 thread：当前用户必须是 thread 的 parent_user_id 或 teacher_user_id
  - 编辑/删除 post：必须是帖子作者
  - tag 限制：
      parent  → 只能使用 is_selectable_by_parent=True 的 tag
      teacher → 可使用 system tag + 自己的 private tag，可使用 important
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user
from ac_link.common.exceptions import AppError, Errors
from ac_link.crud import discussion as discussion_crud
from ac_link.crud import translation as translation_crud
from ac_link.db.db import get_db
from ac_link.db.orm.communication import Tag
from ac_link.db.orm.enums import TagScope, TranslationResourceType, UserRole
from ac_link.db.orm.user import User
from ac_link.dto.auth import ApiResponse, SuccessResponse
from ac_link.dto.discussion import PostCreate, PostItem, PostUpdate, build_post_item

router = APIRouter(tags=["discussion"])


# ── POST /api/threads/{thread_uuid}/posts ─────────────────────────────────────

@router.post("/api/threads/{thread_uuid}/posts", response_model=ApiResponse[PostItem], status_code=201)
def create_post(
    thread_uuid: UUID,
    body: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[PostItem]:
    """在指定 thread 下创建帖子（§9.15 / §10.5）。"""
    _require_parent_or_teacher(current_user)

    thread = discussion_crud.get_thread_by_uuid_for_user(db, thread_uuid, current_user.id)
    if thread is None:
        raise Errors.not_found("Thread 不存在或无权访问")

    # 解析 tag，做角色校验
    tags = discussion_crud.get_tags_by_uuids(db, body.tag_uuids)
    _validate_tags_for_role(current_user, tags, thread)

    # 解析 reply_to_post_id
    reply_to_post_id: int | None = None
    if body.reply_to_post_uuid is not None:
        reply_post = discussion_crud.get_post_by_uuid(db, body.reply_to_post_uuid)
        if reply_post is None or reply_post.thread_id != thread.id:
            raise Errors.not_found("回复的帖子不存在或不属于此 thread")
        reply_to_post_id = reply_post.id

    # original_language: 优先使用请求体中的值，否则回退到用户语言设置，再回退到默认值
    original_language = (
        body.original_language
        or (current_user.settings.language if current_user.settings else None)
        or "en"
    )

    post = discussion_crud.create_post(
        db, thread, current_user.id,
        title=body.title,
        content_markdown=body.content_markdown,
        original_language=original_language,
        tags=tags,
        reply_to_post_id=reply_to_post_id,
    )
    db.commit()

    # 重新加载含关联数据的 post
    post = discussion_crud.get_post_by_uuid(db, post.uuid)
    return ApiResponse(data=build_post_item(post))


# ── PATCH /api/posts/{post_uuid} ──────────────────────────────────────────────

@router.patch("/api/posts/{post_uuid}", response_model=ApiResponse[PostItem])
def update_post(
    post_uuid: UUID,
    body: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[PostItem]:
    """编辑帖子（§9.16 / §10.6）。仅作者可调用；tag_uuids 提供时整体替换。"""
    _require_parent_or_teacher(current_user)

    post = discussion_crud.get_post_by_uuid(db, post_uuid)
    if post is None or post.deleted_at is not None:
        raise Errors.not_found("帖子不存在")

    if post.author_user_id != current_user.id:
        raise Errors.forbidden("只允许作者编辑自己的帖子")

    # 解析新 tag（若提供）
    new_tags: list[Tag] | None = None
    if body.tag_uuids is not None:
        new_tags = discussion_crud.get_tags_by_uuids(db, body.tag_uuids)
        _validate_tags_for_role(current_user, new_tags, post.thread)

    discussion_crud.update_post(
        db, post,
        title=body.title,
        content_markdown=body.content_markdown,
        tags=new_tags,
    )
    if body.content_markdown is not None:
        translation_crud.mark_translations_stale(
            db,
            TranslationResourceType.POST,
            post.id,
        )
    db.commit()

    post = discussion_crud.get_post_by_uuid(db, post_uuid)
    return ApiResponse(data=build_post_item(post))


# ── DELETE /api/posts/{post_uuid} ─────────────────────────────────────────────

@router.delete("/api/posts/{post_uuid}", response_model=ApiResponse[SuccessResponse])
def delete_post(
    post_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """软删除帖子（§9.17 / §10.7）。仅作者可调用。"""
    _require_parent_or_teacher(current_user)

    post = discussion_crud.get_post_by_uuid(db, post_uuid)
    if post is None or post.deleted_at is not None:
        raise Errors.not_found("帖子不存在")

    if post.author_user_id != current_user.id:
        raise Errors.forbidden("只允许作者删除自己的帖子")

    discussion_crud.soft_delete_post(db, post)
    db.commit()
    return ApiResponse(data=SuccessResponse())


# ── POST /api/threads/{thread_uuid}/read ─────────────────────────────────────

@router.post("/api/threads/{thread_uuid}/read", response_model=ApiResponse[SuccessResponse])
def mark_thread_read(
    thread_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """将指定 thread 标记为当前用户已读（§9.20 / §10.20）。"""
    _require_parent_or_teacher(current_user)

    thread = discussion_crud.get_thread_by_uuid_for_user(db, thread_uuid, current_user.id)
    if thread is None:
        raise Errors.not_found("Thread 不存在或无权访问")

    discussion_crud.mark_thread_read(db, thread.id, current_user.id)
    db.commit()
    return ApiResponse(data=SuccessResponse())


# ── 内部辅助 ─────────────────────────────────────────────────────────────────

def _require_parent_or_teacher(user: User) -> None:
    """只允许 parent / teacher 角色访问讨论接口。"""
    if user.role not in (UserRole.PARENT, UserRole.TEACHER):
        raise AppError(403, "role_not_allowed", "仅 parent 或 teacher 角色可访问此接口")


def _validate_tags_for_role(user: User, tags: list[Tag], thread: object) -> None:
    """
    按 tag 类型和用户角色校验使用权限：
    - 系统 tag：所有用户（parent / teacher）均可使用
    - 老师私有 tag：
        teacher → 只能使用自己的
        parent  → 只能使用当前 thread 的教师（thread.teacher_user_id）所拥有的
    """
    from ac_link.db.orm.communication import DiscussionThread as _Thread
    t: _Thread = thread  # type: ignore[assignment]

    if user.role == UserRole.PARENT:
        for tag in tags:
            if tag.scope == TagScope.TEACHER_PRIVATE and tag.owner_teacher_user_id != t.teacher_user_id:
                raise AppError(403, "forbidden", f"Tag「{tag.name}」不是此讨论教师的私有 tag")
    elif user.role == UserRole.TEACHER:
        for tag in tags:
            if tag.scope == TagScope.TEACHER_PRIVATE and tag.owner_teacher_user_id != user.id:
                raise AppError(403, "forbidden", f"Tag「{tag.name}」不是你的私有 tag")
