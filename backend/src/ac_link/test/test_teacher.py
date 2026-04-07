"""
§10 老师端接口集成测试。

覆盖：
  GET  /api/teachers/me/overview                                  - 教师端首页总览（§10.0）
  GET  /api/teachers/me/students                                  - 学生列表
  GET  /api/teachers/me/students/{uuid}/dashboard                 - 学生 Dashboard
  GET  /api/teachers/me/classes                                   - 班级列表
  GET  /api/teachers/me/classes/{uuid}/students                   - 班级学生列表
  GET  /api/teachers/me/classes/{uuid}/grade-stats                - 班级成绩统计
  GET  /api/teachers/me/tags                                      - 可用 Tag 列表
  POST /api/teachers/me/tags                                      - 创建私有 Tag
  PATCH/DELETE /api/teachers/me/tags/{uuid}                       - 更新/删除私有 Tag
  POST /api/teachers/me/students/{uuid}/reports                   - 创建报告
  PATCH /api/reports/{uuid}                                       - 更新报告
  POST /api/teachers/me/students/{uuid}/announcements             - 创建公告
  PATCH /api/announcements/{uuid}                                 - 更新公告
  POST/GET/PATCH/DELETE exam-scores                               - 考试成绩管理
  POST/GET period-metrics                                         - 周期指标管理
"""

from __future__ import annotations

import uuid as _uuid
from datetime import date

import pytest

# ── 教师首页总览 (§10.0) ───────────────────────────────────────────────────────────

class TestTeacherOverview:
    def test_overview_returns_200(self, teacher_client):
        """教师首页总览接口应返回 200。"""
        r = teacher_client.get("/api/teachers/me/overview")
        assert r.status_code == 200

    def test_overview_structure(self, teacher_client):
        """返回结构应包含 summary 和 classes 两个顶级键。"""
        r = teacher_client.get("/api/teachers/me/overview")
        data = r.json()["data"]
        assert "summary" in data
        assert "classes" in data
        assert isinstance(data["classes"], list)

    def test_overview_summary_fields(self, teacher_client):
        """summary 应包含 student_count、class_count、unread_message_count。"""
        r = teacher_client.get("/api/teachers/me/overview")
        summary = r.json()["data"]["summary"]
        for field in ("student_count", "class_count", "unread_message_count"):
            assert field in summary, f"Missing field: {field}"
        assert summary["student_count"] >= 0
        assert summary["class_count"] >= 0
        assert summary["unread_message_count"] >= 0

    def test_overview_counts_reflect_seed_data(self, teacher_client):
        """种子数据创建了 1 个学生和 1 个班级，summary 应具体反映这些。"""
        r = teacher_client.get("/api/teachers/me/overview")
        summary = r.json()["data"]["summary"]
        assert summary["student_count"] >= 1
        assert summary["class_count"] >= 1

    def test_overview_classes_item_structure(self, teacher_client):
        """classes 列表每项应包含 uuid、name、is_homeroom、student_count。"""
        r = teacher_client.get("/api/teachers/me/overview")
        classes = r.json()["data"]["classes"]
        assert len(classes) >= 1
        for cls in classes:
            for field in ("uuid", "name", "is_homeroom", "student_count"):
                assert field in cls, f"Missing field in class item: {field}"
            assert isinstance(cls["is_homeroom"], bool)
            assert cls["student_count"] >= 0

    def test_parent_cannot_access_teacher_overview(self, parent_client):
        """parent 不能访问教师端接口，应返回 403。"""
        r = parent_client.get("/api/teachers/me/overview")
        assert r.status_code == 403

# ── 学生相关 ──────────────────────────────────────────────────────────────────

