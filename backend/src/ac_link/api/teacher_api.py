"""
教师端接口：/api/teachers/me/*

包含：
  GET   /api/teachers/me/students                                                §10.1
  GET   /api/teachers/me/students/{student_uuid}/dashboard                       §10.2
  GET   /api/teachers/me/students/{student_uuid}/discussions/parents             §10.3
  GET   /api/teachers/me/students/{student_uuid}/discussions/parents/{parent_uuid} §10.4
  GET   /api/teachers/me/tags                                                    §10.8
  POST  /api/teachers/me/tags                                                    §10.9
  PATCH /api/teachers/me/tags/{tag_uuid}                                         §10.10
  DELETE /api/teachers/me/tags/{tag_uuid}                                        §10.11
  POST  /api/teachers/me/students/{student_uuid}/reports                         §10.12
  POST  /api/teachers/me/students/{student_uuid}/announcements                   §10.14
"""

from __future__ import annotations

import math
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import require_teacher
from ac_link.common.exceptions import AppError, Errors
from ac_link.crud import discussion as discussion_crud
from ac_link.crud import teacher as teacher_crud
from ac_link.db.db import get_db
from ac_link.db.orm.enums import AnnouncementCategory, ReportType, TranslationStatus, UserRole
from ac_link.db.orm.user import User
from ac_link.dto.admin import PaginatedResponse, PaginationMeta
from ac_link.dto.auth import ApiResponse
from ac_link.dto.discussion import (
    DiscussionParentInfo,
    DiscussionParentListItem,
    TagCreate,
    TagDetail,
    TagUpdate,
    TeacherDiscussionPageData,
    build_post_item,
)
from ac_link.dto.parent import AuthorBrief, StudentBrief, SubjectBrief, SummaryCards
from ac_link.dto.teacher import (
    AnnouncementCreate,
    TeacherAnnouncementDetail,
    TeacherDashboardData,
    TeacherReportDetail,
    TeacherStudentBrief,
    TeacherStudentListItem,
    ReportCreate,
)

router = APIRouter(prefix="/api/teachers/me", tags=["teachers"])


# ── 翻译辅助 ──────────────────────────────────────────────────────────────────

def _display_language(obj: object) -> str:
    from ac_link.db.orm.content import Announcement, Report
    o: Report | Announcement = obj  # type: ignore[assignment]
    if o.translation_status == TranslationStatus.COMPLETED and o.translated_language:
        return o.translated_language
    return o.original_language


def _display_content(obj: object) -> str:
    from ac_link.db.orm.content import Announcement, Report
    o: Report | Announcement = obj  # type: ignore[assignment]
    if o.translation_status == TranslationStatus.COMPLETED and o.translated_content_markdown:
        return o.translated_content_markdown
    return o.original_content_markdown


def _build_teacher_report_detail(report: object) -> TeacherReportDetail:
    from ac_link.db.orm.content import Report as ReportORM
    r: ReportORM = report  # type: ignore[assignment]
    return TeacherReportDetail(
        uuid=r.uuid,
        title=r.title,
        report_type=str(r.report_type),
        source_type=str(r.source_type),
        subject=SubjectBrief.model_validate(r.subject) if r.subject else None,
        author=AuthorBrief(
            uuid=r.author_user.uuid,
            display_name=r.author_user.display_name,
            role=str(r.author_user.role),
        ),
        created_at=r.created_at,
        published_at=r.published_at,
        display_content_markdown=_display_content(r),
        original_content_markdown=r.original_content_markdown,
        translated_content_markdown=r.translated_content_markdown,
        display_language=_display_language(r),
        original_language=r.original_language,
        translated_language=r.translated_language,
        translation_status=str(r.translation_status),
        translated_at=r.translated_at,
    )


def _build_teacher_announcement_detail(announcement: object) -> TeacherAnnouncementDetail:
    from ac_link.db.orm.content import Announcement as AnnORM
    a: AnnORM = announcement  # type: ignore[assignment]
    return TeacherAnnouncementDetail(
        uuid=a.uuid,
        category=str(a.category),
        title=a.title,
        subject=SubjectBrief.model_validate(a.subject) if a.subject else None,
        is_important=a.is_important,
        author=AuthorBrief(
            uuid=a.author_user.uuid,
            display_name=a.author_user.display_name,
            role=str(a.author_user.role),
        ),
        published_at=a.published_at,
        due_at=a.due_at,
        created_at=a.created_at,
        display_content_markdown=_display_content(a),
        original_content_markdown=a.original_content_markdown,
        translated_content_markdown=a.translated_content_markdown,
        display_language=_display_language(a),
        original_language=a.original_language,
        translated_language=a.translated_language,
        translation_status=str(a.translation_status),
        translated_at=a.translated_at,
    )


