"""
讨论区 CRUD 层。

职责：纯粹的数据库读写，不含业务逻辑（tag 权限校验在 API 层做）。

公开函数：
  get_student_for_teacher           — 教师视角获取有权限的学生
  list_teachers_for_parent_student  — 家长视角获取教师列表（含 thread/unread 信息）
  list_parents_for_teacher_student  — 教师视角获取家长列表（含 thread/unread 信息）
  get_teacher_for_student           — 确认某教师教某学生（供家长打开讨论页时验证）
  get_parent_for_student            — 确认某家长绑定某学生（供教师打开讨论页时验证）
  get_or_create_thread              — 懒创建 discussion thread
  get_thread_by_uuid_for_user       — 按 uuid 取 thread，确认当前用户是参与者
  list_posts_in_thread              — 帖子分页查询（含 tag/keyword 过滤）
  get_tags_by_uuids                 — 批量取 tag，任一不存在则抛 404
  create_post                       — 创建帖子 + 更新对方 unread_post_count + 更新 thread.last_post_at
  get_post_by_uuid                  — 按 uuid 取 post（含 tags / reply_to_post）
  update_post                       — 更新帖子内容（可选替换 tags）
  soft_delete_post                  — 软删除帖子
  mark_thread_read                  — 重置当前用户的 unread_post_count 为 0
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ac_link.common.exceptions import AppError, Errors
from ac_link.db.orm.academic import ParentStudentBinding, Student, Subject, TeachingAssignment
from ac_link.db.orm.communication import (
    DiscussionParticipantState,
    DiscussionThread,
    Post,
    PostTagBinding,
    Tag,
)
from ac_link.db.orm.user import User


# ── 学生 / 用户查询辅助 ───────────────────────────────────────────────────────

def get_student_for_teacher(
    db: Session,
    teacher_user_id: int,
    student_uuid: UUID,
) -> Student | None:
    """返回该教师通过 active 教学分配可访问的学生，不存在或无权限时返回 None。"""
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


def get_teacher_for_student(
    db: Session,
    student_id: int,
    teacher_uuid: UUID,
) -> User | None:
    """返回教这个学生的教师用户对象，确认存在 active 教学分配。"""
    return (
        db.query(User)
        .join(TeachingAssignment, TeachingAssignment.teacher_user_id == User.id)
        .filter(
            User.uuid == teacher_uuid,
            TeachingAssignment.student_id == student_id,
            TeachingAssignment.is_active == True,  # noqa: E712
            User.is_active == True,  # noqa: E712
        )
        .first()
    )


def get_parent_for_student(
    db: Session,
    student_id: int,
    parent_uuid: UUID,
) -> User | None:
    """返回绑定了这个学生的家长用户对象，确认存在 active 绑定。"""
    return (
        db.query(User)
        .join(ParentStudentBinding, ParentStudentBinding.parent_user_id == User.id)
        .filter(
            User.uuid == parent_uuid,
            ParentStudentBinding.student_id == student_id,
            ParentStudentBinding.is_active == True,  # noqa: E712
            User.is_active == True,  # noqa: E712
        )
        .first()
    )


# ── 列表查询 ──────────────────────────────────────────────────────────────────

def list_teachers_for_parent_student(
    db: Session,
    parent_user_id: int,
    student_id: int,
    *,
    sort: str = "last_post_at_desc",
) -> list[dict]:
    """
    返回与该学生有 active 教学分配的所有教师，附带 thread/unread 信息。

    每条结果为 dict：
        teacher_user   : User
        subjects       : list[Subject]
        thread         : DiscussionThread | None
        unread_count   : int
    """
    assignments = (
        db.query(TeachingAssignment)
        .options(
            joinedload(TeachingAssignment.teacher_user),
            joinedload(TeachingAssignment.subject),
        )
        .filter(
            TeachingAssignment.student_id == student_id,
            TeachingAssignment.is_active == True,  # noqa: E712
        )
        .all()
    )

    # 按 teacher 聚合
    teacher_map: dict[int, tuple[User, list[Subject]]] = {}
    for ta in assignments:
        if ta.teacher_user_id not in teacher_map:
            teacher_map[ta.teacher_user_id] = (ta.teacher_user, [])
        teacher_map[ta.teacher_user_id][1].append(ta.subject)

    if not teacher_map:
        return []

    teacher_ids = list(teacher_map.keys())

    threads = (
        db.query(DiscussionThread)
        .filter(
            DiscussionThread.student_id == student_id,
            DiscussionThread.parent_user_id == parent_user_id,
            DiscussionThread.teacher_user_id.in_(teacher_ids),
        )
        .all()
    )
    thread_by_teacher: dict[int, DiscussionThread] = {t.teacher_user_id: t for t in threads}

    thread_ids = [t.id for t in threads]
    state_by_thread: dict[int, DiscussionParticipantState] = {}
    if thread_ids:
        states = (
            db.query(DiscussionParticipantState)
            .filter(
                DiscussionParticipantState.thread_id.in_(thread_ids),
                DiscussionParticipantState.user_id == parent_user_id,
            )
            .all()
        )
        state_by_thread = {s.thread_id: s for s in states}

    result = []
    for teacher_id, (teacher_user, subjects) in teacher_map.items():
        thread = thread_by_teacher.get(teacher_id)
        state = state_by_thread.get(thread.id) if thread else None
        result.append({
            "teacher_user": teacher_user,
            "subjects": subjects,
            "thread": thread,
            "unread_count": state.unread_post_count if state else 0,
        })

    _sort_discussion_list(result, sort, user_key="teacher_user")
    return result


def list_parents_for_teacher_student(
    db: Session,
    teacher_user_id: int,
    student_id: int,
    *,
    sort: str = "last_post_at_desc",
) -> list[dict]:
    """
    返回与该学生有 active 家长绑定的所有家长，附带 thread/unread 信息。

    每条结果为 dict：
        parent_user  : User
        thread       : DiscussionThread | None
        unread_count : int
    """
    bindings = (
        db.query(ParentStudentBinding)
        .options(joinedload(ParentStudentBinding.parent_user))
        .filter(
            ParentStudentBinding.student_id == student_id,
            ParentStudentBinding.is_active == True,  # noqa: E712
        )
        .all()
    )

    if not bindings:
        return []

    parent_user_ids = [b.parent_user_id for b in bindings]
    parent_by_id: dict[int, User] = {b.parent_user_id: b.parent_user for b in bindings}

    threads = (
        db.query(DiscussionThread)
        .filter(
            DiscussionThread.student_id == student_id,
            DiscussionThread.teacher_user_id == teacher_user_id,
            DiscussionThread.parent_user_id.in_(parent_user_ids),
        )
        .all()
    )
    thread_by_parent: dict[int, DiscussionThread] = {t.parent_user_id: t for t in threads}

    thread_ids = [t.id for t in threads]
    state_by_thread: dict[int, DiscussionParticipantState] = {}
    if thread_ids:
        states = (
            db.query(DiscussionParticipantState)
            .filter(
                DiscussionParticipantState.thread_id.in_(thread_ids),
                DiscussionParticipantState.user_id == teacher_user_id,
            )
            .all()
        )
        state_by_thread = {s.thread_id: s for s in states}

    result = []
    for parent_user_id, parent_user in parent_by_id.items():
        thread = thread_by_parent.get(parent_user_id)
        state = state_by_thread.get(thread.id) if thread else None
        result.append({
            "parent_user": parent_user,
            "thread": thread,
            "unread_count": state.unread_post_count if state else 0,
        })

    _sort_discussion_list(result, sort, user_key="parent_user")
    return result


def _sort_discussion_list(
    items: list[dict],
    sort: str,
    user_key: str,
) -> None:
    """原地排序讨论参与者列表。"""
    _epoch = datetime.fromtimestamp(0, tz=timezone.utc)
    if sort == "display_name_asc":
        items.sort(key=lambda x: x[user_key].display_name)
    else:  # last_post_at_desc（默认）
        items.sort(
            key=lambda x: (x["thread"].last_post_at if x["thread"] else _epoch),
            reverse=True,
        )


# ── Thread 操作 ───────────────────────────────────────────────────────────────

def get_or_create_thread(
    db: Session,
    student_id: int,
    parent_user_id: int,
    teacher_user_id: int,
) -> DiscussionThread:
    """懒创建：若 thread 不存在则创建，否则直接返回。"""
    thread = (
        db.query(DiscussionThread)
        .filter(
            DiscussionThread.student_id == student_id,
            DiscussionThread.parent_user_id == parent_user_id,
            DiscussionThread.teacher_user_id == teacher_user_id,
        )
        .first()
    )
    if thread is None:
        thread = DiscussionThread(
            student_id=student_id,
            parent_user_id=parent_user_id,
            teacher_user_id=teacher_user_id,
        )
        db.add(thread)
        db.flush()
    return thread


def get_thread_by_uuid_for_user(
    db: Session,
    thread_uuid: UUID,
    user_id: int,
) -> DiscussionThread | None:
    """按 uuid 取 thread，同时校验当前用户是参与者（parent 或 teacher）。"""
    return (
        db.query(DiscussionThread)
        .filter(
            DiscussionThread.uuid == thread_uuid,
            or_(
                DiscussionThread.parent_user_id == user_id,
                DiscussionThread.teacher_user_id == user_id,
            ),
        )
        .first()
    )


def mark_thread_read(
    db: Session,
    thread_id: int,
    user_id: int,
) -> DiscussionParticipantState:
    """将当前用户在此 thread 的 unread_post_count 归零，并更新 last_read_at。"""
    now = datetime.now(timezone.utc)
    state = (
        db.query(DiscussionParticipantState)
        .filter(
            DiscussionParticipantState.thread_id == thread_id,
            DiscussionParticipantState.user_id == user_id,
        )
        .first()
    )
    if state is None:
        state = DiscussionParticipantState(
            thread_id=thread_id,
            user_id=user_id,
            unread_post_count=0,
            last_read_at=now,
        )
        db.add(state)
    else:
        state.unread_post_count = 0
        state.last_read_at = now
    db.flush()
    return state


# ── Post 查询 ─────────────────────────────────────────────────────────────────

def list_posts_in_thread(
    db: Session,
    thread_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
    sort: str = "created_at_desc",
    tag_name: str | None = None,
    keyword: str | None = None,
) -> tuple[list[Post], int]:
    """
    分页查询某 thread 内的帖子（包含已删除帖子，由 API 层决定内容替换策略）。
    tag_name: 按 tag 名称精确过滤；keyword: 标题/正文模糊搜索。
    """
    q = (
        db.query(Post)
        .options(
            joinedload(Post.author_user),
            joinedload(Post.post_tags).joinedload(PostTagBinding.tag),
            joinedload(Post.reply_to_post),
        )
        .filter(Post.thread_id == thread_id)
    )

    if tag_name:
        q = (
            q.join(PostTagBinding, PostTagBinding.post_id == Post.id)
            .join(Tag, Tag.id == PostTagBinding.tag_id)
            .filter(Tag.name == tag_name)
        )

    if keyword:
        pattern = f"%{keyword}%"
        q = q.filter(
            or_(Post.title.ilike(pattern), Post.content_markdown.ilike(pattern))
        )

    total = q.count()
    order = Post.created_at.asc() if sort == "created_at_asc" else Post.created_at.desc()
    items = q.order_by(order).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_post_by_uuid(db: Session, post_uuid: UUID) -> Post | None:
    """取单个帖子（含 tags / reply_to_post / author_user / thread）。"""
    return (
        db.query(Post)
        .options(
            joinedload(Post.author_user),
            joinedload(Post.post_tags).joinedload(PostTagBinding.tag),
            joinedload(Post.reply_to_post),
            joinedload(Post.thread),
        )
        .filter(Post.uuid == post_uuid)
        .first()
    )


# ── Tag 辅助 ─────────────────────────────────────────────────────────────────

def get_tags_by_uuids(db: Session, tag_uuids: list[UUID]) -> list[Tag]:
    """
    批量解析 tag UUID 列表，返回对应 active Tag 对象。
    有任一 UUID 无法找到（不存在或 is_active=False）则抛 404。
    """
    if not tag_uuids:
        return []
    tags = (
        db.query(Tag)
        .filter(Tag.uuid.in_(tag_uuids), Tag.is_active == True)  # noqa: E712
        .all()
    )
    if len(tags) != len(tag_uuids):
        raise Errors.not_found("一个或多个 tag 不存在或已停用")
    return tags


# ── Post 写操作 ───────────────────────────────────────────────────────────────

def create_post(
    db: Session,
    thread: DiscussionThread,
    author_user_id: int,
    *,
    title: str | None,
    content_markdown: str,
    tags: list[Tag],
    reply_to_post_id: int | None,
) -> Post:
    """
    创建帖子，同时：
      1. 更新 thread.last_post_at
      2. 将另一个参与者的 unread_post_count + 1（upsert participant state）
    """
    now = datetime.now(timezone.utc)

    post = Post(
        thread_id=thread.id,
        author_user_id=author_user_id,
        title=title,
        content_markdown=content_markdown,
        reply_to_post_id=reply_to_post_id,
    )
    db.add(post)
    db.flush()  # 得到 post.id

    for tag in tags:
        db.add(PostTagBinding(post_id=post.id, tag_id=tag.id))

    # 更新 thread.last_post_at
    thread.last_post_at = now

    # 对方 unread_post_count + 1
    other_user_id = (
        thread.teacher_user_id
        if author_user_id == thread.parent_user_id
        else thread.parent_user_id
    )
    _increment_unread(db, thread.id, other_user_id)

    db.flush()
    return post


def update_post(
    db: Session,
    post: Post,
    *,
    title: str | None = None,
    content_markdown: str | None = None,
    tags: list[Tag] | None = None,
) -> Post:
    """
    更新帖子字段。title/content_markdown 为 None 时不修改。
    tags 非 None 时整体替换现有标签。
    """
    if title is not None:
        post.title = title
    if content_markdown is not None:
        post.content_markdown = content_markdown
    if tags is not None:
        # 删除现有绑定，重新写入
        db.query(PostTagBinding).filter(PostTagBinding.post_id == post.id).delete()
        for tag in tags:
            db.add(PostTagBinding(post_id=post.id, tag_id=tag.id))
    db.flush()
    return post


def soft_delete_post(db: Session, post: Post) -> Post:
    """软删除帖子（is_deleted=True，deleted_at=now）。"""
    now = datetime.now(timezone.utc)
    post.is_deleted = True
    post.deleted_at = now
    db.flush()
    return post


# ── 内部辅助 ─────────────────────────────────────────────────────────────────

def _increment_unread(db: Session, thread_id: int, user_id: int) -> None:
    """为指定用户在指定 thread 的 unread_post_count + 1（upsert）。"""
    state = (
        db.query(DiscussionParticipantState)
        .filter(
            DiscussionParticipantState.thread_id == thread_id,
            DiscussionParticipantState.user_id == user_id,
        )
        .first()
    )
    if state is None:
        state = DiscussionParticipantState(
            thread_id=thread_id,
            user_id=user_id,
            unread_post_count=1,
        )
        db.add(state)
    else:
        state.unread_post_count = (state.unread_post_count or 0) + 1


# ── Tag CRUD（教师私有 tag 管理）──────────────────────────────────────────────

def list_tags_for_teacher(
    db: Session,
    teacher_user_id: int,
    *,
    scope: str = "all",
) -> list[Tag]:
    """
    返回当前教师可见的 tag 列表（is_active=True 且 is_selectable 满足条件）。

    scope:
      "all"             — 系统 tag（is_selectable_by_teacher=True）+ 本人私有 tag
      "system"          — 仅系统 tag（is_selectable_by_teacher=True）
      "teacher_private" — 仅本人私有 tag
    """
    from ac_link.db.orm.enums import TagScope

    q = db.query(Tag).filter(Tag.is_active == True)  # noqa: E712

    if scope == "system":
        q = q.filter(
            Tag.scope == TagScope.SYSTEM,
            Tag.is_selectable_by_teacher == True,  # noqa: E712
        )
    elif scope == "teacher_private":
        q = q.filter(
            Tag.scope == TagScope.TEACHER_PRIVATE,
            Tag.owner_user_id == teacher_user_id,
        )
    else:  # "all"
        q = q.filter(
            or_(
                (Tag.scope == TagScope.SYSTEM) & (Tag.is_selectable_by_teacher == True),  # noqa: E712
                (Tag.scope == TagScope.TEACHER_PRIVATE) & (Tag.owner_user_id == teacher_user_id),
            )
        )

    return q.order_by(Tag.scope, Tag.name).all()


def get_tag_by_uuid(db: Session, tag_uuid: UUID) -> Tag | None:
    """按 uuid 获取 tag，不关心 is_active 状态（调用方自行决策）。"""
    return db.query(Tag).filter(Tag.uuid == tag_uuid).first()


def create_teacher_tag(
    db: Session,
    teacher_user_id: int,
    *,
    name: str,
) -> Tag:
    """
    创建教师私有 tag。
    同名检查：同一 teacher 已有同名（is_active=True）私有 tag 则抛 409。
    """
    from ac_link.db.orm.enums import TagScope

    existing = (
        db.query(Tag)
        .filter(
            Tag.owner_user_id == teacher_user_id,
            Tag.scope == TagScope.TEACHER_PRIVATE,
            Tag.name == name,
            Tag.is_active == True,  # noqa: E712
        )
        .first()
    )
    if existing is not None:
        raise Errors.duplicate_tag_name(name)

    tag = Tag(
        name=name,
        scope=TagScope.TEACHER_PRIVATE,
        owner_user_id=teacher_user_id,
        is_selectable_by_parent=True,
        is_selectable_by_teacher=True,
        affects_business_logic=False,
        is_active=True,
    )
    db.add(tag)
    db.flush()
    return tag


def update_teacher_tag(
    db: Session,
    tag: Tag,
    teacher_user_id: int,
    *,
    name: str,
) -> Tag:
    """
    更新教师私有 tag 名称。
    - 非本人私有 tag（系统 tag 或他人 tag）→ 403
    - 改名后与已有 active 同名私有 tag 冲突 → 409
    """
    from ac_link.db.orm.enums import TagScope

    if tag.scope != TagScope.TEACHER_PRIVATE or tag.owner_user_id != teacher_user_id:
        raise Errors.forbidden("只能修改自己的私有 tag")

    if tag.name != name:
        conflict = (
            db.query(Tag)
            .filter(
                Tag.owner_user_id == teacher_user_id,
                Tag.scope == TagScope.TEACHER_PRIVATE,
                Tag.name == name,
                Tag.is_active == True,  # noqa: E712
                Tag.id != tag.id,
            )
            .first()
        )
        if conflict is not None:
            raise Errors.duplicate_tag_name(name)
        tag.name = name

    db.flush()
    return tag


def soft_delete_teacher_tag(
    db: Session,
    tag: Tag,
    teacher_user_id: int,
) -> None:
    """
    软删除教师私有 tag（is_active=False）。
    - 系统 tag 或他人私有 tag → 403
    """
    from ac_link.db.orm.enums import TagScope

    if tag.scope != TagScope.TEACHER_PRIVATE or tag.owner_user_id != teacher_user_id:
        raise Errors.forbidden("只能删除自己的私有 tag")

    tag.is_active = False
    db.flush()
