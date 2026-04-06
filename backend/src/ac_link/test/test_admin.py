"""
§11 Admin 管理接口集成测试。

覆盖：
  GET/POST/PATCH /api/admin/users
  GET/POST/PATCH /api/admin/classes
  GET/POST/PATCH /api/admin/students
  POST           /api/admin/students/{uuid}/transfer-class
  GET/POST/PATCH /api/admin/bindings/parent_student
  GET/POST/PATCH /api/admin/assignments/teaching
  GET/POST/PATCH /api/admin/tags/system

每个测试方法中使用独立的临时数据，避免与 seed fixture 冲突。
"""

from __future__ import annotations

import uuid as _uuid

import pytest

# ── 用户管理 ──────────────────────────────────────────────────────────────────

class TestAdminUsers:
    def test_list_users(self, admin_client):
        """获取用户列表应返回分页数据。"""
        r = admin_client.get("/api/admin/users")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body
        assert "meta" in body
        assert isinstance(body["data"], list)

    def test_list_users_filter_by_role(self, admin_client):
        """按 role 过滤用户列表。"""
        r = admin_client.get("/api/admin/users", params={"role": "teacher"})
        assert r.status_code == 200
        users = r.json()["data"]
        for u in users:
            assert u["role"] == "teacher"

    def test_create_user(self, admin_client):
        """创建用户后应能在列表中查到。"""
        unique = _uuid.uuid4().hex[:8]
        r = admin_client.post("/api/admin/users", json={
            "role": "parent",
            "display_name": f"Tmp Parent {unique}",
            "email": f"tmp.parent.{unique}@example.com",
            "password": "TmpPass1234",
        })
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["role"] == "parent"
        assert data["is_active"] is True
        new_uuid = data["uuid"]

        # 清理
        admin_client.patch(f"/api/admin/users/{new_uuid}", json={"is_active": False})

    def test_create_user_duplicate_email_returns_409(self, admin_client, td):
        """重复邮箱应返回 409 conflict。"""
        from conftest import TEACHER_EMAIL
        r = admin_client.post("/api/admin/users", json={
            "role": "teacher",
            "display_name": "Dup Teacher",
            "email": TEACHER_EMAIL,
            "password": "TmpPass1234",
        })
        assert r.status_code == 409

    def test_create_user_weak_password_returns_422(self, admin_client):
        """密码不满足强度要求应返回 422。"""
        r = admin_client.post("/api/admin/users", json={
            "role": "parent",
            "display_name": "Weak Pass",
            "email": "weakpass.aclink@example.com",
            "password": "short",
        })
        assert r.status_code == 422

    def test_update_user(self, admin_client, td):
        """更新用户 display_name 应成功。"""
        teacher_uuid = td["teacher_uuid"]
        r = admin_client.patch(f"/api/admin/users/{teacher_uuid}", json={
            "display_name": "Updated Teacher Name",
        })
        assert r.status_code == 200
        assert r.json()["data"]["display_name"] == "Updated Teacher Name"

        # 恢复
        admin_client.patch(f"/api/admin/users/{teacher_uuid}", json={"display_name": "Test Teacher"})

    def test_update_nonexistent_user_returns_404(self, admin_client):
        r = admin_client.patch(
            f"/api/admin/users/{_uuid.uuid4()}",
            json={"display_name": "Ghost"},
        )
        assert r.status_code == 404


# ── 班级管理 ──────────────────────────────────────────────────────────────────

class TestAdminClasses:
    def test_list_classes(self, admin_client):
        r = admin_client.get("/api/admin/classes")
        assert r.status_code == 200
        assert "data" in r.json()

    def test_create_and_update_class(self, admin_client, td):
        """创建班级后能更新班主任。"""
        r = admin_client.post("/api/admin/classes", json={
            "name": "Tmp Class 2B",
            "grade_level": "Grade 2",
            "academic_year": "2026",
        })
        assert r.status_code == 201
        class_uuid = r.json()["data"]["uuid"]

        # 设置班主任为 teacher
        r = admin_client.patch(f"/api/admin/classes/{class_uuid}", json={
            "homeroom_teacher_uuid": td["teacher_uuid"],
        })
        assert r.status_code == 200
        assert r.json()["data"]["homeroom_teacher"]["uuid"] == td["teacher_uuid"]

        # 清理（停用）
        admin_client.patch(f"/api/admin/classes/{class_uuid}", json={"is_active": False})

    def test_create_class_empty_name_returns_422(self, admin_client):
        r = admin_client.post("/api/admin/classes", json={"name": ""})
        assert r.status_code == 422


# ── 学生管理 ──────────────────────────────────────────────────────────────────

class TestAdminStudents:
    def test_list_students(self, admin_client):
        r = admin_client.get("/api/admin/students")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body

    def test_list_students_filter_by_class(self, admin_client, td):
        r = admin_client.get("/api/admin/students", params={"class_uuid": td["class_uuid"]})
        assert r.status_code == 200
        students = r.json()["data"]
        # 测试学生 "TST001" 应在其中
        sids = [s["sid"] for s in students]
        assert "TST001" in sids

    def test_create_student(self, admin_client, td):
        unique = _uuid.uuid4().hex[:6]
        r = admin_client.post("/api/admin/students", json={
            "sid": f"TMPST{unique}",
            "full_name": f"Tmp Student {unique}",
            "class_uuid": td["class_uuid"],
        })
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["is_active"] is True
        tmp_student_uuid = data["uuid"]

        # 清理（停用）
        admin_client.patch(f"/api/admin/students/{tmp_student_uuid}", json={"is_active": False})

    def test_create_student_duplicate_sid_returns_409(self, admin_client):
        """重复 sid 应返回 409。"""
        r = admin_client.post("/api/admin/students", json={
            "sid": "TST001",
            "full_name": "Duplicate SID Student",
        })
        assert r.status_code == 409

    def test_update_student(self, admin_client, td):
        r = admin_client.patch(f"/api/admin/students/{td['student_uuid']}", json={
            "preferred_name": "Testy2",
        })
        assert r.status_code == 200
        assert r.json()["data"]["preferred_name"] == "Testy2"

        # 恢复
        admin_client.patch(f"/api/admin/students/{td['student_uuid']}", json={
            "preferred_name": "Testy",
        })