# ── GET /api/teachers/me/students ─────────────────────────────────────────────

_VALID_STUDENT_SORTS = frozenset({
    "full_name_asc", "full_name_desc",
    "sid_asc", "sid_desc",
    "score_desc", "score_asc",
    "last_activity_at_desc",
})


@router.get(
    "/students",
    response_model=PaginatedResponse[TeacherStudentListItem],
)
def list_my_students(
    page: int = 1,
    page_size: int = 20,
    class_name: str | None = None,
    grade_level: str | None = None,
    subject_uuid: str | None = None,
    keyword: str | None = None,
    sort: str = "full_name_asc",
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> PaginatedResponse[TeacherStudentListItem]:
    """
    获取当前教师负责的学生列表（§10.1）。
    score_desc / score_asc：student_metrics 表尚未建立，score 字段始终为 null，
    排序回退到 full_name_asc。
    last_activity_at_desc：按该教师与该学生最近一条未删除 post 的时间排序。
    """
    if sort not in _VALID_STUDENT_SORTS:
        raise AppError(400, "invalid_sort", f"sort 参数非法，可选值：{_VALID_STUDENT_SORTS}")

    page_size = min(page_size, 100)

    # 解析 subject_uuid → subject_id
    subject_id: int | None = None
    if subject_uuid is not None:
        from uuid import UUID as _UUID
        try:
            parsed_uuid = _UUID(subject_uuid)
        except ValueError:
            raise AppError(400, "invalid_filter", "subject_uuid 格式无效")
        subject = teacher_crud.get_subject_by_uuid(db, parsed_uuid)
        if subject is None:
            raise Errors.not_found("学科不存在")
        subject_id = subject.id

    rows, total = teacher_crud.list_teacher_students(
        db, current_user.id,
        page=page, page_size=page_size,
        class_name=class_name, grade_level=grade_level,
        subject_id=subject_id, keyword=keyword, sort=sort,
    )

    data = [
        TeacherStudentListItem(
            uuid=student.uuid,
            sid=student.sid,
            full_name=student.full_name,
            preferred_name=student.preferred_name,
            class_name=student.class_name,
            grade_level=student.grade_level,
            avatar_url=student.avatar_url,
            score=None,  # 待 student_metrics 表建好后填充
            last_activity_at=last_activity_at,
        )
        for student, last_activity_at in rows
    ]
    return PaginatedResponse(
        data=data,
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if total > 0 else 1,
        ),
    )


# ── GET /api/teachers/me/students/{student_uuid}/dashboard ────────────────────

