"""
报告接口：/api/reports/*

包含：
  POST  /api/reports/{report_uuid}/read      - 标记报告为已读（§9.7）
  POST  /api/reports/{report_uuid}/archive   - 归档报告（§9.8）
  POST  /api/reports/{report_uuid}/unarchive - 取消归档报告（§9.9）
  PATCH /api/reports/{report_uuid}           - 更新报告（§10.13）仅创建者或 admin
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user, require_parent
from ac_link.common.exceptions import AppError, Errors
from ac_link.crud import parent as parent_crud
from ac_link.crud import teacher as teacher_crud
from ac_link.db.db import get_db
from ac_link.db.orm.enums import ReportType, TranslationStatus, UserRole
from ac_link.db.orm.user import User
from ac_link.dto.auth import ApiResponse, SuccessResponse
from ac_link.dto.teacher import ReportUpdate, TeacherReportDetail

router = APIRouter(prefix="/api/reports", tags=["reports"])


# ── POST /api/reports/{report_uuid}/read ──────────────────────────────────────

@router.post("/{report_uuid}/read", response_model=ApiResponse[SuccessResponse])
def mark_report_read(
    report_uuid: UUID,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """标记报告为已读。若已读则返回 409。"""
    result = parent_crud.get_report_for_parent(db, current_user.id, report_uuid)
    if result is None:
        raise Errors.not_found("报告不存在或无权访问")

    _, state = result
    if state is not None and state.is_read:
        raise Errors.already_read()

    report, _ = result
    parent_crud.upsert_report_state(
        db, report.id, current_user.id,
        is_read=True,
        read_at=datetime.now(timezone.utc),
    )
    db.commit()
    return ApiResponse(data=SuccessResponse())


# ── POST /api/reports/{report_uuid}/archive ───────────────────────────────────

@router.post("/{report_uuid}/archive", response_model=ApiResponse[SuccessResponse])
def archive_report(
    report_uuid: UUID,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """归档报告。若已归档则返回 409。"""
    result = parent_crud.get_report_for_parent(db, current_user.id, report_uuid)
    if result is None:
        raise Errors.not_found("报告不存在或无权访问")

    _, state = result
    if state is not None and state.is_archived:
        raise Errors.already_archived()

    report, _ = result
    parent_crud.upsert_report_state(
        db, report.id, current_user.id,
        is_archived=True,
        archived_at=datetime.now(timezone.utc),
    )
    db.commit()
    return ApiResponse(data=SuccessResponse())


# ── POST /api/reports/{report_uuid}/unarchive ─────────────────────────────────

@router.post("/{report_uuid}/unarchive", response_model=ApiResponse[SuccessResponse])
def unarchive_report(
    report_uuid: UUID,
    current_user: User = Depends(require_parent),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """
    取消归档报告。幂等：若未归档或无状态记录，直接返回成功。
    """
    result = parent_crud.get_report_for_parent(db, current_user.id, report_uuid)
    if result is None:
        raise Errors.not_found("报告不存在或无权访问")

    report, state = result
    if state is not None and state.is_archived:
        parent_crud.upsert_report_state(
            db, report.id, current_user.id,
            is_archived=False,
            archived_at=None,
        )
        db.commit()
    return ApiResponse(data=SuccessResponse())


# ── PATCH /api/reports/{report_uuid} ──────────────────────────────────────────

def _display_language_report(report: object) -> str:
    from ac_link.db.orm.content import Report as ReportORM
    r: ReportORM = report  # type: ignore[assignment]
    if r.translation_status == TranslationStatus.COMPLETED and r.translated_language:
        return r.translated_language
    return r.original_language


def _display_content_report(report: object) -> str:
    from ac_link.db.orm.content import Report as ReportORM
    r: ReportORM = report  # type: ignore[assignment]
    if r.translation_status == TranslationStatus.COMPLETED and r.translated_content_markdown:
        return r.translated_content_markdown
    return r.original_content_markdown


@router.patch("/{report_uuid}", response_model=ApiResponse[TeacherReportDetail])
def update_report(
    report_uuid: UUID,
    body: ReportUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[TeacherReportDetail]:
    """
    更新报告（§10.13）。
    权限：报告创建者（teacher）或 admin。
    禁止修改 student 和 source_type（由创建时确定）。
    若更新 content_markdown 且原 translation_status 为 completed，自动置 stale。
    subject_uuid 提供时验证 teaching_assignment 三元分配。
    """
    report = teacher_crud.get_report_by_uuid(db, report_uuid)
    if report is None:
        raise Errors.not_found("报告不存在")

    is_admin = current_user.role == UserRole.ADMIN
    if not is_admin and report.author_user_id != current_user.id:
        raise Errors.forbidden("仅报告创建者或管理员可更新报告")

    provided = body.model_fields_set

    # 解析 subject_uuid（若在 provided 中）
    subject_id = teacher_crud.UNSET
    if "subject_uuid" in provided:
        if body.subject_uuid is None:
            subject_id = None
        else:
            subject = teacher_crud.get_subject_by_uuid(db, body.subject_uuid)
            if subject is None:
                raise Errors.not_found("学科不存在")
            # admin 不验证 teaching_assignment
            if not is_admin:
                if not teacher_crud.verify_teaching_assignment(
                    db, current_user.id, report.student_id, subject.id
                ):
                    raise Errors.forbidden("当前教师未被分配该学生的此学科")
            subject_id = subject.id

    def _unset_or(field: str, cast=None):
        """若字段在 provided 中则返回其值（可 cast），否则返回 UNSET。"""
        if field not in provided:
            return teacher_crud.UNSET
        v = getattr(body, field)
        return cast(v) if (cast and v is not None) else v

    teacher_crud.update_report(
        db, report,
        title=body.title if "title" in provided else None,
        subject_id=subject_id,
        report_type=ReportType(body.report_type) if "report_type" in provided and body.report_type else None,
        content_markdown=body.content_markdown if "content_markdown" in provided else None,
        original_language=body.original_language if "original_language" in provided else None,
        translation_status=TranslationStatus(body.translation_status)
            if "translation_status" in provided and body.translation_status else None,
        translated_content_markdown=_unset_or("translated_content_markdown"),
        translated_language=_unset_or("translated_language"),
        translated_at=_unset_or("translated_at"),
    )
    db.commit()
    db.refresh(report)
    _ = report.subject
    _ = report.author_user

    from ac_link.dto.parent import AuthorBrief, SubjectBrief
    return ApiResponse(data=TeacherReportDetail(
        uuid=report.uuid,
        title=report.title,
        report_type=str(report.report_type),
        source_type=str(report.source_type),
        subject=SubjectBrief.model_validate(report.subject) if report.subject else None,
        author=AuthorBrief(
            uuid=report.author_user.uuid,
            display_name=report.author_user.display_name,
            role=str(report.author_user.role),
        ),
        created_at=report.created_at,
        published_at=report.published_at,
        display_content_markdown=_display_content_report(report),
        original_content_markdown=report.original_content_markdown,
        translated_content_markdown=report.translated_content_markdown,
        display_language=_display_language_report(report),
        original_language=report.original_language,
        translated_language=report.translated_language,
        translation_status=str(report.translation_status),
        translated_at=report.translated_at,
    ))
