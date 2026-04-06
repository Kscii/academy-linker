"""
周期指标 CRUD（§10.23–10.24 / §9.19）。

公开函数：
  list_period_metrics         — 获取学生周期指标列表（不分页，按 snapshot_date DESC）
  get_period_metric_by_uuid   — 通过 uuid 取单条指标
  get_period_metric_by_key    — 通过 (student_id, subject_id, snapshot_date) 唯一键查询
  upsert_period_metric        — 先 SELECT 后 UPDATE/INSERT
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from ac_link.db.orm.academic import StudentPeriodMetric


def list_period_metrics(
    db: Session,
    student_id: int,
    *,
    subject_id: int | None = None,
    term: str | None = None,
) -> list[StudentPeriodMetric]:
    """获取学生周期指标列表，按 snapshot_date DESC 排序。"""
    q = db.query(StudentPeriodMetric).filter(StudentPeriodMetric.student_id == student_id)
    if subject_id is not None:
        q = q.filter(StudentPeriodMetric.subject_id == subject_id)
    if term is not None:
        q = q.filter(StudentPeriodMetric.term == term)
    return q.order_by(StudentPeriodMetric.snapshot_date.desc()).all()


def get_period_metric_by_uuid(db: Session, uuid: UUID) -> StudentPeriodMetric | None:
    return db.query(StudentPeriodMetric).filter(StudentPeriodMetric.uuid == uuid).first()


def get_period_metric_by_key(
    db: Session,
    student_id: int,
    subject_id: int,
    snapshot_date: date,
) -> StudentPeriodMetric | None:
    return db.query(StudentPeriodMetric).filter(
        StudentPeriodMetric.student_id == student_id,
        StudentPeriodMetric.subject_id == subject_id,
        StudentPeriodMetric.snapshot_date == snapshot_date,
    ).first()


def upsert_period_metric(
    db: Session,
    student_id: int,
    subject_id: int,
    author_user_id: int,
    snapshot_date: date,
    **fields: object,
) -> tuple[StudentPeriodMetric, bool]:
    """
    UPSERT：先 SELECT，存在则 UPDATE，否则 INSERT。
    返回 (metric, created)，created=True 表示新建。
    """
    existing = get_period_metric_by_key(db, student_id, subject_id, snapshot_date)
    if existing is not None:
        for k, v in fields.items():
            setattr(existing, k, v)
        db.flush()
        return existing, False
    metric = StudentPeriodMetric(
        student_id=student_id,
        subject_id=subject_id,
        author_user_id=author_user_id,
        snapshot_date=snapshot_date,
        **fields,
    )
    db.add(metric)
    db.flush()
    return metric, True
