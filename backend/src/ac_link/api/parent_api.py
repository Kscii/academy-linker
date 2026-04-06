"""
家长端接口：/api/parents/me/*

包含：
  GET /api/parents/me/students                                                              §9.1
  GET /api/parents/me/students/{student_uuid}/dashboard                                     §9.2
  GET /api/parents/me/students/{student_uuid}/subjects                                      §9.3
  GET /api/parents/me/students/{student_uuid}/subjects/{subject_uuid}                       §9.4
  GET /api/parents/me/students/{student_uuid}/reports                                       §9.5
  GET /api/parents/me/students/{student_uuid}/reports/{report_uuid}                         §9.6
  GET /api/parents/me/students/{student_uuid}/announcements                                 §9.10
  GET /api/parents/me/students/{student_uuid}/discussions/teachers                          §9.13
  GET /api/parents/me/students/{student_uuid}/discussions/teachers/{teacher_uuid}           §9.14
"""

from __future__ import annotations

import math
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import require_parent
from ac_link.common.exceptions import AppError, Errors
from ac_link.crud import discussion as discussion_crud
from ac_link.crud import metrics as metrics_crud
from ac_link.crud import parent as parent_crud
from ac_link.crud import score as score_crud
from ac_link.db.db import get_db
from ac_link.db.orm.content import Announcement, AnnouncementUserState, Report, ReportUserState
from ac_link.db.orm.user import User
from ac_link.dto.auth import ApiResponse
from ac_link.dto.admin import PaginatedResponse, PaginationMeta
from ac_link.dto.discussion import (
    DiscussionTeacherInfo,
    DiscussionTeacherListItem,
    ParentDiscussionPageData,
    build_post_item,
)
from ac_link.dto.parent import (
    AnnouncementDetail,
    AnnouncementListItem,
    ChartPoint,
    Charts,
    DashboardContext,
    DashboardData,
    ImportantPostBanner,
    LearningProgressPoint,
    ParentExamScoreItem,
    ParentPeriodMetricItem,
    ReportDetail,
    ReportListItem,
    StudentBrief,
    StudentOut,
    SubjectBrief,
    SubjectDetailData,
    SubjectListItem,
    SubjectListResponse,
    SubjectOverview,
    SubjectStat,
    SubjectWithTeachers,
    SummaryCards,
    TeacherBrief,
    TeacherDetail,
    TranslationBlock,
    ReportSummary,
)

router = APIRouter(prefix="/api/parents/me", tags=["parents"])


# ── GET /api/parents/me/students ─────────────────────────────────────────────

@router.get("/students", response_model=PaginatedResponse[StudentOut])
def list_my_students(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> PaginatedResponse[StudentOut]:
    """获取当前家长通过 active binding 绑定的所有 active 学生，按姓名升序分页。"""
    page_size = min(page_size, 100)
    students, total = parent_crud.list_parent_students(
        db, current_user.id, page=page, page_size=page_size
    )
    return PaginatedResponse(
        data=[StudentOut.from_student(s) for s in students],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total > 0 else 1,
        ),
    )


# ── GET /api/parents/me/students/{student_uuid}/subjects ─────────────────────

