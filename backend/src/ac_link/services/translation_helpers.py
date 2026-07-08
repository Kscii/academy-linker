"""
翻译辅助模块。

提供统一的翻译字段填充逻辑，用于所有 API 响应构建。
将翻译查询逻辑集中在此，避免各 API 文件重复代码。
"""

from __future__ import annotations

from datetime import datetime
from typing import TypedDict

from sqlalchemy.orm import Session

from ac_link.crud import translation as translation_crud
from ac_link.db.orm.enums import TranslationResourceType, TranslationStatus
from ac_link.db.orm.translation import ResourceTranslation


class TranslationFields(TypedDict):
    display_content_markdown: str
    original_content_markdown: str
    translated_content_markdown: str | None
    display_language: str
    original_language: str
    translated_language: str | None
    translation_status: str | None
    translated_at: datetime | None


class TranslationBlockFields(TypedDict):
    """用于列表项的翻译块字段。"""
    display_language: str
    original_language: str
    translated_language: str | None
    translation_status: str | None
    translated_at: datetime | None


def resolve_translation_fields(
    original_content: str,
    original_language: str,
    translation: ResourceTranslation | None,
) -> TranslationFields:
    """根据已有翻译缓存计算全部翻译展示字段。"""
    display_content = original_content
    display_lang = original_language
    translated_content: str | None = None
    translated_lang: str | None = None
    trans_status: str | None = None
    translated_at: datetime | None = None

    if translation is not None:
        translated_content = translation.translated_content_markdown
        translated_lang = translation.language
        trans_status = str(translation.translation_status)
        translated_at = translation.translated_at
        if translation.translation_status == TranslationStatus.COMPLETED:
            display_content = translation.translated_content_markdown
            display_lang = translation.language

    return TranslationFields(
        display_content_markdown=display_content,
        original_content_markdown=original_content,
        translated_content_markdown=translated_content,
        display_language=display_lang,
        original_language=original_language,
        translated_language=translated_lang,
        translation_status=trans_status,
        translated_at=translated_at,
    )


def resolve_translation_block(
    original_language: str,
    translation: ResourceTranslation | None,
) -> TranslationBlockFields:
    """列表项翻译块字段。"""
    display_lang = original_language
    translated_lang: str | None = None
    trans_status: str | None = None
    translated_at: datetime | None = None

    if translation is not None:
        translated_lang = translation.language
        trans_status = str(translation.translation_status)
        translated_at = translation.translated_at
        if translation.translation_status == TranslationStatus.COMPLETED:
            display_lang = translation.language

    return TranslationBlockFields(
        display_language=display_lang,
        original_language=original_language,
        translated_language=translated_lang,
        translation_status=trans_status,
        translated_at=translated_at,
    )


def get_target_language(
    user_settings_language: str | None,
    accept_language: str | None = None,
) -> str:
    """确定目标语言优先级：user_settings.language > Accept-Language > 'en-AU'。"""
    if user_settings_language:
        return user_settings_language
    if accept_language:
        # 取第一个语言 tag
        return accept_language.split(',')[0].split(';')[0].strip()
    return 'en-AU'
