"""
§9 家长端接口集成测试。

覆盖：
  GET  /api/parents/me/students                                    - 学生列表
  GET  /api/parents/me/students/{uuid}/dashboard                   - 学生 Dashboard
  GET  /api/parents/me/students/{uuid}/subjects                    - 学科列表
  GET  /api/parents/me/students/{uuid}/subjects/{uuid}             - 学科详情（含学习路径/帖子新字段）
  GET  /api/parents/me/students/{uuid}/reports                     - 报告列表
  GET  /api/parents/me/students/{uuid}/reports/{uuid}              - 报告详情
  POST /api/reports/{uuid}/read                                    - 标记报告已读
  POST /api/reports/{uuid}/archive                                 - 归档报告
  POST /api/reports/{uuid}/unarchive                               - 取消归档
  GET  /api/parents/me/students/{uuid}/announcements               - 公告列表（含 body_preview）
  GET  /api/announcements/{uuid}                                   - 公告详情
  POST /api/announcements/{uuid}/read                              - 标记公告已读
  GET  /api/parents/me/students/{uuid}/exam-scores                 - 考试成绩列表（家长视角）
  GET  /api/parents/me/students/{uuid}/period-metrics              - 周期指标列表（家长视角）
  GET  /api/parents/me/students/{uuid}/leave                       - 请假申请列表（§9.20）
  POST /api/parents/me/students/{uuid}/leave                       - 提交请假申请（§9.21）
  GET  /api/parents/me/students/{uuid}/incidents                   - 事件举报列表（§9.22）
  POST /api/parents/me/students/{uuid}/incidents                   - 提交事件举报（§9.23）
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
        # 验证 §9.4 新增字段：学习路径、近期帖子、成绩趋势、班级均值
        assert "learning_pathway" in data
        assert "posts" in data
        assert "trend_data" in data
        assert "class_avg_data" in data
        assert isinstance(data["learning_pathway"], list)
        assert isinstance(data["posts"], list)
        assert isinstance(data["trend_data"], list)
        assert isinstance(data["class_avg_data"], list)


class TestParentOptions:
    def test_list_subject_options(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/options/subjects"
        )
        assert r.status_code == 200
        assert any(item["value"] == td["subject_uuid"] for item in r.json()["data"])

    def test_list_term_options(self, parent_client, teacher_client, td):
        teacher_client.post(
            f"/api/teachers/me/students/{td['student_uuid']}/period-metrics",
            json={
                "subject_uuid": td["subject_uuid"],
                "term": "2026-T2",
                "snapshot_date": str(date.today()),
                "progress": 0.77,
                "assignment_completion_rate": 0.84,
                "attendance_rate": 0.95,
            },
        )
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/options/terms",
            params={"subject_uuid": td["subject_uuid"]},
        )
        assert r.status_code == 200
        assert any(item["value"] == "2026-T2" for item in r.json()["data"])


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

    def test_announcement_list_item_has_body_preview(self, parent_client, td, announcement_uuid):
        """公告列表每条应包含 body_preview 字段（§9.10 变更）。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/announcements"
        )
        assert r.status_code == 200
        items = r.json()["data"]
        if items:
            # 所有条目都应有 body_preview 键（值可为 null 或 str）
            assert all("body_preview" in item for item in items)

    def test_announcement_list_item_has_body_preview(self, parent_client, td, announcement_uuid):
        """公告列表每条应包含 body_preview 字段（§9.10 变更）。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/announcements"
        )
        assert r.status_code == 200
        items = r.json()["data"]
        if items:
            # 所有条目都应有 body_preview 键（值可为 null 或 str）
            assert all("body_preview" in item for item in items)

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


# ── 请假申请 (§9.20 / §9.21) ─────────────────────────────────────────────────

class TestParentLeave:
    def test_list_leave_requests_empty(self, parent_client, td):
        """初始状态下请假列表应返回 200 及数组。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/leave"
        )
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        assert isinstance(body["data"], list)

    def test_list_leave_requests_filter_by_status(self, parent_client, td):
        """status 筛选参数应被接受，不返回 422。"""
        for status in ("pending", "approved", "rejected", "all"):
            r = parent_client.get(
                f"/api/parents/me/students/{td['student_uuid']}/leave",
                params={"status": status},
            )
            assert r.status_code == 200

    def test_create_leave_request(self, parent_client, td):
        """提交请假申请后应返回 201，status 固定为 pending。"""
        from datetime import date, timedelta
        today = date.today()
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            json={
                "type": "sick",
                "start_date": str(today),
                "end_date": str(today + timedelta(days=2)),
                "reason": "Flu recovery",
            },
        )
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["status"] == "pending"
        assert data["student_uuid"] == td["student_uuid"]
        assert data["type"] == "sick"
        assert "uuid" in data
        assert "submitted_at" in data
        assert data["school_note"] is None

    def test_create_leave_request_single_day(self, parent_client, td):
        """start_date == end_date 应被接受。"""
        from datetime import date
        today = str(date.today())
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            json={"type": "personal", "start_date": today, "end_date": today},
        )
        assert r.status_code == 201

    def test_create_leave_request_invalid_date_range_returns_422(self, parent_client, td):
        """start_date > end_date 应返回 422 validation_error。"""
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            json={
                "type": "other",
                "start_date": "2026-04-10",
                "end_date": "2026-04-05",  # end < start
            },
        )
        assert r.status_code == 422

    def test_leave_request_appears_in_list_after_creation(self, parent_client, td):
        """创建一条请假申请后，列表中应能查到它。"""
        from datetime import date
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            json={"type": "family", "start_date": str(date.today()), "end_date": str(date.today())},
        )
        assert r.status_code == 201
        created_uuid = r.json()["data"]["uuid"]

        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/leave")
        uuids = [item["uuid"] for item in r.json()["data"]]
        assert created_uuid in uuids

    def test_leave_list_item_fields(self, parent_client, td):
        """请假列表每条记录应包含必要字段。"""
        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/leave")
        items = r.json()["data"]
        if items:
            item = items[0]
            for field in ("uuid", "student_uuid", "type", "start_date", "end_date",
                          "status", "submitted_at"):
                assert field in item, f"Missing field: {field}"

    def test_list_leave_requests_pagination(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            params={"page": 1, "page_size": 5},
        )
        assert r.status_code == 200
        meta = r.json()["meta"]
        assert "page" in meta and "total" in meta

    def test_teacher_cannot_access_leave_endpoint(self, teacher_client, td):
        """teacher 不能访问家长端请假接口，应返回 403。"""
        r = teacher_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/leave"
        )
        assert r.status_code == 403

    def test_leave_unbound_student_returns_403(self, parent_client):
        """访问未绑定学生的请假接口应返回 403/404。"""
        r = parent_client.get(
            f"/api/parents/me/students/{_uuid.uuid4()}/leave"
        )
        assert r.status_code in (403, 404)


