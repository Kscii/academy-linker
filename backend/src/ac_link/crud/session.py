"""
会话（UserSession）CRUD 层。

设计约定：
  - refresh_token 明文永远不写入数据库，只存 SHA-256 哈希值
  - "撤销"操作只设置 revoked_at 时间戳，不物理删除记录
    （保留审计轨迹，后续如需清理过期记录可用定时任务）
  - "活跃会话"定义：revoked_at IS NULL AND expires_at > now()

后续开发注意：
  - 如需分页展示会话列表（Admin 视角），在此新增 list_by_user() 方法
  - 如需定期清理过期会话，可在此添加 delete_expired() 批量删除方法
  - 未来若要做 AT 即时撤销，需在 get_active_by_uuid 基础上
    在 deps.py 的 get_current_user 里增加 DB 查询校验
"""

from __future__ import annotations

from datetime import datetime
from hashlib import sha256
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from ac_link.db.orm.mixins import utc_now
from ac_link.db.orm.user import UserSession


def _hash_token(token: str) -> str:
    """对 refresh_token 明文做 SHA-256 哈希，返回十六进制字符串。"""
    return sha256(token.encode()).hexdigest()


def create(
    db: Session,
    user_id: int,
    refresh_token_plain: str,
    expires_at: datetime,
    *,
    ip_address: str | None = None,
    user_agent: str | None = None,
    device_label: str | None = None,
) -> UserSession:
    """
    创建新会话记录。

    注意：此方法只调用 db.add + db.flush，不 commit。
    由上层调用方（service / api）负责 commit，以便将多个操作放在同一事务中。
    """
    session = UserSession(
        user_id=user_id,
        refresh_token_hash=_hash_token(refresh_token_plain),
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
        device_label=device_label,
    )
    db.add(session)
    db.flush()  # 使 session.id / session.uuid 等字段被填充
    return session


def get_active_by_token_hash_raw(db: Session, token_hash: str) -> UserSession | None:
    """
    通过已哈希的 token 查找活跃会话（内部使用，避免重复哈希）。
    """
    now = utc_now()
    return db.query(UserSession).filter(
        and_(
            UserSession.refresh_token_hash == token_hash,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
    ).first()


def get_active_by_token_plain(db: Session, token_plain: str) -> UserSession | None:
    """
    通过 refresh_token 明文查找活跃会话。
    在 auth_service.refresh_access_token 中调用。
    """
    return get_active_by_token_hash_raw(db, _hash_token(token_plain))


def get_active_by_uuid(db: Session, uuid: UUID) -> UserSession | None:
    """
    通过 uuid 查找活跃会话（用于 /api/me/sessions/{session_uuid} 删除操作）。
    """
    now = utc_now()
    return db.query(UserSession).filter(
        and_(
            UserSession.uuid == uuid,
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > now,
        )
    ).first()


def get_all_active_by_user_id(db: Session, user_id: int) -> list[UserSession]:
    """
    获取某用户所有活跃会话（用于展示 /api/me/sessions 列表）。
    按创建时间倒序排列，最新设备最前。
    """
    now = utc_now()
    return (
        db.query(UserSession)
        .filter(
            and_(
                UserSession.user_id == user_id,
                UserSession.revoked_at.is_(None),
                UserSession.expires_at > now,
            )
        )
        .order_by(UserSession.created_at.desc())
        .all()
    )


def revoke(db: Session, session: UserSession) -> None:
    """
    撤销单个会话（logout 当前设备）。
    保留记录不删除，仅标记撤销时间。
    """
    session.revoked_at = utc_now()
    db.flush()


def revoke_all_by_user_id(db: Session, user_id: int) -> None:
    """
    撤销某用户的所有活跃会话（logout_all）。

    使用批量 UPDATE 而非逐条操作，避免大量会话时性能问题。
    注意：此操作不能通过 ORM relationship 触发 onupdate 钩子，
    所以 revoked_at 必须在此手动赋值。
    """
    now = utc_now()
    db.query(UserSession).filter(
        and_(
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
        )
    ).update(
        {"revoked_at": now},
        synchronize_session="fetch",  # 同步 SQLAlchemy identity map
    )
    db.flush()


def touch_last_used(db: Session, session: UserSession) -> None:
    """
    更新会话的最后使用时间（refresh token 被成功使用时调用）。
    """
    session.last_used_at = utc_now()
    db.flush()
