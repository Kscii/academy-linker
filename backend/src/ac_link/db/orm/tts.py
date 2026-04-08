from __future__ import annotations

from sqlalchemy import Enum as SAEnum, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ac_link.db.orm.base import Base, uq
from ac_link.db.orm.enums import TtsProvider, TtsResourceType
from ac_link.db.orm.mixins import IntPrimaryKeyMixin, TimestampMixin, UUIDMixin
from ac_link.db.orm.sqltypes import enum_column


class TtsAudioCache(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'tts_audio_cache'
    __table_args__ = (
        UniqueConstraint('content_hash', 'voice_key', 'provider', name=uq('tts_audio_cache', 'content_hash', 'voice_key', 'provider')),
        Index('ix_tts_audio_cache_resource', 'resource_type', 'resource_id'),
    )

    resource_type: Mapped[TtsResourceType] = mapped_column(
        enum_column(TtsResourceType, 'tts_resource_type'),
        nullable=False,
    )
    resource_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_language: Mapped[str] = mapped_column(String(32), nullable=False)
    voice_key: Mapped[str] = mapped_column(String(120), nullable=False)
    provider: Mapped[TtsProvider] = mapped_column(
        SAEnum(
            TtsProvider,
            name='tts_provider',
            native_enum=False,
            validate_strings=True,
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        nullable=False,
    )
    audio_mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default='audio/mpeg')
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