# ── 事件举报 (§9.22 / §9.23) ─────────────────────────────────────────────────

class TestParentIncidents:
    def test_list_incident_reports_empty(self, parent_client, td):
        """初始状态下举报列表应返回 200 及数组。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/incidents"
        )
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        assert isinstance(body["data"], list)

    def test_create_incident_report(self, parent_client, td):
        """提交事件举报（非匿名）应返回 201，内含 uuid 和 status=submitted。"""
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/incidents",
            json={
                "incident_type": "bullying",
                "description": "Student was bullied during lunch break.",
                "is_anonymous": False,
            },
        )
        assert r.status_code == 201
        data = r.json()["data"]
        assert "uuid" in data
        assert data["status"] == "submitted"

    def test_non_anonymous_incident_appears_in_list(self, parent_client, td):
        """非匿名举报应出现在家长的举报列表中。"""
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/incidents",
            json={
                "incident_type": "misconduct",
                "description": "Property damage observed.",
                "is_anonymous": False,
            },
        )
        assert r.status_code == 201
        created_uuid = r.json()["data"]["uuid"]

        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/incidents")
        uuids = [item["uuid"] for item in r.json()["data"]]
        assert created_uuid in uuids

    def test_anonymous_incident_not_in_list(self, parent_client, td):
        """匿名举报不应出现在家长的举报列表中（§9.23 规则）。"""
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/incidents",
            json={
                "incident_type": "other",
                "description": "Anonymous concern.",
                "is_anonymous": True,
            },
        )
        assert r.status_code == 201
        anon_uuid = r.json()["data"]["uuid"]

        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/incidents")
        uuids = [item["uuid"] for item in r.json()["data"]]
        assert anon_uuid not in uuids

    def test_create_incident_empty_description_returns_422(self, parent_client, td):
        """description 为空或纯空白应返回 422 validation_error（§9.23 规则）。"""
        for bad_desc in ("", "   "):
            r = parent_client.post(
                f"/api/parents/me/students/{td['student_uuid']}/incidents",
                json={
                    "incident_type": "other",
                    "description": bad_desc,
                    "is_anonymous": False,
                },
            )
            assert r.status_code == 422, f"Expected 422 for description={bad_desc!r}"

    def test_incident_list_item_fields(self, parent_client, td):
        """举报列表每条记录应包含必要字段。"""
        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/incidents")
        items = r.json()["data"]
        if items:
            item = items[0]
            for field in ("uuid", "student_uuid", "incident_type", "description",
                          "is_anonymous", "status", "submitted_at"):
                assert field in item, f"Missing field: {field}"

    def test_incident_list_pagination(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/incidents",
            params={"page": 1, "page_size": 5},
        )
        assert r.status_code == 200
        meta = r.json()["meta"]
        assert "page" in meta and "total" in meta

    def test_teacher_cannot_access_incidents_endpoint(self, teacher_client, td):
        """teacher 不能访问家长端举报接口，应返回 403。"""
        r = teacher_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/incidents"
        )
        assert r.status_code == 403

    def test_incidents_unbound_student_returns_403(self, parent_client):
        """访问未绑定学生的举报接口应返回 403/404。"""
        r = parent_client.get(
            f"/api/parents/me/students/{_uuid.uuid4()}/incidents"
        )
        assert r.status_code in (403, 404)


# ── 请假申请 (§9.20 / §9.21) ─────────────────────────────────────────────────

class TestParentLeave:
    def test_list_leave_requests_empty(self, parent_client, td):
        """初始状态下请假列表应返回 200 及空数组。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/leave"
        )
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        assert isinstance(body["data"], list)

    def test_list_leave_requests_filter_by_status(self, parent_client, td):
        """status 筛选参数应被接受，不返回 422。"""
        for status in ("pending", "approved", "rejected", "all"):
            r = parent_client.get(
                f"/api/parents/me/students/{td['student_uuid']}/leave",
                params={"status": status},
            )
            assert r.status_code == 200

    def test_create_leave_request(self, parent_client, td):
        """提交请假申请后应返回 201，status 固定为 pending。"""
        from datetime import date, timedelta
        today = date.today()
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            json={
                "type": "sick",
                "start_date": str(today),
                "end_date": str(today + timedelta(days=2)),
                "reason": "Flu recovery",
            },
        )
        assert r.status_code == 201
        data = r.json()["data"]
        assert data["status"] == "pending"
        assert data["student_uuid"] == td["student_uuid"]
        assert data["type"] == "sick"
        assert "uuid" in data
        assert "submitted_at" in data
        assert data["school_note"] is None

    def test_create_leave_request_single_day(self, parent_client, td):
        """start_date == end_date 应被接受。"""
        from datetime import date
        today = str(date.today())
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            json={"type": "personal", "start_date": today, "end_date": today},
        )
        assert r.status_code == 201

    def test_create_leave_request_invalid_date_range_returns_422(self, parent_client, td):
        """start_date > end_date 应返回 422 validation_error。"""
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            json={
                "type": "other",
                "start_date": "2026-04-10",
                "end_date": "2026-04-05",  # end < start
            },
        )
        assert r.status_code == 422

    def test_leave_request_appears_in_list_after_creation(self, parent_client, td):
        """创建一条请假申请后，列表中应能查到它。"""
        from datetime import date
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            json={"type": "family", "start_date": str(date.today()), "end_date": str(date.today())},
        )
        assert r.status_code == 201
        created_uuid = r.json()["data"]["uuid"]

        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/leave")
        uuids = [item["uuid"] for item in r.json()["data"]]
        assert created_uuid in uuids

    def test_leave_list_item_fields(self, parent_client, td):
        """请假列表每条记录应包含必要字段。"""
        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/leave")
        items = r.json()["data"]
        if items:
            item = items[0]
            for field in ("uuid", "student_uuid", "type", "start_date", "end_date",
                          "status", "submitted_at"):
                assert field in item, f"Missing field: {field}"

    def test_list_leave_requests_pagination(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/leave",
            params={"page": 1, "page_size": 5},
        )
        assert r.status_code == 200
        meta = r.json()["meta"]
        assert "page" in meta and "total" in meta

    def test_teacher_cannot_access_leave_endpoint(self, teacher_client, td):
        """teacher 不能访问家长端请假接口，应返回 403。"""
        r = teacher_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/leave"
        )
        assert r.status_code == 403

    def test_leave_unbound_student_returns_403(self, parent_client):
        """访问未绑定学生的请假接口应返回 403/404。"""
        r = parent_client.get(
            f"/api/parents/me/students/{_uuid.uuid4()}/leave"
        )
        assert r.status_code in (403, 404)


