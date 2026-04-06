"""
§12.3–12.9 AI 会话接口集成测试。

覆盖：
  GET    /api/ai/conversations                           - 获取会话列表
  POST   /api/ai/conversations                           - 创建会话
  GET    /api/ai/conversations/{uuid}                    - 获取会话详情（含消息）
  POST   /api/ai/conversations/{uuid}/archive            - 归档会话
  POST   /api/ai/conversations/{uuid}/unarchive          - 取消归档
  DELETE /api/ai/conversations/{uuid}                    - 删除会话

跳过的接口（需要真实 LLM）：
  POST /api/teachers/me/students/{uuid}/ai-reports       - AI 报告生成（需 OpenAI API）
  POST /api/ai/conversations/{uuid}/messages             - 发送 AI 消息（需 OpenAI API）
  POST /api/translations/resolve                         - 翻译解析（需 OpenAI API）

以上接口通过 pytest.mark.skip 明确标记，方便接入 LLM 后取消该标记。
"""

from __future__ import annotations

import uuid as _uuid

import pytest


# ── 会话 CRUD ─────────────────────────────────────────────────────────────────

class TestAiConversations:
    @pytest.fixture(scope="class")
    def global_conv_uuid(self, teacher_client):
        """创建一个 global context 的 AI 会话，类内共用。"""
        r = teacher_client.post("/api/ai/conversations", json={
            "context_type": "global",
            "title": "Test Global Conversation",
        })
        assert r.status_code == 201, f"Create AI conversation failed: {r.text}"
        return r.json()["data"]["uuid"]

    @pytest.fixture(scope="class")
    def student_conv_uuid(self, teacher_client, td):
        """创建一个 student context 的 AI 会话，类内共用。"""
        r = teacher_client.post("/api/ai/conversations", json={
            "context_type": "student",
            "student_uuid": td["student_uuid"],
            "title": "Student Context Conversation",
        })
        assert r.status_code == 201
        return r.json()["data"]["uuid"]

    def test_list_conversations(self, teacher_client):
        """获取会话列表应返回分页数据。"""
        r = teacher_client.get("/api/ai/conversations")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        assert isinstance(body["data"], list)

    def test_list_conversations_archived_filter(self, teacher_client):
        r = teacher_client.get("/api/ai/conversations", params={"archived": False})
        assert r.status_code == 200

    def test_create_global_conversation(self, teacher_client):
        """创建 global 类型会话时 student_uuid/subject_uuid 必须为 null。"""
        r = teacher_client.post("/api/ai/conversations", json={
            "context_type": "global",
        })
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["context_type"] == "global"
        assert data["student_uuid"] is None
        assert data["subject_uuid"] is None
        # 清理
        teacher_client.delete(f"/api/ai/conversations/{data['uuid']}")

    def test_create_student_conversation(self, teacher_client, td):
        """创建 student 类型会话必须提供 student_uuid。"""
        r = teacher_client.post("/api/ai/conversations", json={
            "context_type": "student",
            "student_uuid": td["student_uuid"],
        })
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["context_type"] == "student"
        assert data["student_uuid"] == td["student_uuid"]
        # 清理
        teacher_client.delete(f"/api/ai/conversations/{data['uuid']}")

    def test_create_subject_conversation(self, teacher_client, td):
        """创建 subject 类型会话必须同时提供 student_uuid 和 subject_uuid。"""
        r = teacher_client.post("/api/ai/conversations", json={
            "context_type": "subject",
            "student_uuid": td["student_uuid"],
            "subject_uuid": td["subject_uuid"],
        })
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["context_type"] == "subject"
        assert data["subject_uuid"] == td["subject_uuid"]
        # 清理
        teacher_client.delete(f"/api/ai/conversations/{data['uuid']}")

    def test_create_global_conv_with_student_uuid_returns_422(self, teacher_client, td):
        """global 类型不应携带 student_uuid，应返回 422/400。"""
        r = teacher_client.post("/api/ai/conversations", json={
            "context_type": "global",
            "student_uuid": td["student_uuid"],
        })
        assert r.status_code in (400, 422)

    def test_get_conversation_detail(self, teacher_client, global_conv_uuid):
        """获取会话详情应返回会话对象及消息列表。"""
        r = teacher_client.get(f"/api/ai/conversations/{global_conv_uuid}")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["uuid"] == global_conv_uuid
        assert "messages" in data
        assert isinstance(data["messages"], list)

    def test_get_nonexistent_conversation_returns_404(self, teacher_client):
        r = teacher_client.get(f"/api/ai/conversations/{_uuid.uuid4()}")
        assert r.status_code == 404

    def test_archive_and_unarchive_conversation(self, teacher_client, global_conv_uuid):
        """归档后应能取消归档。"""
        r = teacher_client.post(f"/api/ai/conversations/{global_conv_uuid}/archive")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

        # 归档后再归档应返回 409
        r = teacher_client.post(f"/api/ai/conversations/{global_conv_uuid}/archive")
        assert r.status_code == 409

        r = teacher_client.post(f"/api/ai/conversations/{global_conv_uuid}/unarchive")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_delete_conversation(self, teacher_client, student_conv_uuid):
        """删除会话后应返回 200，会话不再出现在列表中。"""
        r = teacher_client.delete(f"/api/ai/conversations/{student_conv_uuid}")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

        # 删除后列表中应不包含该会话（软删除：不出现在默认列表）
        r = teacher_client.get("/api/ai/conversations")
        uuids = [c["uuid"] for c in r.json()["data"]]
        assert student_conv_uuid not in uuids

    def test_delete_nonexistent_conversation_returns_404(self, teacher_client):
        r = teacher_client.delete(f"/api/ai/conversations/{_uuid.uuid4()}")
        assert r.status_code == 404

    def test_other_user_cannot_access_conversation(self, parent_client, global_conv_uuid):
        """其他用户不能访问别人的 AI 会话，应返回 403/404。"""
        r = parent_client.get(f"/api/ai/conversations/{global_conv_uuid}")
        assert r.status_code in (403, 404)


# ── 跳过需要 LLM 的接口 ────────────────────────────────────────────────────────

class TestAiSkipped:
    @pytest.mark.skip(reason="需要真实 LLM API（OpenAI/compatible），集成测试环境跳过")
    def test_send_ai_message(self, teacher_client, td):
        """发送 AI 消息需要真实的 LLM API key。"""
        r = teacher_client.post("/api/ai/conversations", json={"context_type": "global"})
        conv_uuid = r.json()["data"]["uuid"]

        r = teacher_client.post(f"/api/ai/conversations/{conv_uuid}/messages", json={
            "message": "Hello, AI!",
            "preset": "default",
        })
        assert r.status_code == 201
        data = r.json()["data"]
        assert "user_message" in data
        assert "assistant_message" in data

    @pytest.mark.skip(reason="需要真实 LLM API，集成测试环境跳过")
    def test_generate_ai_report(self, teacher_client, td):
        """AI 报告生成需要真实的 LLM API key。"""
        from datetime import date
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/ai-reports",
            json={
                "report_type": "weekly",
                "subject_uuid": td["subject_uuid"],
                "period_start": str(date.today()),
                "period_end": str(date.today()),
            },
        )
        assert r.status_code == 201

    @pytest.mark.skip(reason="需要真实 LLM API，集成测试环境跳过")
    def test_resolve_translation(self, teacher_client, td):
        """翻译解析接口在缺少缓存时需要调用 LLM API。"""
        r = teacher_client.post("/api/translations/resolve", json={
            "resource_type": "report",
            "resource_uuid": "some-report-uuid",
        })
        assert r.status_code == 200
