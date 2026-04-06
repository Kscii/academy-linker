"""
集成测试公共 Fixtures。

设置顺序：
  1. 在 import 前设置 DEBUG=true，使 Cookie 不强制 secure，TestClient 可正常携带 Cookie。
  2. 直接在 DB 中创建 admin 用户与 subject（无对应 API 端点）。
  3. 通过 admin API 依次创建 teacher/parent 用户、班级、学生、绑定、分配、系统 Tag。
  4. 各角色分别登录，返回带 Cookie 的 TestClient 实例。
  5. 所有测试结束后清理测试数据，按反向依赖顺序删除。

注意：
  - 所有测试用邮箱以 "@example.com" 结尾，方便统一识别与清理。
  - 测试共享 session 级 Fixture，不做跨角色的 Cookie 隔离（每角色独立 client）。
"""

from __future__ import annotations

import os

# ── 必须在所有 ac_link 模块导入之前设置，确保 Cookie secure=False ──────────
os.environ.setdefault("DEBUG", "true")

import pytest
from starlette.testclient import TestClient

from ac_link.db.db import SessionLocal
from ac_link.db.orm.academic import Class, ParentStudentBinding, Student, Subject
from ac_link.db.orm.communication import Tag
from ac_link.db.orm.enums import TagScope, UserRole
from ac_link.db.orm.user import User
from ac_link.run import app
from ac_link.services.auth_service import hash_password

# ── 测试用常量 ─────────────────────────────────────────────────────────────────

BASE_URL = "http://testserver"

ADMIN_EMAIL = "testadmin.aclink@example.com"
TEACHER_EMAIL = "testteacher.aclink@example.com"
PARENT_EMAIL = "testparent.aclink@example.com"
TEST_PASSWORD = "TestPass1234"  # 满足强度：大写+小写+数字，长度>=8


# ── 底层 DB Session（session 级）───────────────────────────────────────────────

@pytest.fixture(scope="session")
def db_session():
    """直接操作数据库的 SQLAlchemy Session，用于初始化／清理测试数据。"""
    session = SessionLocal()
    yield session
    session.close()


# ── 测试数据 Bootstrap（session 级）───────────────────────────────────────────

