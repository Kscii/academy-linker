"""
§12C TTS 接口集成测试。

覆盖：
  GET  /api/tts/voices
  POST /api/tts/resolve
  GET  /api/tts/audio/{audio_uuid}
"""

from __future__ import annotations

import uuid as _uuid

from ac_link.config.config import settings


_BASE_RESOURCE = {
    "title": "TTS Test Resource",
    "summary": "A test summary",
    "content_markdown": "## Hello\n\nTest content.",
    "category_key": "tts_test_category",
    "category_label": "TTS Test Category",
    "audience_role": "all",
    "cover_image_url": None,
    "external_url": None,
    "is_pinned": False,
    "is_published": True,
    "published_at": "2026-01-01T00:00:00Z",
    "original_language": "en-AU",
}


def _create_resource(admin_client, **overrides) -> dict:
    body = {**_BASE_RESOURCE, **overrides}
    r = admin_client.post("/api/admin/resources", json=body)
    assert r.status_code == 201, f"create resource failed: {r.text}"
    return r.json()["data"]


def _delete_resource(admin_client, uuid: str):
    admin_client.delete(f"/api/admin/resources/{uuid}")


class TestTtsVoices:
    def test_list_voices(self, parent_client, monkeypatch):
        monkeypatch.setattr(
            "ac_link.api.tts_api.list_available_voices",
            lambda language=None: [
                {"name": "Kore", "languageCodes": ["en-US"]},
                {"name": "Puck", "languageCodes": ["en-US"]},
                {"name": "Aoede", "languageCodes": ["zh-CN"]},
            ],
        )
        r = parent_client.get("/api/tts/voices")
        assert r.status_code == 200
        data = r.json()["data"]
        assert len(data) >= 2
        assert any(item["language"] == "en-US" for item in data)
        assert any(item["language"] == "zh-CN" for item in data)
        assert all(item["provider"] == "gemini" for item in data)

    def test_list_voices_filter_by_language(self, parent_client, monkeypatch):
        monkeypatch.setattr(
            "ac_link.api.tts_api.list_available_voices",
            lambda language=None: [
                {"name": "Aoede", "languageCodes": ["zh-CN"]},
            ],
        )
        r = parent_client.get("/api/tts/voices", params={"language": "zh"})
        assert r.status_code == 200
        data = r.json()["data"]
        assert data
        assert all(item["language"].startswith("zh") for item in data)


