"""
公告接口：/api/announcements/*

包含：
  GET   /api/announcements/{announcement_uuid}       - 获取公告正文详情（§9.11）
  POST  /api/announcements/{announcement_uuid}/read  - 标记公告为已读（§9.12）
  PATCH /api/announcements/{announcement_uuid}       - 更新公告（§10.15）仅创建者或 admin
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user, require_parent
from ac_link.common.exceptions import Errors
from ac_link.crud import parent as parent_crud
from ac_link.crud import teacher as teacher_crud
from ac_link.crud import translation as translation_crud
from ac_link.db.db import get_db
from ac_link.db.orm.enums import AnnouncementCategory, TranslationResourceType, UserRole
from ac_link.db.orm.user import User, UserSettings
from ac_link.dto.auth import ApiResponse, SuccessResponse
from ac_link.dto.parent import AnnouncementDetail, AuthorBrief, SubjectBrief
from ac_link.dto.teacher import AnnouncementUpdate, TeacherAnnouncementDetail
from ac_link.services.translation_helpers import get_target_language, resolve_translation_fields

router = APIRouter(prefix="/api/announcements", tags=["announcements"])



# ── GET /api/announcements/{announcement_uuid} ────────────────────────────────

@router.get("/{announcement_uuid}", response_model=ApiResponse[AnnouncementDetail])
def get_announcement(
    announcement_uuid: UUID,
    request: Request,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[AnnouncementDetail]:
    """获取公告正文详情。验证家长对该公告所属学生的 active binding。"""
    result = parent_crud.get_announcement_for_parent(db, current_user.id, announcement_uuid)
    if result is None:
        raise Errors.not_found("公告不存在或无权访问")

    ann, state = result
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    target_language = get_target_language(
        user_settings.language if user_settings else None,
        request.headers.get("accept-language"),
    )
    translation = translation_crud.get_translation(
        db,
        TranslationResourceType.ANNOUNCEMENT,
        ann.id,
        target_language,
    )
    tf = resolve_translation_fields(ann.original_content_markdown, ann.original_language, translation)
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
        display_content_markdown=tf['display_content_markdown'],
        original_content_markdown=tf['original_content_markdown'],
        translated_content_markdown=tf['translated_content_markdown'],
        display_language=tf['display_language'],
        original_language=tf['original_language'],
        translated_language=tf['translated_language'],
        translation_status=tf['translation_status'],
        translated_at=tf['translated_at'],
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


# ── PATCH /api/announcements/{announcement_uuid} ─────────────────────────────

@router.patch("/{announcement_uuid}", response_model=ApiResponse[TeacherAnnouncementDetail])
def update_announcement(
    announcement_uuid: UUID,
    body: AnnouncementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TeacherAnnouncementDetail]:
    """
    更新公告/任务（§10.15）。
    权限：公告创建者（teacher）或 admin。
    禁止修改 student 和 author（由创建时确定）。
    subject_uuid 提供时验证 teaching_assignment 三元分配。
    """
    announcement = teacher_crud.get_announcement_by_uuid(db, announcement_uuid)
    if announcement is None:
        raise Errors.not_found("公告不存在")

    is_admin = current_user.role == UserRole.ADMIN
    if not is_admin and announcement.author_user_id != current_user.id:
        raise Errors.forbidden("仅公告创建者或管理员可更新")

    provided = body.model_fields_set

    # 解析 subject_uuid
    subject_id = teacher_crud.UNSET
    if "subject_uuid" in provided:
        if body.subject_uuid is None:
            subject_id = None
        else:
            subject = teacher_crud.get_subject_by_uuid(db, body.subject_uuid)
            if subject is None:
                raise Errors.not_found("学科不存在")
            if not is_admin:
                if not teacher_crud.verify_teaching_assignment(
                    db, current_user.id, announcement.student_id, subject.id
                ):
                    raise Errors.forbidden("当前教师未被分配该学生的此学科")
            subject_id = subject.id

    def _unset_or(field: str):
        return getattr(body, field) if field in provided else teacher_crud.UNSET

    teacher_crud.update_announcement(
        db, announcement,
        category=AnnouncementCategory(body.category) if "category" in provided and body.category else None,
        title=body.title if "title" in provided else None,
        subject_id=subject_id,
        content_markdown=body.content_markdown if "content_markdown" in provided else None,
        original_language=body.original_language if "original_language" in provided else None,
        published_at=body.published_at if "published_at" in provided else None,
        due_at=_unset_or("due_at"),
        is_important=body.is_important if "is_important" in provided else None,
    )
    db.commit()
    db.refresh(announcement)
    _ = announcement.subject
    _ = announcement.author_user

    return ApiResponse(data=TeacherAnnouncementDetail(
        uuid=announcement.uuid,
        category=str(announcement.category),
        title=announcement.title,
        subject=SubjectBrief.model_validate(announcement.subject) if announcement.subject else None,
        is_important=announcement.is_important,
        author=AuthorBrief(
            uuid=announcement.author_user.uuid,
            display_name=announcement.author_user.display_name,
            role=str(announcement.author_user.role),
        ),
        published_at=announcement.published_at,
        due_at=announcement.due_at,
        created_at=announcement.created_at,
        display_content_markdown=announcement.original_content_markdown,
        original_content_markdown=announcement.original_content_markdown,
        display_language=announcement.original_language,
        original_language=announcement.original_language,
    ))