@router.get("/students/{student_uuid}/subjects", response_model=SubjectListResponse)
def list_student_subjects(
    student_uuid: UUID,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> SubjectListResponse:
    """获取指定学生的所有 active 学科列表，每个学科携带当前负责老师列表。"""
    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if not student:
        raise Errors.not_found("学生不存在或无权访问")

    pairs = parent_crud.list_student_subjects_with_teachers(db, student.id)
    data = [
        SubjectListItem(
            uuid=subject.uuid,
            name=subject.name,
            code=subject.code,
            teachers=[TeacherBrief(uuid=t.uuid, display_name=t.display_name) for t in teachers],
        )
        for subject, teachers in pairs
    ]
    return SubjectListResponse(data=data)


# ── GET /api/parents/me/students/{student_uuid}/subjects/{subject_uuid} ──────

@router.get(
    "/students/{student_uuid}/subjects/{subject_uuid}",
    response_model=ApiResponse[SubjectDetailData],
)
def get_subject_detail(
    student_uuid: UUID,
    subject_uuid: UUID,
    range: str = "all_time",
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[SubjectDetailData]:
    """
    获取指定学生指定学科的聚合详情。
    overview / timeline 暂时为 null，待 student_metrics 表建好后填充。
    summary 取该学生该学科最近一条已发布 report。
    """
    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if not student:
        raise Errors.not_found("学生不存在或无权访问")

    result = parent_crud.get_subject_for_student(db, student.id, subject_uuid)
    if not result:
        raise Errors.not_found("学科不存在或该学生未分配此学科")
    subject, teachers = result

    latest_report = parent_crud.get_latest_report_for_student(db, student.id, subject_id=subject.id)

    return ApiResponse(data=SubjectDetailData(
        student=StudentBrief.model_validate(student),
        subject=SubjectWithTeachers(
            uuid=subject.uuid,
            name=subject.name,
            code=subject.code,
            teachers=[TeacherDetail(uuid=t.uuid, display_name=t.display_name, email=t.email) for t in teachers],
        ),
        overview=SubjectOverview(),
        timeline=[],
        summary=_build_report_summary(latest_report),
    ))


# ── GET /api/parents/me/students/{student_uuid}/dashboard ────────────────────

@router.get(
    "/students/{student_uuid}/dashboard",
    response_model=ApiResponse[DashboardData],
)
def get_student_dashboard(
    student_uuid: UUID,
    range: str = "all_time",
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[DashboardData]:
    """
    获取学生 Dashboard 聚合数据。
    score / progress / completion_rate / attendance_rate 暂时为 null，
    待 student_metrics 表建好后填充。
    summary 取该学生最近一条已发布 report（不限学科）。
    """
    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if not student:
        raise Errors.not_found("学生不存在或无权访问")

    unread_posts = parent_crud.get_unread_post_count(db, student.id, current_user.id)
    unread_announcements = parent_crud.get_unread_announcement_count(db, student.id, current_user.id)

    latest_report = parent_crud.get_latest_report_for_student(db, student.id)

    subject_pairs = parent_crud.list_student_subjects_with_teachers(db, student.id)

    subject_stats = [
        SubjectStat(subject_uuid=s.uuid, subject_name=s.name)
        for s, _ in subject_pairs
    ]
    charts = Charts(
        subject_score_bar_chart=[ChartPoint(subject_uuid=s.uuid, subject_name=s.name) for s, _ in subject_pairs],
        subject_completion_bar_chart=[ChartPoint(subject_uuid=s.uuid, subject_name=s.name) for s, _ in subject_pairs],
        learning_progress_chart=[],
    )

    banner_posts = parent_crud.get_important_post_banners(db, student.id, current_user.id)
    banners = [
        ImportantPostBanner(
            post_uuid=post.uuid,
            teacher_uuid=post.author_user.uuid,
            teacher_display_name=post.author_user.display_name,
            title=post.title,
            preview_text=post.content_markdown[:200],
            created_at=post.created_at,
        )
        for post in banner_posts
    ]

    return ApiResponse(data=DashboardData(
        student=StudentOut.from_student(student),
        dashboard_context=DashboardContext(
            selected_range=range,
            unread_post_count=unread_posts,
            unread_announcement_count=unread_announcements,
        ),
        summary_cards=SummaryCards(summary=_build_report_summary(latest_report)),
        subject_statistics=subject_stats,
        charts=charts,
        important_post_banners=banners,
    ))


# ── GET /api/parents/me/students/{student_uuid}/reports ──────────────────────

_VALID_REPORT_STATUSES = frozenset({"active", "archived", "all"})
_VALID_READ_STATES = frozenset({"unread", "read", "all"})
_VALID_REPORT_SORTS = frozenset({"created_at_desc", "created_at_asc"})


@router.get(
    "/students/{student_uuid}/reports",
    response_model=PaginatedResponse[ReportListItem],
)
def list_student_reports(
    student_uuid: UUID,
    page: int = 1,
    page_size: int = 20,
    status: str = "active",
    read_state: str = "all",
    sort: str = "created_at_desc",
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ReportListItem]:
    """获取指定学生的报告列表（仅元信息，不含正文内容）。"""
    if status not in _VALID_REPORT_STATUSES:
        raise AppError(400, "invalid_filter", f"status 参数非法，可选值：{_VALID_REPORT_STATUSES}")
    if read_state not in _VALID_READ_STATES:
        raise AppError(400, "invalid_filter", f"read_state 参数非法，可选值：{_VALID_READ_STATES}")
    if sort not in _VALID_REPORT_SORTS:
        raise AppError(400, "invalid_sort", f"sort 参数非法，可选值：{_VALID_REPORT_SORTS}")

    page_size = min(page_size, 100)
    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if not student:
        raise Errors.not_found("学生不存在或无权访问")

    rows, total = parent_crud.list_reports_for_student(
        db, student.id, current_user.id,
        page=page, page_size=page_size,
        status=status, read_state=read_state, sort=sort,
    )
    return PaginatedResponse(
        data=[_build_report_list_item(report, state) for report, state in rows],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total > 0 else 1,
        ),
    )


# ── GET /api/parents/me/students/{student_uuid}/reports/{report_uuid} ────────

@router.get(
    "/students/{student_uuid}/reports/{report_uuid}",
    response_model=ApiResponse[ReportDetail],
)
def get_student_report(
    student_uuid: UUID,
    report_uuid: UUID,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[ReportDetail]:
    """获取指定报告的正文详情。"""
    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if not student:
        raise Errors.not_found("学生不存在或无权访问")

    result = parent_crud.get_report_for_student(db, student.id, current_user.id, report_uuid)
    if not result:
        raise Errors.not_found("报告不存在或无权访问")

    report, _ = result
    return ApiResponse(data=_build_report_detail(report, _))


# ── GET /api/parents/me/students/{student_uuid}/announcements ─────────────────

_VALID_ANNOUNCEMENT_SORTS = frozenset({"published_at_desc", "published_at_asc", "due_at_asc"})
_VALID_ANNOUNCEMENT_CATEGORIES = frozenset({"announcement", "task", "all"})


@router.get(
    "/students/{student_uuid}/announcements",
    response_model=PaginatedResponse[AnnouncementListItem],
)
def list_student_announcements(
    student_uuid: UUID,
    page: int = 1,
    page_size: int = 20,
    category: str = "all",
    active_only: bool = True,
    sort: str = "published_at_desc",
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> PaginatedResponse[AnnouncementListItem]:
    """
    获取指定学生的公告/任务列表。
    active_only=True 时过滤掉 due_at 已过期的条目（due_at IS NULL 或 due_at > now）。
    """
    if category not in _VALID_ANNOUNCEMENT_CATEGORIES:
        raise AppError(400, "invalid_filter", f"category 参数非法，可选值：{_VALID_ANNOUNCEMENT_CATEGORIES}")
    if sort not in _VALID_ANNOUNCEMENT_SORTS:
        raise AppError(400, "invalid_sort", f"sort 参数非法，可选值：{_VALID_ANNOUNCEMENT_SORTS}")

    page_size = min(page_size, 100)
    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if not student:
        raise Errors.not_found("学生不存在或无权访问")

    rows, total = parent_crud.list_announcements_for_student(
        db, student.id, current_user.id,
        page=page, page_size=page_size,
        category=category, active_only=active_only, sort=sort,
    )
    return PaginatedResponse(
        data=[_build_announcement_list_item(ann, state) for ann, state in rows],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total > 0 else 1,
        ),
    )


# ── GET /api/parents/me/students/{student_uuid}/discussions/teachers ─────────

@router.get(
    "/students/{student_uuid}/discussions/teachers",
    response_model=ApiResponse[list[DiscussionTeacherListItem]],
)
def list_discussion_teachers(
    student_uuid: UUID,
    sort: str = "last_post_at_desc",
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[list[DiscussionTeacherListItem]]:
    """列出与指定学生相关的所有教师，附带 thread 信息和当前家长的未读数（§9.13）。"""
    if sort not in ("last_post_at_desc", "display_name_asc"):
        raise AppError(400, "invalid_sort", "sort 参数非法，可选：last_post_at_desc, display_name_asc")

    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在或无权访问")

    rows = discussion_crud.list_teachers_for_parent_student(
        db, current_user.id, student.id, sort=sort
    )

    data = [
        DiscussionTeacherListItem(
            uuid=row["teacher_user"].uuid,
            display_name=row["teacher_user"].display_name,
            avatar_url=row["teacher_user"].avatar_url,
            subjects=[
                SubjectBrief(uuid=s.uuid, name=s.name, code=s.code)
                for s in row["subjects"]
            ],
            thread_uuid=row["thread"].uuid if row["thread"] else None,
            last_post_at=row["thread"].last_post_at if row["thread"] else None,
            unread_post_count=row["unread_count"],
        )
        for row in rows
    ]
    return ApiResponse(data=data)


# ── GET /api/parents/me/students/{student_uuid}/discussions/teachers/{teacher_uuid} ──

@router.get(
    "/students/{student_uuid}/discussions/teachers/{teacher_uuid}",
    response_model=ApiResponse[ParentDiscussionPageData],
)
def get_discussion_with_teacher(
    student_uuid: UUID,
    teacher_uuid: UUID,
    page: int = 1,
    page_size: int = 20,
    sort: str = "created_at_desc",
    tag: str | None = None,
    keyword: str | None = None,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[ParentDiscussionPageData]:
    """
    家长视角：获取与某教师讨论页聚合数据（§9.14）。
    - 懒创建 thread
    - 顺带将当前家长的 unread_post_count 归零
    """
    if sort not in ("created_at_desc", "created_at_asc"):
        raise AppError(400, "invalid_sort", "sort 参数非法，可选：created_at_desc, created_at_asc")

    page_size = min(page_size, 100)

    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在或无权访问")

    teacher_user = discussion_crud.get_teacher_for_student(db, student.id, teacher_uuid)
    if teacher_user is None:
        raise Errors.not_found("教师不存在或未教该学生")

    thread = discussion_crud.get_or_create_thread(
        db, student.id, current_user.id, teacher_user.id
    )

    # 顺带标记已读
    discussion_crud.mark_thread_read(db, thread.id, current_user.id)
    db.commit()

    # 帖子列表
    posts, total = discussion_crud.list_posts_in_thread(
        db, thread.id,
        page=page,
        page_size=page_size,
        sort=sort,
        tag_name=tag,
        keyword=keyword,
    )

    # 教师教的学科列表
    subject_pairs = parent_crud.list_student_subjects_with_teachers(db, student.id)
    teacher_subjects = [
        SubjectBrief(uuid=subj.uuid, name=subj.name, code=subj.code)
        for subj, teachers in subject_pairs
        if any(t.id == teacher_user.id for t in teachers)
    ]

    data = ParentDiscussionPageData(
        thread_uuid=thread.uuid,
        student=StudentBrief(
            uuid=student.uuid,
            sid=student.sid,
            full_name=student.full_name,
        ),
        teacher=DiscussionTeacherInfo(
            uuid=teacher_user.uuid,
            display_name=teacher_user.display_name,
            avatar_url=teacher_user.avatar_url,
            subjects=teacher_subjects,
        ),
        posts=[build_post_item(p) for p in posts],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total > 0 else 1,
        ),
    )
    return ApiResponse(data=data)


# ── 内部辅助 ──────────────────────────────────────────────────────────────────

def _build_report_summary(report: Report | None) -> ReportSummary | None:
    if report is None:
        return None
    return ReportSummary(
        report_uuid=report.uuid,
        report_title=report.title,
        display_text=report.original_content_markdown,
        original_text=report.original_content_markdown,
        display_language=report.original_language,
        original_language=report.original_language,
    )


# ── GET /api/parents/me/students/{student_uuid}/exam-scores ──────────────────────

@router.get(
    "/students/{student_uuid}/exam-scores",
    response_model=PaginatedResponse[ParentExamScoreItem],
)
def list_student_exam_scores(
    student_uuid: UUID,
    subject_uuid: UUID | None = None,
    exam_date_from: str | None = None,
    exam_date_to: str | None = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ParentExamScoreItem]:
    """获取学生考试成绩列表（§9.18）。"""
    from datetime import date as _date

    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if not student:
        raise Errors.not_found("学生不存在或无权访问")

    subject_id: int | None = None
    if subject_uuid is not None:
        from ac_link.db.orm.academic import Subject
        subj = db.query(Subject).filter(
            Subject.uuid == subject_uuid, Subject.is_active == True  # noqa: E712
        ).first()
        if subj is None:
            raise Errors.not_found("学科不存在")
        subject_id = subj.id

    date_from: _date | None = None
    date_to: _date | None = None
    try:
        if exam_date_from:
            date_from = _date.fromisoformat(exam_date_from)
        if exam_date_to:
            date_to = _date.fromisoformat(exam_date_to)
    except ValueError:
        raise AppError(400, "invalid_filter", "exam_date 格式应为 YYYY-MM-DD")

    page_size = min(page_size, 100)
    items, total = score_crud.list_exam_scores(
        db, student.id,
        subject_id=subject_id,
        date_from=date_from, date_to=date_to,
        page=page, page_size=page_size,
    )
    for s in items:
        _ = s.subject
        _ = s.author_user
    return PaginatedResponse(
        data=[ParentExamScoreItem.from_orm_obj(s) for s in items],
        meta=PaginationMeta(
            page=page, page_size=page_size, total=total,
            total_pages=math.ceil(total / page_size) if total > 0 else 1,
        ),
    )


# ── GET /api/parents/me/students/{student_uuid}/period-metrics ───────────────────

@router.get(
    "/students/{student_uuid}/period-metrics",
    response_model=ApiResponse[list[ParentPeriodMetricItem]],
)
def list_student_period_metrics(
    student_uuid: UUID,
    subject_uuid: UUID | None = None,
    term: str | None = None,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[list[ParentPeriodMetricItem]]:
    """获取学生周期指标列表（§9.19）。"""
    student = parent_crud.get_student_for_parent(db, current_user.id, student_uuid)
    if not student:
        raise Errors.not_found("学生不存在或无权访问")

    subject_id: int | None = None
    if subject_uuid is not None:
        from ac_link.db.orm.academic import Subject
        subj = db.query(Subject).filter(
            Subject.uuid == subject_uuid, Subject.is_active == True  # noqa: E712
        ).first()
        if subj is None:
            raise Errors.not_found("学科不存在")
        subject_id = subj.id

    items = metrics_crud.list_period_metrics(
        db, student.id, subject_id=subject_id, term=term
    )
    for m in items:
        _ = m.subject
        _ = m.author_user
    return ApiResponse(data=[ParentPeriodMetricItem.from_orm_obj(m) for m in items])


def _translation_block(obj: Report | Announcement) -> TranslationBlock:
    return TranslationBlock(
        display_language=obj.original_language,
        original_language=obj.original_language,
    )


def _build_report_list_item(
    report: Report, state: ReportUserState | None
) -> ReportListItem:
    return ReportListItem(
        uuid=report.uuid,
        title=report.title,
        report_type=str(report.report_type),
        source_type=str(report.source_type),
        subject=SubjectBrief.model_validate(report.subject) if report.subject else None,
        is_read=state.is_read if state else False,
        read_at=state.read_at if state else None,
        is_archived=state.is_archived if state else False,
        archived_at=state.archived_at if state else None,
        created_at=report.created_at,
        published_at=report.published_at,
        translation=_translation_block(report),
    )


def _build_report_detail(report: Report, state: ReportUserState | None) -> ReportDetail:
    return ReportDetail(
        uuid=report.uuid,
        title=report.title,
        report_type=str(report.report_type),
        source_type=str(report.source_type),
        subject=SubjectBrief.model_validate(report.subject) if report.subject else None,
        is_read=state.is_read if state else False,
        read_at=state.read_at if state else None,
        is_archived=state.is_archived if state else False,
        archived_at=state.archived_at if state else None,
        created_at=report.created_at,
        published_at=report.published_at,
        display_content_markdown=report.original_content_markdown,
        original_content_markdown=report.original_content_markdown,
        display_language=report.original_language,
        original_language=report.original_language,
    )


def _build_announcement_list_item(
    ann: Announcement, state: AnnouncementUserState | None
) -> AnnouncementListItem:
    return AnnouncementListItem(
        uuid=ann.uuid,
        category=str(ann.category),
        title=ann.title,
        subject=SubjectBrief.model_validate(ann.subject) if ann.subject else None,
        is_important=ann.is_important,
        is_read=state.is_read if state else False,
        read_at=state.read_at if state else None,
        published_at=ann.published_at,
        due_at=ann.due_at,
        translation=_translation_block(ann),
    )