# ── 事件举报 (§9.22 / §9.23) ─────────────────────────────────────────────────

class TestParentIncidents:
    def test_list_incident_reports_empty(self, parent_client, td):
        """初始状态下举报列表应返回 200 及数组。"""
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/incidents"
        )
        assert r.status_code == 200
        body = r.json()
        assert "data" in body and "meta" in body
        assert isinstance(body["data"], list)

    def test_create_incident_report(self, parent_client, td):
        """提交事件举报（非匿名）应返回 201，内含 uuid 和 status=submitted。"""
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/incidents",
            json={
                "incident_type": "bullying",
                "description": "Student was bullied during lunch break.",
                "is_anonymous": False,
            },
        )
        assert r.status_code == 201
        data = r.json()["data"]
        assert "uuid" in data
        assert data["status"] == "submitted"

    def test_non_anonymous_incident_appears_in_list(self, parent_client, td):
        """非匿名举报应出现在家长的举报列表中。"""
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/incidents",
            json={
                "incident_type": "misconduct",
                "description": "Property damage observed.",
                "is_anonymous": False,
            },
        )
        assert r.status_code == 201
        created_uuid = r.json()["data"]["uuid"]

        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/incidents")
        uuids = [item["uuid"] for item in r.json()["data"]]
        assert created_uuid in uuids

    def test_anonymous_incident_not_in_list(self, parent_client, td):
        """匿名举报不应出现在家长的举报列表中（§9.23 规则）。"""
        r = parent_client.post(
            f"/api/parents/me/students/{td['student_uuid']}/incidents",
            json={
                "incident_type": "other",
                "description": "Anonymous concern.",
                "is_anonymous": True,
            },
        )
        assert r.status_code == 201
        anon_uuid = r.json()["data"]["uuid"]

        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/incidents")
        uuids = [item["uuid"] for item in r.json()["data"]]
        assert anon_uuid not in uuids

    def test_create_incident_empty_description_returns_422(self, parent_client, td):
        """description 为空或纯空白应返回 422 validation_error（§9.23 规则）。"""
        for bad_desc in ("", "   "):
            r = parent_client.post(
                f"/api/parents/me/students/{td['student_uuid']}/incidents",
                json={
                    "incident_type": "other",
                    "description": bad_desc,
                    "is_anonymous": False,
                },
            )
            assert r.status_code == 422, f"Expected 422 for description={bad_desc!r}"

    def test_incident_list_item_fields(self, parent_client, td):
        """举报列表每条记录应包含必要字段。"""
        r = parent_client.get(f"/api/parents/me/students/{td['student_uuid']}/incidents")
        items = r.json()["data"]
        if items:
            item = items[0]
            for field in ("uuid", "student_uuid", "incident_type", "description",
                          "is_anonymous", "status", "submitted_at"):
                assert field in item, f"Missing field: {field}"

    def test_incident_list_pagination(self, parent_client, td):
        r = parent_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/incidents",
            params={"page": 1, "page_size": 5},
        )
        assert r.status_code == 200
        meta = r.json()["meta"]
        assert "page" in meta and "total" in meta

    def test_teacher_cannot_access_incidents_endpoint(self, teacher_client, td):
        """teacher 不能访问家长端举报接口，应返回 403。"""
        r = teacher_client.get(
            f"/api/parents/me/students/{td['student_uuid']}/incidents"
        )
        assert r.status_code == 403

    def test_incidents_unbound_student_returns_403(self, parent_client):
        """访问未绑定学生的举报接口应返回 403/404。"""
        r = parent_client.get(
            f"/api/parents/me/students/{_uuid.uuid4()}/incidents"
        )
        assert r.status_code in (403, 404)
