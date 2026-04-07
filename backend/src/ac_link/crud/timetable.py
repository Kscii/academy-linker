from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, joinedload

from ac_link.db.orm.academic import Class, Student, Subject, TeachingAssignment
from ac_link.db.orm.timetable import ClassTimetableEntry
from ac_link.db.orm.user import User


def get_class_by_uuid(db: Session, class_uuid: UUID) -> Class | None:
    return db.scalar(select(Class).where(Class.uuid == class_uuid))


def teacher_can_access_class_timetable(db: Session, *, teacher_user_id: int, class_id: int) -> bool:
    if db.scalar(
        select(Class.id).where(
            Class.id == class_id,
            Class.homeroom_teacher_user_id == teacher_user_id,
        )
    ):
        return True
    return db.scalar(
        select(TeachingAssignment.id)
        .join(Student, Student.id == TeachingAssignment.student_id)
        .where(
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
            Student.class_id == class_id,
            Student.is_active == True,  # noqa: E712
        )
        .limit(1)
    ) is not None


def list_entries_for_class_on_date(
    db: Session,
    *,
    class_id: int,
    on_date: date,
) -> list[ClassTimetableEntry]:
    rows = (
        db.query(ClassTimetableEntry)
        .options(
            joinedload(ClassTimetableEntry.subject),
            joinedload(ClassTimetableEntry.teacher_user),
            joinedload(ClassTimetableEntry.class_obj),
        )
        .filter(
            ClassTimetableEntry.class_id == class_id,
            ClassTimetableEntry.is_active == True,  # noqa: E712
            ClassTimetableEntry.effective_from <= on_date,
            or_(
                ClassTimetableEntry.effective_to.is_(None),
                ClassTimetableEntry.effective_to >= on_date,
            ),
        )
        .order_by(
            ClassTimetableEntry.weekday.asc(),
            ClassTimetableEntry.period_index.asc(),
            ClassTimetableEntry.effective_from.desc(),
        )
        .all()
    )

    selected: dict[tuple[str, int], ClassTimetableEntry] = {}
    for row in rows:
        key = (row.weekday, row.period_index)
        if key not in selected:
            selected[key] = row
    return sorted(selected.values(), key=lambda item: (item.weekday, item.period_index))


def replace_class_timetable(
    db: Session,
    *,
    class_obj: Class,
    effective_from: date,
    effective_to: date | None,
    entries: list[dict[str, object]],
) -> list[ClassTimetableEntry]:
    existing_rows = (
        db.query(ClassTimetableEntry)
        .filter(
            ClassTimetableEntry.class_id == class_obj.id,
            ClassTimetableEntry.is_active == True,  # noqa: E712
            or_(
                ClassTimetableEntry.effective_to.is_(None),
                ClassTimetableEntry.effective_to >= effective_from,
            ),
        )
        .all()
    )

    previous_day = effective_from - timedelta(days=1)
    for row in existing_rows:
        if row.effective_from >= effective_from:
            row.is_active = False
            continue
        if row.effective_to is None or row.effective_to >= effective_from:
            if previous_day < row.effective_from:
                row.is_active = False
            else:
                row.effective_to = previous_day

    created: list[ClassTimetableEntry] = []
    for payload in entries:
        item = ClassTimetableEntry(
            class_id=class_obj.id,
            subject_id=payload['subject_id'],  # type: ignore[index]
            teacher_user_id=payload['teacher_user_id'],  # type: ignore[index]
            weekday=payload['weekday'],  # type: ignore[index]
            period_index=payload['period_index'],  # type: ignore[index]
            room_label=payload.get('room_label'),  # type: ignore[arg-type]
            start_time=payload['start_time'],  # type: ignore[index]
            end_time=payload['end_time'],  # type: ignore[index]
            effective_from=effective_from,
            effective_to=effective_to,
            is_active=True,
        )
        db.add(item)
        created.append(item)
    db.flush()
    for item in created:
        _ = item.subject
        _ = item.teacher_user
        _ = item.class_obj
    return created


def get_teacher_candidates_for_class(db: Session, *, class_id: int) -> list[User]:
    teacher_ids = (
        db.query(TeachingAssignment.teacher_user_id)
        .join(Student, Student.id == TeachingAssignment.student_id)
        .filter(
            Student.class_id == class_id,
            Student.is_active == True,  # noqa: E712
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .distinct()
        .all()
    )
    ids = [row[0] for row in teacher_ids]
    if not ids:
        return []
    return (
        db.query(User)
        .filter(User.id.in_(ids), User.is_active == True)  # noqa: E712
        .order_by(User.display_name.asc())
        .all()
    )


def get_subject_candidates_for_class(db: Session, *, class_id: int) -> list[Subject]:
    subject_ids = (
        db.query(TeachingAssignment.subject_id)
        .join(Student, Student.id == TeachingAssignment.student_id)
        .filter(
            Student.class_id == class_id,
            Student.is_active == True,  # noqa: E712
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .distinct()
        .all()
    )
    ids = [row[0] for row in subject_ids]
    if not ids:
        return []
    return (
        db.query(Subject)
        .filter(Subject.id.in_(ids), Subject.is_active == True)  # noqa: E712
        .order_by(Subject.name.asc())
        .all()
    )
