"""
§9 家长端接口集成测试。

覆盖：
  GET /api/parents/me/students                                    - 学生列表
  GET /api/parents/me/students/{uuid}/dashboard                   - 学生 Dashboard
  GET /api/parents/me/students/{uuid}/subjects                    - 学科列表
  GET /api/parents/me/students/{uuid}/subjects/{uuid}             - 学科详情
  GET /api/parents/me/students/{uuid}/reports                     - 报告列表
  GET /api/parents/me/students/{uuid}/reports/{uuid}              - 报告详情
  POST /api/reports/{uuid}/read                                   - 标记报告已读
  POST /api/reports/{uuid}/archive                                - 归档报告
  POST /api/reports/{uuid}/unarchive                              - 取消归档
  GET /api/parents/me/students/{uuid}/announcements               - 公告列表
  GET /api/announcements/{uuid}                                   - 公告详情
  POST /api/announcements/{uuid}/read                             - 标记公告已读
  GET /api/parents/me/students/{uuid}/exam-scores                 - 考试成绩列表（家长视角）
  GET /api/parents/me/students/{uuid}/period-metrics              - 周期指标列表（家长视角）
"""

from __future__ import annotations

import uuid as _uuid
from datetime import date

import pytest


# ── 家长学生列表 ──────────────────────────────────────────────────────────────

class TestParentStudents:
    def test_list_bound_students(self, parent_client, td):
        """家长应能看到自己绑定的学生。"""
        r = parent_client.get("/api/parents/me/students")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        students = body["data"]
        uuids = [s["uuid"] for s in students]
        assert td["student_uuid"] in uuids

    def test_list_students_returns_correct_fields(self, parent_client):
        r = parent_client.get("/api/parents/me/students")
        student = r.json()["data"][0]
        assert "uuid" in student
        assert "full_name" in student

    def test_teacher_cannot_access_parent_students(self, teacher_client):
        r = teacher_client.get("/api/parents/me/students")
        assert r.status_code == 403


# ── 学生 Dashboard ────────────────────────────────────────────────────────────

