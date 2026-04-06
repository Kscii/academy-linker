"""
§9.13–9.17 / §10.3–10.7 / §9.20 讨论区与帖子接口集成测试。

覆盖：
  GET  /api/parents/me/students/{uuid}/discussions/teachers               - 家长视角讨论教师列表
  GET  /api/parents/me/students/{uuid}/discussions/teachers/{teacher_uuid} - 家长与老师讨论页（懒创建 thread）
  GET  /api/teachers/me/students/{uuid}/discussions/parents               - 老师视角讨论家长列表
  GET  /api/teachers/me/students/{uuid}/discussions/parents/{parent_uuid}  - 老师与家长讨论页
  POST /api/threads/{thread_uuid}/posts                                   - 创建帖子
  PATCH /api/posts/{post_uuid}                                            - 编辑帖子
  DELETE /api/posts/{post_uuid}                                           - 删除帖子
  POST /api/threads/{thread_uuid}/read                                    - 标记讨论串已读

注意：讨论 thread 采用懒创建策略，首次访问讨论页时自动创建。
所有帖子测试在同一 thread 内进行，thread_uuid 通过 session 级 fixture 获取。
"""

from __future__ import annotations

import uuid as _uuid

import pytest


# ── Session 级 Fixtures：懒创建 thread 并获取 thread_uuid ───────────────────

@pytest.fixture(scope="module")
def thread_uuid(parent_client, td):
    """
    家长访问讨论页，触发 thread 懒创建，返回 thread_uuid。
    整个讨论测试模块共用同一 thread。
    """
    r = parent_client.get(
        f"/api/parents/me/students/{td['student_uuid']}"
        f"/discussions/teachers/{td['teacher_uuid']}"
    )
    assert r.status_code == 200, f"Parent discussion page failed: {r.text}"
    data = r.json()["data"]
    t_uuid = data["thread_uuid"]
    assert t_uuid is not None, "thread_uuid should be created on first access"
    return t_uuid


# ── 讨论列表 ─────────────────────────────────────────────────────────────────

class TestDiscussionLists:
    def test_parent_lists_teachers(self, parent_client, td):
        """家长应能看到学生关联的老师讨论列表。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/discussions/teachers"
        )
        assert r.status_code == 200
        teachers = r.json()["data"]
        assert isinstance(teachers, list)
        teacher_uuids = [t["uuid"] for t in teachers]
        assert td["teacher_uuid"] in teacher_uuids

    def test_teacher_lists_parents(self, teacher_client, td):
        """老师应能看到学生关联的家长讨论列表。"""
        r = teacher_client.get(
            f"/api/teachers/me/students/{td['student_uuid']}/discussions/parents"
        )
        assert r.status_code == 200
        parents = r.json()["data"]
        assert isinstance(parents, list)
        parent_uuids = [p["uuid"] for p in parents]
        assert td["parent_uuid"] in parent_uuids


# ── 讨论页详情 ────────────────────────────────────────────────────────────────

class TestDiscussionPage:
    def test_parent_discussion_page(self, parent_client, td, thread_uuid):
        """家长访问讨论页应返回 thread_uuid、学生、老师信息。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}"
            f"/discussions/teachers/{td['teacher_uuid']}"
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["thread_uuid"] == thread_uuid
        assert data["student"]["uuid"] == td["student_uuid"]
        assert data["teacher"]["uuid"] == td["teacher_uuid"]
        assert "posts" in data and "meta" in data

    def test_teacher_discussion_page(self, teacher_client, td, thread_uuid):
        """老师访问讨论页应返回相同的 thread_uuid。"""
        r = teacher_client.get(
            f"/api/teachers/me/students/{td['student_uuid']}"
            f"/discussions/parents/{td['parent_uuid']}"
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["thread_uuid"] == thread_uuid

    def test_discussion_page_with_pagination(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}"
            f"/discussions/teachers/{td['teacher_uuid']}",
            params={"page": 1, "page_size": 5},
        )
        assert r.status_code == 200


# ── 帖子 CRUD ─────────────────────────────────────────────────────────────────

