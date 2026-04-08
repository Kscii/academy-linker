"""
管理员账户初始化脚本。

用法：
    python -m ac_link.db.init_admin

支持两种配置方式（可同时使用，ADMIN_LIST 优先）：

方式一：ADMIN_LIST（推荐，支持多账号）
    ADMIN_LIST=[{"email":"a@x.com","password":"xxx","display_name":"Alice"}, ...]

方式二：单账号环境变量（向后兼容）
    ADMIN_EMAIL        管理员邮箱
    ADMIN_PASSWORD     管理员密码（明文）
    ADMIN_DISPLAY_NAME 管理员显示名称

行为：
    - 账号不存在时创建
    - 账号已存在时跳过（不覆盖密码或显示名称）
"""

from __future__ import annotations

import json
import os
import sys

from sqlalchemy.orm import Session

from ac_link.db.db import SessionLocal, init_db
from ac_link.db.orm.enums import UserRole
from ac_link.db.orm.user import User
from ac_link.services.auth_service import hash_password


def ensure_admin_exists(db: Session, email: str, password: str, display_name: str) -> None:
    """若账号不存在则创建，已存在则跳过（不覆盖）。"""
    existing: User | None = db.query(User).filter_by(email=email).first()
    if existing is not None:
        print(f"⏭️  管理员已存在，跳过：{email}")
        return
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


def parse_admin_list(raw: str) -> list[dict]:
    """解析 ADMIN_LIST JSON，校验必填字段。"""
    try:
        entries = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"错误：ADMIN_LIST 不是合法 JSON：{e}", file=sys.stderr)
        sys.exit(1)
    if not isinstance(entries, list):
        print("错误：ADMIN_LIST 必须是 JSON 数组", file=sys.stderr)
        sys.exit(1)
    for i, entry in enumerate(entries):
        for field in ("email", "password", "display_name"):
            if not entry.get(field, "").strip():
                print(f"错误：ADMIN_LIST[{i}] 缺少字段 '{field}'", file=sys.stderr)
                sys.exit(1)
    return entries


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        admin_list_raw = os.environ.get("ADMIN_LIST", "").strip()
        if admin_list_raw:
            entries = parse_admin_list(admin_list_raw)
            for entry in entries:
                ensure_admin_exists(db, entry["email"], entry["password"], entry["display_name"])
        else:
            # 向后兼容：单账号环境变量
            email = os.environ.get("ADMIN_EMAIL", "").strip()
            password = os.environ.get("ADMIN_PASSWORD", "").strip()
            display_name = os.environ.get("ADMIN_DISPLAY_NAME", "").strip()
            if not all([email, password, display_name]):
                print("错误：未设置 ADMIN_LIST，且 ADMIN_EMAIL/ADMIN_PASSWORD/ADMIN_DISPLAY_NAME 不完整", file=sys.stderr)
                sys.exit(1)
            ensure_admin_exists(db, email, password, display_name)
    finally:
        db.close()


if __name__ == "__main__":
    main()
