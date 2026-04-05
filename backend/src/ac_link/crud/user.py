"""
用户 CRUD 层。

职责：纯粹的数据库读写，不包含任何业务逻辑。
业务逻辑（如密码校验、权限判断）应放在 services 层。

后续开发注意：
  - 如需软删除，在此加 is_active=True 过滤条件
  - 如需分页查询用户列表（Admin），在此新增 list() 方法
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from ac_link.db.orm.user import User


def get_by_email(db: Session, email: str) -> User | None:
    """通过邮箱查找用户（登录时使用）。邮箱在数据库中有唯一约束。"""
    return db.query(User).filter(User.email == email).first()


def get_by_uuid(db: Session, uuid: UUID) -> User | None:
    """通过对外暴露的 uuid 查找用户（接口路径参数使用 uuid）。"""
    return db.query(User).filter(User.uuid == uuid).first()


def get_by_id(db: Session, user_id: int) -> User | None:
    """通过内部自增主键查找用户（仅内部逻辑使用，不对外暴露）。"""
    return db.query(User).filter(User.id == user_id).first()


def update(db: Session, user: User, **fields: object) -> User:
    """
    更新用户字段。

    用法：
        user = crud.user.update(db, user, display_name="新名字", avatar_url=None)

    只更新传入的字段，不传的字段保持原值。
    后续如需校验字段白名单（防止越权更新），在调用方做，不在此处做。
    """
    for key, value in fields.items():
        setattr(user, key, value)
    db.flush()  # 写入到事务但不提交，由调用方 commit
    return user