# ── 学生换班 ──────────────────────────────────────────────────────────────────

class TestTransferClass:
    def test_transfer_class(self, admin_client, td):
        """创建新班级后，将学生换班，应返回 transfer 结果。"""
        # 创建临时目标班级
        r = admin_client.post("/api/admin/classes", json={"name": "Transfer Target Class"})
        assert r.status_code == 201
        new_class_uuid = r.json()["data"]["uuid"]

        r = admin_client.post(
            f"/api/admin/students/{td['student_uuid']}/transfer-class",
            json={"new_class_uuid": new_class_uuid},
        )
        assert r.status_code == 200
        result = r.json()["data"]
        assert result["student_uuid"] == td["student_uuid"]
        assert result["new_class_uuid"] == new_class_uuid

        # 换回原班级，保持测试数据一致
        admin_client.post(
            f"/api/admin/students/{td['student_uuid']}/transfer-class",
            json={"new_class_uuid": td["class_uuid"]},
        )
        # 重新创建换班后丢失的 teaching assignment
        admin_client.post("/api/admin/assignments/teaching", json={
            "teacher_uuid": td["teacher_uuid"],
            "student_uuid": td["student_uuid"],
            "subject_uuid": td["subject_uuid"],
        })
        # 清理临时班级
        admin_client.patch(f"/api/admin/classes/{new_class_uuid}", json={"is_active": False})


# ── Parent-Student 绑定 ────────────────────────────────────────────────────────

class TestAdminBindings:
    def test_list_bindings(self, admin_client, td):
        r = admin_client.get("/api/admin/bindings/parent_student")
        assert r.status_code == 200
        assert "data" in r.json()

    def test_list_bindings_filter_by_student(self, admin_client, td):
        r = admin_client.get("/api/admin/bindings/parent_student",
                             params={"student_uuid": td["student_uuid"]})
        assert r.status_code == 200
        bindings = r.json()["data"]
        assert any(b["student_uuid"] == td["student_uuid"] for b in bindings)

    def test_update_binding(self, admin_client, td):
        r = admin_client.patch(
            f"/api/admin/bindings/parent_student/{td['binding_uuid']}",
            json={"relationship_label": "Mother"},
        )
        assert r.status_code == 200
        assert r.json()["data"]["relationship_label"] == "Mother"

        # 恢复
        admin_client.patch(
            f"/api/admin/bindings/parent_student/{td['binding_uuid']}",
            json={"relationship_label": "Parent"},
        )

    def test_create_binding_wrong_role_returns_400(self, admin_client, td):
        """将 teacher 作为 parent 创建绑定应返回 400。"""
        r = admin_client.post("/api/admin/bindings/parent_student", json={
            "parent_uuid": td["teacher_uuid"],  # teacher 不能作 parent
            "student_uuid": td["student_uuid"],
            "is_primary": False,
        })
        assert r.status_code == 400


# ── Teaching Assignment ────────────────────────────────────────────────────────

class TestAdminAssignments:
    def test_list_assignments(self, admin_client, td):
        r = admin_client.get("/api/admin/assignments/teaching")
        assert r.status_code == 200
        assert "data" in r.json()

    def test_list_assignments_filter_by_teacher(self, admin_client, td):
        r = admin_client.get("/api/admin/assignments/teaching",
                             params={"teacher_uuid": td["teacher_uuid"]})
        assert r.status_code == 200
        assignments = r.json()["data"]
        assert any(a["teacher_uuid"] == td["teacher_uuid"] for a in assignments)

    def test_update_assignment(self, admin_client, td):
        r = admin_client.patch(
            f"/api/admin/assignments/teaching/{td['assignment_uuid']}",
            json={"is_active": True},
        )
        assert r.status_code == 200

    def test_create_duplicate_assignment_returns_409(self, admin_client, td):
        """三元组重复应返回 409。"""
        r = admin_client.post("/api/admin/assignments/teaching", json={
            "teacher_uuid": td["teacher_uuid"],
            "student_uuid": td["student_uuid"],
            "subject_uuid": td["subject_uuid"],
        })
        assert r.status_code == 409


# ── 系统 Tag ──────────────────────────────────────────────────────────────────

class TestAdminSystemTags:
    def test_list_system_tags(self, admin_client):
        r = admin_client.get("/api/admin/tags/system")
        assert r.status_code == 200
        tags = r.json()["data"]
        assert isinstance(tags, list)

    def test_create_system_tag(self, admin_client):
        unique = _uuid.uuid4().hex[:6]
        r = admin_client.post("/api/admin/tags/system", json={
            "name": f"tmp-tag-{unique}",
            "is_selectable_by_parent": True,
            "is_selectable_by_teacher": True,
            "affects_business_logic": False,
        })
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["scope"] == "system"
        tag_uuid = data["uuid"]

        # 清理：停用该 tag
        admin_client.patch(f"/api/admin/tags/system/{tag_uuid}", json={"is_selectable_by_parent": False})

    def test_update_system_tag(self, admin_client, td):
        tag_uuid = td["system_tag_uuid"]
        r = admin_client.patch(f"/api/admin/tags/system/{tag_uuid}", json={
            "is_selectable_by_parent": True,
        })
        assert r.status_code == 200
