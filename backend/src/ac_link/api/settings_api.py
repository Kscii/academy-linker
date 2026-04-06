"""
用户设置接口：/api/settings

包含：
  GET   /api/settings  - 获取当前用户设置（§8.1）
  PATCH /api/settings  - 更新当前用户设置（§8.2）

所有角色均可访问。
GET 时若尚未创建过设置记录，则懒创建并返回默认值。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user
from ac_link.crud import user as user_crud
from ac_link.db.db import get_db
from ac_link.db.orm.user import User
from ac_link.dto.auth import ApiResponse
from ac_link.dto.settings import SettingsOut, SettingsPatchRequest

router = APIRouter(prefix="/api/settings", tags=["settings"])

# 不允许通过 PATCH 将非 nullable 字段置为 null 的字段集合
_NON_NULLABLE_SETTINGS = frozenset({
    "theme",
    "high_contrast_mode",
    "tts_enabled",
    "email_digest_enabled",
    "email_post_notification_enabled",
    "default_report_time_range",
    "default_announcement_time_range",
    "ai_auto_translate_enabled",
})


# ── GET /api/settings ─────────────────────────────────────────────────────────

@router.get("", response_model=ApiResponse[SettingsOut])
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SettingsOut]:
    """
    获取当前用户设置。
    若设置记录不存在则创建默认记录（懒创建）。
    """
    settings = user_crud.get_or_create_settings(db, current_user.id)
    db.commit()
    db.refresh(settings)
    return ApiResponse(data=SettingsOut.model_validate(settings))


# ── PATCH /api/settings ───────────────────────────────────────────────────────

@router.patch("", response_model=ApiResponse[SettingsOut])
def update_settings(
    body: SettingsPatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SettingsOut]:
    """
    更新当前用户设置。只更新传入的字段（exclude_unset=True）。
    非 nullable 字段（theme / bool / time_range）若传 null 则忽略，不执行更新。
    """
    updates = body.model_dump(exclude_unset=True)
    # 过滤掉非 nullable 字段中传入的 null 值
    updates = {
        k: v for k, v in updates.items()
        if k not in _NON_NULLABLE_SETTINGS or v is not None
    }

    settings = user_crud.get_or_create_settings(db, current_user.id)
    user_crud.update_settings(db, settings, **updates)
    db.commit()
    db.refresh(settings)
    return ApiResponse(data=SettingsOut.model_validate(settings))
