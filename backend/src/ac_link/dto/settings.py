"""
用户设置相关 DTO（Pydantic Schema）。

与 API 文档对应关系：
  §8.1  SettingsOut
  §8.2  SettingsPatchRequest / SettingsOut
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class SettingsOut(BaseModel):
    language: str | None = None
    timezone: str | None = None
    theme: str
    high_contrast_mode: bool
    tts_enabled: bool
    email_digest_enabled: bool
    email_post_notification_enabled: bool
    default_report_time_range: str
    default_announcement_time_range: str
    ai_chat_style: str | None = None
    ai_auto_translate_enabled: bool

    class Config:
        from_attributes = True


class SettingsPatchRequest(BaseModel):
    """
    所有字段均为可选，只传入需要修改的字段。
    language / timezone 可传 null 以清空设置。
    theme / bool / time_range 字段若传 null 则忽略（不更新）。
    用 exclude_unset=True 区分"未传"与"传了 null"。
    """
    language: str | None = None
    timezone: str | None = None
    theme: Literal["system", "light", "dark"] | None = None
    high_contrast_mode: bool | None = None
    tts_enabled: bool | None = None
    email_digest_enabled: bool | None = None
    email_post_notification_enabled: bool | None = None
    default_report_time_range: Literal["all_time", "7d", "30d", "90d"] | None = None
    default_announcement_time_range: Literal["all_time", "7d", "30d", "90d"] | None = None
    ai_chat_style: str | None = None
    ai_auto_translate_enabled: bool | None = None
