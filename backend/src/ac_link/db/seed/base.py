from __future__ import annotations

from sqlalchemy.orm import Session

from ac_link.db.orm import TagScope

from .helpers import (
    ensure_parent_binding,
    ensure_tag,
    ensure_teaching_assignment,
    get_or_create_class,
    get_or_create_student,
    get_or_create_subject,
    get_or_create_user,
    upsert_timetable_entry,
)
from .models import ADMIN_USER, CLASS_SPECS, PARENT_USERS, PRIVATE_TAG_SPECS, STUDENT_SPECS, SUBJECT_SPECS, SYSTEM_TAG_SPECS, TEACHER_USERS


def run(db: Session) -> dict[str, dict[str, object]]:
    users: dict[str, object] = {}
    users[ADMIN_USER.key] = get_or_create_user(db, spec=ADMIN_USER)
    for spec in TEACHER_USERS + PARENT_USERS:
        users[spec.key] = get_or_create_user(db, spec=spec)

    subjects: dict[str, object] = {}
    for key, name, code in SUBJECT_SPECS:
        subjects[key] = get_or_create_subject(db, name=name, code=code)

    classes: dict[str, object] = {}
    class_teachers = {
        "year5_alpha": users["teacher_ada"],
        "year6_beta": users["teacher_lin"],
    }
    for key, name, grade_level, academic_year in CLASS_SPECS:
        classes[key] = get_or_create_class(
            db,
            name=name,
            grade_level=grade_level,
            academic_year=academic_year,
            homeroom_teacher=class_teachers[key],  # type: ignore[arg-type]
        )

    students: dict[str, object] = {}
    for spec in STUDENT_SPECS:
        students[spec["key"]] = get_or_create_student(
            db,
            sid=spec["sid"],
            full_name=spec["full_name"],
            preferred_name=spec["preferred_name"],
            class_obj=classes[spec["class_key"]],  # type: ignore[arg-type]
            date_of_birth=spec["date_of_birth"],
        )

    ensure_parent_binding(
        db,
        parent=users["parent_chen"],  # type: ignore[arg-type]
        student=students["student_emma"],  # type: ignore[arg-type]
        relationship_label="mother",
        is_primary=True,
    )
    ensure_parent_binding(
        db,
        parent=users["parent_chen"],  # type: ignore[arg-type]
        student=students["student_noah"],  # type: ignore[arg-type]
        relationship_label="mother",
        is_primary=False,
    )
    ensure_parent_binding(
        db,
        parent=users["parent_wang"],  # type: ignore[arg-type]
        student=students["student_olivia"],  # type: ignore[arg-type]
        relationship_label="father",
        is_primary=True,
    )

    assignments = [
        ("teacher_ada", "student_emma", "mathematics"),
        ("teacher_ada", "student_emma", "english"),
        ("teacher_ada", "student_noah", "mathematics"),
        ("teacher_ada", "student_noah", "science"),
        ("teacher_lin", "student_olivia", "science"),
        ("teacher_lin", "student_olivia", "history"),
    ]
    for teacher_key, student_key, subject_key in assignments:
        ensure_teaching_assignment(
            db,
            teacher=users[teacher_key],  # type: ignore[arg-type]
            student=students[student_key],  # type: ignore[arg-type]
            subject=subjects[subject_key],  # type: ignore[arg-type]
        )

    timetable_specs = [
        ("year5_alpha", "mathematics", "teacher_ada", "monday", 1, "Room A1", "09:00:00", "09:50:00"),
        ("year5_alpha", "english", "teacher_ada", "monday", 2, "Room A1", "10:10:00", "11:00:00"),
        ("year5_alpha", "science", "teacher_ada", "tuesday", 3, "Lab 1", "11:20:00", "12:10:00"),
        ("year5_alpha", "mathematics", "teacher_ada", "wednesday", 1, "Room A1", "09:00:00", "09:50:00"),
        ("year5_alpha", "english", "teacher_ada", "thursday", 2, "Room A1", "10:10:00", "11:00:00"),
        ("year5_alpha", "science", "teacher_ada", "friday", 4, "Lab 1", "13:10:00", "14:00:00"),
        ("year6_beta", "science", "teacher_lin", "monday", 1, "Lab 2", "09:00:00", "09:50:00"),
        ("year6_beta", "history", "teacher_lin", "monday", 3, "Room B2", "11:20:00", "12:10:00"),
        ("year6_beta", "science", "teacher_lin", "wednesday", 2, "Lab 2", "10:10:00", "11:00:00"),
        ("year6_beta", "history", "teacher_lin", "thursday", 4, "Room B2", "13:10:00", "14:00:00"),
        ("year6_beta", "science", "teacher_lin", "friday", 1, "Lab 2", "09:00:00", "09:50:00"),
    ]
    for class_key, subject_key, teacher_key, weekday, period_index, room, start_time, end_time in timetable_specs:
        upsert_timetable_entry(
            db,
            class_obj=classes[class_key],  # type: ignore[arg-type]
            subject=subjects[subject_key],  # type: ignore[arg-type]
            teacher=users[teacher_key],  # type: ignore[arg-type]
            weekday=weekday,
            period_index=period_index,
            room_label=room,
            start_time=start_time,
            end_time=end_time,
            effective_from_value="2025-01-28",
        )

    tags: dict[str, object] = {}
    for name, parent_ok, teacher_ok, affects_logic in SYSTEM_TAG_SPECS:
        tags[f"system:{name}"] = ensure_tag(
            db,
            name=name,
            scope=TagScope.SYSTEM,
            owner=None,
            is_selectable_by_parent=parent_ok,
            is_selectable_by_teacher=teacher_ok,
            affects_business_logic=affects_logic,
        )

    for teacher_key, name in PRIVATE_TAG_SPECS:
        tags[f"{teacher_key}:{name}"] = ensure_tag(
            db,
            name=name,
            scope=TagScope.TEACHER_PRIVATE,
            owner=users[teacher_key],  # type: ignore[arg-type]
            is_selectable_by_parent=False,
            is_selectable_by_teacher=True,
            affects_business_logic=False,
        )

    db.flush()
    return {
        "users": users,
        "subjects": subjects,
        "classes": classes,
        "students": students,
        "tags": tags,
    }
