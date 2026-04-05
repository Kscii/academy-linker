"""
家长端 CRUD 层。

职责：纯粹的数据库读写，不含业务逻辑。
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, func, nullslast, or_
from sqlalchemy.orm import Session, joinedload

from ac_link.db.orm.academic import ParentStudentBinding, Student, Subject, TeachingAssignment
from ac_link.db.orm.communication import DiscussionParticipantState, DiscussionThread, Post, PostTagBinding, Tag
from ac_link.db.orm.content import Announcement, AnnouncementUserState, Report, ReportUserState
from ac_link.db.orm.user import User


def list_parent_students(
    db: Session,
    parent_user_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Student], int]:
    """返回该家长通过 active 绑定关联的 active 学生，按姓名升序分页。"""
    q = (
        db.query(Student)
        .join(ParentStudentBinding, ParentStudentBinding.student_id == Student.id)
        .filter(
            ParentStudentBinding.parent_user_id == parent_user_id,
            ParentStudentBinding.is_active == True,  # noqa: E712
            Student.is_active == True,  # noqa: E712
        )
        .order_by(Student.full_name.asc())
    )
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_student_for_parent(
    db: Session,
    parent_user_id: int,
    student_uuid: UUID,
) -> Student | None:
    """返回该家长有权访问的学生对象，无权限或不存在时返回 None。"""
    return (
        db.query(Student)
        .join(ParentStudentBinding, ParentStudentBinding.student_id == Student.id)
        .filter(
            Student.uuid == student_uuid,
            ParentStudentBinding.parent_user_id == parent_user_id,
            ParentStudentBinding.is_active == True,  # noqa: E712
            Student.is_active == True,  # noqa: E712
        )
        .first()
    )


def list_student_subjects_with_teachers(
    db: Session,
    student_id: int,
) -> list[tuple[Subject, list[User]]]:
    """返回 [(subject, [teacher_user, ...]), ...] 按 subject.name 升序。"""
    assignments = (
        db.query(TeachingAssignment)
        .options(
            joinedload(TeachingAssignment.subject),
            joinedload(TeachingAssignment.teacher_user),
        )
        .filter(
            TeachingAssignment.student_id == student_id,
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .all()
    )
    subject_map: dict[int, tuple[Subject, list[User]]] = {}
    for ta in assignments:
        if ta.subject_id not in subject_map:
            subject_map[ta.subject_id] = (ta.subject, [])
        subject_map[ta.subject_id][1].append(ta.teacher_user)
    return sorted(subject_map.values(), key=lambda x: x[0].name)


def get_subject_for_student(
    db: Session,
    student_id: int,
    subject_uuid: UUID,
) -> tuple[Subject, list[User]] | None:
    """返回 (subject, [teachers]) 或 None（确认该学生有此学科分配）。"""
    assignments = (
        db.query(TeachingAssignment)
        .options(
            joinedload(TeachingAssignment.subject),
            joinedload(TeachingAssignment.teacher_user),
        )
        .join(Subject, Subject.id == TeachingAssignment.subject_id)
        .filter(
            TeachingAssignment.student_id == student_id,
            TeachingAssignment.is_active == True,  # noqa: E712
            Subject.uuid == subject_uuid,
        )
        .all()
    )
    if not assignments:
        return None
    teachers = [ta.teacher_user for ta in assignments]
    return assignments[0].subject, teachers


def get_latest_report_for_student(
    db: Session,
    student_id: int,
    subject_id: int | None = None,
) -> Report | None:
    """取最近一条已发布的 report；若给出 subject_id，则只取该学科的。"""
    q = db.query(Report).filter(
        Report.student_id == student_id,
        Report.is_published == True,  # noqa: E712
    )
    if subject_id is not None:
        q = q.filter(Report.subject_id == subject_id)
    return q.order_by(Report.created_at.desc()).first()


def get_unread_announcement_count(
    db: Session,
    student_id: int,
    user_id: int,
) -> int:
    """计算该用户对该学生的未读公告数（总数减去已读数）。"""
    total = (
        db.query(func.count(Announcement.id))
        .filter(
            Announcement.student_id == student_id,
            Announcement.is_published == True,  # noqa: E712
        )
        .scalar()
    ) or 0
    read_count = (
        db.query(func.count(AnnouncementUserState.id))
        .join(Announcement, Announcement.id == AnnouncementUserState.announcement_id)
        .filter(
            Announcement.student_id == student_id,
            AnnouncementUserState.user_id == user_id,
            AnnouncementUserState.is_read == True,  # noqa: E712
        )
        .scalar()
    ) or 0
    return max(total - read_count, 0)


def get_unread_post_count(
    db: Session,
    student_id: int,
    user_id: int,
) -> int:
    """汇总该用户在该学生所有 discussion thread 中的未读帖子数。"""
    result = (
        db.query(func.sum(DiscussionParticipantState.unread_post_count))
        .join(DiscussionThread, DiscussionThread.id == DiscussionParticipantState.thread_id)
        .filter(
            DiscussionThread.student_id == student_id,
            DiscussionParticipantState.user_id == user_id,
        )
        .scalar()
    )
    return int(result) if result else 0


def get_important_post_banners(
    db: Session,
    student_id: int,
    parent_user_id: int,
    limit: int = 5,
) -> list[Post]:
    """返回该家长+学生的 thread 中带 'important' tag 的 Post 列表（含作者），按 created_at desc。"""
    return (
        db.query(Post)
        .options(joinedload(Post.author_user))
        .join(DiscussionThread, DiscussionThread.id == Post.thread_id)
        .join(PostTagBinding, PostTagBinding.post_id == Post.id)
        .join(Tag, Tag.id == PostTagBinding.tag_id)
        .filter(
            DiscussionThread.student_id == student_id,
            DiscussionThread.parent_user_id == parent_user_id,
            Tag.name == "important",
            Post.is_deleted == False,  # noqa: E712
        )
        .order_by(Post.created_at.desc())
        .limit(limit)
        .all()
    )


# ── 报告 CRUD ──────────────────────────────────────────────────────────────────

def list_reports_for_student(
    db: Session,
    student_id: int,
    user_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
    status: str = "active",
    read_state: str = "all",
    sort: str = "created_at_desc",
) -> tuple[list[tuple[Report, ReportUserState | None]], int]:
    """
    左连接 report_user_states，返回 (report, state_or_none) 列表及总数。
    status: active=未归档, archived=已归档, all=全部
    read_state: unread=未读, read=已读, all=全部
    sort: created_at_desc / created_at_asc
    """
    base_filters = [
        Report.student_id == student_id,
        Report.is_published == True,  # noqa: E712
    ]

    if status == "active":
        base_filters.append(
            or_(ReportUserState.is_archived == False, ReportUserState.id.is_(None))  # noqa: E712
        )
    elif status == "archived":
        base_filters.append(ReportUserState.is_archived == True)  # noqa: E712

    if read_state == "unread":
        base_filters.append(
            or_(ReportUserState.is_read == False, ReportUserState.id.is_(None))  # noqa: E712
        )
    elif read_state == "read":
        base_filters.append(ReportUserState.is_read == True)  # noqa: E712

    join_cond = and_(
        ReportUserState.report_id == Report.id,
        ReportUserState.user_id == user_id,
    )

    total = (
        db.query(func.count(Report.id))
        .outerjoin(ReportUserState, join_cond)
        .filter(*base_filters)
        .scalar()
    ) or 0

    order = Report.created_at.asc() if sort == "created_at_asc" else Report.created_at.desc()
    rows = (
        db.query(Report, ReportUserState)
        .options(joinedload(Report.subject))
        .outerjoin(ReportUserState, join_cond)
        .filter(*base_filters)
        .order_by(order)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, total  # type: ignore[return-value]  # SQLAlchemy Row is unpackable as tuple


def get_report_for_student(
    db: Session,
    student_id: int,
    user_id: int,
    report_uuid: UUID,
) -> tuple[Report, ReportUserState | None] | None:
    """
    获取已验证归属该学生的报告（含用户状态）。
    用于详情接口（path 中已含 student_uuid，binding 权限在上层已确认）。
    """
    return (
        db.query(Report, ReportUserState)
        .outerjoin(
            ReportUserState,
            and_(
                ReportUserState.report_id == Report.id,
                ReportUserState.user_id == user_id,
            ),
        )
        .filter(
            Report.uuid == report_uuid,
            Report.student_id == student_id,
            Report.is_published == True,  # noqa: E712
        )
        .first()  # type: ignore[return-value]
    )


def get_report_for_parent(
    db: Session,
    parent_user_id: int,
    report_uuid: UUID,
) -> tuple[Report, ReportUserState | None] | None:
    """
    通过 binding 验证家长权限后获取报告（含用户状态）。
    用于 read / archive / unarchive 接口（path 中只有 report_uuid）。
    """
    return (
        db.query(Report, ReportUserState)
        .outerjoin(
            ReportUserState,
            and_(
                ReportUserState.report_id == Report.id,
                ReportUserState.user_id == parent_user_id,
            ),
        )
        .join(Student, Student.id == Report.student_id)
        .join(
            ParentStudentBinding,
            and_(
                ParentStudentBinding.student_id == Student.id,
                ParentStudentBinding.parent_user_id == parent_user_id,
                ParentStudentBinding.is_active == True,  # noqa: E712
            ),
        )
        .filter(
            Report.uuid == report_uuid,
            Report.is_published == True,  # noqa: E712
            Student.is_active == True,  # noqa: E712
        )
        .first()  # type: ignore[return-value]
    )


def upsert_report_state(
    db: Session,
    report_id: int,
    user_id: int,
    **fields: object,
) -> ReportUserState:
    """插入或更新报告用户状态。"""
    state = (
        db.query(ReportUserState)
        .filter(ReportUserState.report_id == report_id, ReportUserState.user_id == user_id)
        .first()
    )
    if state is None:
        state = ReportUserState(report_id=report_id, user_id=user_id)
        db.add(state)
    for key, value in fields.items():
        setattr(state, key, value)
    db.flush()
    return state


# ── 公告 CRUD ──────────────────────────────────────────────────────────────────

def list_announcements_for_student(
    db: Session,
    student_id: int,
    user_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
    category: str = "all",
    active_only: bool = True,
    sort: str = "published_at_desc",
) -> tuple[list[tuple[Announcement, AnnouncementUserState | None]], int]:
    """
    左连接 announcement_user_states，返回 (announcement, state_or_none) 列表及总数。
    active_only=True: is_published=True 且 (due_at IS NULL 或 due_at > now)
    sort: published_at_desc / published_at_asc / due_at_asc（null 排最后）
    """
    base_filters = [
        Announcement.student_id == student_id,
        Announcement.is_published == True,  # noqa: E712
    ]

    if active_only:
        now = datetime.now(timezone.utc)
        base_filters.append(
            or_(Announcement.due_at.is_(None), Announcement.due_at > now)
        )

    if category != "all":
        base_filters.append(Announcement.category == category)

    join_cond = and_(
        AnnouncementUserState.announcement_id == Announcement.id,
        AnnouncementUserState.user_id == user_id,
    )

    total = (
        db.query(func.count(Announcement.id))
        .outerjoin(AnnouncementUserState, join_cond)
        .filter(*base_filters)
        .scalar()
    ) or 0

    if sort == "published_at_asc":
        order = Announcement.published_at.asc()
    elif sort == "due_at_asc":
        order = nullslast(Announcement.due_at.asc())
    else:
        order = Announcement.published_at.desc()

    rows = (
        db.query(Announcement, AnnouncementUserState)
        .options(joinedload(Announcement.subject))
        .outerjoin(AnnouncementUserState, join_cond)
        .filter(*base_filters)
        .order_by(order)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, total  # type: ignore[return-value]


def get_announcement_for_parent(
    db: Session,
    parent_user_id: int,
    announcement_uuid: UUID,
) -> tuple[Announcement, AnnouncementUserState | None] | None:
    """
    通过 binding 验证家长权限后获取公告（含用户状态）。
    用于公告详情与 read 接口。
    """
    return (
        db.query(Announcement, AnnouncementUserState)
        .options(
            joinedload(Announcement.subject),
            joinedload(Announcement.author_user),
        )
        .outerjoin(
            AnnouncementUserState,
            and_(
                AnnouncementUserState.announcement_id == Announcement.id,
                AnnouncementUserState.user_id == parent_user_id,
            ),
        )
        .join(Student, Student.id == Announcement.student_id)
        .join(
            ParentStudentBinding,
            and_(
                ParentStudentBinding.student_id == Student.id,
                ParentStudentBinding.parent_user_id == parent_user_id,
                ParentStudentBinding.is_active == True,  # noqa: E712
            ),
        )
        .filter(
            Announcement.uuid == announcement_uuid,
            Announcement.is_published == True,  # noqa: E712
            Student.is_active == True,  # noqa: E712
        )
        .first()  # type: ignore[return-value]
    )


def upsert_announcement_state(
    db: Session,
    announcement_id: int,
    user_id: int,
    **fields: object,
) -> AnnouncementUserState:
    """插入或更新公告用户状态。"""
    state = (
        db.query(AnnouncementUserState)
        .filter(
            AnnouncementUserState.announcement_id == announcement_id,
            AnnouncementUserState.user_id == user_id,
        )
        .first()
    )
    if state is None:
        state = AnnouncementUserState(announcement_id=announcement_id, user_id=user_id)
        db.add(state)
    for key, value in fields.items():
        setattr(state, key, value)
    db.flush()
    return state
