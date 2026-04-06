"""
考试成绩 CRUD（§10.19–10.22 / §9.18）。

公开函数：
  list_exam_scores          — 分页获取学生考试成绩（按 exam_date DESC）
  get_exam_score_by_uuid    — 通过 uuid 取单条成绩
  create_exam_score         — 创建成绩
  update_exam_score         — 更新成绩可变字段
  delete_exam_score         — 物理删除成绩
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from ac_link.db.orm.academic import StudentExamScore


def list_exam_scores(
    db: Session,
    student_id: int,
    *,
    subject_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[StudentExamScore], int]:
    """分页获取学生考试成绩，按 exam_date DESC、id DESC 排序。"""
    q = db.query(StudentExamScore).filter(StudentExamScore.student_id == student_id)
    if subject_id is not None:
        q = q.filter(StudentExamScore.subject_id == subject_id)
    if date_from is not None:
        q = q.filter(StudentExamScore.exam_date >= date_from)
    if date_to is not None:
        q = q.filter(StudentExamScore.exam_date <= date_to)
    total = q.with_entities(func.count(StudentExamScore.id)).scalar() or 0
    items = (
        q.order_by(StudentExamScore.exam_date.desc(), StudentExamScore.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def get_exam_score_by_uuid(db: Session, uuid: UUID) -> StudentExamScore | None:
    return db.query(StudentExamScore).filter(StudentExamScore.uuid == uuid).first()


def create_exam_score(db: Session, **fields: object) -> StudentExamScore:
    score = StudentExamScore(**fields)
    db.add(score)
    db.flush()
    return score


def update_exam_score(db: Session, score: StudentExamScore, **fields: object) -> StudentExamScore:
    for k, v in fields.items():
        setattr(score, k, v)
    db.flush()
    return score


def delete_exam_score(db: Session, score: StudentExamScore) -> None:
    db.delete(score)
    db.flush()
