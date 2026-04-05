from __future__ import annotations

from ac_link.db.db import SessionLocal, init_db
from ac_link.db.orm.enums import UserRole
from ac_link.db.orm.user import User
from ac_link.services.auth_service import hash_password

# ── 测试账号配置 ────────────────────────────────────────────────

TEST_EMAIL = "kscii@gmail.com"
TEST_PASSWORD = "114514"
TEST_DISPLAY_NAME = "kscii"
TEST_ROLE = UserRole.ADMIN

BASE_URL = "http://localhost:8000"


# ── 写入数据库 ────────────────────────────────────────────────────────────────

def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == TEST_EMAIL).first()
        if existing:
            print(f"[跳过] 用户 {TEST_EMAIL} 已存在 (uuid={existing.uuid})")
            _print_guide(existing.uuid)
            return

        user = User(
            role=TEST_ROLE,
            email=TEST_EMAIL,
            password_hash=hash_password(TEST_PASSWORD),
            display_name=TEST_DISPLAY_NAME,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[成功] 创建测试用户 {TEST_EMAIL} (uuid={user.uuid})")
        _print_guide(user.uuid)
    finally:
        db.close()


# ── Postman 测试指南 ──────────────────────────────────────────────────────────

def _print_guide(user_uuid: object) -> None:
    print(f"""
══════════════════════════════════════════════════════════
  Postman 测试指南
  Base URL: {BASE_URL}
══════════════════════════════════════════════════════════

注意：所有接口均使用 Cookie 认证（access_token），Postman 需开启
      "Automatically follow redirects" 并在 Cookie Jar 中确认 Cookie 写入。
      建议在 Postman Collection 级别启用 "Send cookies"。

────────────────────────────────────────────────────────
 1. POST /api/auth/login  —  登录
────────────────────────────────────────────────────────
  Headers:
    Content-Type : application/json

  Body (raw JSON):
    {{
      "email": "{TEST_EMAIL}",
      "password": "{TEST_PASSWORD}",
      "remember_me": false
    }}

  预期响应 200:
    Set-Cookie: access_token=<JWT>;  HttpOnly; Path=/
    Set-Cookie: refresh_token=<token>; HttpOnly; Path=/api/auth/refresh
    {{
      "data": {{
        "user": {{
          "uuid": "{user_uuid}",
          "role": "{TEST_ROLE}",
          "display_name": "{TEST_DISPLAY_NAME}",
          "email": "{TEST_EMAIL}",
          "avatar_url": null
        }}
      }}
    }}

────────────────────────────────────────────────────────
 2. GET /api/me  —  获取当前用户信息（需先登录）
────────────────────────────────────────────────────────
  Headers: （无需额外 Header，Cookie 自动携带）

  预期响应 200:
    {{
      "data": {{
        "user": {{
          "uuid": "{user_uuid}",
          "role": "{TEST_ROLE}",
          "display_name": "{TEST_DISPLAY_NAME}",
          "email": "{TEST_EMAIL}",
          "phone_number": null,
          "avatar_url": null
        }}
      }}
    }}

────────────────────────────────────────────────────────
 3. PATCH /api/me  —  更新资料
────────────────────────────────────────────────────────
  Headers:
    Content-Type : application/json

  Body (raw JSON，只传需要修改的字段):
    {{
      "display_name": "新名字",
      "phone_number": "13800138000"
    }}

  预期响应 200:
    {{ "data": {{ "user": {{ "display_name": "新名字", "phone_number": "13800138000", ... }} }} }}

────────────────────────────────────────────────────────
 4. POST /api/me/change_password  —  修改密码
────────────────────────────────────────────────────────
  Headers:
    Content-Type : application/json

  Body (raw JSON):
    {{
      "current_password": "{TEST_PASSWORD}",
      "new_password": "newpassword456"
    }}

  预期响应 200:
    {{ "data": {{ "success": true }} }}

  错误场景（current_password 填错）→ 401:
    {{ "error": {{ "code": "unauthenticated", "message": "当前密码错误", "details": {{}} }} }}

────────────────────────────────────────────────────────
 5. GET /api/me/sessions  —  会话列表
────────────────────────────────────────────────────────
  预期响应 200:
    {{
      "data": [
        {{
          "uuid": "<session_uuid>",
          "device_label": null,
          "ip_address": "127.0.0.1",
          "user_agent": "PostmanRuntime/...",
          "created_at": "2026-...",
          "last_used_at": "2026-...",
          "is_current": true
        }}
      ]
    }}

────────────────────────────────────────────────────────
 6. DELETE /api/me/sessions/{{session_uuid}}  —  踢出设备
────────────────────────────────────────────────────────
  将第 5 步响应中的 session_uuid 填入路径参数。

  预期响应 200:
    {{ "data": {{ "success": true }} }}

  删除他人会话 → 403:
    {{ "error": {{ "code": "forbidden", "message": "无权删除此会话", ... }} }}

────────────────────────────────────────────────────────
 7. POST /api/auth/refresh  —  刷新 access_token
────────────────────────────────────────────────────────
  （无 Body，依赖 refresh_token Cookie）
  预期响应 200:
    {{ "data": {{ "success": true }} }}
    同时 Set-Cookie 会更新 access_token

────────────────────────────────────────────────────────
 8. POST /api/auth/logout  —  登出当前设备
────────────────────────────────────────────────────────
  （无 Body）
  预期响应 200:
    {{ "data": {{ "success": true }} }}
    Cookie 中的 access_token / refresh_token 会被清除

────────────────────────────────────────────────────────
 9. POST /api/auth/logout_all  —  登出所有设备
────────────────────────────────────────────────────────
  （无 Body）
  预期响应 200:
    {{ "data": {{ "success": true }} }}

══════════════════════════════════════════════════════════
""")


if __name__ == "__main__":
    seed()
