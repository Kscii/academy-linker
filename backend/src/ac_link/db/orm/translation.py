from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ac_link.db.orm.base import Base, uq
from ac_link.db.orm.enums import TranslationResourceType, TranslationStatus
from ac_link.db.orm.mixins import IntPrimaryKeyMixin, TimestampMixin, UUIDMixin
from ac_link.db.orm.sqltypes import enum_column


class ResourceTranslation(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'resource_translations'
    __table_args__ = (
        UniqueConstraint(
            'resource_type', 'resource_id', 'language',
            name=uq('resource_translations', 'resource_type', 'resource_id', 'language'),
        ),
        Index('ix_resource_translations_resource', 'resource_type', 'resource_id'),
        Index('ix_resource_translations_lang_status', 'language', 'translation_status'),
    )

    resource_type: Mapped[TranslationResourceType] = mapped_column(
        enum_column(TranslationResourceType, 'translation_resource_type'), nullable=False,
    )
    resource_id: Mapped[int] = mapped_column(Integer, nullable=False)
    language: Mapped[str] = mapped_column(String(32), nullable=False)
    translated_content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    translation_status: Mapped[TranslationStatus] = mapped_column(
        enum_column(TranslationStatus, 'translation_status'), nullable=False,
    )
    translated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