class TestTeacherStudents:
    def test_list_students(self, teacher_client):
        """老师应能看到自己负责的学生。"""
        r = teacher_client.get("/api/teachers/me/students")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        students = body["data"]
        # 测试用学生应在列表中
        assert any(s["sid"] == "TST001" for s in students)

    def test_list_students_pagination(self, teacher_client):
        r = teacher_client.get("/api/teachers/me/students", params={"page": 1, "page_size": 5})
        assert r.status_code == 200

    def test_list_students_filter_by_class(self, teacher_client, td):
        r = teacher_client.get("/api/teachers/me/students",
                               params={"class_uuid": td["class_uuid"]})
        assert r.status_code == 200

    def test_list_students_search_by_keyword(self, teacher_client):
        r = teacher_client.get("/api/teachers/me/students", params={"keyword": "TST001"})
        assert r.status_code == 200
        students = r.json()["data"]
        assert any(s["sid"] == "TST001" for s in students)

    def test_student_dashboard(self, teacher_client, td):
        """老师视角的学生 Dashboard 应返回学生基本信息。"""
        r = teacher_client.get(
            f"/api/teachers/me/students/{td['student_uuid']}/dashboard"
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["student"]["uuid"] == td["student_uuid"]
        assert "summary_cards" in data
        assert "unread_post_count" in data

    def test_student_dashboard_range_param(self, teacher_client, td):
        r = teacher_client.get(
            f"/api/teachers/me/students/{td['student_uuid']}/dashboard",
            params={"range": "30d"},
        )
        assert r.status_code == 200

    def test_student_dashboard_unauthorized(self, parent_client, td):
        """parent 不能访问老师端 Dashboard。"""
        r = parent_client.get(
            f"/api/teachers/me/students/{td['student_uuid']}/dashboard"
        )
        assert r.status_code == 403


# ── 班级相关 ──────────────────────────────────────────────────────────────────

class TestTeacherClasses:
    def test_list_classes(self, teacher_client):
        r = teacher_client.get("/api/teachers/me/classes")
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_class_students(self, teacher_client, td):
        r = teacher_client.get(f"/api/teachers/me/classes/{td['class_uuid']}/students")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body
        students = body["data"]
        assert any(s.get("sid") == "TST001" for s in students)

    def test_class_grade_stats(self, teacher_client, td):
        r = teacher_client.get(
            f"/api/teachers/me/classes/{td['class_uuid']}/grade-stats"
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert "class" in data
        assert "summary" in data


# ── 私有 Tag CRUD ─────────────────────────────────────────────────────────────

class TestTeacherTags:
    def test_list_tags_returns_list(self, teacher_client):
        r = teacher_client.get("/api/teachers/me/tags")
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_list_system_tags_only(self, teacher_client):
        r = teacher_client.get("/api/teachers/me/tags", params={"scope": "system"})
        assert r.status_code == 200
        tags = r.json()["data"]
        for t in tags:
            assert t["scope"] == "system"

    def test_create_private_tag(self, teacher_client):
        unique = _uuid.uuid4().hex[:6]
        r = teacher_client.post("/api/teachers/me/tags", json={"name": f"tmp-{unique}"})
        assert r.status_code == 201
        tag = r.json()["data"]
        assert tag["scope"] == "teacher_private"
        tag_uuid = tag["uuid"]

        # 立即删除清理
        teacher_client.delete(f"/api/teachers/me/tags/{tag_uuid}")

    def test_create_duplicate_private_tag_returns_409(self, teacher_client):
        unique = _uuid.uuid4().hex[:6]
        name = f"dup-tag-{unique}"
        r1 = teacher_client.post("/api/teachers/me/tags", json={"name": name})
        assert r1.status_code == 201
        tag_uuid = r1.json()["data"]["uuid"]

        r2 = teacher_client.post("/api/teachers/me/tags", json={"name": name})
        assert r2.status_code == 409

        teacher_client.delete(f"/api/teachers/me/tags/{tag_uuid}")

    def test_update_private_tag(self, teacher_client):
        unique = _uuid.uuid4().hex[:6]
        r = teacher_client.post("/api/teachers/me/tags", json={"name": f"upd-{unique}"})
        tag_uuid = r.json()["data"]["uuid"]

        r = teacher_client.patch(f"/api/teachers/me/tags/{tag_uuid}",
                                  json={"name": f"upd-renamed-{unique}"})
        assert r.status_code == 200
        assert "renamed" in r.json()["data"]["name"]

        teacher_client.delete(f"/api/teachers/me/tags/{tag_uuid}")

    def test_delete_private_tag(self, teacher_client):
        unique = _uuid.uuid4().hex[:6]
        r = teacher_client.post("/api/teachers/me/tags", json={"name": f"del-{unique}"})
        tag_uuid = r.json()["data"]["uuid"]

        r = teacher_client.delete(f"/api/teachers/me/tags/{tag_uuid}")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_delete_tag_not_found(self, teacher_client):
        r = teacher_client.delete(f"/api/teachers/me/tags/{_uuid.uuid4()}")
        assert r.status_code in (403, 404)


# ── 报告管理 ──────────────────────────────────────────────────────────────────

class TestTeacherReports:
    @pytest.fixture(scope="class")
    def report_uuid(self, teacher_client, td):
        """创建一个测试报告，类内共用，类结束后删除（通过停用）。"""
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/reports",
            json={
                "title": "Weekly Report Test",
                "report_type": "weekly",
                "subject_uuid": td["subject_uuid"],
                "content_markdown": "# Test Report\n\nThis is a test report.",
                "original_language": "en-AU",
                "translation_status": "not_required",
            },
        )
        assert r.status_code == 201, f"Report creation failed: {r.text}"
        return r.json()["data"]["uuid"]

    def test_create_report(self, teacher_client, td):
        """创建报告后应返回 201 及完整报告对象。"""
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/reports",
            json={
                "title": "Custom Report",
                "report_type": "custom",
                "subject_uuid": None,
                "content_markdown": "Custom report content.",
                "original_language": "en-AU",
                "translation_status": "not_required",
            },
        )
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["report_type"] == "custom"
        assert data["source_type"] == "teacher"
        assert data["title"] == "Custom Report"

    def test_update_report(self, teacher_client, td, report_uuid):
        """更新报告标题和内容应成功。"""
        r = teacher_client.patch(f"/api/reports/{report_uuid}", json={
            "title": "Updated Weekly Report",
        })
        assert r.status_code == 200
        assert r.json()["data"]["title"] == "Updated Weekly Report"

    def test_update_nonexistent_report_returns_404(self, teacher_client):
        r = teacher_client.patch(f"/api/reports/{_uuid.uuid4()}", json={"title": "Ghost"})
        assert r.status_code == 404


