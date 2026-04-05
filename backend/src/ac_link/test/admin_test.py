"""
Admin 接口 Postman 测试指南

运行此脚本可一次性向数据库写入测试数据（admin 用户、teacher 用户、
parent 用户、学生、学科），并打印完整的接口测试步骤。

使用方式：
    python src/ac_link/test/admin_test.py

前提：
    - 数据库已初始化（init_db）
    - 服务已通过 uvicorn ac_link.run:app --reload 启动
"""

from __future__ import annotations

from ac_link.db.db import SessionLocal, init_db
from ac_link.db.orm.academic import Subject
from ac_link.db.orm.enums import UserRole
from ac_link.db.orm.user import User
from ac_link.services.auth_service import hash_password

# ── 测试数据配置 ──────────────────────────────────────────────────────────────

BASE_URL = "http://localhost:8000"

ADMIN_EMAIL    = "kscii@gmail.com"
ADMIN_PASSWORD = "114514"
ADMIN_NAME     = "kscii"

TEACHER_EMAIL    = "teacher@test.com"
TEACHER_PASSWORD = "Teacher123456"
TEACHER_NAME     = "test_teacher"

PARENT_EMAIL    = "parent@test.com"
PARENT_PASSWORD = "Parent123456"
PARENT_NAME     = "test_parent"

SUBJECT_NAME = "math"
SUBJECT_CODE = "MATH01"


# ── 写入数据库 ────────────────────────────────────────────────────────────────

def seed() -> dict:
    init_db()
    db = SessionLocal()
    uuids: dict = {}
    try:
        # admin
        admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not admin:
            admin = User(
                role=UserRole.ADMIN,
                email=ADMIN_EMAIL,
                password_hash=hash_password(ADMIN_PASSWORD),
                display_name=ADMIN_NAME,
                is_active=True,
            )
            db.add(admin)
            db.flush()
            print(f"[创建] admin  {ADMIN_EMAIL}")
        else:
            print(f"[已存在] admin  {ADMIN_EMAIL}")
        uuids["admin"] = str(admin.uuid)

        # teacher
        teacher = db.query(User).filter(User.email == TEACHER_EMAIL).first()
        if not teacher:
            teacher = User(
                role=UserRole.TEACHER,
                email=TEACHER_EMAIL,
                password_hash=hash_password(TEACHER_PASSWORD),
                display_name=TEACHER_NAME,
                is_active=True,
            )
            db.add(teacher)
            db.flush()
            print(f"[创建] teacher {TEACHER_EMAIL}")
        else:
            print(f"[已存在] teacher {TEACHER_EMAIL}")
        uuids["teacher"] = str(teacher.uuid)

        # parent
        parent = db.query(User).filter(User.email == PARENT_EMAIL).first()
        if not parent:
            parent = User(
                role=UserRole.PARENT,
                email=PARENT_EMAIL,
                password_hash=hash_password(PARENT_PASSWORD),
                display_name=PARENT_NAME,
                is_active=True,
            )
            db.add(parent)
            db.flush()
            print(f"[创建] parent  {PARENT_EMAIL}")
        else:
            print(f"[已存在] parent  {PARENT_EMAIL}")
        uuids["parent"] = str(parent.uuid)

        # subject
        subject = db.query(Subject).filter(Subject.code == SUBJECT_CODE).first()
        if not subject:
            subject = Subject(name=SUBJECT_NAME, code=SUBJECT_CODE, is_active=True)
            db.add(subject)
            db.flush()
            print(f"[创建] subject {SUBJECT_NAME}")
        else:
            print(f"[已存在] subject {SUBJECT_NAME}")
        uuids["subject"] = str(subject.uuid)

        db.commit()
    finally:
        db.close()

    return uuids


# ── Postman 测试指南 ──────────────────────────────────────────────────────────

