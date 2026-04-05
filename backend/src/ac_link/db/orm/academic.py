from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Index, String, UniqueConstraint, text

from sqlalchemy.orm import Mapped, mapped_column, relationship

from ac_link.db.orm.base import Base, uq
from ac_link.db.orm.mixins import IntPrimaryKeyMixin, TimestampMixin, UUIDMixin


if TYPE_CHECKING:
    from ac_link.db.orm.communication import DiscussionThread
    from ac_link.db.orm.content import Announcement, Report
    from ac_link.db.orm.user import User


class Student(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'students'
    __table_args__ = (
        Index('uq_students_sid_not_null', 'sid', unique=True, postgresql_where=text('sid IS NOT NULL')),
        Index('ix_students_full_name', 'full_name'),
        Index('ix_students_class_name_grade_level', 'class_name', 'grade_level'),
    )

    sid: Mapped[str | None] = mapped_column(String(64), nullable=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    preferred_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    class_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    grade_level: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    parent_bindings: Mapped[list['ParentStudentBinding']] = relationship(back_populates='student', cascade='all, delete-orphan')
    teaching_assignments: Mapped[list['TeachingAssignment']] = relationship(back_populates='student', cascade='all, delete-orphan')
    discussion_threads: Mapped[list['DiscussionThread']] = relationship(back_populates='student', cascade='all, delete-orphan')
    reports: Mapped[list['Report']] = relationship(back_populates='student', cascade='all, delete-orphan')
    announcements: Mapped[list['Announcement']] = relationship(back_populates='student', cascade='all, delete-orphan')


class ParentStudentBinding(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'parent_student_bindings'
    __table_args__ = (
        Index('ix_parent_student_bindings_parent_user_id', 'parent_user_id'),
        Index('ix_parent_student_bindings_student_id', 'student_id'),
        Index('ix_parent_student_bindings_active_lookup', 'student_id', 'is_active'),
        UniqueConstraint('parent_user_id', 'student_id', name=uq('parent_student_bindings', 'parent_user_id', 'student_id')),
    )

    parent_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    relationship_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    parent_user: Mapped['User'] = relationship(back_populates='parent_student_bindings')
    student: Mapped['Student'] = relationship(back_populates='parent_bindings')


class Subject(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'subjects'
    __table_args__ = (
        Index('ix_subjects_name', 'name'),
        Index('uq_subjects_code_not_null', 'code', unique=True, postgresql_where=text('code IS NOT NULL')),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    teaching_assignments: Mapped[list['TeachingAssignment']] = relationship(back_populates='subject', cascade='all, delete-orphan')
    reports: Mapped[list['Report']] = relationship(back_populates='subject')
    announcements: Mapped[list['Announcement']] = relationship(back_populates='subject')


class TeachingAssignment(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'teaching_assignments'
    __table_args__ = (
        Index('ix_teaching_assignments_teacher_student', 'teacher_user_id', 'student_id'),
        Index('ix_teaching_assignments_subject_lookup', 'subject_id', 'student_id'),
        UniqueConstraint(
            'teacher_user_id',
            'student_id',
            'subject_id',
            name=uq('teaching_assignments', 'teacher_user_id', 'student_id', 'subject_id'),
        ),
    )

    teacher_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey('subjects.id', ondelete='CASCADE'), nullable=False)
    is_homeroom: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    teacher_user: Mapped['User'] = relationship(back_populates='teaching_assignments')
    student: Mapped['Student'] = relationship(back_populates='teaching_assignments')
    subject: Mapped['Subject'] = relationship(back_populates='teaching_assignments')
