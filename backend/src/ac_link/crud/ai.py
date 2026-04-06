"""
AI 会话 CRUD 层。

职责：ai_conversations / ai_messages 表的读写操作。

公开函数：
  list_conversations       — 分页获取用户的 AI 会话列表
  get_conversation_by_uuid — 通过 uuid 取会话（含消息预加载）
  create_conversation      — 创建会话
  archive_conversation     — 归档
  unarchive_conversation   — 取消归档
  soft_delete_conversation — 软删除
  create_message           — 写入一条消息
  get_recent_messages      — 获取最近 N 轮对话
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ac_link.db.orm.ai import AiConversation, AiMessage
from ac_link.db.orm.enums import AiConversationContextType, AiMessageRole


def list_conversations(
    db: Session,
    user_id: int,
    *,
    page: int = 1,
    page_size: int = 20,
    archived: bool = False,
    context_type: AiConversationContextType | None = None,
    student_id: int | None = None,
    subject_id: int | None = None,
    sort: str = "updated_at_desc",
) -> tuple[list[AiConversation], int]:
    """分页获取用户的 AI 会话列表。"""
    q = db.query(AiConversation).filter(
        AiConversation.user_id == user_id,
        AiConversation.is_archived == archived,
        AiConversation.deleted_at.is_(None),
    )
    if context_type is not None:
        q = q.filter(AiConversation.context_type == context_type)
    if student_id is not None:
        q = q.filter(AiConversation.student_id == student_id)
    if subject_id is not None:
        q = q.filter(AiConversation.subject_id == subject_id)

    total = q.with_entities(func.count(AiConversation.id)).scalar() or 0

    if sort == "updated_at_asc":
        q = q.order_by(AiConversation.updated_at.asc())
    else:
        q = q.order_by(AiConversation.updated_at.desc())

    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_conversation_by_uuid(
    db: Session,
    conversation_uuid: UUID,
) -> AiConversation | None:
    """通过 uuid 取会话，预加载消息（排除已删除的）。"""
    conv = (
        db.query(AiConversation)
        .options(joinedload(AiConversation.messages))
        .filter(
            AiConversation.uuid == conversation_uuid,
            AiConversation.deleted_at.is_(None),
        )
        .first()
    )
    return conv


def create_conversation(
    db: Session,
    user_id: int,
    context_type: AiConversationContextType,
    *,
    student_id: int | None = None,
    subject_id: int | None = None,
    title: str | None = None,
) -> AiConversation:
    """创建 AI 会话。"""
    conv = AiConversation(
        user_id=user_id,
        context_type=context_type,
        student_id=student_id,
        subject_id=subject_id,
        title=title,
    )
    db.add(conv)
    db.flush()
    return conv


def archive_conversation(db: Session, conv: AiConversation) -> None:
    """归档会话。"""
    now = datetime.now(timezone.utc)
    conv.is_archived = True
    conv.archived_at = now
    db.flush()


def unarchive_conversation(db: Session, conv: AiConversation) -> None:
    """取消归档。"""
    conv.is_archived = False
    conv.archived_at = None
    db.flush()


def soft_delete_conversation(db: Session, conv: AiConversation) -> None:
    """软删除会话。"""
    conv.deleted_at = datetime.now(timezone.utc)
    db.flush()


def create_message(
    db: Session,
    conversation_id: int,
    role: AiMessageRole,
    content_markdown: str,
    *,
    preset: str | None = None,
) -> AiMessage:
    """写入一条消息。"""
    now = datetime.now(timezone.utc)
    msg = AiMessage(
        conversation_id=conversation_id,
        role=role,
        preset=preset,
        content_markdown=content_markdown,
        created_at=now,
    )
    db.add(msg)
    db.flush()
    return msg


def get_recent_messages(
    db: Session,
    conversation_id: int,
    *,
    limit: int = 12,
) -> list[AiMessage]:
    """获取最近 limit 条消息（不含已删除），按 created_at ASC 返回。"""
    msgs = (
        db.query(AiMessage)
        .filter(
            AiMessage.conversation_id == conversation_id,
            AiMessage.deleted_at.is_(None),
        )
        .order_by(AiMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(msgs))
