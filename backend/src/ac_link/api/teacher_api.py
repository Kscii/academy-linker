"""
教师端接口：/api/teachers/me/*

包含：
  GET /api/teachers/me/students/{student_uuid}/discussions/parents           §10.3
  GET /api/teachers/me/students/{student_uuid}/discussions/parents/{parent_uuid} §10.4
"""

from __future__ import annotations

import math
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ac_link.common.deps import require_teacher
from ac_link.common.exceptions import Errors
from ac_link.crud import discussion as discussion_crud
from ac_link.db.db import get_db
from ac_link.db.orm.user import User
from ac_link.dto.admin import PaginatedResponse, PaginationMeta
from ac_link.dto.auth import ApiResponse
from ac_link.dto.discussion import (
    DiscussionParentInfo,
    DiscussionParentListItem,
    TeacherDiscussionPageData,
    build_post_item,
)
from ac_link.dto.parent import StudentBrief

router = APIRouter(prefix="/api/teachers/me", tags=["teachers"])


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
        raise Errors.not_found("无效的 sort 参数")

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
        raise Errors.not_found("无效的 sort 参数")

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
