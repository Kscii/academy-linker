"""
认证业务逻辑层。

分层职责：
  - 本层（service）：业务规则、token 生成/验证、密码哈希
  - crud 层：纯数据库读写
  - api 层：HTTP 请求解析、Cookie 写入、响应序列化

token 安全约定：
  - Access Token（JWT）：无状态，不查 DB，仅凭签名和过期时间判断有效性
    → 当前版本不做即时撤销，logout 后旧 AT 最多再存活 15 分钟
    → 未来若需即时撤销，需在 deps.get_current_user 中添加会话 DB 查询
  - Refresh Token：有状态，存储 SHA-256 哈希到 DB，每次使用时查 DB 验证

后续开发注意：
  - 如需 RT Rotation（每次 refresh 都换发新 RT），在 refresh_access_token 中
    先 revoke 旧 session，再 create 新 session
  - 如需限流（防暴力破解），在 login() 入口处集成 rate limiter（如 slowapi）
  - 密码哈希方案若升级（如从 bcrypt 换到 argon2），需同步更新 CryptContext
"""

from __future__ import annotations

import secrets
from datetime import timedelta

import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ac_link.common.exceptions import Errors
from ac_link.config.config import settings
from ac_link.crud import session as session_crud
from ac_link.crud import user as user_crud
from ac_link.db.orm.mixins import utc_now
from ac_link.db.orm.user import User, UserSession

# passlib CryptContext：使用 bcrypt 作为哈希算法
# deprecated="auto" 表示将来升级算法时可自动识别并重新哈希旧密码
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── 密码工具 ──────────────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    """验证明文密码与哈希值是否匹配。"""
    return _pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    """对明文密码进行 bcrypt 哈希，返回哈希字符串。"""
    return _pwd_context.hash(plain)


# ── JWT 工具 ──────────────────────────────────────────────────────────────────

def _create_access_token(user: User, session: UserSession) -> str:
    """
    生成 Access Token（JWT）。

    Claims 说明：
      sub          - 用户 uuid（字符串形式），对外唯一标识
      role         - 用户角色，避免频繁 DB 查询角色判断
      session_uuid - 关联的会话 uuid，用于 /api/me/sessions 的 is_current 标记
                     注意：鉴权中间件不凭 session_uuid 查 DB，仅用于展示
      exp / iat    - JWT 标准字段，由 pyjwt 自动处理
    """
    now = utc_now()
    expire = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user.uuid),
        "role": str(user.role),
        "session_uuid": str(session.uuid),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """
    解码并验证 Access Token。

    - ExpiredSignatureError → 返回 401 access_token_expired（前端应触发 refresh）
    - 其他 JWT 错误         → 返回 401 invalid_token

    后续若需要支持 RS256（非对称签名），把 jwt_secret_key 换成公钥即可。
    """
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise Errors.access_token_expired()
    except jwt.PyJWTError:
        raise Errors.invalid_token()


# ── 核心业务 ──────────────────────────────────────────────────────────────────

def login(
    db: Session,
    email: str,
    password: str,
    remember_me: bool,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, UserSession, str, str]:
    """
    登录验证并创建会话。

    返回值：(user, session, access_token_jwt, refresh_token_plain)
      - access_token_jwt 由 api 层写入 Cookie
      - refresh_token_plain 由 api 层写入 Cookie（明文），不存 DB

    安全要点：
      - 邮箱不存在和密码错误统一返回相同错误，防止用户枚举攻击
      - 禁用账户（is_active=False）也返回相同 unauthenticated 错误
    """
    user = user_crud.get_by_email(db, email)

    # 统一错误：不区分"用户不存在"和"密码错误"，防止用户名枚举
    if user is None or not verify_password(password, user.password_hash):
        raise Errors.unauthenticated("邮箱或密码错误")

    if not user.is_active:
        raise Errors.unauthenticated("账户已被禁用，请联系管理员")

    # 根据 remember_me 选择 RT 有效期
    expire_days = (
        settings.refresh_token_remember_me_expire_days
        if remember_me
        else settings.refresh_token_expire_days
    )
    expires_at = utc_now() + timedelta(days=expire_days)

    # 生成加密随机 refresh token（明文），只在此处存在，不写 DB
    refresh_token_plain = secrets.token_urlsafe(32)

    session = session_crud.create(
        db,
        user_id=user.id,
        refresh_token_plain=refresh_token_plain,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    # 更新最后登录时间
    user_crud.update(db, user, last_login_at=utc_now())

    access_token = _create_access_token(user, session)

    db.commit()
    db.refresh(user)
    db.refresh(session)

    return user, session, access_token, refresh_token_plain


def refresh_access_token(
    db: Session,
    refresh_token_plain: str,
) -> tuple[User, UserSession, str]:
    """
    使用 refresh token 换发新的 access token。

    当前策略：只刷新 AT，不做 RT rotation（不换发新 RT）。
    如需 RT rotation，改为：revoke 旧 session → create 新 session → 返回新 RT。

    返回值：(user, session, new_access_token_jwt)
    """
    session = session_crud.get_active_by_token_plain(db, refresh_token_plain)

    if session is None:
        # 无法区分"token 不存在"和"token 已过期"时，统一返回 refresh_token_expired
        # 让前端一律跳转登录页
        raise Errors.refresh_token_expired()

    user = user_crud.get_by_id(db, session.user_id)
    if user is None or not user.is_active:
        raise Errors.unauthenticated("关联用户不存在或已被禁用")

    # 更新会话最后使用时间
    session_crud.touch_last_used(db, session)

    new_access_token = _create_access_token(user, session)

    db.commit()
    db.refresh(session)

    return user, session, new_access_token


def logout(db: Session, session: UserSession) -> None:
    """
    登出当前设备：撤销当前会话的 refresh token。
    旧 access token 不做即时撤销，最多保留 15 分钟。
    """
    session_crud.revoke(db, session)
    db.commit()


def logout_all(db: Session, user_id: int) -> None:
    """
    登出所有设备：撤销该用户所有活跃会话。
    同 logout，旧 access token 不做即时撤销。
    """
    session_crud.revoke_all_by_user_id(db, user_id)
    db.commit()
