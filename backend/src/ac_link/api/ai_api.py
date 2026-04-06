"""
AI 会话接口：/api/ai/*

包含：
  GET    /api/ai/conversations                                    §12.3
  POST   /api/ai/conversations                                    §12.4
  GET    /api/ai/conversations/{conversation_uuid}                 §12.5
  POST   /api/ai/conversations/{conversation_uuid}/messages        §12.6
  POST   /api/ai/conversations/{conversation_uuid}/archive         §12.7
  POST   /api/ai/conversations/{conversation_uuid}/unarchive       §12.8
  DELETE /api/ai/conversations/{conversation_uuid}                 §12.9
"""

from __future__ import annotations

import logging
import math
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user
from ac_link.common.exceptions import AppError, Errors
from ac_link.crud import ai as ai_crud
from ac_link.db.db import get_db
from ac_link.db.orm.enums import AiConversationContextType, AiMessageRole, UserRole
from ac_link.db.orm.user import User, UserSettings
from ac_link.dto.admin import PaginatedResponse, PaginationMeta
from ac_link.dto.auth import ApiResponse, SuccessResponse
from ac_link.services.translation_helpers import get_target_language

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])


# ── DTO ───────────────────────────────────────────────────────────────────────

class ConversationListItem(BaseModel):
    uuid: UUID
    title: str | None = None
    context_type: str
    student_uuid: UUID | None = None
    subject_uuid: UUID | None = None
    is_archived: bool
    last_message_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class MessageItem(BaseModel):
    uuid: UUID
    role: str
    preset: str | None = None
    content_markdown: str
    created_at: datetime


class ConversationDetail(BaseModel):
    uuid: UUID
    title: str | None = None
    context_type: str
    student_uuid: UUID | None = None
    subject_uuid: UUID | None = None
    is_archived: bool
    last_message_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageItem]


class ConversationCreateRequest(BaseModel):
    context_type: str
    student_uuid: UUID | None = None
    subject_uuid: UUID | None = None
    title: str | None = None


class SendMessageRequest(BaseModel):
    message: str
    preset: str = "default"


class SendMessageResponse(BaseModel):
    conversation_uuid: UUID
    user_message: MessageItem
    assistant_message: MessageItem


# ── 辅助 ──────────────────────────────────────────────────────────────────────

_VALID_CONTEXT_TYPES = frozenset({"global", "student", "subject"})
_VALID_PRESETS = frozenset({"default", "summary", "parent_friendly"})
_VALID_SORTS = frozenset({"updated_at_desc", "updated_at_asc"})