def _print_guide(uuids: dict) -> None:
    admin_uuid   = uuids["admin"]
    teacher_uuid = uuids["teacher"]
    parent_uuid  = uuids["parent"]
    subject_uuid = uuids["subject"]

    print(f"""
══════════════════════════════════════════════════════════
  Admin 接口 Postman 测试指南
  Base URL : {BASE_URL}
  说明     : 所有 Admin 接口均需先完成步骤 1（登录）获取 Cookie
══════════════════════════════════════════════════════════

注意：Postman 需开启 "Send cookies" 并在 Cookie Jar 中确认写入。
      所有写操作必须在 Headers 中添加：Origin: http://localhost:5173

────────────────────────────────────────────────────────
 1. 登录（获取 admin Cookie）
────────────────────────────────────────────────────────
  POST {BASE_URL}/api/auth/login
  Body:
    {{
      "email": "{ADMIN_EMAIL}",
      "password": "{ADMIN_PASSWORD}",
      "remember_me": false
    }}
  预期 200: Set-Cookie access_token + refresh_token

────────────────────────────────────────────────────────
 2. 获取用户列表（11.1）
────────────────────────────────────────────────────────
  GET {BASE_URL}/api/admin/users
  Query 参数示例:
    ?page=1&page_size=20
    ?role=teacher
    ?keyword=测试
    ?sort=created_at_desc

  预期 200:
    {{
      "data": [ {{ "uuid": "...", "role": "...", "display_name": "...", ... }} ],
      "meta": {{ "page": 1, "page_size": 20, "total": 3, "total_pages": 1 }}
    }}

────────────────────────────────────────────────────────
 3. 创建用户（11.2）
────────────────────────────────────────────────────────
  POST {BASE_URL}/api/admin/users
  Headers: Content-Type: application/json
  Body:
    {{
      "role": "teacher",
      "display_name": "新老师",
      "email": "new_teacher@test.com",
      "phone_number": null,
      "password": "NewTeacher1"
    }}

  密码强度校验（会触发 422）:
    "password": "short"       → 422: 至少 8 位
    "password": "alllowercase1"  → 422: 缺少大写字母
    "password": "ALLUPPERCASE1"  → 422: 缺少小写字母
    "password": "NoDigitHere"    → 422: 缺少数字

  预期 201: {{ "data": {{ "uuid": "...", ... }} }}
  预期 409: 邮箱已存在时返回 conflict

────────────────────────────────────────────────────────
 4. 更新用户（11.3）
────────────────────────────────────────────────────────
  PATCH {BASE_URL}/api/admin/users/{teacher_uuid}
  Headers: Content-Type: application/json
  Body:
    {{
      "display_name": "更新后的老师名",
      "is_active": true
    }}

  停用账户示例:
    {{ "is_active": false }}

  预期 200: {{ "data": {{ "uuid": "...", "display_name": "更新后的老师名", ... }} }}

────────────────────────────────────────────────────────
 5. 获取学生列表（11.4）
────────────────────────────────────────────────────────
  GET {BASE_URL}/api/admin/students
  Query 参数示例:
    ?page=1&page_size=20
    ?keyword=张
    ?class_name=3年2班
    ?grade_level=3
    ?is_active=true
    ?sort=full_name_asc

  预期 200: 列表 + meta

────────────────────────────────────────────────────────
 6. 创建学生（11.5）
────────────────────────────────────────────────────────
  POST {BASE_URL}/api/admin/students
  Headers: Content-Type: application/json
  Body:
    {{
      "sid": "S2026001",
      "full_name": "张小明",
      "preferred_name": "小明",
      "class_name": "3年2班",
      "grade_level": "3",
      "avatar_url": null
    }}

  → 记录响应中的 student_uuid，后续步骤使用

  预期 201: {{ "data": {{ "uuid": "<student_uuid>", ... }} }}

────────────────────────────────────────────────────────
 7. 更新学生（11.6）
────────────────────────────────────────────────────────
  PATCH {BASE_URL}/api/admin/students/<student_uuid>
  Headers: Content-Type: application/json
  Body:
    {{
      "preferred_name": "明明",
      "is_active": true
    }}

  预期 200: {{ "data": {{ "uuid": "...", "preferred_name": "明明", ... }} }}

────────────────────────────────────────────────────────
 8. 获取 Parent-Student 绑定列表（11.7）
────────────────────────────────────────────────────────
  GET {BASE_URL}/api/admin/bindings/parent_student
  Query 参数示例:
    ?parent_uuid={parent_uuid}
    ?is_active=true

  预期 200: 列表 + meta

────────────────────────────────────────────────────────
 9. 创建 Parent-Student 绑定（11.8）
────────────────────────────────────────────────────────
  POST {BASE_URL}/api/admin/bindings/parent_student
  Headers: Content-Type: application/json
  Body:
    {{
      "parent_uuid": "{parent_uuid}",
      "student_uuid": "<step6中的student_uuid>",
      "relationship_label": "mother",
      "is_primary": true
    }}

  错误场景:
    parent_uuid 填 teacher => 400 bad_request
    重复绑定同一 student 且均 is_active => 409 conflict

  → 记录响应中的 binding_uuid

  预期 201:
    {{
      "data": {{
        "uuid": "<binding_uuid>",
        "parent_uuid": "{parent_uuid}",
        "student_uuid": "<student_uuid>",
        "relationship_label": "mother",
        "is_primary": true,
        "is_active": true,
        "created_at": "..."
      }}
    }}

────────────────────────────────────────────────────────
 10. 更新 Parent-Student 绑定（11.9）
────────────────────────────────────────────────────────
  PATCH {BASE_URL}/api/admin/bindings/parent_student/<binding_uuid>
  Headers: Content-Type: application/json
  Body:
    {{
      "relationship_label": "father",
      "is_primary": true
    }}

  停用绑定示例:
    {{ "is_active": false }}

  预期 200: {{ "data": {{ "uuid": "...", ... }} }}

────────────────────────────────────────────────────────
 11. 获取 Teaching Assignment 列表（11.10）
────────────────────────────────────────────────────────
  GET {BASE_URL}/api/admin/assignments/teaching
  Query 参数示例:
    ?teacher_uuid={teacher_uuid}
    ?subject_uuid={subject_uuid}
    ?is_active=true

  预期 200: 列表 + meta

────────────────────────────────────────────────────────
 12. 创建 Teaching Assignment（11.11）
────────────────────────────────────────────────────────
  POST {BASE_URL}/api/admin/assignments/teaching
  Headers: Content-Type: application/json
  Body:
    {{
      "teacher_uuid": "{teacher_uuid}",
      "student_uuid": "<step6中的student_uuid>",
      "subject_uuid": "{subject_uuid}",
      "is_homeroom": false
    }}

  错误场景:
    teacher_uuid 填 parent_uuid => 400 bad_request（role 不是 teacher）
    重复提交相同三元组 => 409 conflict

  → 记录响应中的 assignment_uuid

  预期 201:
    {{
      "data": {{
        "uuid": "<assignment_uuid>",
        "teacher_uuid": "{teacher_uuid}",
        "student_uuid": "<student_uuid>",
        "subject_uuid": "{subject_uuid}",
        "is_homeroom": false,
        "is_active": true,
        "created_at": "..."
      }}
    }}

────────────────────────────────────────────────────────
 13. 更新 Teaching Assignment（11.12）
────────────────────────────────────────────────────────
  PATCH {BASE_URL}/api/admin/assignments/teaching/<assignment_uuid>
  Headers: Content-Type: application/json
  Body:
    {{
      "is_homeroom": true
    }}

  停用分配示例:
    {{ "is_active": false }}

  预期 200: {{ "data": {{ "uuid": "...", "is_homeroom": true, ... }} }}

────────────────────────────────────────────────────────
 14. 获取系统 Tag 列表（11.13）
────────────────────────────────────────────────────────
  GET {BASE_URL}/api/admin/tags/system

  预期 200:
    {{
      "data": [ {{ "uuid": "...", "name": "important", "scope": "system", ... }} ]
    }}

────────────────────────────────────────────────────────
 15. 创建系统 Tag（11.14）
────────────────────────────────────────────────────────
  POST {BASE_URL}/api/admin/tags/system
  Headers: Content-Type: application/json
  Body:
    {{
      "name": "urgent",
      "is_selectable_by_parent": false,
      "is_selectable_by_teacher": true,
      "affects_business_logic": false
    }}

  → 记录响应中的 tag_uuid

  预期 201: {{ "data": {{ "uuid": "<tag_uuid>", "name": "urgent", "scope": "system", ... }} }}
  预期 409: 名称重复时返回 duplicate_tag_name

────────────────────────────────────────────────────────
 16. 更新系统 Tag（11.15）
────────────────────────────────────────────────────────
  PATCH {BASE_URL}/api/admin/tags/system/<tag_uuid>
  Headers: Content-Type: application/json
  Body:
    {{
      "is_selectable_by_parent": true
    }}

  预期 200: {{ "data": {{ "uuid": "...", "is_selectable_by_parent": true, ... }} }}

────────────────────────────────────────────────────────
 权限校验（非 admin 访问应拒绝）
────────────────────────────────────────────────────────
  1. 用 teacher 账号登录:
     POST {BASE_URL}/api/auth/login
     Body: {{ "email": "{TEACHER_EMAIL}", "password": "{TEACHER_PASSWORD}", "remember_me": false }}

  2. 访问任意 admin 接口，例如:
     GET {BASE_URL}/api/admin/users

  预期 403: {{ "error": {{ "code": "role_not_allowed", "message": "...", ... }} }}

══════════════════════════════════════════════════════════
  已写入测试数据摘要
  admin   : {ADMIN_EMAIL} / {ADMIN_PASSWORD}  (uuid: {admin_uuid})
  teacher : {TEACHER_EMAIL} / {TEACHER_PASSWORD}  (uuid: {teacher_uuid})
  parent  : {PARENT_EMAIL} / {PARENT_PASSWORD}  (uuid: {parent_uuid})
  subject : {SUBJECT_NAME} ({SUBJECT_CODE})  (uuid: {subject_uuid})
══════════════════════════════════════════════════════════
""")


if __name__ == "__main__":
    uuids = seed()
    _print_guide(uuids)
