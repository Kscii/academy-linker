from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ac_link.db.orm.base import Base
from ac_link.db.orm.enums import AiConversationContextType, AiMessageRole
from ac_link.db.orm.mixins import IntPrimaryKeyMixin, TimestampMixin, UUIDMixin
from ac_link.db.orm.sqltypes import enum_column

if TYPE_CHECKING:
    from ac_link.db.orm.academic import Student, Subject
    from ac_link.db.orm.user import User


class AiConversation(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'ai_conversations'
    __table_args__ = (
        Index('ix_ai_conversations_user_updated', 'user_id', 'updated_at'),
        Index('ix_ai_conversations_user_archived_updated', 'user_id', 'is_archived', 'updated_at'),
        Index('ix_ai_conversations_student_updated', 'student_id', 'updated_at'),
        Index('ix_ai_conversations_subject_updated', 'subject_id', 'updated_at'),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    context_type: Mapped[AiConversationContextType] = mapped_column(
        enum_column(AiConversationContextType, 'ai_conversation_context_type'), nullable=False,
    )
    student_id: Mapped[int | None] = mapped_column(ForeignKey('students.id', ondelete='CASCADE'), nullable=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey('subjects.id', ondelete='CASCADE'), nullable=True)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped['User'] = relationship()
    student: Mapped['Student | None'] = relationship()
    subject: Mapped['Subject | None'] = relationship()
    messages: Mapped[list['AiMessage']] = relationship(back_populates='conversation', cascade='all, delete-orphan')


class AiMessage(Base, IntPrimaryKeyMixin, UUIDMixin):
    __tablename__ = 'ai_messages'
    __table_args__ = (
        Index('ix_ai_messages_conversation_created', 'conversation_id', 'created_at'),
        Index('ix_ai_messages_role_created', 'role', 'created_at'),
    )

    conversation_id: Mapped[int] = mapped_column(ForeignKey('ai_conversations.id', ondelete='CASCADE'), nullable=False)
    role: Mapped[AiMessageRole] = mapped_column(
        enum_column(AiMessageRole, 'ai_message_role'), nullable=False,
    )
    preset: Mapped[str | None] = mapped_column(String(100), nullable=True)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    conversation: Mapped['AiConversation'] = relationship(back_populates='messages')