def _conv_to_list_item(conv: object) -> ConversationListItem:
    from ac_link.db.orm.ai import AiConversation as ConvORM
    c: ConvORM = conv  # type: ignore[assignment]
    return ConversationListItem(
        uuid=c.uuid,
        title=c.title,
        context_type=str(c.context_type),
        student_uuid=c.student.uuid if c.student else None,
        subject_uuid=c.subject.uuid if c.subject else None,
        is_archived=c.is_archived,
        last_message_at=c.last_message_at,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


def _msg_to_item(msg: object) -> MessageItem:
    from ac_link.db.orm.ai import AiMessage as MsgORM
    m: MsgORM = msg  # type: ignore[assignment]
    return MessageItem(
        uuid=m.uuid,
        role=str(m.role),
        preset=m.preset,
        content_markdown=m.content_markdown,
        created_at=m.created_at,
    )


def _build_context_info(
    db: Session,
    conv: object,
) -> str | None:
    """根据会话上下文类型组装上下文信息文本。"""
    from ac_link.db.orm.ai import AiConversation as ConvORM
    c: ConvORM = conv  # type: ignore[assignment]

    if c.context_type == AiConversationContextType.GLOBAL:
        return None

    parts: list[str] = []
    if c.student:
        parts.append(f"学生姓名: {c.student.full_name}")
        if c.student.sid:
            parts.append(f"学号: {c.student.sid}")
        cls = getattr(c.student, 'class_obj', None)
        if cls:
            parts.append(f"班级: {cls.name}")

    if c.subject:
        parts.append(f"学科: {c.subject.name}")

    return "\n".join(parts) if parts else None


# ── GET /api/ai/conversations ─────────────────────────────────────────────────

@router.get(
    "/conversations",
    response_model=PaginatedResponse[ConversationListItem],
)
def list_conversations(
    page: int = 1,
    page_size: int = 20,
    archived: bool = False,
    context_type: str | None = None,
    student_uuid: str | None = None,
    subject_uuid: str | None = None,
    sort: str = "updated_at_desc",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ConversationListItem]:
    """获取 AI 会话列表（§12.3）。"""
    if sort not in _VALID_SORTS:
        raise AppError(400, "invalid_sort", f"sort 必须为 {_VALID_SORTS}")

    page_size = min(page_size, 100)

    ct: AiConversationContextType | None = None
    if context_type is not None:
        if context_type not in _VALID_CONTEXT_TYPES:
            raise AppError(400, "invalid_filter", f"context_type 必须为 {_VALID_CONTEXT_TYPES}")
        ct = AiConversationContextType(context_type)

    # 解析 student_uuid → student_id
    student_id: int | None = None
    if student_uuid is not None:
        from ac_link.db.orm.academic import Student
        try:
            s_uuid = UUID(student_uuid)
        except ValueError:
            raise AppError(400, "invalid_filter", "student_uuid 格式无效")
        stu = db.query(Student).filter(Student.uuid == s_uuid).first()
        if stu is None:
            raise Errors.not_found("学生不存在")
        student_id = stu.id

    # 解析 subject_uuid → subject_id
    subject_id: int | None = None
    if subject_uuid is not None:
        from ac_link.db.orm.academic import Subject
        try:
            sj_uuid = UUID(subject_uuid)
        except ValueError:
            raise AppError(400, "invalid_filter", "subject_uuid 格式无效")
        subj = db.query(Subject).filter(Subject.uuid == sj_uuid).first()
        if subj is None:
            raise Errors.not_found("学科不存在")
        subject_id = subj.id

    items, total = ai_crud.list_conversations(
        db, current_user.id,
        page=page, page_size=page_size,
        archived=archived, context_type=ct,
        student_id=student_id, subject_id=subject_id,
        sort=sort,
    )

    return PaginatedResponse(
        data=[_conv_to_list_item(c) for c in items],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=math.ceil(total / page_size) if page_size > 0 else 0,
        ),
    )


# ── POST /api/ai/conversations ────────────────────────────────────────────────

