from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from ac_link.db.orm.enums import TranslationStatus
from ac_link.db.orm.sqltypes import enum_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class IntPrimaryKeyMixin:
    id: Mapped[int] = mapped_column(primary_key=True)


class UUIDMixin:
    uuid: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        unique=True,
        nullable=False,
        default=uuid4,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )


class TranslationFieldsMixin:
    @declared_attr
    def original_language(cls) -> Mapped[str]:
        return mapped_column(String(32), nullable=False)

    @declared_attr
    def translated_language(cls) -> Mapped[str | None]:
        return mapped_column(String(32), nullable=True)

    @declared_attr
    def translation_status(cls) -> Mapped[TranslationStatus]:
        return mapped_column(enum_column(TranslationStatus, 'translation_status'), nullable=False, default=TranslationStatus.NOT_REQUIRED)

    @declared_attr
    def translated_at(cls) -> Mapped[datetime | None]:
        return mapped_column(DateTime(timezone=True), nullable=True)


class MarkdownTranslationContentMixin(TranslationFieldsMixin):
    @declared_attr
    def content_markdown(cls) -> Mapped[str]:
        return mapped_column(Text, nullable=False)

    @declared_attr
    def original_content_markdown(cls) -> Mapped[str]:
        return mapped_column(Text, nullable=False)

    @declared_attr
    def translated_content_markdown(cls) -> Mapped[str | None]:
        return mapped_column(Text, nullable=True)
