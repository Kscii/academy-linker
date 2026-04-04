from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ac_link.db.orm.base import Base
from ac_link.db.orm.enums import SessionStatus, Theme, TimeRange, UserRole
from ac_link.db.orm.mixins import IntPrimaryKeyMixin, TimestampMixin, UUIDMixin, utc_now
from ac_link.db.orm.sqltypes import enum_column

if TYPE_CHECKING:
    from ac_link.db.orm.academic import ParentStudentBinding, TeachingAssignment
    from ac_link.db.orm.communication import DiscussionParticipantState, DiscussionThread, Post, Tag
    from ac_link.db.orm.content import Announcement, AnnouncementUserState, Report, ReportUserState


class User(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'users'
    __table_args__ = (
        Index('ix_users_role', 'role'),
        Index('ix_users_is_active', 'is_active'),
    )

    role: Mapped[UserRole] = mapped_column(enum_column(UserRole, 'user_role'), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    settings: Mapped['UserSettings | None'] = relationship(back_populates='user', cascade='all, delete-orphan', uselist=False)
    sessions: Mapped[list['UserSession']] = relationship(back_populates='user', cascade='all, delete-orphan')

    parent_student_bindings: Mapped[list['ParentStudentBinding']] = relationship(
        back_populates='parent_user',
        foreign_keys='ParentStudentBinding.parent_user_id',
    )
    teaching_assignments: Mapped[list['TeachingAssignment']] = relationship(back_populates='teacher_user')

    parent_threads: Mapped[list['DiscussionThread']] = relationship(
        back_populates='parent_user',
        foreign_keys='DiscussionThread.parent_user_id',
    )
    teacher_threads: Mapped[list['DiscussionThread']] = relationship(
        back_populates='teacher_user',
        foreign_keys='DiscussionThread.teacher_user_id',
    )
    posts: Mapped[list['Post']] = relationship(back_populates='author_user')
    owned_tags: Mapped[list['Tag']] = relationship(back_populates='owner_user')
    discussion_states: Mapped[list['DiscussionParticipantState']] = relationship(back_populates='user')

    authored_reports: Mapped[list['Report']] = relationship(back_populates='author_user')
    report_states: Mapped[list['ReportUserState']] = relationship(back_populates='user')
    authored_announcements: Mapped[list['Announcement']] = relationship(back_populates='author_user')
    announcement_states: Mapped[list['AnnouncementUserState']] = relationship(back_populates='user')


class UserSettings(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'user_settings'

    user_id: Mapped[int] = mapped_column(
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True,
    )
    language: Mapped[str | None] = mapped_column(String(32), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    theme: Mapped[Theme] = mapped_column(enum_column(Theme, 'theme'), nullable=False, default=Theme.SYSTEM)
    high_contrast_mode: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tts_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_digest_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_post_notification_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    default_report_time_range: Mapped[TimeRange] = mapped_column(
        enum_column(TimeRange, 'time_range'),
        nullable=False,
        default=TimeRange.ALL_TIME,
    )
    default_announcement_time_range: Mapped[TimeRange] = mapped_column(
        enum_column(TimeRange, 'announcement_time_range'),
        nullable=False,
        default=TimeRange.ALL_TIME,
    )

    user: Mapped['User'] = relationship(back_populates='settings')


class UserSession(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'user_sessions'
    __table_args__ = (
        Index('ix_user_sessions_user_id_expires_at', 'user_id', 'expires_at'),
        Index('ix_user_sessions_active_only', 'user_id', postgresql_where=text('revoked_at IS NULL')),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    device_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(
        enum_column(SessionStatus, 'session_status'),
        nullable=False,
        default=SessionStatus.ACTIVE,
    )

    user: Mapped['User'] = relationship(back_populates='sessions')
