"""
福利/福祉 CRUD 层（请假申请 & 事件举报）。

职责：纯粹的数据库读写，不含业务逻辑。

公开函数：
  list_leave_requests    — 分页查询某学生的请假申请列表
  create_leave_request   — 提交新请假申请
  list_incident_reports  — 分页查询某学生的事件举报列表（仅返回提交者自己的）
  create_incident_report — 提交新事件举报
"""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from ac_link.db.orm.enums import IncidentStatus, IncidentType, LeaveRequestStatus, LeaveRequestType
from ac_link.db.orm.welfare import StudentIncidentReport, StudentLeaveRequest


def list_leave_requests(
    db: Session,
    student_id: int,
    submitter_user_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
    status: str = "all",
) -> tuple[list[StudentLeaveRequest], int]:
    """
    返回指定学生、指定提交者的请假申请列表。

    status 可选值：
      - "all"      : 全部
      - "pending"  : 待审核
      - "approved" : 已批准
      - "rejected" : 已拒绝
    """
    q = db.query(StudentLeaveRequest).filter(
        StudentLeaveRequest.student_id == student_id,
        StudentLeaveRequest.submitter_user_id == submitter_user_id,
    )
    if status != "all":
        status_enum = LeaveRequestStatus(status)
        q = q.filter(StudentLeaveRequest.status == status_enum)

    q = q.order_by(StudentLeaveRequest.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def create_leave_request(
    db: Session,
    *,
    student_id: int,
    submitter_user_id: int,
    leave_type: LeaveRequestType,
    start_date: date,
    end_date: date,
    reason: str | None,
) -> StudentLeaveRequest:
    """创建并 flush 请假申请，status 固定为 PENDING。"""
    obj = StudentLeaveRequest(
        student_id=student_id,
        submitter_user_id=submitter_user_id,
        type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status=LeaveRequestStatus.PENDING,
    )
    db.add(obj)
    db.flush()
    return obj


def list_incident_reports(
    db: Session,
    reporter_user_id: int,
    student_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[StudentIncidentReport], int]:
    """
    返回指定举报者针对指定学生提交的（非匿名）事件举报列表。

    匿名举报的 reporter_user_id 为 NULL，不会出现在此列表中。
    """
    q = (
        db.query(StudentIncidentReport)
        .filter(
            StudentIncidentReport.student_id == student_id,
            StudentIncidentReport.reporter_user_id == reporter_user_id,
            StudentIncidentReport.is_anonymous == False,  # noqa: E712
        )
        .order_by(StudentIncidentReport.created_at.desc())
    )
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def create_incident_report(
    db: Session,
    *,
    student_id: int,
    reporter_user_id: int | None,
    incident_type: IncidentType,
    description: str,
    is_anonymous: bool,
) -> StudentIncidentReport:
    """
    创建并 flush 事件举报。

    is_anonymous=True 时 reporter_user_id 应传入 None（调用方负责不写入用户 ID）。
    """
    obj = StudentIncidentReport(
        student_id=student_id,
        reporter_user_id=reporter_user_id,
        incident_type=incident_type,
        description=description,
        is_anonymous=is_anonymous,
        status=IncidentStatus.SUBMITTED,
    )
    db.add(obj)
    db.flush()
    return obj