@router.get(
    "/students/{student_uuid}/dashboard",
    response_model=ApiResponse[TeacherDashboardData],
)
def get_student_dashboard(
    student_uuid: UUID,
    range: str = "all_time",
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[TeacherDashboardData]:
    """
    获取老师视角学生 Dashboard（§10.2）。
    summary 取该学生最近一条 is_published=True 的 report（不限作者）。
    score / completion_rate 等聚合字段待 student_metrics 表建好后填充。
    """
    student = teacher_crud.get_student_for_teacher(db, current_user.id, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在或无权访问")

    unread_posts = teacher_crud.get_teacher_unread_post_count(db, current_user.id, student.id)

    # 取最近一条已发布 report（不限作者）作为 summary
    from ac_link.crud import parent as parent_crud
    from ac_link.dto.parent import ReportSummary
    latest_report = parent_crud.get_latest_report_for_student(db, student.id)

    summary: ReportSummary | None = None
    if latest_report is not None:
        summary = ReportSummary(
            report_uuid=latest_report.uuid,
            report_title=latest_report.title,
            display_text=_display_content(latest_report)[:500],
            original_text=latest_report.original_content_markdown[:500],
            translated_text=(
                latest_report.translated_content_markdown[:500]
                if latest_report.translated_content_markdown else None
            ),
            display_language=_display_language(latest_report),
            original_language=latest_report.original_language,
            translated_language=latest_report.translated_language,
            translation_status=str(latest_report.translation_status),
            translated_at=latest_report.translated_at,
        )

    return ApiResponse(data=TeacherDashboardData(
        student=TeacherStudentBrief.model_validate(student),
        unread_post_count=unread_posts,
        summary_cards=SummaryCards(summary=summary),
    ))


# ── POST /api/teachers/me/students/{student_uuid}/reports ─────────────────────

@router.post(
    "/students/{student_uuid}/reports",
    response_model=ApiResponse[TeacherReportDetail],
    status_code=201,
)
def create_report(
    student_uuid: UUID,
    body: ReportCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[TeacherReportDetail]:
    """
    老师创建报告（§10.12）。source_type 固定为 teacher，立即发布。
    若提供 subject_uuid，验证 teaching_assignment(teacher, student, subject) 三元关联。
    """
    student = teacher_crud.get_student_for_teacher(db, current_user.id, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在或无权访问")

    subject_id: int | None = None
    if body.subject_uuid is not None:
        subject = teacher_crud.get_subject_by_uuid(db, body.subject_uuid)
        if subject is None:
            raise Errors.not_found("学科不存在")
        if not teacher_crud.verify_teaching_assignment(db, current_user.id, student.id, subject.id):
            raise Errors.forbidden("当前教师未被分配该学生的此学科")
        subject_id = subject.id

    report = teacher_crud.create_report(
        db, current_user.id, student.id,
        subject_id=subject_id,
        title=body.title,
        report_type=ReportType(body.report_type),
        content_markdown=body.content_markdown,
        original_language=body.original_language,
        translation_status=TranslationStatus(body.translation_status),
        translated_content_markdown=body.translated_content_markdown,
        translated_language=body.translated_language,
        translated_at=body.translated_at,
    )
    db.commit()
    db.refresh(report)
    # 预加载关联
    _ = report.subject
    _ = report.author_user

    return ApiResponse(data=_build_teacher_report_detail(report))


# ── POST /api/teachers/me/students/{student_uuid}/announcements ───────────────

@router.post(
    "/students/{student_uuid}/announcements",
    response_model=ApiResponse[TeacherAnnouncementDetail],
    status_code=201,
)
def create_announcement(
    student_uuid: UUID,
    body: AnnouncementCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[TeacherAnnouncementDetail]:
    """
    老师创建公告/任务（§10.14）。立即发布（published_at 默认为服务端当前时间）。
    若提供 subject_uuid，验证 teaching_assignment 三元关联。
    """
    student = teacher_crud.get_student_for_teacher(db, current_user.id, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在或无权访问")

    subject_id: int | None = None
    if body.subject_uuid is not None:
        subject = teacher_crud.get_subject_by_uuid(db, body.subject_uuid)
        if subject is None:
            raise Errors.not_found("学科不存在")
        if not teacher_crud.verify_teaching_assignment(db, current_user.id, student.id, subject.id):
            raise Errors.forbidden("当前教师未被分配该学生的此学科")
        subject_id = subject.id

    announcement = teacher_crud.create_announcement(
        db, current_user.id, student.id,
        subject_id=subject_id,
        category=AnnouncementCategory(body.category),
        title=body.title,
        content_markdown=body.content_markdown,
        original_language=body.original_language,
        translation_status=TranslationStatus(body.translation_status),
        translated_content_markdown=body.translated_content_markdown,
        translated_language=body.translated_language,
        translated_at=body.translated_at,
        published_at=body.published_at,
        due_at=body.due_at,
        is_important=body.is_important,
    )
    db.commit()
    db.refresh(announcement)
    _ = announcement.subject
    _ = announcement.author_user

    return ApiResponse(data=_build_teacher_announcement_detail(announcement))


# ── GET /api/teachers/me/students/{student_uuid}/discussions/parents ──────────

@router.get(
    "/students/{student_uuid}/discussions/parents",
    response_model=ApiResponse[list[DiscussionParentListItem]],
)
def list_discussion_parents(
    student_uuid: UUID,
    sort: str = "last_post_at_desc",
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[list[DiscussionParentListItem]]:
    """列出与指定学生相关的所有家长，附带 thread 信息和当前教师的未读数（§10.3）。"""
    if sort not in ("last_post_at_desc", "display_name_asc"):
        raise AppError(400, "invalid_sort", "sort 参数非法，可选：last_post_at_desc, display_name_asc")

    student = discussion_crud.get_student_for_teacher(db, current_user.id, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在或无权访问")

    rows = discussion_crud.list_parents_for_teacher_student(
        db, current_user.id, student.id, sort=sort
    )

    data = [
        DiscussionParentListItem(
            uuid=row["parent_user"].uuid,
            display_name=row["parent_user"].display_name,
            avatar_url=row["parent_user"].avatar_url,
            thread_uuid=row["thread"].uuid if row["thread"] else None,
            last_post_at=row["thread"].last_post_at if row["thread"] else None,
            unread_post_count=row["unread_count"],
        )
        for row in rows
    ]
    return ApiResponse(data=data)


# ── GET /api/teachers/me/students/{student_uuid}/discussions/parents/{parent_uuid} ──

@router.get(
    "/students/{student_uuid}/discussions/parents/{parent_uuid}",
    response_model=ApiResponse[TeacherDiscussionPageData],
)
def get_discussion_with_parent(
    student_uuid: UUID,
    parent_uuid: UUID,
    page: int = 1,
    page_size: int = 20,
    sort: str = "created_at_desc",
    tag: str | None = None,
    keyword: str | None = None,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[TeacherDiscussionPageData]:
    """
    教师视角：获取与某家长讨论页聚合数据（§10.4）。
    - 懒创建 thread
    - 顺带将当前教师的 unread_post_count 归零
    """
    if sort not in ("created_at_desc", "created_at_asc"):
        raise AppError(400, "invalid_sort", "sort 参数非法，可选：created_at_desc, created_at_asc")

    page_size = min(page_size, 100)

    student = discussion_crud.get_student_for_teacher(db, current_user.id, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在或无权访问")

    parent_user = discussion_crud.get_parent_for_student(db, student.id, parent_uuid)
    if parent_user is None:
        raise Errors.not_found("家长不存在或与该学生无绑定")

    thread = discussion_crud.get_or_create_thread(
        db, student.id, parent_user.id, current_user.id
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

    data = TeacherDiscussionPageData(
        thread_uuid=thread.uuid,
        student=StudentBrief(
            uuid=student.uuid,
            sid=student.sid,
            full_name=student.full_name,
        ),
        parent=DiscussionParentInfo(
            uuid=parent_user.uuid,
            display_name=parent_user.display_name,
            avatar_url=parent_user.avatar_url,
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


# ── Tag 管理 ──────────────────────────────────────────────────────────────────

def _tag_to_detail(tag: object) -> TagDetail:  # type: ignore[type-arg]
    from ac_link.db.orm.communication import Tag as TagORM

    t: TagORM = tag  # type: ignore[assignment]
    return TagDetail(
        uuid=t.uuid,
        name=t.name,
        scope=str(t.scope),
        owner_teacher_uuid=t.owner_user.uuid if t.owner_user else None,
        is_selectable_by_parent=t.is_selectable_by_parent,
        is_selectable_by_teacher=t.is_selectable_by_teacher,
        affects_business_logic=t.affects_business_logic,
    )


@router.get(
    "/tags",
    response_model=ApiResponse[list[TagDetail]],
)
def list_tags(
    scope: str = "all",
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[list[TagDetail]]:
    """列出当前教师可用的 tag（§10.8）。"""
    if scope not in ("all", "system", "teacher_private"):
        raise AppError(400, "invalid_filter", "scope 参数非法，可选值：all, system, teacher_private")

    tags = discussion_crud.list_tags_for_teacher(db, current_user.id, scope=scope)
    return ApiResponse(data=[_tag_to_detail(t) for t in tags])


@router.post(
    "/tags",
    response_model=ApiResponse[TagDetail],
    status_code=201,
)
def create_tag(
    body: TagCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[TagDetail]:
    """创建教师私有 tag（§10.9）。"""
    tag = discussion_crud.create_teacher_tag(db, current_user.id, name=body.name)
    db.commit()
    db.refresh(tag)
    # 加载 owner_user 以便序列化
    _ = tag.owner_user
    return ApiResponse(data=_tag_to_detail(tag))


@router.patch(
    "/tags/{tag_uuid}",
    response_model=ApiResponse[TagDetail],
)
def update_tag(
    tag_uuid: UUID,
    body: TagUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[TagDetail]:
    """更新教师私有 tag 名称（§10.10）。"""
    tag = discussion_crud.get_tag_by_uuid(db, tag_uuid)
    if tag is None:
        raise Errors.not_found("tag 不存在")

    updated = discussion_crud.update_teacher_tag(db, tag, current_user.id, name=body.name)
    db.commit()
    db.refresh(updated)
    _ = updated.owner_user
    return ApiResponse(data=_tag_to_detail(updated))


@router.delete(
    "/tags/{tag_uuid}",
    response_model=ApiResponse[dict],
)
def delete_tag(
    tag_uuid: UUID,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
) -> ApiResponse[dict]:
    """软删除教师私有 tag（§10.11）。"""
    tag = discussion_crud.get_tag_by_uuid(db, tag_uuid)
    if tag is None:
        raise Errors.not_found("tag 不存在")

    discussion_crud.soft_delete_teacher_tag(db, tag, current_user.id)
    db.commit()
    return ApiResponse(data={"success": True})
