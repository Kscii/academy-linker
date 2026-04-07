from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ac_link.db.orm.base import Base
from ac_link.db.orm.enums import IncidentStatus, IncidentType, LeaveRequestStatus, LeaveRequestType
from ac_link.db.orm.mixins import IntPrimaryKeyMixin, TimestampMixin, UUIDMixin
from ac_link.db.orm.sqltypes import enum_column

from datetime import date
from sqlalchemy import Date

if TYPE_CHECKING:
    from ac_link.db.orm.academic import Student
    from ac_link.db.orm.user import User


class StudentLeaveRequest(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    """学生请假申请表。created_at 即为 submitted_at。"""

    __tablename__ = 'student_leave_requests'
    __table_args__ = (
        Index('ix_student_leave_requests_student_id', 'student_id'),
        Index('ix_student_leave_requests_submitter_user_id', 'submitter_user_id'),
        Index('ix_student_leave_requests_status', 'status'),
    )

    student_id: Mapped[int] = mapped_column(ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    submitter_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    type: Mapped[LeaveRequestType] = mapped_column(
        enum_column(LeaveRequestType, 'leave_request_type'), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[LeaveRequestStatus] = mapped_column(
        enum_column(LeaveRequestStatus, 'leave_request_status'),
        nullable=False,
        default=LeaveRequestStatus.PENDING,
    )
    school_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    student: Mapped['Student'] = relationship(back_populates='leave_requests')
    submitter_user: Mapped['User'] = relationship(back_populates='submitted_leave_requests')


class StudentIncidentReport(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    """学生事件举报表。reporter_user_id 匿名时为 NULL。created_at 即为 submitted_at。"""

    __tablename__ = 'student_incident_reports'
    __table_args__ = (
        Index('ix_student_incident_reports_student_id', 'student_id'),
        Index('ix_student_incident_reports_reporter_user_id', 'reporter_user_id'),
        Index('ix_student_incident_reports_status', 'status'),
    )

    student_id: Mapped[int] = mapped_column(ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    reporter_user_id: Mapped[int | None] = mapped_column(
        ForeignKey('users.id', ondelete='SET NULL'), nullable=True
    )
    incident_type: Mapped[IncidentType] = mapped_column(
        enum_column(IncidentType, 'incident_type'), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[IncidentStatus] = mapped_column(
        enum_column(IncidentStatus, 'incident_status'),
        nullable=False,
        default=IncidentStatus.SUBMITTED,
    )

    student: Mapped['Student'] = relationship(back_populates='incident_reports')
    reporter_user: Mapped['User | None'] = relationship(back_populates='submitted_incident_reports')
