"""
§12A 资源中心接口集成测试。

覆盖：
  GET    /api/resources                          §12A.1 获取资源列表
  GET    /api/resources/categories               §12A.2 获取资源分类列表
  GET    /api/resources/{resource_uuid}          §12A.3 获取资源详情
  GET    /api/admin/resources                    §12A.4 Admin 获取资源列表
  POST   /api/admin/resources                    §12A.5 Admin 创建资源
  PATCH  /api/admin/resources/{resource_uuid}    §12A.6 Admin 更新资源
  DELETE /api/admin/resources/{resource_uuid}    §12A.7 Admin 删除资源

测试策略：
  - 每个 class 内通过 admin API 创建独立的临时资源，测试后清理（或依赖 CASCADE）。
  - 使用 session 级 client fixture（admin_client / teacher_client / parent_client）。
  - 列表/分类接口通过已知 UUID 验证结果中包含预期数据，而不要求恰好等于某个集合
    （避免与其他测试的临时数据冲突）。
"""

from __future__ import annotations

import uuid as _uuid

import pytest
from starlette.testclient import TestClient

from ac_link.run import app
from conftest import ADMIN_EMAIL, BASE_URL, TEST_PASSWORD

# ─────────────────────────────────────────────────────────────────────────────
# 辅助：资源 CRUD 快捷函数
# ─────────────────────────────────────────────────────────────────────────────