class TestTtsResolve:
    def test_resolve_ad_hoc_and_stream_audio(self, parent_client, monkeypatch, tmp_path):
        fake_audio = b"RIFF\x00\x00\x00\x00WAVEtest-audio"
        unique_text = f"Read this aloud {_uuid.uuid4().hex}"
        monkeypatch.setattr(settings, "tts_storage_dir", str(tmp_path))
        monkeypatch.setattr(settings, "tts_api_key", "gemini-key")
        monkeypatch.setattr("ac_link.api.tts_api.synthesize_text", lambda **_: fake_audio)

        r = parent_client.post(
            "/api/tts/resolve",
            json={
                "resource_type": "ad_hoc",
                "text": unique_text,
                "target_language": "en-US",
            },
        )
        assert r.status_code == 200, r.text
        data = r.json()["data"]
        assert data["cached"] is False
        assert data["mime_type"] == "audio/wav"
        assert data["provider"] == "gemini"

        audio_resp = parent_client.get(data["audio_url"])
        assert audio_resp.status_code == 200
        assert audio_resp.content == fake_audio

    def test_resolve_ad_hoc_reuses_cache(self, parent_client, monkeypatch, tmp_path):
        calls = {"count": 0}
        unique_text = f"Cache me {_uuid.uuid4().hex}"

        def fake_synthesize(**_: object) -> bytes:
            calls["count"] += 1
            return b"RIFF\x00\x00\x00\x00WAVEcache-audio"

        monkeypatch.setattr(settings, "tts_storage_dir", str(tmp_path))
        monkeypatch.setattr(settings, "tts_api_key", "gemini-key")
        monkeypatch.setattr("ac_link.api.tts_api.synthesize_text", fake_synthesize)

        body = {
            "resource_type": "ad_hoc",
            "text": unique_text,
            "target_language": "en-US",
        }
        first = parent_client.post("/api/tts/resolve", json=body)
        second = parent_client.post("/api/tts/resolve", json=body)
        assert first.status_code == 200
        assert second.status_code == 200
        assert first.json()["data"]["cached"] is False
        assert second.json()["data"]["cached"] is True
        assert calls["count"] == 1

    def test_resolve_report_uses_translated_content(self, parent_client, teacher_client, td, monkeypatch, tmp_path):
        unique_content = f"Weekly report body for TTS {_uuid.uuid4().hex}."
        translated_content = f"用于 TTS 的周报正文 {_uuid.uuid4().hex}"
        created = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/reports",
            json={
                "title": "TTS translation source",
                "report_type": "weekly",
                "subject_uuid": td["subject_uuid"],
                "content_markdown": unique_content,
                "original_language": "en-AU",
                "translation_status": "not_required",
            },
        )
        assert created.status_code == 201, created.text
        report_uuid = created.json()["data"]["uuid"]

        seen: dict[str, str] = {}

        def fake_translate(content: str, target_language: str) -> str:
            assert content == unique_content
            assert target_language == "zh-CN"
            return translated_content

        def fake_synthesize(*, text: str, language: str, voice_key: str) -> bytes:
            seen["text"] = text
            seen["language"] = language
            seen["voice_key"] = voice_key
            return b"RIFF\x00\x00\x00\x00WAVEreport-audio"

        monkeypatch.setattr(settings, "tts_storage_dir", str(tmp_path))
        monkeypatch.setattr(settings, "tts_api_key", "gemini-key")
        monkeypatch.setattr(settings, "tts_voice_zh", "Aoede")
        monkeypatch.setattr("ac_link.api.tts_api.translate_content", fake_translate)
        monkeypatch.setattr("ac_link.api.tts_api.synthesize_text", fake_synthesize)

        r = parent_client.post(
            "/api/tts/resolve",
            json={
                "resource_type": "report",
                "resource_uuid": report_uuid,
                "target_language": "zh-CN",
            },
        )
        assert r.status_code == 200, r.text
        assert seen["text"] == translated_content
        assert seen["language"] == "zh-CN"
        assert seen["voice_key"] == "Aoede"

    def test_resolve_report_falls_back_to_original_when_llm_unconfigured(self, parent_client, teacher_client, td, monkeypatch, tmp_path):
        unique_content = f"Fallback source {_uuid.uuid4().hex}."
        created = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/reports",
            json={
                "title": "TTS fallback source",
                "report_type": "weekly",
                "subject_uuid": td["subject_uuid"],
                "content_markdown": unique_content,
                "original_language": "en-AU",
                "translation_status": "not_required",
            },
        )
        assert created.status_code == 201, created.text
        report_uuid = created.json()["data"]["uuid"]

        seen: dict[str, str] = {}

        def fake_synthesize(*, text: str, language: str, voice_key: str) -> bytes:
            seen["text"] = text
            seen["language"] = language
            seen["voice_key"] = voice_key
            return b"RIFF\x00\x00\x00\x00WAVEfallback-audio"

        monkeypatch.setattr(settings, "tts_storage_dir", str(tmp_path))
        monkeypatch.setattr(settings, "tts_api_key", "gemini-key")
        monkeypatch.setattr(settings, "tts_voice_zh", "Aoede")
        monkeypatch.setattr("ac_link.api.tts_api.is_llm_configured", lambda: False)
        monkeypatch.setattr("ac_link.api.tts_api.synthesize_text", fake_synthesize)

        r = parent_client.post(
            "/api/tts/resolve",
            json={
                "resource_type": "report",
                "resource_uuid": report_uuid,
                "target_language": "zh-CN",
            },
        )
        assert r.status_code == 200, r.text
        assert seen["text"] == unique_content
        assert seen["language"] == "en-AU"
        assert seen["voice_key"] == "Kore"

    def test_resolve_without_configuration_returns_503(self, parent_client, monkeypatch, tmp_path):
        monkeypatch.setattr(settings, "tts_storage_dir", str(tmp_path))
        monkeypatch.setattr(settings, "tts_api_key", "")

        r = parent_client.post(
            "/api/tts/resolve",
            json={
                "resource_type": "ad_hoc",
                "text": "Config required",
                "target_language": "en-US",
            },
        )
        assert r.status_code == 503
        assert r.json()["error"]["code"] == "tts_not_configured"

    def test_resolve_resource_enforces_audience_access(self, admin_client, teacher_client, monkeypatch, tmp_path):
        monkeypatch.setattr(settings, "tts_storage_dir", str(tmp_path))
        monkeypatch.setattr(settings, "tts_api_key", "gemini-key")
        monkeypatch.setattr(settings, "tts_voice_zh", "Aoede")
        resource = _create_resource(admin_client, audience_role="parent")

        try:
            r = teacher_client.post(
                "/api/tts/resolve",
                json={
                    "resource_type": "resource",
                    "resource_uuid": resource["uuid"],
                    "target_language": "en-AU",
                },
            )
            assert r.status_code == 403
        finally:
            _delete_resource(admin_client, resource["uuid"])

    def test_ad_hoc_audio_is_private_to_creator(self, parent_client, teacher_client, monkeypatch, tmp_path):
        fake_audio = b"RIFF\x00\x00\x00\x00WAVEprivate-audio"
        monkeypatch.setattr(settings, "tts_storage_dir", str(tmp_path))
        monkeypatch.setattr(settings, "tts_api_key", "gemini-key")
        monkeypatch.setattr("ac_link.api.tts_api.synthesize_text", lambda **_: fake_audio)

        created = parent_client.post(
            "/api/tts/resolve",
            json={
                "resource_type": "ad_hoc",
                "text": f"Private TTS {_uuid.uuid4().hex}",
                "target_language": "en-US",
            },
        )
        assert created.status_code == 200, created.text

        audio_resp = teacher_client.get(created.json()["data"]["audio_url"])
        assert audio_resp.status_code == 404

    def test_get_missing_audio_returns_404(self, parent_client):
        r = parent_client.get(f"/api/tts/audio/{_uuid.uuid4()}")
        assert r.status_code == 404
