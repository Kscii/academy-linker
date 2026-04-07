from __future__ import annotations

from datetime import date, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Index, Integer, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ac_link.db.orm.base import Base, uq
from ac_link.db.orm.mixins import IntPrimaryKeyMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from ac_link.db.orm.academic import Class, Subject
    from ac_link.db.orm.user import User


class ClassTimetableEntry(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'class_timetable_entries'
    __table_args__ = (
        UniqueConstraint(
            'class_id',
            'weekday',
            'period_index',
            'effective_from',
            name=uq('class_timetable_entries', 'class_id', 'weekday', 'period_index', 'effective_from'),
        ),
        Index('ix_timetable_entries_class_date', 'class_id', 'effective_from', 'effective_to'),
        Index('ix_timetable_entries_teacher_user_id', 'teacher_user_id'),
        Index('ix_timetable_entries_subject_id', 'subject_id'),
        Index('ix_timetable_entries_is_active', 'is_active'),
    )

    class_id: Mapped[int] = mapped_column(ForeignKey('classes.id', ondelete='CASCADE'), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey('subjects.id', ondelete='RESTRICT'), nullable=False)
    teacher_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    weekday: Mapped[str] = mapped_column(String(16), nullable=False)
    period_index: Mapped[int] = mapped_column(Integer, nullable=False)
    room_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    class_obj: Mapped['Class'] = relationship(back_populates='timetable_entries')
    subject: Mapped['Subject'] = relationship(back_populates='timetable_entries')
    teacher_user: Mapped['User'] = relationship(back_populates='scheduled_timetable_entries')
