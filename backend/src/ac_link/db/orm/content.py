from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ac_link.db.orm.base import Base, uq
from ac_link.db.orm.enums import AnnouncementCategory, ReportSourceType, ReportType
from ac_link.db.orm.mixins import (
    IntPrimaryKeyMixin,
    OriginalContentMixin,
    TimestampMixin,
    UUIDMixin,
)
from ac_link.db.orm.sqltypes import enum_column

if TYPE_CHECKING:
    from ac_link.db.orm.academic import Student, Subject
    from ac_link.db.orm.user import User


class Report(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin, OriginalContentMixin):
    __tablename__ = 'reports'
    __table_args__ = (
        Index('ix_reports_student_id_created_at', 'student_id', 'created_at'),
        Index('ix_reports_subject_id_created_at', 'subject_id', 'created_at'),
        Index('ix_reports_author_user_id', 'author_user_id'),
    )

    student_id: Mapped[int] = mapped_column(ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey('subjects.id', ondelete='SET NULL'), nullable=True)
    author_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    report_type: Mapped[ReportType] = mapped_column(enum_column(ReportType, 'report_type'), nullable=False)
    source_type: Mapped[ReportSourceType] = mapped_column(enum_column(ReportSourceType, 'report_source_type'), nullable=False)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped['Student'] = relationship(back_populates='reports')
    subject: Mapped['Subject | None'] = relationship(back_populates='reports')
    author_user: Mapped['User'] = relationship(back_populates='authored_reports')
    user_states: Mapped[list['ReportUserState']] = relationship(back_populates='report', cascade='all, delete-orphan')


class ReportUserState(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'report_user_states'
    __table_args__ = (
        UniqueConstraint('report_id', 'user_id', name=uq('report_user_states', 'report_id', 'user_id')),
        Index('ix_report_user_states_user_id_read_archive', 'user_id', 'is_read', 'is_archived'),
    )

    report_id: Mapped[int] = mapped_column(ForeignKey('reports.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    report: Mapped['Report'] = relationship(back_populates='user_states')
    user: Mapped['User'] = relationship(back_populates='report_states')


class Announcement(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin, OriginalContentMixin):
    __tablename__ = 'announcements'
    __table_args__ = (
        Index('ix_announcements_student_id_published_at', 'student_id', 'published_at'),
        Index('ix_announcements_category_due_at', 'category', 'due_at'),
        Index('ix_announcements_author_user_id', 'author_user_id'),
    )

    student_id: Mapped[int] = mapped_column(ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey('subjects.id', ondelete='SET NULL'), nullable=True)
    author_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    category: Mapped[AnnouncementCategory] = mapped_column(
        enum_column(AnnouncementCategory, 'announcement_category'),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    is_important: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped['Student'] = relationship(back_populates='announcements')
    subject: Mapped['Subject | None'] = relationship(back_populates='announcements')
    author_user: Mapped['User'] = relationship(back_populates='authored_announcements')
    user_states: Mapped[list['AnnouncementUserState']] = relationship(back_populates='announcement', cascade='all, delete-orphan')


class AnnouncementUserState(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'announcement_user_states'
    __table_args__ = (
        UniqueConstraint('announcement_id', 'user_id', name=uq('announcement_user_states', 'announcement_id', 'user_id')),
        Index('ix_announcement_user_states_user_id_is_read', 'user_id', 'is_read'),
    )

    announcement_id: Mapped[int] = mapped_column(ForeignKey('announcements.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    announcement: Mapped['Announcement'] = relationship(back_populates='user_states')
    user: Mapped['User'] = relationship(back_populates='announcement_states')
