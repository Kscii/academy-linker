"""
§7.5–7.9 用户个人信息接口 + §8 设置接口集成测试。

覆盖：
  GET    /api/me                          - 获取当前用户信息
  PATCH  /api/me                          - 更新用户资料
  POST   /api/me/change_password          - 修改密码
  GET    /api/me/sessions                 - 会话列表
  DELETE /api/me/sessions/{session_uuid}  - 删除指定会话
  GET    /api/settings                    - 获取设置
  PATCH  /api/settings                    - 更新设置
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from ac_link.run import app
from conftest import BASE_URL, TEACHER_EMAIL, TEST_PASSWORD


# ── GET /api/me ───────────────────────────────────────────────────────────────

class TestGetMe:
    def test_returns_current_user(self, teacher_client, td):
        """已认证用户应能正确获取自己的信息。"""
        r = teacher_client.get("/api/me")
        assert r.status_code == 200
        user = r.json()["data"]["user"]
        assert user["email"] == TEACHER_EMAIL
        assert user["role"] == "teacher"
        assert "uuid" in user
        assert "display_name" in user

    def test_unauthenticated_returns_401(self, seed):
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.get("/api/me")
        assert r.status_code == 401


# ── PATCH /api/me ─────────────────────────────────────────────────────────────

class TestUpdateMe:
    def test_update_display_name(self, teacher_client, td):
        """更新 display_name 应返回更新后的用户信息。"""
        r = teacher_client.patch("/api/me", json={"display_name": "Updated Teacher"})
        assert r.status_code == 200
        user = r.json()["data"]["user"]
        assert user["display_name"] == "Updated Teacher"

        # 恢复原始 display_name
        teacher_client.patch("/api/me", json={"display_name": "Test Teacher"})

    def test_update_phone_number(self, teacher_client, td):
        """更新手机号应成功。"""
        r = teacher_client.patch("/api/me", json={"phone_number": "+61400000001"})
        assert r.status_code == 200
        assert r.json()["data"]["user"]["phone_number"] == "+61400000001"

    def test_clear_phone_number(self, teacher_client, td):
        """将 phone_number 设为 null 应清空手机号。"""
        r = teacher_client.patch("/api/me", json={"phone_number": None})
        assert r.status_code == 200
        assert r.json()["data"]["user"]["phone_number"] is None


# ── POST /api/me/change_password ──────────────────────────────────────────────

class TestChangePassword:
    def test_change_password_success(self, td):
        """修改密码后应能用新密码登录。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/auth/login", json={
                "email": TEACHER_EMAIL,
                "password": TEST_PASSWORD,
            })
            assert r.status_code == 200

            new_password = "NewPass5678"
            r = client.post("/api/me/change_password", json={
                "current_password": TEST_PASSWORD,
                "new_password": new_password,
            })
            assert r.status_code == 200
            assert r.json()["data"]["success"] is True

            # 用新密码可以登录
            r = client.post("/api/auth/login", json={
                "email": TEACHER_EMAIL,
                "password": new_password,
            })
            assert r.status_code == 200

            # 恢复原始密码
            client.post("/api/me/change_password", json={
                "current_password": new_password,
                "new_password": TEST_PASSWORD,
            })

    def test_change_password_wrong_old_password(self, teacher_client):
        """旧密码错误应返回 401。"""
        r = teacher_client.post("/api/me/change_password", json={
            "current_password": "WrongOldPass1",
            "new_password": "NewPass5678",
        })
        assert r.status_code == 401

    def test_change_password_weak_new_password(self, teacher_client):
        """新密码不满足强度规则应返回 422。"""
        r = teacher_client.post("/api/me/change_password", json={
            "current_password": TEST_PASSWORD,
            "new_password": "weakpwd",
        })
        assert r.status_code == 422


# ── GET /api/me/sessions ──────────────────────────────────────────────────────

class TestSessions:
    def test_get_sessions(self, teacher_client):
        """获取会话列表应返回至少一条当前会话。"""
        r = teacher_client.get("/api/me/sessions")
        assert r.status_code == 200
        sessions = r.json()["data"]
        assert isinstance(sessions, list)
        assert len(sessions) >= 1
        # 当前会话的 is_current 应为 true
        current = [s for s in sessions if s.get("is_current")]
        assert len(current) >= 1

    def test_session_fields(self, teacher_client):
        """会话对象应包含必要字段。"""
        r = teacher_client.get("/api/me/sessions")
        session = r.json()["data"][0]
        assert "uuid" in session
        assert "created_at" in session
        assert "last_used_at" in session
        assert "is_current" in session

    def test_delete_other_session(self, td):
        """创建第二个会话后，可以从第一个会话中删除它。"""
        with TestClient(app, base_url=BASE_URL) as session1:
            session1.post("/api/auth/login", json={
                "email": TEACHER_EMAIL, "password": TEST_PASSWORD
            })
            with TestClient(app, base_url=BASE_URL) as session2:
                session2.post("/api/auth/login", json={
                    "email": TEACHER_EMAIL, "password": TEST_PASSWORD
                })
                # 从 session2 获取其 session uuid
                sessions2 = session2.get("/api/me/sessions").json()["data"]
                s2_uuid = next(s["uuid"] for s in sessions2 if s["is_current"])

            # 从 session1 删除 session2 的记录
            r = session1.delete(f"/api/me/sessions/{s2_uuid}")
            assert r.status_code == 200
            assert r.json()["data"]["success"] is True

    def test_delete_nonexistent_session(self, teacher_client):
        """删除不存在的会话应返回 404。"""
        r = teacher_client.delete(
            "/api/me/sessions/00000000-0000-0000-0000-000000000000"
        )
        assert r.status_code == 404


# ── GET /api/settings ─────────────────────────────────────────────────────────

class TestGetSettings:
    def test_returns_settings_object(self, teacher_client):
        """获取设置应返回完整的设置对象。"""
        r = teacher_client.get("/api/settings")
        assert r.status_code == 200
        data = r.json()["data"]
        assert "theme" in data
        assert "tts_enabled" in data
        assert "ai_auto_translate_enabled" in data

    def test_default_theme_is_system(self, teacher_client):
        """默认主题应为 system。"""
        r = teacher_client.get("/api/settings")
        assert r.json()["data"]["theme"] == "system"


# ── PATCH /api/settings ───────────────────────────────────────────────────────

class TestUpdateSettings:
    def test_update_theme(self, teacher_client):
        """更新 theme 应成功并返回更新后的设置。"""
        r = teacher_client.patch("/api/settings", json={"theme": "dark"})
        assert r.status_code == 200
        assert r.json()["data"]["theme"] == "dark"

        # 恢复
        teacher_client.patch("/api/settings", json={"theme": "system"})

    def test_update_language(self, teacher_client):
        """更新 language 应成功。"""
        r = teacher_client.patch("/api/settings", json={"language": "zh-CN"})
        assert r.status_code == 200
        assert r.json()["data"]["language"] == "zh-CN"

    def test_update_ai_auto_translate(self, teacher_client):
        """更新 ai_auto_translate_enabled 应成功。"""
        r = teacher_client.patch("/api/settings", json={"ai_auto_translate_enabled": False})
        assert r.status_code == 200
        assert r.json()["data"]["ai_auto_translate_enabled"] is False

        # 恢复
        teacher_client.patch("/api/settings", json={"ai_auto_translate_enabled": True})

    def test_update_invalid_theme_returns_422(self, teacher_client):
        """传入非法 theme 值应返回 422。"""
        r = teacher_client.patch("/api/settings", json={"theme": "invalid_theme"})
        assert r.status_code == 422