class TestParentDashboard:
    def test_student_dashboard(self, parent_client, td):
        """家长视角学生 Dashboard 应包含学生信息和 dashboard_context。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/dashboard"
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["student"]["uuid"] == td["student_uuid"]
        assert "dashboard_context" in data
        assert "summary_cards" in data

    def test_dashboard_range_param(self, parent_client, td):
        for rng in ("7d", "30d", "90d", "all_time"):
            r = parent_client.get(
                f"/api/parents/me/students/{td['student_uuid']}/dashboard",
                params={"range": rng},
            )
            assert r.status_code == 200

    def test_dashboard_unbound_student_returns_403(self, parent_client):
        """访问未绑定学生的 Dashboard 应返回 403。"""
        r = parent_client.get(
            f"/api/parents/me/students/{_uuid.uuid4()}/dashboard"
        )
        assert r.status_code in (403, 404)


# ── 学科列表与详情 ────────────────────────────────────────────────────────────

class TestParentSubjects:
    def test_list_subjects(self, parent_client, td):
        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/subjects")
        assert r.status_code == 200
        subjects = r.json()["data"]
        assert isinstance(subjects, list)
        # 测试学科 Test Mathematics 应在其中
        names = [s["name"] for s in subjects]
        assert "Test Mathematics" in names

    def test_subject_detail(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/subjects/{td['subject_uuid']}"
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert "student" in data
        assert "subject" in data
        assert "overview" in data


# ── 报告接口 ──────────────────────────────────────────────────────────────────

class TestParentReports:
    @pytest.fixture(scope="class")
    def report_uuid(self, teacher_client, td):
        """由 teacher 创建的报告，供家长测试使用。"""
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/reports",
            json={
                "title": "Parent View Report",
                "report_type": "monthly",
                "subject_uuid": td["subject_uuid"],
                "content_markdown": "Monthly progress looks good.",
                "original_language": "en-AU",
                "translation_status": "not_required",
            },
        )
        assert r.status_code == 201
        return r.json()["data"]["uuid"]

    def test_list_reports(self, parent_client, td):
        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/reports")
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body

    def test_list_reports_pagination(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/reports",
            params={"page": 1, "page_size": 5},
        )
        assert r.status_code == 200

    def test_get_report_detail(self, parent_client, td, report_uuid):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/reports/{report_uuid}"
        )
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["uuid"] == report_uuid
        assert "display_content_markdown" in data
        assert "is_read" in data

    def test_mark_report_read(self, parent_client, report_uuid):
        r = parent_client.post(f"/api/reports/{report_uuid}/read")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_mark_report_read_again_returns_409(self, parent_client, report_uuid):
        """已读状态重复标记应返回 409。"""
        r = parent_client.post(f"/api/reports/{report_uuid}/read")
        assert r.status_code == 409
        assert r.json()["error"]["code"] == "already_read"

    def test_archive_and_unarchive_report(self, parent_client, report_uuid):
        r = parent_client.post(f"/api/reports/{report_uuid}/archive")
        assert r.status_code == 200

        # 归档后再归档应返回 409
        r = parent_client.post(f"/api/reports/{report_uuid}/archive")
        assert r.status_code == 409

        # 取消归档
        r = parent_client.post(f"/api/reports/{report_uuid}/unarchive")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_report_not_found_returns_404(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/reports/{_uuid.uuid4()}"
        )
        assert r.status_code == 404


# ── 公告接口 ──────────────────────────────────────────────────────────────────

class TestParentAnnouncements:
    @pytest.fixture(scope="class")
    def announcement_uuid(self, teacher_client, td):
        """由 teacher 创建的公告，供家长测试使用。"""
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/announcements",
            json={
                "category": "announcement",
                "title": "Parent View Announcement",
                "content_markdown": "Important notice for parents.",
                "original_language": "en-AU",
                "published_at": "2026-04-06T00:00:00Z",
                "is_important": False,
            },
        )
        assert r.status_code == 201
        return r.json()["data"]["uuid"]

    def test_list_announcements(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/announcements"
        )
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body

    def test_list_announcements_filter_by_category(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/announcements",
            params={"category": "announcement"},
        )
        assert r.status_code == 200

    def test_get_announcement_detail(self, parent_client, announcement_uuid):
        r = parent_client.get(f"/api/announcements/{announcement_uuid}")
        assert r.status_code == 200
        data = r.json()["data"]
        assert data["uuid"] == announcement_uuid
        assert "display_content_markdown" in data
        assert "is_read" in data

    def test_mark_announcement_read(self, parent_client, announcement_uuid):
        r = parent_client.post(f"/api/announcements/{announcement_uuid}/read")
        assert r.status_code == 200
        assert r.json()["data"]["success"] is True

    def test_mark_announcement_read_again_returns_409(self, parent_client, announcement_uuid):
        r = parent_client.post(f"/api/announcements/{announcement_uuid}/read")
        assert r.status_code == 409

    def test_announcement_not_found_returns_404(self, parent_client):
        r = parent_client.get(f"/api/announcements/{_uuid.uuid4()}")
        assert r.status_code == 404


# ── 考试成绩（家长视角） ──────────────────────────────────────────────────────

class TestParentExamScores:
    @pytest.fixture(scope="class", autouse=True)
    def ensure_score_exists(self, teacher_client, td):
        """确保有一条考试成绩供家长查看。"""
        r = teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/exam-scores",
            json={
                "subject_uuid": td["subject_uuid"],
                "exam_name": "Parent View Exam",
                "exam_date": str(date.today()),
                "score": 82.0,
                "full_score": 100.0,
            },
        )
        assert r.status_code == 201
        self.__class__._score_uuid = r.json()["data"]["uuid"]
        yield
        teacher_client.delete(
            f"/api/teachers/me/students/{td['student_uuid']}/exam-scores/{self.__class__._score_uuid}"
        )

    def test_list_exam_scores(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/exam-scores"
        )
        assert r.status_code == 200
        body = r.json()
        assert "data" in body

    def test_list_exam_scores_filter_by_subject(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/exam-scores",
            params={"subject_uuid": td["subject_uuid"]},
        )
        assert r.status_code == 200


# ── 周期指标（家长视角） ──────────────────────────────────────────────────────

class TestParentPeriodMetrics:
    @pytest.fixture(scope="class", autouse=True)
    def ensure_metric_exists(self, teacher_client, td):
        """确保有一条周期指标供家长查看。"""
        teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/period-metrics",
            json={
                "subject_uuid": td["subject_uuid"],
                "term": "2026-T1",
                "snapshot_date": str(date.today()),
                "progress": 0.80,
                "assignment_completion_rate": 0.85,
                "attendance_rate": 0.97,
            },
        )

    def test_list_period_metrics(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/period-metrics"
        )
        assert r.status_code == 200
        assert isinstance(r.json()["data"], list)

    def test_list_period_metrics_filter_by_subject(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/period-metrics",
            params={"subject_uuid": td["subject_uuid"]},
        )
        assert r.status_code == 200
