"""
家长端接口：/api/parents/me/*

包含：
  GET /api/parents/me/students                                        §9.1
  GET /api/parents/me/students/{student_uuid}/dashboard               §9.2
  GET /api/parents/me/students/{student_uuid}/subjects                §9.3
  GET /api/parents/me/students/{student_uuid}/subjects/{subject_uuid} §9.4
"""

from __future__ import annotations

import math
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import require_parent
from ac_link.common.exceptions import Errors
from ac_link.crud import parent as parent_crud
from ac_link.db.db import get_db
from ac_link.db.orm.content import Report
from ac_link.db.orm.user import User
from ac_link.dto.auth import ApiResponse
from ac_link.dto.admin import PaginatedResponse, PaginationMeta
from ac_link.dto.parent import (
    ChartPoint,
    Charts,
    DashboardContext,
    DashboardData,
    ImportantPostBanner,
    LearningProgressPoint,
    ReportSummary,
    StudentBrief,
    StudentOut,
    SubjectDetailData,
    SubjectListItem,
    SubjectListResponse,
    SubjectOverview,
    SubjectStat,
    SubjectWithTeachers,
    SummaryCards,
    TeacherBrief,
    TeacherDetail,
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
        data=[StudentOut.model_validate(s) for s in students],
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
        student=StudentOut.model_validate(student),
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


# ── 内部辅助 ──────────────────────────────────────────────────────────────────

def _build_report_summary(report: Report | None) -> ReportSummary | None:
    if report is None:
        return None
    return ReportSummary(
        report_uuid=report.uuid,
        report_title=report.title,
        display_text=report.content_markdown,
        original_text=report.original_content_markdown,
        translated_text=report.translated_content_markdown,
        display_language=report.original_language,
        original_language=report.original_language,
        translated_language=report.translated_language,
        translation_status=str(report.translation_status),
        translated_at=report.translated_at,
    )
