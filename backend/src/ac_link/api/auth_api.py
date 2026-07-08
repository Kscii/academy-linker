"""
认证相关路由：/api/auth/*

包含：
  POST /api/auth/login        - 登录，种 AT + RT Cookie
  POST /api/auth/refresh      - 用 RT 换发新 AT
  POST /api/auth/logout       - 登出当前设备
  POST /api/auth/logout_all   - 登出所有设备

Cookie 配置说明（见 API 文档 §6）：
  access_token:
    Path=/，所有接口都会自动携带
    HttpOnly=True，前端 JS 无法读取
    SameSite=Lax，防 CSRF
    Secure=True（生产环境），本地开发通过 settings.debug 控制

  refresh_token:
    Path=/api/auth/refresh，只在 refresh 接口自动携带，减少暴露面
    其余同 access_token

后续开发注意：
  - login 接口豁免了 Origin 校验（见 run.py 中间件），因为登录时没有有效 Cookie，
    不存在 CSRF 风险；但登录本身仍应考虑 rate limiting 防暴力破解
  - refresh 接口仍需校验 Origin（写操作）
  - 如需为不同环境（staging/prod）配置不同的 Cookie domain，
    可在 settings 中新增 cookie_domain 字段
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user
from ac_link.common.exceptions import Errors
from ac_link.config.config import settings
from ac_link.crud import session as session_crud
from ac_link.db.db import get_db
from ac_link.db.orm.user import User
from ac_link.dto.auth import ApiResponse, LoginRequest, LoginResponse, SuccessResponse
from ac_link.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_access_token_cookie(response: Response, token: str) -> None:
    """设置 access_token Cookie。抽取为函数方便 refresh 接口复用。"""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=not settings.debug,  # 本地开发 HTTP 时 secure=False
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )


def _set_refresh_token_cookie(response: Response, token: str, max_age_seconds: int) -> None:
    """
    设置 refresh_token Cookie。
    Path 限制为 /api/auth/refresh，减少 RT 暴露面。
    """
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=not settings.debug,
        path="/api/auth/refresh",
        max_age=max_age_seconds,
    )


def _clear_auth_cookies(response: Response) -> None:
    """清除登录相关的所有 Cookie（logout 时调用）。"""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")


# ── POST /api/auth/login ─────────────────────────────────────────────────────

@router.post("/login", response_model=ApiResponse[LoginResponse])
def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> ApiResponse[LoginResponse]:
    """
    用户登录。

    成功后：
      1. 种 access_token Cookie（15 分钟）
      2. 种 refresh_token Cookie（3 天或 7 天，取决于 remember_me）
      3. 返回用户基本信息

    注意：此接口在 run.py 中被豁免 Origin 校验，无需显式处理。
    """
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user, session, access_token, refresh_token = auth_service.login(
        db,
        email=str(body.email),
        password=body.password,
        remember_me=body.remember_me,
        ip_address=ip,
        user_agent=user_agent,
    )

    _set_access_token_cookie(response, access_token)

    # RT 过期时间（秒）与 DB 中 expires_at 保持一致
    expire_days = (
        settings.refresh_token_remember_me_expire_days
        if body.remember_me
        else settings.refresh_token_expire_days
    )
    _set_refresh_token_cookie(response, refresh_token, max_age_seconds=expire_days * 86400)

    return ApiResponse(data=LoginResponse(user=user))  # type: ignore[arg-type]


# ── POST /api/auth/refresh ───────────────────────────────────────────────────

@router.post("/refresh", response_model=ApiResponse[SuccessResponse])
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """
    用 refresh_token Cookie 换发新的 access_token。

    前端触发时机：收到 401 access_token_expired 后调用此接口，然后重试原请求。
    此接口需要 Origin 校验（写操作），由 run.py 中间件处理。
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise Errors.invalid_token("refresh_token Cookie 缺失")

    _user, _session, new_access_token = auth_service.refresh_access_token(db, refresh_token)

    _set_access_token_cookie(response, new_access_token)

    return ApiResponse(data=SuccessResponse())


# ── POST /api/auth/logout ────────────────────────────────────────────────────

@router.post("/logout", response_model=ApiResponse[SuccessResponse])
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """
    登出当前设备。

    流程：
      1. 从 access_token payload 取 session_uuid，查 DB 撤销会话
      2. 清除客户端 Cookie

    幂等性：即使 session 已过期或不存在，依然清除 Cookie 并返回成功。
    """
    from uuid import UUID
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = auth_service.decode_access_token(token)
            raw = payload.get("session_uuid")
            if raw:
                session = session_crud.get_active_by_uuid(db, UUID(raw))
                if session:
                    auth_service.logout(db, session)
        except Exception:
            pass

    _clear_auth_cookies(response)
    return ApiResponse(data=SuccessResponse())


# ── POST /api/auth/logout_all ─────────────────────────────────────────────────

@router.post("/logout_all", response_model=ApiResponse[SuccessResponse])
def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SuccessResponse]:
    """
    登出所有设备：撤销该用户的全部活跃会话。
    旧 access token 不会即时失效，最多保留各自的剩余 15 分钟。
    """
    auth_service.logout_all(db, current_user.id)
    _clear_auth_cookies(response)
    return ApiResponse(data=SuccessResponse())
