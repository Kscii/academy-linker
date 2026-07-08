"""
§7 认证接口集成测试。

覆盖：
  POST /api/auth/login        - 登录
  POST /api/auth/refresh      - 刷新 Access Token
  POST /api/auth/logout       - 登出当前设备
  POST /api/auth/logout_all   - 登出所有设备
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from ac_link.run import app
from conftest import ADMIN_EMAIL, BASE_URL, TEST_PASSWORD


# ── 登录 ─────────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_success(self, seed):
        """正确凭据登录，应返回 200 及用户信息，并通过 Set-Cookie 设置 token。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": TEST_PASSWORD,
            })
        assert r.status_code == 200
        body = r.json()
        assert "data" in body
        user = body["data"]["user"]
        assert user["email"] == ADMIN_EMAIL
        assert user["role"] == "admin"
        assert "uuid" in user
        assert "display_name" in user

    def test_login_wrong_password(self, seed):
        """密码错误应返回 401。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": "WrongPass999",
            })
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "unauthenticated"

    def test_login_nonexistent_user(self, seed):
        """不存在的邮箱应返回 401。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/auth/login", json={
                "email": "nobody.aclink@example.com",
                "password": TEST_PASSWORD,
            })
        assert r.status_code == 401

    def test_login_missing_fields(self, seed):
        """缺少必填字段应返回 422。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL})
        assert r.status_code == 422

    def test_login_sets_cookies(self, seed):
        """登录后 Cookie 中应携带 access_token。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": TEST_PASSWORD,
            })
            assert r.status_code == 200
            # access_token cookie 应存在
            assert "access_token" in client.cookies

    def test_login_remember_me(self, seed):
        """remember_me=True 登录成功后用户信息应与普通登录一致。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": TEST_PASSWORD,
                "remember_me": True,
            })
        assert r.status_code == 200
        assert r.json()["data"]["user"]["email"] == ADMIN_EMAIL


# ── 刷新 Access Token ─────────────────────────────────────────────────────────

class TestRefresh:
    def test_refresh_success(self, seed):
        """使用有效的 refresh_token 刷新 access_token 应返回 200。"""
        with TestClient(app, base_url=BASE_URL) as client:
            client.post("/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": TEST_PASSWORD,
            })
            r = client.post("/api/auth/refresh")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_refresh_without_token_returns_401(self, seed):
        """未登录状态下刷新应返回 401。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/auth/refresh")
        assert r.status_code == 401


# ── 登出 ─────────────────────────────────────────────────────────────────────

class TestLogout:
    def test_logout_current_device(self, seed):
        """登出当前设备应返回 200 success=true。"""
        with TestClient(app, base_url=BASE_URL) as client:
            client.post("/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": TEST_PASSWORD,
            })
            r = client.post("/api/auth/logout")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_logout_clears_session(self, seed):
        """登出后再次访问需要认证的接口应返回 401。"""
        with TestClient(app, base_url=BASE_URL) as client:
            client.post("/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": TEST_PASSWORD,
            })
            client.post("/api/auth/logout")
            # access_token cookie 已清除，再次访问需认证接口应返回 401
            r = client.get("/api/me")
        assert r.status_code == 401

    def test_logout_all_devices(self, seed):
        """登出所有设备应返回 200 success=true。"""
        with TestClient(app, base_url=BASE_URL) as client:
            client.post("/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": TEST_PASSWORD,
            })
            r = client.post("/api/auth/logout_all")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True


# ── 认证保护 ─────────────────────────────────────────────────────────────────

class TestAuthGuard:
    def test_unauthenticated_access_returns_401(self, seed):
        """未登录请求受保护接口应返回 401。"""
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.get("/api/me")
        assert r.status_code == 401

    def test_role_guard_parent_cannot_access_admin(self, parent_client):
        """parent 角色访问 admin 专有接口应返回 403。"""
        r = parent_client.get("/api/admin/users")
        assert r.status_code == 403
        assert r.json()["error"]["code"] == "role_not_allowed"

    def test_role_guard_teacher_cannot_access_admin(self, teacher_client):
        """teacher 角色访问 admin 专有接口应返回 403。"""
        r = teacher_client.get("/api/admin/users")
        assert r.status_code == 403