# ── 公告/任务管理 ─────────────────────────────────────────────────────────────

class TestTeacherAnnouncements:
    @pytest.fixture(scope="class")
    def announcement_uuid(self, teacher_client, td):
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/announcements",
            json={
                "category": "announcement",
                "title": "Test Announcement",
                "subject_uuid": td["subject_uuid"],
                "content_markdown": "Please remember homework.",
                "original_language": "en-AU",
                "published_at": "2026-04-06T00:00:00Z",
                "is_important": False,
            },
        )
        assert r.status_code == 201, f"Announcement creation failed: {r.text}"
        return r.json()["data"]["uuid"]

    def test_create_announcement(self, teacher_client, td):
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/announcements",
            json={
                "category": "task",
                "title": "Task Due Tomorrow",
                "content_markdown": "Submit assignment.",
                "original_language": "en-AU",
                "published_at": "2026-04-06T00:00:00Z",
                "due_at": "2026-04-07T23:59:00Z",
                "is_important": True,
            },
        )
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["category"] == "task"
        assert data["is_important"] is True

    def test_update_announcement(self, teacher_client, announcement_uuid):
        r = teacher_client.patch(f"/api/announcements/{announcement_uuid}", json={
            "title": "Updated Announcement Title",
        })
        assert r.status_code == 200
        assert r.json()["data"]["title"] == "Updated Announcement Title"

    def test_update_nonexistent_announcement_returns_404(self, teacher_client):
        r = teacher_client.patch(f"/api/announcements/{_uuid.uuid4()}", json={"title": "x"})
        assert r.status_code == 404


# ── 考试成绩 CRUD ─────────────────────────────────────────────────────────────

class TestTeacherExamScores:
    @pytest.fixture(scope="class")
    def score_uuid(self, teacher_client, td):
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/exam-scores",
            json={
                "subject_uuid": td["subject_uuid"],
                "exam_name": "Mid-term Test",
                "exam_date": str(date.today()),
                "score": 88.5,
                "full_score": 100.0,
            },
        )
        assert r.status_code == 201, f"Score creation failed: {r.text}"
        return r.json()["data"]["uuid"]

    def test_list_exam_scores(self, teacher_client, td):
        r = teacher_client.get(
            f"/api/teachers/me/students/{td['student_uuid']}/exam-scores"
        )
        assert r.status_code == 200
        assert "data" in r.json()

    def test_create_exam_score(self, teacher_client, td):
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/exam-scores",
            json={
                "subject_uuid": td["subject_uuid"],
                "exam_name": "Quiz 1",
                "exam_date": str(date.today()),
                "score": 75.0,
                "full_score": 100.0,
                "note": "Good effort",
            },
        )
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["score"] == 75.0
        # 清理
        teacher_client.delete(
            f"/api/teachers/me/students/{td['student_uuid']}/exam-scores/{data['uuid']}"
        )

    def test_update_exam_score(self, teacher_client, td, score_uuid):
        r = teacher_client.patch(
            f"/api/teachers/me/students/{td['student_uuid']}/exam-scores/{score_uuid}",
            json={"score": 90.0, "note": "Revised"},
        )
        assert r.status_code == 200
        assert r.json()["data"]["score"] == 90.0

    def test_delete_exam_score(self, teacher_client, td, score_uuid):
        r = teacher_client.delete(
            f"/api/teachers/me/students/{td['student_uuid']}/exam-scores/{score_uuid}"
        )
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True


# ── 周期指标 ──────────────────────────────────────────────────────────────────

class TestTeacherPeriodMetrics:
    def test_create_period_metric(self, teacher_client, td):
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/period-metrics",
            json={
                "subject_uuid": td["subject_uuid"],
                "term": "2026-T1",
                "snapshot_date": str(date.today()),
                "progress": 0.75,
                "assignment_completion_rate": 0.90,
                "attendance_rate": 0.95,
            },
        )
        # UPSERT: 201 (new) or 200 (existing)
        assert r.status_code in (200, 201)
        data = r.json()["data"]
        assert data["progress"] == 0.75

    def test_list_period_metrics(self, teacher_client, td):
        r = teacher_client.get(
            f"/api/teachers/me/students/{td['student_uuid']}/period-metrics"
        )
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_period_metric_ratio_out_of_range_returns_422(self, teacher_client, td):
        """比率超范围应返回 422。"""
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/period-metrics",
            json={
                "subject_uuid": td["subject_uuid"],
                "snapshot_date": str(date.today()),
                "progress": 1.5,  # > 1.0，应被拒绝
            },
        )
        assert r.status_code == 422
