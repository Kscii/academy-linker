"""
报告状态操作接口：/api/reports/*

包含：
  POST /api/reports/{report_uuid}/read      - 标记报告为已读（§9.7）
  POST /api/reports/{report_uuid}/archive   - 归档报告（§9.8）
  POST /api/reports/{report_uuid}/unarchive - 取消归档报告（§9.9）

权限：仅 parent 角色可访问，且报告所属学生必须与当前家长有 active binding。
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import require_parent
from ac_link.common.exceptions import AppError, Errors
from ac_link.crud import parent as parent_crud
from ac_link.db.db import get_db
from ac_link.db.orm.user import User
from ac_link.dto.auth import ApiResponse, SuccessResponse

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