class TestPosts:
    @pytest.fixture(scope="class")
    def teacher_post_uuid(self, teacher_client, thread_uuid, td):
        """由 teacher 创建的测试帖子。"""
        r = teacher_client.post(f"/api/threads/{thread_uuid}/posts", json={
            "title": "Teacher Post Title",
            "content_markdown": "Hello from teacher.",
            "tag_uuids": [],
        })
        assert r.status_code == 201, f"Teacher post creation failed: {r.text}"
        return r.json()["data"]["uuid"]

    @pytest.fixture(scope="class")
    def parent_post_uuid(self, parent_client, thread_uuid):
        """由 parent 创建的测试帖子。"""
        r = parent_client.post(f"/api/threads/{thread_uuid}/posts", json={
            "content_markdown": "Hello from parent.",
            "tag_uuids": [],
        })
        assert r.status_code == 201, f"Parent post creation failed: {r.text}"
        return r.json()["data"]["uuid"]

    def test_teacher_creates_post(self, teacher_client, thread_uuid):
        """老师在 thread 中创建帖子，应返回 201 及帖子对象。"""
        r = teacher_client.post(f"/api/threads/{thread_uuid}/posts", json={
            "title": "Informational Post",
            "content_markdown": "Please check the schedule.",
            "tag_uuids": [],
        })
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["author"]["role"] == "teacher"
        assert data["is_deleted"] is False

    def test_parent_creates_post(self, parent_client, thread_uuid):
        """家长在 thread 中创建帖子，应返回 201。"""
        r = parent_client.post(f"/api/threads/{thread_uuid}/posts", json={
            "content_markdown": "Thank you for the update.",
            "tag_uuids": [],
        })
        assert r.status_code == 201
        assert r.json()["data"]["author"]["role"] == "parent"

    def test_post_with_reply(self, parent_client, thread_uuid, teacher_post_uuid):
        """回复帖子应成功并记录 reply_to_post_uuid。"""
        r = parent_client.post(f"/api/threads/{thread_uuid}/posts", json={
            "content_markdown": "Got it, thanks!",
            "tag_uuids": [],
            "reply_to_post_uuid": teacher_post_uuid,
        })
        assert r.status_code == 201
        assert r.json()["data"]["reply_to_post_uuid"] == teacher_post_uuid

    def test_post_with_system_tag(self, teacher_client, thread_uuid, td):
        """携带系统 tag 创建帖子应成功。"""
        r = teacher_client.post(f"/api/threads/{thread_uuid}/posts", json={
            "content_markdown": "Urgent notice.",
            "tag_uuids": [td["system_tag_uuid"]],
        })
        assert r.status_code == 201
        tags = r.json()["data"]["tags"]
        tag_uuids = [t["uuid"] for t in tags]
        assert td["system_tag_uuid"] in tag_uuids

    def test_edit_own_post(self, teacher_client, teacher_post_uuid):
        """老师编辑自己的帖子应成功。"""
        r = teacher_client.patch(f"/api/posts/{teacher_post_uuid}", json={
            "content_markdown": "Updated content by teacher.",
        })
        assert r.status_code == 200
        assert "Updated content" in r.json()["data"]["content_markdown"]

    def test_parent_cannot_edit_teacher_post(self, parent_client, teacher_post_uuid):
        """家长不能编辑老师的帖子，应返回 403。"""
        r = parent_client.patch(f"/api/posts/{teacher_post_uuid}", json={
            "content_markdown": "Hack attempt.",
        })
        assert r.status_code == 403

    def test_teacher_cannot_edit_parent_post(self, teacher_client, parent_post_uuid):
        """老师不能编辑家长的帖子，应返回 403。"""
        r = teacher_client.patch(f"/api/posts/{parent_post_uuid}", json={
            "content_markdown": "Hack attempt.",
        })
        assert r.status_code == 403

    def test_delete_own_post_as_parent(self, parent_client, thread_uuid):
        """家长可以删除自己的帖子。"""
        r = parent_client.post(f"/api/threads/{thread_uuid}/posts", json={
            "content_markdown": "To be deleted.",
            "tag_uuids": [],
        })
        assert r.status_code == 201
        post_uuid = r.json()["data"]["uuid"]

        r = parent_client.delete(f"/api/posts/{post_uuid}")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_delete_own_post_as_teacher(self, teacher_client, thread_uuid):
        """老师可以删除自己的帖子。"""
        r = teacher_client.post(f"/api/threads/{thread_uuid}/posts", json={
            "content_markdown": "Teacher post to delete.",
            "tag_uuids": [],
        })
        assert r.status_code == 201
        post_uuid = r.json()["data"]["uuid"]

        r = teacher_client.delete(f"/api/posts/{post_uuid}")
        assert r.status_code == 200

    def test_parent_cannot_delete_teacher_post(self, parent_client, teacher_post_uuid):
        """家长不能删除老师的帖子，应返回 403。"""
        r = parent_client.delete(f"/api/posts/{teacher_post_uuid}")
        assert r.status_code == 403

    def test_edit_nonexistent_post_returns_404(self, teacher_client):
        r = teacher_client.patch(f"/api/posts/{_uuid.uuid4()}", json={"content_markdown": "x"})
        assert r.status_code == 404


# ── 标记已读 ──────────────────────────────────────────────────────────────────

class TestMarkRead:
    def test_mark_thread_read_as_parent(self, parent_client, thread_uuid):
        """家长标记讨论串已读应返回 200。"""
        r = parent_client.post(f"/api/threads/{thread_uuid}/read")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_mark_thread_read_as_teacher(self, teacher_client, thread_uuid):
        """老师标记讨论串已读应返回 200。"""
        r = teacher_client.post(f"/api/threads/{thread_uuid}/read")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_mark_nonexistent_thread_read_returns_404(self, parent_client):
        r = parent_client.post(f"/api/threads/{_uuid.uuid4()}/read")
        assert r.status_code in (403, 404)
