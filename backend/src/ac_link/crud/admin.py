"""
Admin CRUD 层。

职责：纯粹的数据库读写，不含业务逻辑。
业务规则校验（如 role 合法性、冲突检测）由 admin_api.py 中完成。

涵盖：
  - 用户列表查询、创建
  - 学生列表查询、创建
  - Parent-Student 绑定创建、更新
  - Teaching Assignment 创建、更新
  - 系统 Tag 查询、创建
"""

from __future__ import annotations

import math
from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ac_link.db.orm.academic import Class, ParentStudentBinding, Student, Subject, TeachingAssignment
from ac_link.db.orm.communication import Tag
from ac_link.db.orm.enums import TagScope, UserRole
from ac_link.db.orm.user import User


# ── 用户 ──────────────────────────────────────────────────────────────────────

def list_users(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    role: str | None = None,
    keyword: str | None = None,
    sort: str = "created_at_desc",
) -> tuple[list[User], int]:
    """返回 (items, total)"""
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(or_(User.display_name.ilike(like), User.email.ilike(like)))
    if sort == "created_at_asc":
        q = q.order_by(User.created_at.asc())
    elif sort == "display_name_asc":
        q = q.order_by(User.display_name.asc())
    else:
        q = q.order_by(User.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def create_user(db: Session, **fields: object) -> User:
    user = User(**fields)
    db.add(user)
    db.flush()
    return user


def get_user_by_uuid(db: Session, uuid: UUID) -> User | None:
    return db.query(User).filter(User.uuid == uuid).first()


def update_user(db: Session, user: User, **fields: object) -> User:
    for k, v in fields.items():
        setattr(user, k, v)
    db.flush()
    return user


# ── 学生 ──────────────────────────────────────────────────────────────────────

def list_students(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    keyword: str | None = None,
    class_id: int | None = None,
    is_active: bool | None = None,
    sort: str = "created_at_desc",
) -> tuple[list[Student], int]:
    q = db.query(Student)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(
            or_(
                Student.full_name.ilike(like),
                Student.preferred_name.ilike(like),
                Student.sid.ilike(like),
            )
        )
    if class_id is not None:
        q = q.filter(Student.class_id == class_id)
    if is_active is not None:
        q = q.filter(Student.is_active == is_active)
    if sort == "created_at_asc":
        q = q.order_by(Student.created_at.asc())
    elif sort == "full_name_asc":
        q = q.order_by(Student.full_name.asc())
    else:
        q = q.order_by(Student.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def create_student(db: Session, **fields: object) -> Student:
    student = Student(**fields)
    db.add(student)
    db.flush()
    return student


def get_student_by_uuid(db: Session, uuid: UUID) -> Student | None:
    return db.query(Student).filter(Student.uuid == uuid).first()


def update_student(db: Session, student: Student, **fields: object) -> Student:
    for k, v in fields.items():
        setattr(student, k, v)
    db.flush()
    return student


# ── Parent-Student 绑定 ───────────────────────────────────────────────────────

def list_bindings(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    parent_user_id: int | None = None,
    student_id: int | None = None,
    is_active: bool | None = None,
) -> tuple[list[ParentStudentBinding], int]:
    q = db.query(ParentStudentBinding)
    if parent_user_id is not None:
        q = q.filter(ParentStudentBinding.parent_user_id == parent_user_id)
    if student_id is not None:
        q = q.filter(ParentStudentBinding.student_id == student_id)
    if is_active is not None:
        q = q.filter(ParentStudentBinding.is_active == is_active)
    q = q.order_by(ParentStudentBinding.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_binding_by_uuid(db: Session, uuid: UUID) -> ParentStudentBinding | None:
    return db.query(ParentStudentBinding).filter(ParentStudentBinding.uuid == uuid).first()


def has_active_binding_for_student(db: Session, student_id: int, exclude_binding_id: int | None = None) -> bool:
    """检查指定学生是否已存在 is_active=True 的绑定（用于冲突校验）。"""
    q = db.query(ParentStudentBinding).filter(
        ParentStudentBinding.student_id == student_id,
        ParentStudentBinding.is_active == True,  # noqa: E712
    )
    if exclude_binding_id is not None:
        q = q.filter(ParentStudentBinding.id != exclude_binding_id)
    return q.first() is not None


def create_binding(db: Session, **fields: object) -> ParentStudentBinding:
    binding = ParentStudentBinding(**fields)
    db.add(binding)
    db.flush()
    return binding


def update_binding(db: Session, binding: ParentStudentBinding, **fields: object) -> ParentStudentBinding:
    for k, v in fields.items():
        setattr(binding, k, v)
    db.flush()
    return binding


# ── Teaching Assignment ───────────────────────────────────────────────────────

def list_assignments(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    teacher_user_id: int | None = None,
    student_id: int | None = None,
    subject_id: int | None = None,
    is_active: bool | None = None,
) -> tuple[list[TeachingAssignment], int]:
    q = db.query(TeachingAssignment)
    if teacher_user_id is not None:
        q = q.filter(TeachingAssignment.teacher_user_id == teacher_user_id)
    if student_id is not None:
        q = q.filter(TeachingAssignment.student_id == student_id)
    if subject_id is not None:
        q = q.filter(TeachingAssignment.subject_id == subject_id)
    if is_active is not None:
        q = q.filter(TeachingAssignment.is_active == is_active)
    q = q.order_by(TeachingAssignment.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_assignment_by_uuid(db: Session, uuid: UUID) -> TeachingAssignment | None:
    return db.query(TeachingAssignment).filter(TeachingAssignment.uuid == uuid).first()


def get_assignment_by_triple(
    db: Session,
    teacher_user_id: int,
    student_id: int,
    subject_id: int,
) -> TeachingAssignment | None:
    return db.query(TeachingAssignment).filter(
        TeachingAssignment.teacher_user_id == teacher_user_id,
        TeachingAssignment.student_id == student_id,
        TeachingAssignment.subject_id == subject_id,
    ).first()


def create_assignment(db: Session, **fields: object) -> TeachingAssignment:
    assignment = TeachingAssignment(**fields)
    db.add(assignment)
    db.flush()
    return assignment


def update_assignment(db: Session, assignment: TeachingAssignment, **fields: object) -> TeachingAssignment:
    for k, v in fields.items():
        setattr(assignment, k, v)
    db.flush()
    return assignment


def get_subject_by_uuid(db: Session, uuid: UUID) -> Subject | None:
    return db.query(Subject).filter(Subject.uuid == uuid).first()


# ── 系统 Tag ──────────────────────────────────────────────────────────────────

def list_system_tags(db: Session) -> list[Tag]:
    return (
        db.query(Tag)
        .filter(Tag.scope == TagScope.SYSTEM)
        .order_by(Tag.name.asc())
        .all()
    )


def get_system_tag_by_uuid(db: Session, uuid: UUID) -> Tag | None:
    return db.query(Tag).filter(Tag.uuid == uuid, Tag.scope == TagScope.SYSTEM).first()


def get_system_tag_by_name(db: Session, name: str) -> Tag | None:
    return db.query(Tag).filter(Tag.scope == TagScope.SYSTEM, Tag.name == name).first()


def create_system_tag(db: Session, **fields: object) -> Tag:
    tag = Tag(**fields)
    db.add(tag)
    db.flush()
    return tag


def update_tag(db: Session, tag: Tag, **fields: object) -> Tag:
    for k, v in fields.items():
        setattr(tag, k, v)
    db.flush()
    return tag


# ── 工具函数 ──────────────────────────────────────────────────────────────────

def calc_total_pages(total: int, page_size: int) -> int:
    return max(1, math.ceil(total / page_size)) if total > 0 else 1


# ── 班级 ────────────────────────────────────────────────────────────────────────────────

def list_classes(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    grade_level: str | None = None,
    academic_year: str | None = None,
    homeroom_teacher_user_id: int | None = None,
    is_active: bool | None = None,
) -> tuple[list[Class], int]:
    q = db.query(Class)
    if grade_level is not None:
        q = q.filter(Class.grade_level == grade_level)
    if academic_year is not None:
        q = q.filter(Class.academic_year == academic_year)
    if homeroom_teacher_user_id is not None:
        q = q.filter(Class.homeroom_teacher_user_id == homeroom_teacher_user_id)
    if is_active is not None:
        q = q.filter(Class.is_active == is_active)
    q = q.order_by(Class.name.asc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_class_by_uuid(db: Session, uuid: UUID) -> Class | None:
    return db.query(Class).filter(Class.uuid == uuid).first()


def create_class(db: Session, **fields: object) -> Class:
    cls_obj = Class(**fields)
    db.add(cls_obj)
    db.flush()
    return cls_obj


def update_class(db: Session, cls_obj: Class, **fields: object) -> Class:
    for k, v in fields.items():
        setattr(cls_obj, k, v)
    db.flush()
    return cls_obj


def count_students_in_class(db: Session, class_id: int) -> int:
    return db.query(Student).filter(Student.class_id == class_id, Student.is_active == True).count()  # noqa: E712


def transfer_student_class(
    db: Session,
    student: Student,
    new_class: Class,
) -> tuple[int, int]:
    """
    原子性换班操作：
    1. 更新 student.class_id
    2. 旧 teaching_assignments 全部设为 is_active=False
    3. 按新班级已有的 active assignments 推断新分配
    返回 (deactivated_count, created_count)
    """
    # 步骤1：更新班级
    student.class_id = new_class.id

    # 步骤2：停用旧分配
    old_assignments = (
        db.query(TeachingAssignment)
        .filter(
            TeachingAssignment.student_id == student.id,
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .all()
    )
    for ta in old_assignments:
        ta.is_active = False
    deactivated_count = len(old_assignments)

    # 步骤3：按新班级学生的现有分配推断新分配
    # 取新班级中任意学生的 active assignments -> 获得谁教什么科目
    new_class_student_ids = (
        db.query(Student.id)
        .filter(Student.class_id == new_class.id, Student.is_active == True, Student.id != student.id)  # noqa: E712
        .all()
    )
    created_count = 0
    if new_class_student_ids:
        sample_student_id = new_class_student_ids[0][0]
        template_assignments = (
            db.query(TeachingAssignment)
            .filter(
                TeachingAssignment.student_id == sample_student_id,
                TeachingAssignment.is_active == True,  # noqa: E712
            )
            .all()
        )
        for ta in template_assignments:
            existing = get_assignment_by_triple(db, ta.teacher_user_id, student.id, ta.subject_id)
            if existing:
                existing.is_active = True
            else:
                new_ta = TeachingAssignment(
                    teacher_user_id=ta.teacher_user_id,
                    student_id=student.id,
                    subject_id=ta.subject_id,
                    is_active=True,
                )
                db.add(new_ta)
                created_count += 1
    db.flush()
    return deactivated_count, created_count


# ── Admin 首页总览 ─────────────────────────────────────────────────────────────

def get_admin_overview(db: Session) -> dict:
    """
    返回系统实体计数摘要（仅含 is_active=true 的记录）：
      user_count    — 所有 active 用户（teacher + parent + admin）
      teacher_count — active teacher 数
      parent_count  — active parent 数
      student_count — active student 数
      class_count   — 所有班级数（Class 无 is_active 字段，全量计数）
    """
    user_count = (
        db.query(func.count(User.id))
        .filter(User.is_active == True)  # noqa: E712
        .scalar() or 0
    )
    teacher_count = (
        db.query(func.count(User.id))
        .filter(User.is_active == True, User.role == UserRole.TEACHER)  # noqa: E712
        .scalar() or 0
    )
    parent_count = (
        db.query(func.count(User.id))
        .filter(User.is_active == True, User.role == UserRole.PARENT)  # noqa: E712
        .scalar() or 0
    )
    student_count = (
        db.query(func.count(Student.id))
        .filter(Student.is_active == True)  # noqa: E712
        .scalar() or 0
    )
    class_count = db.query(func.count(Class.id)).scalar() or 0

    return {
        "user_count": user_count,
        "teacher_count": teacher_count,
        "parent_count": parent_count,
        "student_count": student_count,
        "class_count": class_count,
    }