_BASE_RESOURCE = {
    "title": "Test Resource",
    "summary": "A test summary",
    "content_markdown": "## Hello\n\nTest content.",
    "category_key": "test_category",
    "category_label": "Test Category",
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


# ─────────────────────────────────────────────────────────────────────────────
# §12A.5  Admin 创建资源  POST /api/admin/resources
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminCreateResource:
    def test_create_returns_201(self, admin_client, seed):
        r = admin_client.post("/api/admin/resources", json=_BASE_RESOURCE)
        assert r.status_code == 201
        _delete_resource(admin_client, r.json()["data"]["uuid"])

    def test_create_response_structure(self, admin_client, seed):
        """创建后返回结构应与 §12A.3 定义的 ResourceDetail 一致。"""
        r = admin_client.post("/api/admin/resources", json=_BASE_RESOURCE)
        assert r.status_code == 201
        data = r.json()["data"]
        required = {
            "uuid", "title", "summary", "category_key", "category_label",
            "audience_role", "cover_image_url", "external_url", "is_pinned",
            "published_at", "display_content_markdown",
            "original_content_markdown", "translated_content_markdown",
            "display_language", "original_language",
            "translated_language", "translation_status", "translated_at",
        }
        missing = required - set(data.keys())
        assert not missing, f"Response missing fields: {missing}"
        _delete_resource(admin_client, data["uuid"])

    def test_create_fields_are_persisted(self, admin_client, seed):
        """创建请求的各字段应正确持久化并在响应中返回。"""
        unique = _uuid.uuid4().hex[:6]
        body = {
            "title": f"Persist Test {unique}",
            "summary": "Summary here",
            "content_markdown": "# Content",
            "category_key": "welfare",
            "category_label": "Welfare",
            "audience_role": "parent",
            "cover_image_url": "https://example.com/img.png",
            "external_url": "https://example.com/link",
            "is_pinned": True,
            "is_published": True,
            "published_at": "2026-03-01T08:00:00Z",
            "original_language": "zh",
        }
        r = admin_client.post("/api/admin/resources", json=body)
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["title"] == body["title"]
        assert data["summary"] == body["summary"]
        assert data["category_key"] == body["category_key"]
        assert data["category_label"] == body["category_label"]
        assert data["audience_role"] == body["audience_role"]
        assert data["cover_image_url"] == body["cover_image_url"]
        assert data["external_url"] == body["external_url"]
        assert data["is_pinned"] is True
        assert data["original_language"] == body["original_language"]
        # original_content_markdown 应与 content_markdown 相同
        assert data["original_content_markdown"] == body["content_markdown"]
        _delete_resource(admin_client, data["uuid"])

    def test_create_invalid_audience_role_returns_422(self, admin_client, seed):
        r = admin_client.post("/api/admin/resources", json={**_BASE_RESOURCE, "audience_role": "student"})
        assert r.status_code == 422

    def test_create_unpublished_resource(self, admin_client, seed):
        r = admin_client.post("/api/admin/resources", json={**_BASE_RESOURCE, "is_published": False})
        assert r.status_code == 201
        data = r.json()["data"]
        _delete_resource(admin_client, data["uuid"])

    def test_non_admin_cannot_create(self, teacher_client, seed):
        r = teacher_client.post("/api/admin/resources", json=_BASE_RESOURCE)
        assert r.status_code == 403

    def test_unauthenticated_cannot_create(self, seed):
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.post("/api/admin/resources", json=_BASE_RESOURCE)
        assert r.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# §12A.6  Admin 更新资源  PATCH /api/admin/resources/{uuid}
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminUpdateResource:
    def test_patch_title(self, admin_client, seed):
        res = _create_resource(admin_client)
        r = admin_client.patch(f"/api/admin/resources/{res['uuid']}", json={"title": "Updated Title"})
        assert r.status_code == 200
        assert r.json()["data"]["title"] == "Updated Title"
        _delete_resource(admin_client, res["uuid"])

    def test_patch_response_is_resource_detail(self, admin_client, seed):
        """更新响应结构应与 §12A.3 ResourceDetail 一致。"""
        res = _create_resource(admin_client)
        r = admin_client.patch(
            f"/api/admin/resources/{res['uuid']}",
            json={"summary": "New summary"},
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert "display_content_markdown" in data
        assert "original_content_markdown" in data
        _delete_resource(admin_client, res["uuid"])

    def test_patch_content_syncs_original(self, admin_client, seed):
        """更新 content_markdown 时 original_content_markdown 应同步更新。"""
        res = _create_resource(admin_client)
        new_content = "# Updated Content\n\nNew body."
        r = admin_client.patch(
            f"/api/admin/resources/{res['uuid']}",
            json={"content_markdown": new_content},
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["original_content_markdown"] == new_content
        _delete_resource(admin_client, res["uuid"])

    def test_patch_is_published(self, admin_client, seed):
        res = _create_resource(admin_client, is_published=False)
        r = admin_client.patch(f"/api/admin/resources/{res['uuid']}", json={"is_published": True})
        assert r.status_code == 200
        _delete_resource(admin_client, res["uuid"])

    def test_patch_invalid_audience_role_returns_422(self, admin_client, seed):
        res = _create_resource(admin_client)
        r = admin_client.patch(f"/api/admin/resources/{res['uuid']}", json={"audience_role": "student"})
        assert r.status_code == 422
        _delete_resource(admin_client, res["uuid"])

    def test_patch_nonexistent_returns_404(self, admin_client, seed):
        fake = _uuid.uuid4()
        r = admin_client.patch(f"/api/admin/resources/{fake}", json={"title": "x"})
        assert r.status_code == 404

    def test_non_admin_cannot_patch(self, teacher_client, admin_client, seed):
        res = _create_resource(admin_client)
        r = teacher_client.patch(f"/api/admin/resources/{res['uuid']}", json={"title": "x"})
        assert r.status_code == 403
        _delete_resource(admin_client, res["uuid"])


# ─────────────────────────────────────────────────────────────────────────────
# §12A.7  Admin 删除资源  DELETE /api/admin/resources/{uuid}
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminDeleteResource:
    def test_delete_returns_200_with_success(self, admin_client, seed):
        res = _create_resource(admin_client)
        r = admin_client.delete(f"/api/admin/resources/{res['uuid']}")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_delete_makes_resource_inaccessible(self, admin_client, seed):
        """删除后再查详情应返回 404。"""
        res = _create_resource(admin_client)
        admin_client.delete(f"/api/admin/resources/{res['uuid']}")
        r = admin_client.get(f"/api/resources/{res['uuid']}")
        assert r.status_code == 404

    def test_delete_nonexistent_returns_404(self, admin_client, seed):
        fake = _uuid.uuid4()
        r = admin_client.delete(f"/api/admin/resources/{fake}")
        assert r.status_code == 404

    def test_non_admin_cannot_delete(self, teacher_client, admin_client, seed):
        res = _create_resource(admin_client)
        r = teacher_client.delete(f"/api/admin/resources/{res['uuid']}")
        assert r.status_code == 403
        _delete_resource(admin_client, res["uuid"])


# ─────────────────────────────────────────────────────────────────────────────
# §12A.4  Admin 获取资源列表  GET /api/admin/resources
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminListResources:
    def test_list_returns_200_paginated(self, admin_client, seed):
        r = admin_client.get("/api/admin/resources")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body
        assert "meta" in body
        meta = body["meta"]
        assert "page" in meta
        assert "page_size" in meta
        assert "total" in meta
        assert "total_pages" in meta

    def test_list_item_structure(self, admin_client, seed):
        """列表项结构应与 §12A.1 ResourceListItem 一致（含 translation 块）。"""
        res = _create_resource(admin_client)
        r = admin_client.get("/api/admin/resources")
        assert r.status_code == 200
        items = r.json()["data"]
        uuids = [i["uuid"] for i in items]
        assert res["uuid"] in uuids, "新建资源应出现在列表中"
        item = next(i for i in items if i["uuid"] == res["uuid"])
        for field in ("uuid", "title", "summary", "category_key", "category_label",
                      "audience_role", "cover_image_url", "external_url",
                      "is_pinned", "published_at"):
            assert field in item, f"Missing field: {field}"
        assert "translation" in item
        trans = item["translation"]
        for tf in ("display_language", "original_language", "translated_language",
                   "translation_status", "translated_at"):
            assert tf in trans, f"Missing translation field: {tf}"
        _delete_resource(admin_client, res["uuid"])

    def test_admin_can_see_unpublished(self, admin_client, seed):
        """Admin 列表应能看到未发布资源。"""
        res = _create_resource(admin_client, is_published=False)
        r = admin_client.get("/api/admin/resources", params={"is_published": False})
        assert r.status_code == 200
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res["uuid"] in uuids
        _delete_resource(admin_client, res["uuid"])

    def test_filter_by_category(self, admin_client, seed):
        unique_cat = f"cat_{_uuid.uuid4().hex[:6]}"
        res = _create_resource(admin_client, category_key=unique_cat, category_label="Unique Cat")
        r = admin_client.get("/api/admin/resources", params={"category": unique_cat})
        assert r.status_code == 200
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res["uuid"] in uuids
        _delete_resource(admin_client, res["uuid"])

    def test_filter_by_keyword(self, admin_client, seed):
        unique_kw = _uuid.uuid4().hex[:12]
        res = _create_resource(admin_client, title=f"KW {unique_kw}")
        r = admin_client.get("/api/admin/resources", params={"keyword": unique_kw})
        assert r.status_code == 200
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res["uuid"] in uuids
        _delete_resource(admin_client, res["uuid"])

    def test_filter_by_audience_role(self, admin_client, seed):
        res = _create_resource(admin_client, audience_role="teacher")
        r = admin_client.get("/api/admin/resources", params={"audience_role": "teacher"})
        assert r.status_code == 200
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res["uuid"] in uuids
        _delete_resource(admin_client, res["uuid"])

    def test_sort_title_asc_accepted(self, admin_client, seed):
        r = admin_client.get("/api/admin/resources", params={"sort": "title_asc"})
        assert r.status_code == 200

    def test_sort_published_at_desc_accepted(self, admin_client, seed):
        r = admin_client.get("/api/admin/resources", params={"sort": "published_at_desc"})
        assert r.status_code == 200

    def test_invalid_sort_returns_400(self, admin_client, seed):
        r = admin_client.get("/api/admin/resources", params={"sort": "invalid_sort"})
        assert r.status_code == 400

    def test_non_admin_cannot_access(self, teacher_client, seed):
        r = teacher_client.get("/api/admin/resources")
        assert r.status_code == 403

    def test_is_published_filter_true(self, admin_client, seed):
        res_pub = _create_resource(admin_client, is_published=True)
        res_unp = _create_resource(admin_client, is_published=False)
        r = admin_client.get("/api/admin/resources", params={"is_published": True})
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res_pub["uuid"] in uuids
        assert res_unp["uuid"] not in uuids
        _delete_resource(admin_client, res_pub["uuid"])
        _delete_resource(admin_client, res_unp["uuid"])


# ─────────────────────────────────────────────────────────────────────────────
# §12A.1  获取资源列表  GET /api/resources
# ─────────────────────────────────────────────────────────────────────────────

class TestListResources:
    def test_unauthenticated_returns_401(self, seed):
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.get("/api/resources")
        assert r.status_code == 401

    def test_returns_200_paginated(self, teacher_client, seed):
        r = teacher_client.get("/api/resources")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body

    def test_response_item_structure(self, admin_client, teacher_client, seed):
        """列表项结构完全对应文档 §12A.1。"""
        res = _create_resource(admin_client, audience_role="teacher")
        r = teacher_client.get("/api/resources")
        items = r.json()["data"]
        uuids = [i["uuid"] for i in items]
        assert res["uuid"] in uuids
        item = next(i for i in items if i["uuid"] == res["uuid"])
        for field in ("uuid", "title", "summary", "category_key", "category_label",
                      "audience_role", "cover_image_url", "external_url",
                      "is_pinned", "published_at", "translation"):
            assert field in item, f"Missing field: {field}"
        # translation 块字段
        for tf in ("display_language", "original_language", "translated_language",
                   "translation_status", "translated_at"):
            assert tf in item["translation"], f"Missing translation field: {tf}"
        _delete_resource(admin_client, res["uuid"])

    def test_only_published_resources_returned(self, admin_client, teacher_client, seed):
        """公开接口只返回 is_published=True 的资源。"""
        res_pub = _create_resource(admin_client, audience_role="all", is_published=True)
        res_unp = _create_resource(admin_client, audience_role="all", is_published=False)
        r = teacher_client.get("/api/resources")
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res_pub["uuid"] in uuids
        assert res_unp["uuid"] not in uuids
        _delete_resource(admin_client, res_pub["uuid"])
        _delete_resource(admin_client, res_unp["uuid"])

    def test_audience_role_all_visible_to_all_roles(self, admin_client, teacher_client, parent_client, seed):
        """audience_role=all 的资源应对 teacher 和 parent 均可见。"""
        res = _create_resource(admin_client, audience_role="all")
        for client in (teacher_client, parent_client):
            r = client.get("/api/resources")
            uuids = [i["uuid"] for i in r.json()["data"]]
            assert res["uuid"] in uuids, f"audience=all 资源对 {client} 不可见"
        _delete_resource(admin_client, res["uuid"])

    def test_teacher_only_resource_not_visible_to_parent(self, admin_client, parent_client, seed):
        """audience_role=teacher 的资源不应对 parent 可见。"""
        res = _create_resource(admin_client, audience_role="teacher")
        r = parent_client.get("/api/resources")
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res["uuid"] not in uuids
        _delete_resource(admin_client, res["uuid"])

    def test_parent_only_resource_not_visible_to_teacher(self, admin_client, teacher_client, seed):
        """audience_role=parent 的资源不应对 teacher 可见。"""
        res = _create_resource(admin_client, audience_role="parent")
        r = teacher_client.get("/api/resources")
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res["uuid"] not in uuids
        _delete_resource(admin_client, res["uuid"])

    def test_filter_by_category(self, admin_client, teacher_client, seed):
        unique_cat = f"cat_{_uuid.uuid4().hex[:6]}"
        res = _create_resource(admin_client, category_key=unique_cat, category_label="U", audience_role="all")
        r = teacher_client.get("/api/resources", params={"category": unique_cat})
        assert r.status_code == 200
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res["uuid"] in uuids
        _delete_resource(admin_client, res["uuid"])

    def test_keyword_search(self, admin_client, teacher_client, seed):
        unique_kw = _uuid.uuid4().hex[:14]
        res = _create_resource(admin_client, title=f"KW {unique_kw}", audience_role="all")
        r = teacher_client.get("/api/resources", params={"keyword": unique_kw})
        assert r.status_code == 200
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert res["uuid"] in uuids
        _delete_resource(admin_client, res["uuid"])

    def test_sort_pinned_desc(self, admin_client, teacher_client, seed):
        pinned = _create_resource(admin_client, audience_role="all", is_pinned=True)
        non_pinned = _create_resource(admin_client, audience_role="all", is_pinned=False)
        r = teacher_client.get("/api/resources", params={"sort": "pinned_desc"})
        assert r.status_code == 200
        uuids = [i["uuid"] for i in r.json()["data"]]
        assert uuids.index(pinned["uuid"]) < uuids.index(non_pinned["uuid"]), \
            "置顶资源应排在非置顶之前"
        _delete_resource(admin_client, pinned["uuid"])
        _delete_resource(admin_client, non_pinned["uuid"])

    def test_invalid_sort_returns_400(self, teacher_client, seed):
        r = teacher_client.get("/api/resources", params={"sort": "unknown_sort"})
        assert r.status_code == 400

    def test_pagination_meta(self, teacher_client, seed):
        r = teacher_client.get("/api/resources", params={"page": 1, "page_size": 5})
        assert r.status_code == 200
        meta = r.json()["meta"]
        assert meta["page"] == 1
        assert meta["page_size"] == 5
        assert isinstance(meta["total"], int)
        assert isinstance(meta["total_pages"], int)


# ─────────────────────────────────────────────────────────────────────────────
# §12A.2  获取资源分类列表  GET /api/resources/categories
# ─────────────────────────────────────────────────────────────────────────────

class TestListCategories:
    def test_unauthenticated_returns_401(self, seed):
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.get("/api/resources/categories")
        assert r.status_code == 401

    def test_returns_200_list(self, teacher_client, seed):
        r = teacher_client.get("/api/resources/categories")
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_category_item_structure(self, admin_client, teacher_client, seed):
        """分类项结构应包含 key, label, resource_count（§12A.2）。"""
        unique_cat = f"catstr_{_uuid.uuid4().hex[:6]}"
        res = _create_resource(admin_client, category_key=unique_cat,
                               category_label="StructTest", audience_role="teacher")
        r = teacher_client.get("/api/resources/categories")
        items = r.json()["data"]
        cat = next((i for i in items if i["key"] == unique_cat), None)
        assert cat is not None, "新建分类应出现在列表中"
        assert "key" in cat
        assert "label" in cat
        assert "resource_count" in cat
        assert cat["resource_count"] >= 1
        _delete_resource(admin_client, res["uuid"])

    def test_only_published_in_categories(self, admin_client, teacher_client, seed):
        """未发布资源不应计入分类统计。"""
        unique_cat = f"catunp_{_uuid.uuid4().hex[:6]}"
        res = _create_resource(admin_client, category_key=unique_cat,
                               category_label="UnpubCat", audience_role="all",
                               is_published=False)
        r = teacher_client.get("/api/resources/categories")
        cats = r.json()["data"]
        assert not any(c["key"] == unique_cat for c in cats), \
            "未发布资源所在分类不应出现在列表"
        _delete_resource(admin_client, res["uuid"])

    def test_teacher_cannot_see_parent_only_categories(self, admin_client, teacher_client, seed):
        """teacher 不应看到 audience_role=parent 的资源所属分类。"""
        unique_cat = f"catpar_{_uuid.uuid4().hex[:6]}"
        res = _create_resource(admin_client, category_key=unique_cat,
                               category_label="ParentOnly", audience_role="parent")
        r = teacher_client.get("/api/resources/categories")
        cats = r.json()["data"]
        assert not any(c["key"] == unique_cat for c in cats), \
            "teacher 不应见到 parent-only 分类"
        _delete_resource(admin_client, res["uuid"])

    def test_parent_cannot_see_teacher_only_categories(self, admin_client, parent_client, seed):
        """parent 不应看到 audience_role=teacher 的资源所属分类。"""
        unique_cat = f"cattea_{_uuid.uuid4().hex[:6]}"
        res = _create_resource(admin_client, category_key=unique_cat,
                               category_label="TeacherOnly", audience_role="teacher")
        r = parent_client.get("/api/resources/categories")
        cats = r.json()["data"]
        assert not any(c["key"] == unique_cat for c in cats), \
            "parent 不应见到 teacher-only 分类"
        _delete_resource(admin_client, res["uuid"])

    def test_resource_count_is_correct(self, admin_client, teacher_client, seed):
        """同一分类的 resource_count 应等于可见的已发布资源数。"""
        unique_cat = f"catcnt_{_uuid.uuid4().hex[:6]}"
        res1 = _create_resource(admin_client, category_key=unique_cat,
                                category_label="CountTest", audience_role="all")
        res2 = _create_resource(admin_client, category_key=unique_cat,
                                category_label="CountTest", audience_role="all")
        r = teacher_client.get("/api/resources/categories")
        cats = r.json()["data"]
        cat = next(c for c in cats if c["key"] == unique_cat)
        assert cat["resource_count"] == 2
        _delete_resource(admin_client, res1["uuid"])
        _delete_resource(admin_client, res2["uuid"])


# ─────────────────────────────────────────────────────────────────────────────
# §12A.3  获取资源详情  GET /api/resources/{resource_uuid}
# ─────────────────────────────────────────────────────────────────────────────

class TestGetResource:
    def test_unauthenticated_returns_401(self, admin_client, seed):
        res = _create_resource(admin_client)
        with TestClient(app, base_url=BASE_URL) as client:
            r = client.get(f"/api/resources/{res['uuid']}")
        assert r.status_code == 401
        _delete_resource(admin_client, res["uuid"])

    def test_returns_200_with_detail_structure(self, admin_client, teacher_client, seed):
        """详情结构应与文档 §12A.3 完全一致。"""
        res = _create_resource(admin_client, audience_role="teacher")
        r = teacher_client.get(f"/api/resources/{res['uuid']}")
        assert r.status_code == 200
        data = r.json()["data"]
        required = {
            "uuid", "title", "summary", "category_key", "category_label",
            "audience_role", "cover_image_url", "external_url", "is_pinned",
            "published_at", "display_content_markdown",
            "original_content_markdown", "translated_content_markdown",
            "display_language", "original_language",
            "translated_language", "translation_status", "translated_at",
        }
        missing = required - set(data.keys())
        assert not missing, f"Response missing fields: {missing}"
        _delete_resource(admin_client, res["uuid"])

    def test_unpublished_returns_403_to_non_admin(self, admin_client, teacher_client, seed):
        """未发布资源对非 admin 返回 403。"""
        res = _create_resource(admin_client, audience_role="teacher", is_published=False)
        r = teacher_client.get(f"/api/resources/{res['uuid']}")
        assert r.status_code == 403
        _delete_resource(admin_client, res["uuid"])

    def test_unpublished_accessible_to_admin(self, admin_client, seed):
        """未发布资源 admin 仍可访问（通过 /api/resources/{uuid}，admin viewer_role=None 绕过过滤）。"""
        res = _create_resource(admin_client, audience_role="teacher", is_published=False)
        r = admin_client.get(f"/api/resources/{res['uuid']}")
        assert r.status_code == 200
        _delete_resource(admin_client, res["uuid"])

    def test_wrong_audience_returns_403(self, admin_client, teacher_client, seed):
        """audience_role=parent 的已发布资源对 teacher 用户返回 403。"""
        res = _create_resource(admin_client, audience_role="parent", is_published=True)
        r = teacher_client.get(f"/api/resources/{res['uuid']}")
        assert r.status_code == 403
        _delete_resource(admin_client, res["uuid"])

    def test_nonexistent_returns_404(self, teacher_client, seed):
        fake = _uuid.uuid4()
        r = teacher_client.get(f"/api/resources/{fake}")
        assert r.status_code == 404

    def test_all_audience_visible_to_both_roles(self, admin_client, teacher_client, parent_client, seed):
        """audience_role=all 对 teacher 和 parent 均可访问。"""
        res = _create_resource(admin_client, audience_role="all")
        for client in (teacher_client, parent_client):
            r = client.get(f"/api/resources/{res['uuid']}")
            assert r.status_code == 200
        _delete_resource(admin_client, res["uuid"])

    def test_detail_content_fields(self, admin_client, teacher_client, seed):
        """display/original content markdown 均应返回正确内容。"""
        content = "# Spec Content\n\nHello world."
        res = _create_resource(admin_client, content_markdown=content, audience_role="teacher")
        r = teacher_client.get(f"/api/resources/{res['uuid']}")
        data = r.json()["data"]
        assert data["original_content_markdown"] == content
        # 无翻译时 display 与 original 相同
        assert data["display_content_markdown"] == content
        assert data["translated_content_markdown"] is None
        _delete_resource(admin_client, res["uuid"])
