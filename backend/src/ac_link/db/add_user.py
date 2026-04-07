"""
向数据库添加用户的交互式工具。

用法（容器外，连接远程 DB）：
    python3 -m ac_link.db.add_user

用法（容器内）：
    podman exec -it academy-linker-api python3 -m ac_link.db.add_user

支持命令行参数（非交互模式）：
    python3 -m ac_link.db.add_user \\
        --role teacher \\
        --email teacher@example.com \\
        --name "张三" \\
        --password secret123 \\
        [--phone 13800138000]
"""

from __future__ import annotations

import argparse
import getpass
import sys

from sqlalchemy.exc import IntegrityError

from ac_link.db.db import SessionLocal, init_db
from ac_link.db.orm.enums import UserRole
from ac_link.db.orm.user import User
from ac_link.services.auth_service import hash_password

ROLES = [r.value for r in UserRole]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="向数据库添加用户")
    p.add_argument("--role", choices=ROLES, help=f"角色：{ROLES}")
    p.add_argument("--email", help="邮箱（登录账号）")
    p.add_argument("--name", dest="display_name", help="显示名称")
    p.add_argument("--password", help="密码（明文，建议用交互模式输入以避免泄露）")
    p.add_argument("--phone", dest="phone_number", default=None, help="手机号（可选）")
    return p.parse_args()


def prompt(label: str, default: str | None = None, secret: bool = False) -> str:
    suffix = f" [{default}]" if default else ""
    while True:
        if secret:
            value = getpass.getpass(f"{label}{suffix}: ")
            if not value and default:
                return default
            if value:
                confirm = getpass.getpass(f"再次确认密码: ")
                if value != confirm:
                    print("两次输入不一致，请重试")
                    continue
                return value
        else:
            value = input(f"{label}{suffix}: ").strip()
            if not value and default:
                return default
            if value:
                return value
        print("此项不能为空，请重新输入")


def collect_interactive(args: argparse.Namespace) -> dict:
    print("\n=== 添加用户 ===")
    role_str = args.role or prompt(f"角色 {ROLES}")
    if role_str not in ROLES:
        print(f"错误：角色必须是 {ROLES} 之一", file=sys.stderr)
        sys.exit(1)

    email        = args.email        or prompt("邮箱")
    display_name = args.display_name or prompt("显示名称")
    password     = args.password     or prompt("密码", secret=True)
    phone_number = args.phone_number
    if phone_number is None and not args.email:   # 完全交互模式才询问
        raw = input("手机号（可选，直接回车跳过）: ").strip()
        phone_number = raw or None

    return dict(
        role=UserRole(role_str),
        email=email,
        display_name=display_name,
        password=password,
        phone_number=phone_number,
    )


def add_user(role: UserRole, email: str, display_name: str, password: str, phone_number: str | None) -> None:
    init_db()
    db = SessionLocal()
    try:
        user = User(
            role=role,
            email=email,
            password_hash=hash_password(password),
            display_name=display_name,
            phone_number=phone_number,
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"\n✅ 用户已创建")
        print(f"   邮箱：{email}")
        print(f"   角色：{role}")
        print(f"   名称：{display_name}")
    except IntegrityError:
        db.rollback()
        print(f"\n❌ 失败：邮箱 {email} 已存在", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


def main() -> None:
    args = parse_args()
    params = collect_interactive(args)
    add_user(**params)


if __name__ == "__main__":
    main()
