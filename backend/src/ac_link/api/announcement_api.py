"""
公告独立接口：/api/announcements/*

包含：
  GET  /api/announcements/{announcement_uuid}       - 获取公告正文详情（§9.11）
  POST /api/announcements/{announcement_uuid}/read  - 标记公告为已读（§9.12）

权限：仅 parent 角色可访问，且公告所属学生必须与当前家长有 active binding。
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import require_parent
from ac_link.common.exceptions import Errors
from ac_link.crud import parent as parent_crud
from ac_link.db.db import get_db
from ac_link.db.orm.content import Announcement
from ac_link.db.orm.enums import TranslationStatus
from ac_link.db.orm.user import User
from ac_link.dto.auth import ApiResponse, SuccessResponse
from ac_link.dto.parent import AnnouncementDetail, AuthorBrief, SubjectBrief

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


def _display_language(ann: Announcement) -> str:
    if ann.translation_status == TranslationStatus.COMPLETED and ann.translated_language:
        return ann.translated_language
    return ann.original_language


def _display_content(ann: Announcement) -> str:
    if ann.translation_status == TranslationStatus.COMPLETED and ann.translated_content_markdown:
        return ann.translated_content_markdown
    return ann.original_content_markdown


# ── GET /api/announcements/{announcement_uuid} ────────────────────────────────

@router.get("/{announcement_uuid}", response_model=ApiResponse[AnnouncementDetail])
def get_announcement(
    announcement_uuid: UUID,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[AnnouncementDetail]:
    """获取公告正文详情。验证家长对该公告所属学生的 active binding。"""
    result = parent_crud.get_announcement_for_parent(db, current_user.id, announcement_uuid)
    if result is None:
        raise Errors.not_found("公告不存在或无权访问")

    ann, state = result
    return ApiResponse(data=AnnouncementDetail(
        uuid=ann.uuid,
        category=str(ann.category),
        title=ann.title,
        subject=SubjectBrief.model_validate(ann.subject) if ann.subject else None,
        is_important=ann.is_important,
        is_read=state.is_read if state else False,
        read_at=state.read_at if state else None,
        published_at=ann.published_at,
        due_at=ann.due_at,
        author=AuthorBrief.model_validate(ann.author_user),
        display_content_markdown=_display_content(ann),
        original_content_markdown=ann.original_content_markdown,
        translated_content_markdown=ann.translated_content_markdown,
        display_language=_display_language(ann),
        original_language=ann.original_language,
        translated_language=ann.translated_language,
        translation_status=str(ann.translation_status),
        translated_at=ann.translated_at,
    ))


# ── POST /api/announcements/{announcement_uuid}/read ──────────────────────────

@router.post("/{announcement_uuid}/read", response_model=ApiResponse[SuccessResponse])
def mark_announcement_read(
    announcement_uuid: UUID,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """标记公告为已读。若已读则返回 409。"""
    result = parent_crud.get_announcement_for_parent(db, current_user.id, announcement_uuid)
    if result is None:
        raise Errors.not_found("公告不存在或无权访问")

    ann, state = result
    if state is not None and state.is_read:
        raise Errors.already_read()

    parent_crud.upsert_announcement_state(
        db, ann.id, current_user.id,
        is_read=True,
        read_at=datetime.now(timezone.utc),
    )
    db.commit()
    return ApiResponse(data=SuccessResponse())