@pytest.fixture(scope="session")
def seed(db_session):
    """
    创建整个测试套件依赖的基础数据。

    直接写库：admin user、subject
    通过 API：teacher user、parent user、class、student、
              parent-student binding、teaching assignment、system tag
    """
    # ── 1. 清理可能残留的上次测试数据（幂等保护） ─────────────────────────
    for email in (ADMIN_EMAIL, TEACHER_EMAIL, PARENT_EMAIL):
        u = db_session.query(User).filter(User.email == email).first()
        if u:
            # 先删 teaching_assignments，避免 ORM 尝试 SET NULL teacher_user_id 而违反 NOT NULL 约束
            for ta in list(u.teaching_assignments):
                db_session.delete(ta)
            # 再删 binding，避免 ORM 尝试 SET NULL parent_user_id 而违反 NOT NULL 约束
            for b in list(u.parent_student_bindings):
                db_session.delete(b)
            db_session.flush()
            db_session.delete(u)
    # 删学生（CASCADE 会删除 teaching_assignments、reports 等依赖数据）
    old_student = db_session.query(Student).filter(Student.sid == "TST001").first()
    if old_student:
        db_session.delete(old_student)
        db_session.flush()
    # 删班级
    old_class = db_session.query(Class).filter(Class.name == "Test Class 1A").first()
    if old_class:
        db_session.delete(old_class)
        db_session.flush()
    old_subj = db_session.query(Subject).filter(Subject.code == "TMATH").first()
    if old_subj:
        db_session.delete(old_subj)
        db_session.flush()
    # 删系统 tag
    old_tag = db_session.query(Tag).filter(Tag.name == "test-urgent", Tag.scope == TagScope.SYSTEM).first()
    if old_tag:
        db_session.delete(old_tag)
    db_session.commit()

    # ── 2. 直接创建 admin user（无 API 端点可从外部创建首个 admin） ──────
    admin = User(
        role=UserRole.ADMIN,
        email=ADMIN_EMAIL,
        password_hash=hash_password(TEST_PASSWORD),
        display_name="Test Admin",
        is_active=True,
    )
    db_session.add(admin)

    # ── 3. 直接创建学科（无 admin Subject 创建 API） ─────────────────────
    subject = Subject(name="Test Mathematics", code="TMATH", is_active=True)
    db_session.add(subject)
    db_session.commit()
    db_session.refresh(admin)
    db_session.refresh(subject)

    subject_uuid = str(subject.uuid)

    # ── 4. 通过 admin API 创建剩余测试数据 ──────────────────────────────
    setup_client = TestClient(app, base_url=BASE_URL)
    r = setup_client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"

    # 创建 teacher
    r = setup_client.post("/api/admin/users", json={
        "role": "teacher",
        "display_name": "Test Teacher",
        "email": TEACHER_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert r.status_code == 201, f"Create teacher failed: {r.text}"
    teacher_uuid = r.json()["data"]["uuid"]

    # 创建 parent
    r = setup_client.post("/api/admin/users", json={
        "role": "parent",
        "display_name": "Test Parent",
        "email": PARENT_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert r.status_code == 201, f"Create parent failed: {r.text}"
    parent_uuid = r.json()["data"]["uuid"]

    # 创建班级
    r = setup_client.post("/api/admin/classes", json={
        "name": "Test Class 1A",
        "grade_level": "Grade 1",
        "academic_year": "2026",
    })
    assert r.status_code == 201, f"Create class failed: {r.text}"
    class_uuid = r.json()["data"]["uuid"]

    # 创建学生
    r = setup_client.post("/api/admin/students", json={
        "sid": "TST001",
        "full_name": "Test Student One",
        "preferred_name": "Testy",
        "class_uuid": class_uuid,
    })
    assert r.status_code == 201, f"Create student failed: {r.text}"
    student_uuid = r.json()["data"]["uuid"]

    # 创建 parent-student 绑定
    r = setup_client.post("/api/admin/bindings/parent_student", json={
        "parent_uuid": parent_uuid,
        "student_uuid": student_uuid,
        "relationship_label": "Parent",
        "is_primary": True,
    })
    assert r.status_code == 201, f"Create binding failed: {r.text}"
    binding_uuid = r.json()["data"]["uuid"]

    # 创建 teaching assignment
    r = setup_client.post("/api/admin/assignments/teaching", json={
        "teacher_uuid": teacher_uuid,
        "student_uuid": student_uuid,
        "subject_uuid": subject_uuid,
    })
    assert r.status_code == 201, f"Create assignment failed: {r.text}"
    assignment_uuid = r.json()["data"]["uuid"]

    # 创建系统 tag（用于讨论测试）
    r = setup_client.post("/api/admin/tags/system", json={
        "name": "test-urgent",
        "is_selectable_by_parent": True,
        "is_selectable_by_teacher": True,
        "affects_business_logic": False,
    })
    assert r.status_code == 201, f"Create system tag failed: {r.text}"
    system_tag_uuid = r.json()["data"]["uuid"]

    data = {
        "admin_uuid": str(admin.uuid),
        "teacher_uuid": teacher_uuid,
        "parent_uuid": parent_uuid,
        "subject_uuid": subject_uuid,
        "class_uuid": class_uuid,
        "student_uuid": student_uuid,
        "binding_uuid": binding_uuid,
        "assignment_uuid": assignment_uuid,
        "system_tag_uuid": system_tag_uuid,
    }

    yield data

    # ── 5. 清理（逆向删除，避免 FK 冲突） ───────────────────────────────
    # 先删 binding（避免删除用户时 ORM 尝试 SET NULL 而违反 NOT NULL 约束）
    binding_obj = db_session.query(ParentStudentBinding).filter(
        ParentStudentBinding.uuid == binding_uuid
    ).first()
    if binding_obj:
        db_session.delete(binding_obj)
        db_session.flush()

    # 再删 student（CASCADE: reports, announcements, exam_scores, threads, posts...）
    student_obj = db_session.query(Student).filter(
        Student.uuid == student_uuid
    ).first()
    if student_obj:
        db_session.delete(student_obj)
        db_session.flush()

    # 删 class
    class_obj = db_session.query(Class).filter(
        Class.uuid == class_uuid
    ).first()
    if class_obj:
        db_session.delete(class_obj)
        db_session.flush()

    # 删 subject
    subj_obj = db_session.query(Subject).filter(Subject.code == "TMATH").first()
    if subj_obj:
        db_session.delete(subj_obj)
        db_session.flush()

    # 删用户（CASCADE: sessions, settings, tags, ai_conversations...）
    for email in (TEACHER_EMAIL, PARENT_EMAIL, ADMIN_EMAIL):
        u = db_session.query(User).filter(User.email == email).first()
        if u:
            for b in list(u.parent_student_bindings):
                db_session.delete(b)
            db_session.flush()
            db_session.delete(u)
            db_session.flush()

    db_session.commit()


# ── 各角色已登录的 TestClient（session 级） ────────────────────────────────────

@pytest.fixture(scope="session")
def admin_client(seed):
    """已登录 admin 角色的 TestClient，整个 session 复用。"""
    with TestClient(app, base_url=BASE_URL) as client:
        r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200
        yield client


@pytest.fixture(scope="session")
def teacher_client(seed):
    """已登录 teacher 角色的 TestClient，整个 session 复用。"""
    with TestClient(app, base_url=BASE_URL) as client:
        r = client.post("/api/auth/login", json={"email": TEACHER_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200
        yield client


@pytest.fixture(scope="session")
def parent_client(seed):
    """已登录 parent 角色的 TestClient，整个 session 复用。"""
    with TestClient(app, base_url=BASE_URL) as client:
        r = client.post("/api/auth/login", json={"email": PARENT_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200
        yield client


# ── 测试数据快捷方法（函数别名） ───────────────────────────────────────────────

@pytest.fixture(scope="session")
def td(seed):
    """seed data 的别名，方便测试函数直接使用 td['student_uuid'] 等。"""
    return seed
