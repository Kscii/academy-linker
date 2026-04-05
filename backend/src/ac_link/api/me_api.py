"""
当前用户账户路由：/api/me/*

包含：
  GET    /api/me                         - 获取当前用户信息
  PATCH  /api/me                         - 更新当前用户资料
  POST   /api/me/change_password         - 修改密码
  GET    /api/me/sessions                - 获取当前登录会话列表
  DELETE /api/me/sessions/{session_uuid} - 删除指定会话

后续开发注意：
  - /api/settings 建议单独放在 settings_api.py，不放此文件
  - 如需 email 修改功能，需增加验证码或确认邮件流程，不要直接允许修改
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user
from ac_link.common.exceptions import Errors
from ac_link.crud import session as session_crud
from ac_link.crud import user as user_crud
from ac_link.db.db import get_db
from ac_link.db.orm.user import User
from ac_link.dto.auth import (
    ApiResponse,
    ChangePasswordRequest,
    MeResponse,
    SessionItem,
    SuccessResponse,
    UpdateMeRequest,
    UserOut,
)
from ac_link.services import auth_service

router = APIRouter(prefix="/api/me", tags=["me"])


# ── GET /api/me ───────────────────────────────────────────────────────────────

@router.get("", response_model=ApiResponse[MeResponse])
def get_me(current_user: User = Depends(get_current_user)) -> ApiResponse[MeResponse]:
    """
    获取当前已登录用户的完整资料（含 phone_number）。
    登录响应中的 user 字段不含 phone_number，此接口补全。
    """
    return ApiResponse(data=MeResponse(user=UserOut.model_validate(current_user)))


# ── PATCH /api/me ─────────────────────────────────────────────────────────────

@router.patch("", response_model=ApiResponse[MeResponse])
def update_me(
    body: UpdateMeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[MeResponse]:
    """
    更新当前用户资料（display_name / phone_number / avatar_url）。

    仅允许修改本文件中定义的字段，email 和 role 不在此开放。
    传 null 表示清空可选字段（如清除头像）。
    如果不想修改某字段，直接不传即可（而不是传 null）。

    注意：此处使用 model_dump(exclude_unset=True) 只更新用户明确传入的字段，
    避免将未传入的字段误置为 None。
    """
    updates = body.model_dump(exclude_unset=True)
    updated_user = user_crud.update(db, current_user, **updates)
    db.commit()
    db.refresh(updated_user)

    return ApiResponse(data=MeResponse(user=UserOut.model_validate(updated_user)))


# ── POST /api/me/change_password ──────────────────────────────────────────────

@router.post("/change_password", response_model=ApiResponse[SuccessResponse])
def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """
    修改密码。

    安全要点：
      - 必须提供当前正确密码才能修改（防止 session 被盗用时任意改密）
      - 修改密码后不自动撤销其他设备的会话（当前 v1 约定）
        如需"改密码即踢出所有其他设备"，在此调用 auth_service.logout_all
        再重建当前设备会话
    """
    if not auth_service.verify_password(body.current_password, current_user.password_hash):
        raise Errors.unauthenticated("当前密码错误")

    new_hash = auth_service.hash_password(body.new_password)
    user_crud.update(db, current_user, password_hash=new_hash)
    db.commit()

    return ApiResponse(data=SuccessResponse())


# ── GET /api/me/sessions ──────────────────────────────────────────────────────

@router.get("/sessions", response_model=ApiResponse[list[SessionItem]])
def list_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[list[SessionItem]]:
    """
    获取当前用户所有活跃会话。

    is_current 的判断逻辑：
      从本次请求的 access_token 中解析 session_uuid，
      与列表中每个 session.uuid 比对。
      注意：这里不验证 AT 有效性（已在 get_current_user 中验证），
      只是从 payload 中取 session_uuid 字段。
    """
    # 从 access_token payload 中取当前会话的 uuid
    current_session_uuid: UUID | None = None
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = auth_service.decode_access_token(token)
            raw = payload.get("session_uuid")
            if raw:
                current_session_uuid = UUID(raw)
        except Exception:
            pass  # AT 已在依赖中验证，此处理论上不会失败，保险起见容忍

    sessions = session_crud.get_all_active_by_user_id(db, current_user.id)

    items = [
        SessionItem(
            **{
                "uuid": s.uuid,
                "device_label": s.device_label,
                "ip_address": s.ip_address,
                "user_agent": s.user_agent,
                "created_at": s.created_at,
                "last_used_at": s.last_used_at,
                "is_current": (s.uuid == current_session_uuid),
            }
        )
        for s in sessions
    ]

    return ApiResponse(data=items)


# ── DELETE /api/me/sessions/{session_uuid} ────────────────────────────────────

@router.delete("/sessions/{session_uuid}", response_model=ApiResponse[SuccessResponse])
def delete_session(
    session_uuid: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """
    删除指定会话（踢出某设备）。

    权限规则：
      - 只能删除自己的会话（user_id 归属校验在下方）
      - 404 表示会话不存在或已过期
      - 403 表示会话存在但不属于当前用户
    """
    session = session_crud.get_active_by_uuid(db, session_uuid)
    if session is None:
        raise Errors.not_found("会话不存在或已过期")

    # 确保不能删除其他用户的会话
    if session.user_id != current_user.id:
        raise Errors.forbidden("无权删除此会话")

    auth_service.logout(db, session)

    return ApiResponse(data=SuccessResponse())