@router.post(
    "/conversations",
    response_model=ApiResponse[ConversationListItem],
    status_code=201,
)
def create_conversation(
    body: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[ConversationListItem]:
    """创建 AI 会话（§12.4）。"""
    if body.context_type not in _VALID_CONTEXT_TYPES:
        raise AppError(400, "invalid_context_type", f"context_type 必须为 {_VALID_CONTEXT_TYPES}")

    ct = AiConversationContextType(body.context_type)
    student_id: int | None = None
    subject_id: int | None = None

    if ct == AiConversationContextType.GLOBAL:
        if body.student_uuid is not None or body.subject_uuid is not None:
            raise AppError(422, "validation_error",
                           "context_type=global 时 student_uuid 和 subject_uuid 必须为 null")
    elif ct == AiConversationContextType.STUDENT:
        if body.student_uuid is None:
            raise AppError(422, "validation_error",
                           "context_type=student 时 student_uuid 必填")
        if body.subject_uuid is not None:
            raise AppError(422, "validation_error",
                           "context_type=student 时 subject_uuid 必须为 null")
        student_id = _resolve_student(db, current_user, body.student_uuid)
    else:  # subject
        if body.student_uuid is None or body.subject_uuid is None:
            raise AppError(422, "validation_error",
                           "context_type=subject 时 student_uuid 和 subject_uuid 必须同时提供")
        student_id = _resolve_student(db, current_user, body.student_uuid)
        subject_id = _resolve_subject(db, current_user, body.subject_uuid, student_id)

    conv = ai_crud.create_conversation(
        db, current_user.id, ct,
        student_id=student_id,
        subject_id=subject_id,
        title=body.title,
    )
    db.commit()
    db.refresh(conv)

    return ApiResponse(data=_conv_to_list_item(conv))


def _resolve_student(db: Session, user: User, student_uuid: UUID) -> int:
    """解析并校验 student_uuid → student_id，根据角色做权限检查。"""
    from ac_link.db.orm.academic import Student, ParentStudentBinding, TeachingAssignment
    stu = db.query(Student).filter(Student.uuid == student_uuid, Student.is_active == True).first()  # noqa: E712
    if stu is None:
        raise Errors.not_found("学生不存在")

    if user.role == UserRole.TEACHER:
        has_access = db.query(
            db.query(TeachingAssignment).filter(
                TeachingAssignment.teacher_user_id == user.id,
                TeachingAssignment.student_id == stu.id,
                TeachingAssignment.is_active == True,  # noqa: E712
            ).exists()
        ).scalar()
        if not has_access:
            raise Errors.forbidden("无权访问该学生")
    elif user.role == UserRole.PARENT:
        has_access = db.query(
            db.query(ParentStudentBinding).filter(
                ParentStudentBinding.parent_user_id == user.id,
                ParentStudentBinding.student_id == stu.id,
                ParentStudentBinding.is_active == True,  # noqa: E712
            ).exists()
        ).scalar()
        if not has_access:
            raise Errors.forbidden("无权访问该学生")

    return stu.id


def _resolve_subject(db: Session, user: User, subject_uuid: UUID, student_id: int) -> int:
    """解析并校验 subject_uuid → subject_id。"""
    from ac_link.db.orm.academic import Subject, TeachingAssignment, ParentStudentBinding
    subj = db.query(Subject).filter(Subject.uuid == subject_uuid, Subject.is_active == True).first()  # noqa: E712
    if subj is None:
        raise Errors.not_found("学科不存在")

    if user.role == UserRole.TEACHER:
        from ac_link.crud import teacher as teacher_crud
        if not teacher_crud.verify_teaching_assignment(db, user.id, student_id, subj.id):
            raise Errors.forbidden("当前教师未被分配该学生的此学科")

    return subj.id


# ── GET /api/ai/conversations/{conversation_uuid} ────────────────────────────

@router.get(
    "/conversations/{conversation_uuid}",
    response_model=ApiResponse[ConversationDetail],
)
def get_conversation_detail(
    conversation_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[ConversationDetail]:
    """获取 AI 会话详情（§12.5），含消息列表。"""
    conv = ai_crud.get_conversation_by_uuid(db, conversation_uuid)
    if conv is None or conv.user_id != current_user.id:
        raise Errors.not_found("会话不存在")

    # 过滤已删除的消息
    visible_messages = [m for m in conv.messages if m.deleted_at is None]
    visible_messages.sort(key=lambda m: m.created_at)

    return ApiResponse(data=ConversationDetail(
        uuid=conv.uuid,
        title=conv.title,
        context_type=str(conv.context_type),
        student_uuid=conv.student.uuid if conv.student else None,
        subject_uuid=conv.subject.uuid if conv.subject else None,
        is_archived=conv.is_archived,
        last_message_at=conv.last_message_at,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[_msg_to_item(m) for m in visible_messages],
    ))


# ── POST /api/ai/conversations/{conversation_uuid}/messages ──────────────────

@router.post(
    "/conversations/{conversation_uuid}/messages",
    response_model=ApiResponse[SendMessageResponse],
    status_code=201,
)
def send_message(
    conversation_uuid: UUID,
    body: SendMessageRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SendMessageResponse]:
    """
    发送 AI 消息（§12.6）。

    前端只传用户输入与 preset，后端负责 prompt 组织、上下文查询、系统 prompt 拼接。
    当前 v1 采用 JSON 同步返回，不采用流式输出。
    """
    if body.preset not in _VALID_PRESETS:
        raise AppError(400, "unsupported_preset", f"preset 必须为 {_VALID_PRESETS}")

    conv = ai_crud.get_conversation_by_uuid(db, conversation_uuid)
    if conv is None or conv.user_id != current_user.id:
        raise Errors.not_found("会话不存在")

    if conv.is_archived:
        raise Errors.conversation_archived()

    # 保存用户消息
    user_msg = ai_crud.create_message(
        db, conv.id, AiMessageRole.USER, body.message,
        preset=body.preset,
    )

    # 获取最近对话历史（最近6轮 = 12条）
    recent_msgs = ai_crud.get_recent_messages(db, conv.id, limit=12)
    history: list[dict[str, str]] = []
    for m in recent_msgs:
        if m.role in (AiMessageRole.USER, AiMessageRole.ASSISTANT):
            history.append({"role": str(m.role), "content": m.content_markdown})

    # 确定输出语言
    _settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id
    ).first()
    language = get_target_language(
        _settings.language if _settings else None,
        request.headers.get("accept-language"),
    )

    # 组装上下文信息
    context_info = _build_context_info(db, conv)

    # 获取用户 ai_chat_style
    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id
    ).first()
    ai_chat_style = user_settings.ai_chat_style if user_settings else None

    # 调用 OpenAI
    try:
        from ac_link.services.openai_service import ai_chat
        assistant_content = ai_chat(
            history,
            role=str(current_user.role),
            language=language,
            preset=body.preset,
            context_info=context_info,
            ai_chat_style=ai_chat_style,
        )
    except Exception:
        logger.exception("AI 对话失败: conv=%s", conversation_uuid)
        raise Errors.ai_chat_failed()

    # 保存 assistant 消息
    assistant_msg = ai_crud.create_message(
        db, conv.id, AiMessageRole.ASSISTANT, assistant_content,
    )

    # 更新会话 last_message_at
    from datetime import datetime, timezone
    conv.last_message_at = datetime.now(timezone.utc)
    db.flush()

    db.commit()

    return ApiResponse(data=SendMessageResponse(
        conversation_uuid=conv.uuid,
        user_message=_msg_to_item(user_msg),
        assistant_message=_msg_to_item(assistant_msg),
    ))


