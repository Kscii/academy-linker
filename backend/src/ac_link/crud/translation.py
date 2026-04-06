"""
翻译资源 CRUD 层。

职责：resource_translations 表的读写操作。

公开函数：
  get_translation            — 按资源类型+资源ID+目标语言查找已有缓存
  get_translations_batch     — 批量查找多个资源的翻译（用于列表场景）
  upsert_translation         — 创建或覆盖翻译缓存
  mark_translations_stale    — 将某资源所有语言的译文标记为 stale
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import and_, update
from sqlalchemy.orm import Session

from ac_link.db.orm.enums import TranslationResourceType, TranslationStatus
from ac_link.db.orm.translation import ResourceTranslation


def get_translation(
    db: Session,
    resource_type: TranslationResourceType,
    resource_id: int,
    language: str,
) -> ResourceTranslation | None:
    """查找单个资源的指定语言翻译缓存。"""
    return db.query(ResourceTranslation).filter(
        ResourceTranslation.resource_type == resource_type,
        ResourceTranslation.resource_id == resource_id,
        ResourceTranslation.language == language,
    ).first()


def get_translations_batch(
    db: Session,
    resource_type: TranslationResourceType,
    resource_ids: list[int],
    language: str,
) -> dict[int, ResourceTranslation]:
    """批量查找翻译缓存，返回 {resource_id: ResourceTranslation}。"""
    if not resource_ids:
        return {}
    rows = db.query(ResourceTranslation).filter(
        ResourceTranslation.resource_type == resource_type,
        ResourceTranslation.resource_id.in_(resource_ids),
        ResourceTranslation.language == language,
    ).all()
    return {r.resource_id: r for r in rows}


def upsert_translation(
    db: Session,
    resource_type: TranslationResourceType,
    resource_id: int,
    language: str,
    translated_content_markdown: str,
    status: TranslationStatus = TranslationStatus.COMPLETED,
) -> ResourceTranslation:
    """创建或覆盖翻译缓存。"""
    existing = get_translation(db, resource_type, resource_id, language)
    now = datetime.now(timezone.utc)
    if existing is not None:
        existing.translated_content_markdown = translated_content_markdown
        existing.translation_status = status
        existing.translated_at = now
        db.flush()
        return existing
    tr = ResourceTranslation(
        resource_type=resource_type,
        resource_id=resource_id,
        language=language,
        translated_content_markdown=translated_content_markdown,
        translation_status=status,
        translated_at=now,
    )
    db.add(tr)
    db.flush()
    return tr


def mark_translations_stale(
    db: Session,
    resource_type: TranslationResourceType,
    resource_id: int,
) -> int:
    """将某资源的所有语言译文标记为 stale，返回受影响行数。"""
    result = db.execute(
        update(ResourceTranslation)
        .where(and_(
            ResourceTranslation.resource_type == resource_type,
            ResourceTranslation.resource_id == resource_id,
            ResourceTranslation.translation_status != TranslationStatus.STALE,
        ))
        .values(translation_status=TranslationStatus.STALE)
    )
    db.flush()
    return result.rowcount  # type: ignore[return-value]
