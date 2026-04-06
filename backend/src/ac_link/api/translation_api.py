"""
翻译接口：/api/translations/*

包含：
  POST /api/translations/resolve   §12.2
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user
from ac_link.common.exceptions import Errors
from ac_link.crud import translation as translation_crud
from ac_link.db.db import get_db
from ac_link.db.orm.communication import Post
from ac_link.db.orm.content import Announcement, Report
from ac_link.db.orm.enums import TranslationResourceType, TranslationStatus
from ac_link.db.orm.user import User, UserSettings
from ac_link.dto.auth import ApiResponse
from ac_link.services.translation_helpers import get_target_language

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/translations", tags=["translations"])


# ── DTO ───────────────────────────────────────────────────────────────────────

from pydantic import BaseModel
from datetime import datetime


class TranslationResolveRequest(BaseModel):
    resource_type: str  # "report" | "announcement" | "post"
    resource_uuid: str


class TranslationResolveData(BaseModel):
    resource_type: str
    resource_uuid: str
    display_content_markdown: str
    original_content_markdown: str
    translated_content_markdown: str | None = None
    display_language: str
    original_language: str
    translated_language: str | None = None
    translation_status: str | None = None
    translated_at: datetime | None = None


# ── POST /api/translations/resolve ────────────────────────────────────────────

_VALID_RESOURCE_TYPES = frozenset({"report", "announcement", "post"})


@router.post("/resolve", response_model=ApiResponse[TranslationResolveData], status_code=200)
def resolve_translation(
    body: TranslationResolveRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TranslationResolveData]:
    """
    解析/获取资源翻译内容（§12.2）。

    若缓存存在（且非 stale）则直接返回；否则视 ai_auto_translate_enabled 决定是否
    调用 OpenAI 执行翻译并缓存。
    """
    if body.resource_type not in _VALID_RESOURCE_TYPES:
        from ac_link.common.exceptions import AppError
        raise AppError(400, "invalid_resource_type",
                       f"resource_type 必须为 {_VALID_RESOURCE_TYPES}")

    # 解析 resource_uuid
    try:
        resource_uuid = UUID(body.resource_uuid)
    except ValueError:
        from ac_link.common.exceptions import AppError
        raise AppError(400, "invalid_uuid", "resource_uuid 格式无效")

    # 获取资源原文
    resource_type_enum = TranslationResourceType(body.resource_type)
    original_content: str
    original_language: str
    resource_id: int

    if resource_type_enum == TranslationResourceType.REPORT:
        report = db.query(Report).filter(Report.uuid == resource_uuid).first()
        if report is None:
            raise Errors.not_found("报告不存在")
        original_content = report.original_content_markdown
        original_language = report.original_language
        resource_id = report.id
    elif resource_type_enum == TranslationResourceType.ANNOUNCEMENT:
        ann = db.query(Announcement).filter(Announcement.uuid == resource_uuid).first()
        if ann is None:
            raise Errors.not_found("公告不存在")
        original_content = ann.original_content_markdown
        original_language = ann.original_language
        resource_id = ann.id
    else:  # POST
        post = db.query(Post).filter(Post.uuid == resource_uuid).first()
        if post is None:
            raise Errors.not_found("帖子不存在")
        original_content = post.content_markdown
        original_language = post.original_language or "en-AU"
        resource_id = post.id

    # 确定目标语言
    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id
    ).first()
    target_language = get_target_language(
        user_settings.language if user_settings else None,
        request.headers.get("accept-language"),
    )

    # 若目标语言与原文语言相同，直接返回
    if target_language == original_language:
        return ApiResponse(data=TranslationResolveData(
            resource_type=body.resource_type,
            resource_uuid=body.resource_uuid,
            display_content_markdown=original_content,
            original_content_markdown=original_content,
            display_language=original_language,
            original_language=original_language,
            translation_status=str(TranslationStatus.NOT_REQUIRED),
        ))

    # 查找缓存
    cached = translation_crud.get_translation(db, resource_type_enum, resource_id, target_language)
    if cached is not None and cached.translation_status == TranslationStatus.COMPLETED:
        return ApiResponse(data=TranslationResolveData(
            resource_type=body.resource_type,
            resource_uuid=body.resource_uuid,
            display_content_markdown=cached.translated_content_markdown,
            original_content_markdown=original_content,
            translated_content_markdown=cached.translated_content_markdown,
            display_language=cached.language,
            original_language=original_language,
            translated_language=cached.language,
            translation_status=str(cached.translation_status),
            translated_at=cached.translated_at,
        ))

    # 检查自动翻译是否启用
    if user_settings and not user_settings.ai_auto_translate_enabled:
        raise Errors.auto_translation_disabled()

    # 执行翻译
    try:
        from ac_link.services.openai_service import translate_content
        translated_text = translate_content(original_content, original_language, target_language)
    except Exception:
        logger.exception("翻译失败: resource_type=%s resource_id=%d", body.resource_type, resource_id)
        raise Errors.ai_translation_failed()

    # 写入缓存
    tr = translation_crud.upsert_translation(
        db, resource_type_enum, resource_id, target_language,
        translated_text, TranslationStatus.COMPLETED,
    )
    db.commit()

    return ApiResponse(data=TranslationResolveData(
        resource_type=body.resource_type,
        resource_uuid=body.resource_uuid,
        display_content_markdown=tr.translated_content_markdown,
        original_content_markdown=original_content,
        translated_content_markdown=tr.translated_content_markdown,
        display_language=tr.language,
        original_language=original_language,
        translated_language=tr.language,
        translation_status=str(tr.translation_status),
        translated_at=tr.translated_at,
    ))
