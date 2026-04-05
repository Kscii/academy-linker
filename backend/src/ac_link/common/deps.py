"""
FastAPI 依赖注入模块。

提供以下公共依赖：
  - get_db          → 数据库 Session
  - get_current_user → 从 access_token Cookie 解码并返回当前用户

关键设计说明：
  get_current_user 不查 DB 验证 session 有效性（无状态验证），
  只凭 JWT 签名 + 过期时间判断。
  这意味着：
    - logout 后旧 AT 最多仍可存活 15 分钟（已在 API 文档中约定）
    - 好处：每次请求无额外 DB 往返，性能更好
    - 未来如需即时撤销，在此函数中添加 session_crud.get_active_by_uuid 查询

后续开发注意：
  - 如果需要限制特定角色访问，建议新增以下依赖：
      require_teacher = Depends(get_current_user) + 角色检查
      require_admin   = Depends(get_current_user) + 角色检查
    具体实现可参考 api/auth_api.py 中的模式，统一放在本文件
"""

from __future__ import annotations

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from ac_link.common.exceptions import Errors
from ac_link.crud import user as user_crud
from ac_link.db.db import get_db
from ac_link.db.orm.user import User
from ac_link.services import auth_service


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    从 HttpOnly Cookie 读取 access_token，解码 JWT，返回当前用户 ORM 对象。

    错误处理：
      - Cookie 缺失       → 401 unauthenticated
      - token 过期        → 401 access_token_expired（前端应触发 refresh）
      - token 签名无效    → 401 invalid_token
      - JWT sub 对应用户不存在（账号被删）→ 401 unauthenticated
      - 账户已被禁用      → 401 unauthenticated

    注意：此处通过 uuid 查数据库确认用户存在，是必要的：
    即使 JWT 有效，也需要确保账户没有被管理员删除或禁用。
    session 有效性不检查（无状态设计）。
    """
    token = request.cookies.get("access_token")
    if not token:
        raise Errors.unauthenticated()

    payload = auth_service.decode_access_token(token)

    user_uuid = payload.get("sub")
    if not user_uuid:
        raise Errors.invalid_token()

    from uuid import UUID
    user = user_crud.get_by_uuid(db, UUID(user_uuid))
    if user is None:
        raise Errors.unauthenticated("用户不存在")

    if not user.is_active:
        raise Errors.unauthenticated("账户已被禁用")

    return user