# ── POST /api/ai/conversations/{conversation_uuid}/archive ───────────────────

@router.post(
    "/conversations/{conversation_uuid}/archive",
    response_model=ApiResponse[SuccessResponse],
)
def archive_conversation(
    conversation_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """归档 AI 会话（§12.7）。"""
    conv = ai_crud.get_conversation_by_uuid(db, conversation_uuid)
    if conv is None or conv.user_id != current_user.id:
        raise Errors.not_found("会话不存在")

    if conv.is_archived:
        raise AppError(409, "already_archived", "会话已归档")

    ai_crud.archive_conversation(db, conv)
    db.commit()
    return ApiResponse(data=SuccessResponse())


# ── POST /api/ai/conversations/{conversation_uuid}/unarchive ─────────────────

@router.post(
    "/conversations/{conversation_uuid}/unarchive",
    response_model=ApiResponse[SuccessResponse],
)
def unarchive_conversation(
    conversation_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """取消归档 AI 会话（§12.8）。"""
    conv = ai_crud.get_conversation_by_uuid(db, conversation_uuid)
    if conv is None or conv.user_id != current_user.id:
        raise Errors.not_found("会话不存在")

    ai_crud.unarchive_conversation(db, conv)
    db.commit()
    return ApiResponse(data=SuccessResponse())


# ── DELETE /api/ai/conversations/{conversation_uuid} ─────────────────────────

@router.delete(
    "/conversations/{conversation_uuid}",
    response_model=ApiResponse[SuccessResponse],
)
def delete_conversation(
    conversation_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """删除 AI 会话（§12.9），采用软删除。"""
    conv = ai_crud.get_conversation_by_uuid(db, conversation_uuid)
    if conv is None or conv.user_id != current_user.id:
        raise Errors.not_found("会话不存在")

    ai_crud.soft_delete_conversation(db, conv)
    db.commit()
    return ApiResponse(data=SuccessResponse())
