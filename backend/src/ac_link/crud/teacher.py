"""
教师端 CRUD 层。

职责：纯粹的数据库读写，不含业务逻辑。

公开函数：
  list_teacher_students            — 分页获取教师负责的学生列表
  get_student_for_teacher          — 验证教师对学生的访问权限（用于内容生产接口）
  get_teacher_unread_post_count    — 教师对某学生的跨 thread 未读总数
  get_subject_by_uuid              — 通过 uuid 取学科（用于 subject_uuid 校验）
  verify_teaching_assignment       — 校验 teacher-student-subject 三元分配是否存在且 active
  create_report                    — 老师创建报告
  get_report_by_uuid               — 通过 uuid 取报告（用于 PATCH 权限校验）
  update_report                    — 更新报告字段
  create_announcement              — 老师创建公告/任务
  get_announcement_by_uuid         — 通过 uuid 取公告（用于 PATCH 权限校验）
  update_announcement              — 更新公告字段
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import func, nullslast, select
from sqlalchemy.orm import Session, joinedload

from ac_link.db.orm.academic import Class, Student, Subject, TeachingAssignment
from ac_link.db.orm.communication import ThreadUserState, DiscussionThread, Post
from ac_link.db.orm.content import Announcement, Report
from ac_link.db.orm.enums import AnnouncementCategory, ReportSourceType, ReportType, TranslationStatus


class _UnsetType:
    """哨兵类型，用于区分"未传入"和"显式传 None"（nullable 字段 partial update）。"""
    _instance: _UnsetType | None = None

    def __new__(cls) -> _UnsetType:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self) -> str:
        return "UNSET"


UNSET = _UnsetType()


# ── 学生列表 ──────────────────────────────────────────────────────────────────

_VALID_SORTS = frozenset({
    "full_name_asc", "full_name_desc",
    "sid_asc", "sid_desc",
    "score_desc", "score_asc",
    "last_activity_at_desc",
})


def list_teacher_students(
    db: Session,
    teacher_user_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
    class_id: int | None = None,
    subject_id: int | None = None,
    keyword: str | None = None,
    sort: str = "full_name_asc",
) -> tuple[list[tuple[Student, datetime | None]], int]:
    """
    返回教师有权访问的学生列表（去重），附带每个学生的 last_activity_at。

    last_activity_at = 当前教师在该学生所有 thread 中最近一条未删除 post 的 created_at。
    score_desc / score_asc 因聚合表未建，按 full_name_asc fallback（score 字段返回 null）。

    返回：[(student, last_activity_at_or_none), ...], total
    """
    # 子查询：计算每个学生的 last_activity_at（当前教师视角）
    last_activity_sq = (
        select(func.max(Post.created_at))
        .join(DiscussionThread, DiscussionThread.id == Post.thread_id)
        .filter(
            DiscussionThread.teacher_user_id == teacher_user_id,
            DiscussionThread.student_id == Student.id,
            Post.deleted_at.is_(None),
        )
        .correlate(Student)
        .scalar_subquery()
    )

    base = (
        db.query(Student, last_activity_sq.label("last_activity_at"))
        .join(TeachingAssignment, TeachingAssignment.student_id == Student.id)
        .filter(
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
            Student.is_active == True,  # noqa: E712
        )
        .group_by(Student.id)
    )

    if class_id is not None:
        base = base.filter(Student.class_id == class_id)
    if subject_id is not None:
        base = base.filter(TeachingAssignment.subject_id == subject_id)
    if keyword is not None:
        kw = f"%{keyword}%"
        base = base.filter(
            Student.full_name.ilike(kw) | Student.sid.ilike(kw)
        )

    # 按 count(student.id) 的 count 查 total（去重后）
    total_q = (
        db.query(func.count(func.distinct(Student.id)))
        .join(TeachingAssignment, TeachingAssignment.student_id == Student.id)
        .filter(
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
            Student.is_active == True,  # noqa: E712
        )
    )
    if class_id is not None:
        total_q = total_q.filter(Student.class_id == class_id)
    if subject_id is not None:
        total_q = total_q.filter(TeachingAssignment.subject_id == subject_id)
    if keyword is not None:
        kw = f"%{keyword}%"
        total_q = total_q.filter(
            Student.full_name.ilike(kw) | Student.sid.ilike(kw)
        )
    total = total_q.scalar() or 0

    # 排序
    if sort == "full_name_desc":
        base = base.order_by(Student.full_name.desc())
    elif sort == "sid_asc":
        base = base.order_by(nullslast(Student.sid.asc()))
    elif sort == "sid_desc":
        base = base.order_by(nullslast(Student.sid.desc()))
    elif sort == "last_activity_at_desc":
        base = base.order_by(nullslast(last_activity_sq.desc()))
    elif sort in ("score_desc", "score_asc"):
        # metrics 表未建，fallback 到 full_name_asc
        base = base.order_by(Student.full_name.asc())
    else:
        # full_name_asc（default）
        base = base.order_by(Student.full_name.asc())

    rows = base.offset((page - 1) * page_size).limit(page_size).all()
    return [(row[0], row[1]) for row in rows], total


def get_student_for_teacher(
    db: Session,
    teacher_user_id: int,
    student_uuid: UUID,
) -> Student | None:
    """返回教师通过 active 分配可访问的学生，不存在或无权限时返回 None。"""
    return (
        db.query(Student)
        .join(TeachingAssignment, TeachingAssignment.student_id == Student.id)
        .filter(
            Student.uuid == student_uuid,
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
            Student.is_active == True,  # noqa: E712
        )
        .first()
    )


# ── 未读帖子数 ─────────────────────────────────────────────────────────────────

def get_teacher_unread_post_count(
    db: Session,
    teacher_user_id: int,
    student_id: int,
) -> int:
    """汇总该教师在该学生所有 thread 中的未读帖子缓存数。"""
    result = (
        db.query(func.sum(ThreadUserState.unread_count_cache))
        .join(DiscussionThread, DiscussionThread.id == ThreadUserState.thread_id)
        .filter(
            DiscussionThread.student_id == student_id,
            DiscussionThread.teacher_user_id == teacher_user_id,
            ThreadUserState.user_id == teacher_user_id,
        )
        .scalar()
    )
    return int(result) if result else 0


# ── 学科查询 ──────────────────────────────────────────────────────────────────

def get_subject_by_uuid(db: Session, subject_uuid: UUID) -> Subject | None:
    """通过 uuid 取学科，is_active 不限（允许向已停用学科写历史数据时提示不存在）。"""
    return db.query(Subject).filter(Subject.uuid == subject_uuid, Subject.is_active == True).first()  # noqa: E712


def verify_teaching_assignment(
    db: Session,
    teacher_user_id: int,
    student_id: int,
    subject_id: int,
) -> bool:
    """校验 teacher-student-subject 三元分配是否存在且 active。"""
    return db.query(
        db.query(TeachingAssignment)
        .filter(
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.student_id == student_id,
            TeachingAssignment.subject_id == subject_id,
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .exists()
    ).scalar()


# ── 报告 CRUD ──────────────────────────────────────────────────────────────────

def create_report(
    db: Session,
    teacher_user_id: int,
    student_id: int,
    *,
    subject_id: int | None,
    title: str,
    report_type: ReportType,
    content_markdown: str,
    original_language: str,
    translation_status: TranslationStatus = TranslationStatus.NOT_REQUIRED,
    translated_content_markdown: str | None = None,
    translated_language: str | None = None,
    translated_at: datetime | None = None,
) -> Report:
    """创建报告，source_type 固定为 teacher，立即发布。"""
    now = datetime.now(timezone.utc)
    report = Report(
        student_id=student_id,
        subject_id=subject_id,
        author_user_id=teacher_user_id,
        title=title,
        report_type=report_type,
        source_type=ReportSourceType.TEACHER,
        is_published=True,
        published_at=now,
        content_markdown=content_markdown,
        original_content_markdown=content_markdown,
        original_language=original_language,
        translation_status=translation_status,
        translated_content_markdown=translated_content_markdown,
        translated_language=translated_language,
        translated_at=translated_at,
    )
    db.add(report)
    db.flush()
    return report


def get_report_by_uuid(db: Session, report_uuid: UUID) -> Report | None:
    """通过 uuid 取报告（含 subject / author 预加载），不做权限过滤。"""
    return (
        db.query(Report)
        .options(joinedload(Report.subject), joinedload(Report.author_user))
        .filter(Report.uuid == report_uuid)
        .first()
    )


def update_report(
    db: Session,
    report: Report,
    *,
    title: str | None = None,
    subject_id: int | None | _UnsetType = UNSET,
    report_type: ReportType | None = None,
    content_markdown: str | None = None,
    original_language: str | None = None,
    translation_status: TranslationStatus | None = None,
    translated_content_markdown: str | None | _UnsetType = UNSET,
    translated_language: str | None | _UnsetType = UNSET,
    translated_at: datetime | None | _UnsetType = UNSET,
) -> Report:
    """
    更新报告可变字段。
    - subject_id / translated_* 使用 UNSET 哨兵区分"未提供"和"显式置 null"。
    - 若 content_markdown 有变化且原 translation_status == completed，自动置 stale。
    """
    if title is not None:
        report.title = title
    if report_type is not None:
        report.report_type = report_type
    if original_language is not None:
        report.original_language = original_language

    if content_markdown is not None:
        report.content_markdown = content_markdown
        report.original_content_markdown = content_markdown
        # 原文变化，已完成的翻译自动标为 stale
        if report.translation_status == TranslationStatus.COMPLETED:
            report.translation_status = TranslationStatus.STALE

    # 显式传入 translation_status 时（包括 stale 已自动设置后再覆盖的场景）
    if translation_status is not None:
        report.translation_status = translation_status

    if not isinstance(subject_id, _UnsetType):
        report.subject_id = subject_id
    if not isinstance(translated_content_markdown, _UnsetType):
        report.translated_content_markdown = translated_content_markdown
    if not isinstance(translated_language, _UnsetType):
        report.translated_language = translated_language
    if not isinstance(translated_at, _UnsetType):
        report.translated_at = translated_at

    db.flush()
    return report


# ── 公告 CRUD ──────────────────────────────────────────────────────────────────

def create_announcement(
    db: Session,
    teacher_user_id: int,
    student_id: int,
    *,
    subject_id: int | None,
    category: AnnouncementCategory,
    title: str,
    content_markdown: str,
    original_language: str,
    translation_status: TranslationStatus = TranslationStatus.NOT_REQUIRED,
    translated_content_markdown: str | None = None,
    translated_language: str | None = None,
    translated_at: datetime | None = None,
    published_at: datetime | None = None,
    due_at: datetime | None = None,
    is_important: bool = False,
) -> Announcement:
    """创建公告/任务，立即发布（published_at 默认为 now()）。"""
    announcement = Announcement(
        student_id=student_id,
        subject_id=subject_id,
        author_user_id=teacher_user_id,
        category=category,
        title=title,
        is_important=is_important,
        is_published=True,
        published_at=published_at or datetime.now(timezone.utc),
        due_at=due_at,
        content_markdown=content_markdown,
        original_content_markdown=content_markdown,
        original_language=original_language,
        translation_status=translation_status,
        translated_content_markdown=translated_content_markdown,
        translated_language=translated_language,
        translated_at=translated_at,
    )
    db.add(announcement)
    db.flush()
    return announcement


def get_announcement_by_uuid(db: Session, announcement_uuid: UUID) -> Announcement | None:
    """通过 uuid 取公告（含 subject / author 预加载），不做权限过滤。"""
    return (
        db.query(Announcement)
        .options(joinedload(Announcement.subject), joinedload(Announcement.author_user))
        .filter(Announcement.uuid == announcement_uuid)
        .first()
    )


def update_announcement(
    db: Session,
    announcement: Announcement,
    *,
    category: AnnouncementCategory | None = None,
    title: str | None = None,
    subject_id: int | None | _UnsetType = UNSET,
    content_markdown: str | None = None,
    original_language: str | None = None,
    translation_status: TranslationStatus | None = None,
    translated_content_markdown: str | None | _UnsetType = UNSET,
    translated_language: str | None | _UnsetType = UNSET,
    translated_at: datetime | None | _UnsetType = UNSET,
    published_at: datetime | None = None,
    due_at: datetime | None | _UnsetType = UNSET,
    is_important: bool | None = None,
) -> Announcement:
    """
    更新公告可变字段。
    - 同 update_report，content_markdown 变化时若已完成翻译则自动置 stale。
    - subject_id / due_at / translated_* 使用 UNSET 哨兵。
    """
    if category is not None:
        announcement.category = category
    if title is not None:
        announcement.title = title
    if published_at is not None:
        announcement.published_at = published_at
    if is_important is not None:
        announcement.is_important = is_important
    if original_language is not None:
        announcement.original_language = original_language

    if content_markdown is not None:
        announcement.content_markdown = content_markdown
        announcement.original_content_markdown = content_markdown
        if announcement.translation_status == TranslationStatus.COMPLETED:
            announcement.translation_status = TranslationStatus.STALE

    if translation_status is not None:
        announcement.translation_status = translation_status

    if not isinstance(subject_id, _UnsetType):
        announcement.subject_id = subject_id
    if not isinstance(translated_content_markdown, _UnsetType):
        announcement.translated_content_markdown = translated_content_markdown
    if not isinstance(translated_language, _UnsetType):
        announcement.translated_language = translated_language
    if not isinstance(translated_at, _UnsetType):
        announcement.translated_at = translated_at
    if not isinstance(due_at, _UnsetType):
        announcement.due_at = due_at

    db.flush()
    return announcement


# ── 班级查询 ──────────────────────────────────────────────────────────────────────

def list_teacher_classes(
    db: Session,
    teacher_user_id: int,
) -> list[tuple[Class, bool, int]]:
    """
    返回当前教师通过 active teaching_assignment 关联的所有不重复班级，
    附带 is_homeroom 标志和班级学生数量。
    """
    class_id_rows = (
        db.query(Student.class_id)
        .join(TeachingAssignment, TeachingAssignment.student_id == Student.id)
        .filter(
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
            Student.is_active == True,  # noqa: E712
            Student.class_id.isnot(None),
        )
        .distinct()
        .all()
    )
    id_list = [row[0] for row in class_id_rows]
    if not id_list:
        return []

    classes = db.query(Class).filter(Class.id.in_(id_list)).all()
    result = []
    for cls in classes:
        is_homeroom = cls.homeroom_teacher_user_id == teacher_user_id
        student_count = (
            db.query(func.count(Student.id))
            .filter(Student.class_id == cls.id, Student.is_active == True)  # noqa: E712
            .scalar() or 0
        )
        result.append((cls, is_homeroom, student_count))
    return result


def get_class_for_teacher(db: Session, teacher_user_id: int, class_uuid: UUID) -> Class | None:
    """
    返回该教师有访问权的班级（在该班级有至少一名 active 学生的 active 分配）。
    """
    cls = db.query(Class).filter(Class.uuid == class_uuid).first()
    if cls is None:
        return None
    has_access = db.query(
        db.query(Student)
        .join(TeachingAssignment, TeachingAssignment.student_id == Student.id)
        .filter(
            Student.class_id == cls.id,
            Student.is_active == True,  # noqa: E712
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .exists()
    ).scalar()
    return cls if has_access else None


def list_class_students_for_teacher(
    db: Session,
    teacher_user_id: int,
    class_id: int,
    *,
    subject_id: int | None = None,
    keyword: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[tuple[Student, list[Subject]]], int]:
    """
    返回班级中该教师有 active 分配的学生（去重），附带该教师对每个学生的全部科目。
    subject_id 仅用于筛选学生，返回的 subjects 始终为全部科目。
    """
    student_q = (
        db.query(Student)
        .join(TeachingAssignment, TeachingAssignment.student_id == Student.id)
        .filter(
            Student.class_id == class_id,
            Student.is_active == True,  # noqa: E712
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .distinct()
        .order_by(Student.full_name.asc())
    )
    if subject_id is not None:
        student_q = student_q.filter(TeachingAssignment.subject_id == subject_id)
    if keyword is not None:
        kw = f"%{keyword}%"
        student_q = student_q.filter(
            Student.full_name.ilike(kw) | Student.sid.ilike(kw)
        )

    total_q = (
        db.query(func.count(func.distinct(Student.id)))
        .join(TeachingAssignment, TeachingAssignment.student_id == Student.id)
        .filter(
            Student.class_id == class_id,
            Student.is_active == True,  # noqa: E712
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
        )
    )
    if subject_id is not None:
        total_q = total_q.filter(TeachingAssignment.subject_id == subject_id)
    if keyword is not None:
        kw = f"%{keyword}%"
        total_q = total_q.filter(
            Student.full_name.ilike(kw) | Student.sid.ilike(kw)
        )
    total = total_q.scalar() or 0

    students = student_q.offset((page - 1) * page_size).limit(page_size).all()
    if not students:
        return [], total

    student_ids = [s.id for s in students]
    subject_rows = (
        db.query(TeachingAssignment.student_id, Subject)
        .join(Subject, Subject.id == TeachingAssignment.subject_id)
        .filter(
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.student_id.in_(student_ids),
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .all()
    )

    from collections import defaultdict
    student_subjects: dict[int, list[Subject]] = defaultdict(list)
    for sid, subj in subject_rows:
        student_subjects[sid].append(subj)

    return [(s, student_subjects[s.id]) for s in students], total


def get_class_grade_stats(
    db: Session,
    teacher_user_id: int,
    class_id: int,
    *,
    subject_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict:
    """
    汇总该班级中教师负责科目的考试成绩统计。
    返回包含 student_count, avg_score, max_score, min_score, exam_count,
    以及 student_results 列表的 dict。
    """
    from collections import defaultdict
    from ac_link.db.orm.academic import StudentExamScore

    pair_q = (
        db.query(Student, Subject)
        .join(TeachingAssignment, TeachingAssignment.student_id == Student.id)
        .join(Subject, Subject.id == TeachingAssignment.subject_id)
        .filter(
            Student.class_id == class_id,
            Student.is_active == True,  # noqa: E712
            TeachingAssignment.teacher_user_id == teacher_user_id,
            TeachingAssignment.is_active == True,  # noqa: E712
        )
    )
    if subject_id is not None:
        pair_q = pair_q.filter(TeachingAssignment.subject_id == subject_id)

    pairs = pair_q.all()
    student_map: dict[int, Student] = {}
    student_subjects: dict[int, dict[int, Subject]] = defaultdict(dict)
    for student, subject in pairs:
        student_map[student.id] = student
        student_subjects[student.id][subject.id] = subject

    if not student_map:
        return {
            "student_count": 0,
            "avg_score": None,
            "max_score": None,
            "min_score": None,
            "exam_count": 0,
            "student_results": [],
        }

    all_subject_ids = list({
        sid for subjects in student_subjects.values() for sid in subjects
    })
    score_q = (
        db.query(StudentExamScore)
        .filter(
            StudentExamScore.student_id.in_(list(student_map.keys())),
            StudentExamScore.subject_id.in_(all_subject_ids),
        )
    )
    if date_from is not None:
        score_q = score_q.filter(StudentExamScore.exam_date >= date_from)
    if date_to is not None:
        score_q = score_q.filter(StudentExamScore.exam_date <= date_to)

    all_scores = score_q.all()
    score_groups: dict[tuple[int, int], list[StudentExamScore]] = defaultdict(list)
    for s in all_scores:
        score_groups[(s.student_id, s.subject_id)].append(s)

    student_results = []
    for student_id, student in student_map.items():
        subject_scores_data = []
        for subj_id, subj in student_subjects[student_id].items():
            scores = score_groups.get((student_id, subj_id), [])
            sorted_scores = sorted(scores, key=lambda x: x.exam_date, reverse=True)
            subject_scores_data.append({
                "subject": subj,
                "avg_score": sum(s.score for s in scores) / len(scores) if scores else None,
                "latest_score": sorted_scores[0].score if sorted_scores else None,
                "exam_count": len(scores),
            })
        student_results.append({
            "student": student,
            "subject_scores": subject_scores_data,
        })

    all_score_values = [s.score for s in all_scores]
    return {
        "student_count": len(student_map),
        "avg_score": sum(all_score_values) / len(all_score_values) if all_score_values else None,
        "max_score": max(all_score_values) if all_score_values else None,
        "min_score": min(all_score_values) if all_score_values else None,
        "exam_count": len(all_scores),
        "student_results": student_results,
    }
