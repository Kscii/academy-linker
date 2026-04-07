"""
创建或更新管理员用户的脚本。

用法：
    python -m ac_link.db.create_admin

所需环境变量（在 .env 中配置）：
    ADMIN_EMAIL        管理员邮箱（用于登录）
    ADMIN_PASSWORD     管理员密码（明文，脚本会自动哈希）
    ADMIN_DISPLAY_NAME 管理员显示名称

行为：
    - 若该邮箱的用户不存在，则创建新管理员账户
    - 若该邮箱的用户已存在，则更新其密码和显示名称，并确保 role=admin
"""

from __future__ import annotations

import os
import sys

from sqlalchemy.orm import Session

from ac_link.db.db import SessionLocal, init_db
from ac_link.db.orm.enums import UserRole
from ac_link.db.orm.user import User
from ac_link.services.auth_service import hash_password


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"错误：环境变量 {name} 未设置或为空", file=sys.stderr)
        sys.exit(1)
    return value


def create_or_update_admin(db: Session, email: str, password: str, display_name: str) -> None:
    existing: User | None = db.query(User).filter_by(email=email).first()

    if existing is None:
        admin = User(
            role=UserRole.ADMIN,
            email=email,
            password_hash=hash_password(password),
            display_name=display_name,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"✅ 管理员账户已创建：{email}")
    else:
        existing.role = UserRole.ADMIN
        existing.password_hash = hash_password(password)
        existing.display_name = display_name
        existing.is_active = True
        db.commit()
        print(f"✅ 管理员账户已更新：{email}")


def main() -> None:
    email = _require_env("ADMIN_EMAIL")
    password = _require_env("ADMIN_PASSWORD")
    display_name = _require_env("ADMIN_DISPLAY_NAME")

    init_db()

    db = SessionLocal()
    try:
        create_or_update_admin(db, email, password, display_name)
    finally:
        db.close()


if __name__ == "__main__":
    main()
