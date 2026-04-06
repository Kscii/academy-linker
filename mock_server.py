"""
Academy Linker — Mock Backend Server
按照 api_design_v1.md 实现的模拟后端，用于前端验证。

运行方式:
    python3 mock_server.py

默认监听: http://localhost:8000
前端 Vite dev server: http://localhost:5173
"""

import json
import os
import re
import uuid as uuid_lib
import datetime
from functools import wraps

import jwt
import requests as http_requests
from flask import Flask, jsonify, request, make_response
from flask_cors import CORS

# ── DeepSeek AI 配置 ──────────────────────────────────────────────────────────
# 读取 .env 文件（简易加载，无需 python-dotenv）
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _v = _line.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"], supports_credentials=True)

# ── JWT 配置 ─────────────────────────────────────────────────────────────────
JWT_SECRET = "dev-secret-do-not-use-in-prod-academy-linker"
AT_EXP_MINUTES = 480  # 8 hours for dev convenience
RT_EXP_DAYS = 3

# ── 内存存储 ──────────────────────────────────────────────────────────────────
# refresh_tokens: {token_str: user_uuid}
REFRESH_TOKENS: dict[str, str] = {}

# user states: read/archive per user
# {user_uuid: {"read_reports": set, "archived_reports": set, "read_announcements": set}}
USER_STATE: dict[str, dict] = {}

# post replies added at runtime
RUNTIME_POSTS: list[dict] = []


# ═══════════════════════════════════════════════════════════════════════════════
# MOCK DATA
# ═══════════════════════════════════════════════════════════════════════════════

USERS = {
    "u-parent-01": {
        "uuid": "u-parent-01",
        "role": "parent",
        "display_name": "Li Wei",
        "email": "li.wei@email.com",
        "phone_number": "+61 412 345 678",
        "avatar_url": None,
        "password": "password123",
    },
    "u-teacher-01": {
        "uuid": "u-teacher-01",
        "role": "teacher",
        "display_name": "Ms. Thompson",
        "email": "thompson@westside.edu.au",
        "phone_number": None,
        "avatar_url": None,
        "password": "password123",
    },
    "u-teacher-02": {
        "uuid": "u-teacher-02",
        "role": "teacher",
        "display_name": "Mr. Walsh",
        "email": "walsh@westside.edu.au",
        "phone_number": None,
        "avatar_url": None,
        "password": "password123",
    },
    "u-teacher-03": {
        "uuid": "u-teacher-03",
        "role": "teacher",
        "display_name": "Ms. Patel",
        "email": "patel@westside.edu.au",
        "phone_number": None,
        "avatar_url": None,
        "password": "password123",
    },
    "u-teacher-04": {
        "uuid": "u-teacher-04",
        "role": "teacher",
        "display_name": "Mr. Nguyen",
        "email": "nguyen@westside.edu.au",
        "phone_number": None,
        "avatar_url": None,
        "password": "password123",
    },
    "u-admin-01": {
        "uuid": "u-admin-01",
        "role": "admin",
        "display_name": "Admin",
        "email": "admin@westside.edu.au",
        "phone_number": None,
        "avatar_url": None,
        "password": "admin123",
    },
}

STUDENTS = {
    "s-aiden-01": {
        "uuid": "s-aiden-01",
        "sid": "S2024018",
        "full_name": "Aiden Wei",
        "preferred_name": "Aiden",
        "class_name": "7A",
        "grade_level": "Year 7",
        "avatar_url": None,
        "birthday": "2014-04-10",   # 4 days from today (2026-04-06) for demo
    },
    "s-priya-01": {
        "uuid": "s-priya-01",
        "sid": "S2024022",
        "full_name": "Priya Sharma",
        "preferred_name": "Priya",
        "class_name": "7A",
        "grade_level": "Year 7",
        "avatar_url": None,
        "birthday": "2014-06-15",
    },
    "s-james-01": {
        "uuid": "s-james-01",
        "sid": "S2024031",
        "full_name": "James O'Brien",
        "preferred_name": "James",
        "class_name": "7A",
        "grade_level": "Year 7",
        "avatar_url": None,
        "birthday": "2014-11-22",
    },
}

INCIDENT_REPORTS: list = []

LEAVE_REQUESTS: list = [
    {
        "uuid": "leave-001",
        "student_uuid": "s-aiden-01",
        "type": "sick",
        "start_date": "2026-03-20",
        "end_date": "2026-03-21",
        "reason": "Flu and fever",
        "status": "approved",
        "submitted_at": "2026-03-19T08:30:00Z",
    },
    {
        "uuid": "leave-002",
        "student_uuid": "s-aiden-01",
        "type": "personal",
        "start_date": "2026-04-14",
        "end_date": "2026-04-14",
        "reason": "Family appointment",
        "status": "pending",
        "submitted_at": "2026-04-05T10:00:00Z",
    },
]

SUBJECTS = {
    "sub-math": {"uuid": "sub-math", "name": "Mathematics",       "code": "math",    "teacher_uuid": "u-teacher-02", "color": "#E8614E"},
    "sub-eng":  {"uuid": "sub-eng",  "name": "English",            "code": "english", "teacher_uuid": "u-teacher-01", "color": "#3DB6A8"},
    "sub-sci":  {"uuid": "sub-sci",  "name": "Science",            "code": "science", "teacher_uuid": "u-teacher-03", "color": "#4A90D9"},
    "sub-hass": {"uuid": "sub-hass", "name": "HASS",               "code": "hass",    "teacher_uuid": "u-teacher-04", "color": "#F0A732"},
    "sub-pe":   {"uuid": "sub-pe",   "name": "Physical Education", "code": "pe",      "teacher_uuid": "u-teacher-02", "color": "#8B5CF6"},
    "sub-arts": {"uuid": "sub-arts", "name": "Arts",               "code": "arts",    "teacher_uuid": "u-teacher-03", "color": "#E91E8C"},
}

# Learning pathway timelines per subject
TIMELINES = {
    "sub-math": [
        {"uuid": "tl-math-1", "title": "Number & Algebra: Factoring", "status": "done",    "week": 1},
        {"uuid": "tl-math-2", "title": "Linear Equations",            "status": "done",    "week": 3},
        {"uuid": "tl-math-3", "title": "Quadratic Expressions",       "status": "current", "week": 5},
        {"uuid": "tl-math-4", "title": "Functions & Graphs",          "status": "future",  "week": 7},
        {"uuid": "tl-math-5", "title": "Mid-Term Exam Revision",      "status": "future",  "week": 9},
    ],
    "sub-eng": [
        {"uuid": "tl-eng-1", "title": "Narrative Writing",         "status": "done",    "week": 1},
        {"uuid": "tl-eng-2", "title": "Creative Composition",      "status": "done",    "week": 3},
        {"uuid": "tl-eng-3", "title": "Persuasive Texts",          "status": "current", "week": 5},
        {"uuid": "tl-eng-4", "title": "Reading Comprehension",     "status": "future",  "week": 7},
        {"uuid": "tl-eng-5", "title": "Final Essay Assessment",    "status": "future",  "week": 9},
    ],
    "sub-sci": [
        {"uuid": "tl-sci-1", "title": "Chemical Properties",  "status": "done",    "week": 1},
        {"uuid": "tl-sci-2", "title": "Reactions & Equations","status": "done",    "week": 3},
        {"uuid": "tl-sci-3", "title": "Lab Safety & Method",  "status": "current", "week": 5},
        {"uuid": "tl-sci-4", "title": "Biological Systems",   "status": "future",  "week": 7},
        {"uuid": "tl-sci-5", "title": "Science Assessment",   "status": "future",  "week": 9},
    ],
    "sub-hass": [
        {"uuid": "tl-hass-1", "title": "Ancient Civilisations Intro", "status": "done",    "week": 1},
        {"uuid": "tl-hass-2", "title": "Ancient Greece",              "status": "done",    "week": 3},
        {"uuid": "tl-hass-3", "title": "Ancient Rome",                "status": "current", "week": 5},
        {"uuid": "tl-hass-4", "title": "Medieval Europe",             "status": "future",  "week": 7},
        {"uuid": "tl-hass-5", "title": "History Essay",               "status": "future",  "week": 9},
    ],
    "sub-pe": [
        {"uuid": "tl-pe-1", "title": "Team Sports Fundamentals", "status": "done",    "week": 1},
        {"uuid": "tl-pe-2", "title": "Athletics",                "status": "done",    "week": 3},
        {"uuid": "tl-pe-3", "title": "Fitness & Wellness",       "status": "current", "week": 5},
        {"uuid": "tl-pe-4", "title": "Swimming Program",         "status": "future",  "week": 7},
        {"uuid": "tl-pe-5", "title": "Physical Assessment",      "status": "future",  "week": 9},
    ],
    "sub-arts": [
        {"uuid": "tl-arts-1", "title": "Drawing Techniques",  "status": "done",    "week": 1},
        {"uuid": "tl-arts-2", "title": "Colour Theory",       "status": "done",    "week": 3},
        {"uuid": "tl-arts-3", "title": "Mixed Media Project", "status": "current", "week": 5},
        {"uuid": "tl-arts-4", "title": "Digital Art Intro",   "status": "future",  "week": 7},
        {"uuid": "tl-arts-5", "title": "Portfolio Review",    "status": "future",  "week": 9},
    ],
}

# parent → student bindings
PARENT_STUDENT_BINDINGS = [
    {"parent_uuid": "u-parent-01", "student_uuid": "s-aiden-01"},
]

# classes
CLASSES: dict[str, dict] = {
    "cls-7a": {
        "uuid": "cls-7a",
        "name": "7A",
        "grade_level": "Year 7",
        "homeroom_teacher_uuid": "u-teacher-01",
        "student_uuids": ["s-aiden-01", "s-priya-01", "s-james-01"],
    },
    "cls-7b": {
        "uuid": "cls-7b",
        "name": "7B",
        "grade_level": "Year 7",
        "homeroom_teacher_uuid": "u-teacher-02",
        "student_uuids": [],
    },
}

# teacher → student → subject assignments
# Ms. Thompson (u-teacher-01) teaches English; Mr. Walsh (u-teacher-02) teaches Math
TEACHING_ASSIGNMENTS = [
    {"teacher_uuid": "u-teacher-01", "student_uuid": "s-aiden-01", "subject_uuid": "sub-eng"},
    {"teacher_uuid": "u-teacher-01", "student_uuid": "s-priya-01", "subject_uuid": "sub-eng"},
    {"teacher_uuid": "u-teacher-01", "student_uuid": "s-james-01", "subject_uuid": "sub-eng"},
    {"teacher_uuid": "u-teacher-02", "student_uuid": "s-aiden-01", "subject_uuid": "sub-math"},
    {"teacher_uuid": "u-teacher-02", "student_uuid": "s-priya-01", "subject_uuid": "sub-math"},
    {"teacher_uuid": "u-teacher-02", "student_uuid": "s-james-01", "subject_uuid": "sub-math"},
    {"teacher_uuid": "u-teacher-03", "student_uuid": "s-aiden-01", "subject_uuid": "sub-sci"},
    {"teacher_uuid": "u-teacher-04", "student_uuid": "s-aiden-01", "subject_uuid": "sub-hass"},
]

REPORTS = {
    "r-001": {
        "uuid": "r-001",
        "student_uuid": "s-aiden-01",
        "title": "Week 8 Progress Report",
        "week": 8,
        "term": 2,
        "created_at": "2026-04-01T08:00:00Z",
        "is_read": False,
        "subjects": [
            {"subject_uuid": "sub-eng",  "subject_name": "English",     "subject_color": "#3DB6A8", "score": 75, "summary": "Essay writing shows great improvement. Scored 18/20 on persuasive writing task. Focus on varied sentence structure and expanding vocabulary through non-fiction reading."},
            {"subject_uuid": "sub-math", "subject_name": "Mathematics",  "subject_color": "#E8614E", "score": 82, "summary": "Strong performance in algebra. 15-minute daily practice sessions are making a real difference."},
            {"subject_uuid": "sub-sci",  "subject_name": "Science",      "subject_color": "#4A90D9", "score": 91, "summary": "Excellent participation in lab work. Leading class discussions on chemical reactions."},
            {"subject_uuid": "sub-hass", "subject_name": "HASS",         "subject_color": "#F0A732", "score": 55, "summary": "Struggling with Ancient Rome vocabulary (55%). 10 minutes of evening reading together would help significantly."},
        ],
        "content_markdown": "## Week 8 Progress\n\n### English — Good Progress ✅\nScored **18/20** on persuasive writing. Encourage non-fiction reading this term.\n\n### HASS — Needs Attention ⚠️\nStruggling with Ancient Rome unit (55%). Evening reading together would help.",
    },
    "r-002": {
        "uuid": "r-002",
        "student_uuid": "s-aiden-01",
        "title": "Term 2 Mid-Term Report",
        "week": 6,
        "term": 2,
        "created_at": "2026-03-15T10:00:00Z",
        "is_read": False,
        "subjects": [
            {"subject_uuid": "sub-math", "subject_name": "Mathematics", "subject_color": "#E8614E", "score": 80, "summary": "Performing above average in Mathematics. Particular strengths in algebra and problem-solving."},
            {"subject_uuid": "sub-sci",  "subject_name": "Science",     "subject_color": "#4A90D9", "score": 88, "summary": "Excellent enthusiasm and participation. Strong lab work skills evident throughout the term."},
        ],
        "content_markdown": "## Term 2 Mid-Term\n\n### Mathematics\nAbove average performance. Particular strengths in algebra.\n\n### Science\nExcellent enthusiasm and strong lab work skills.",
    },
}

ANNOUNCEMENTS = {
    "ann-001": {
        "uuid": "ann-001",
        "student_uuid": "s-aiden-01",
        "category": "Event",
        "title": "End-of-Term Music Concert",
        "body_preview": "Join us for the annual end-of-term music concert on Friday 11 April at 6:30 PM in the school hall. All students are invited to attend.",
        "content_markdown": "Join us for the annual end-of-term music concert on **Friday 11 April at 6:30 PM** in the school hall. All students are invited to attend and parents are warmly welcome.",
        "created_at": "2026-04-01T09:00:00Z",
        "is_read": True,
        "is_important": False,
        "author": "School Administration",
    },
    "ann-002": {
        "uuid": "ann-002",
        "student_uuid": "s-aiden-01",
        "category": "Interviews",
        "title": "Parent-Teacher Interviews — April 14",
        "body_preview": "Parent-teacher interviews are scheduled for Monday 14 April. Bookings open online from 7 April. Session slots are 10 minutes.",
        "content_markdown": "Parent-teacher interviews are scheduled for **Monday 14 April**. Bookings open online from 7 April via the school portal. Session slots are 10 minutes.",
        "created_at": "2026-03-28T10:00:00Z",
        "is_read": True,
        "is_important": True,
        "author": "Ms. Thompson",
    },
    "ann-003": {
        "uuid": "ann-003",
        "student_uuid": "s-aiden-01",
        "category": "Excursion",
        "title": "Year 7 Science Excursion — April 9",
        "body_preview": "Year 7 students will visit the Science Museum on Wednesday 9 April. Permission forms and payment due by April 4.",
        "content_markdown": "Year 7 students will visit the **Science Museum** on Wednesday 9 April. Permission forms and payment of $22 are due by Friday 4 April.",
        "created_at": "2026-03-22T08:00:00Z",
        "is_read": True,
        "is_important": False,
        "author": "Ms. Patel",
    },
}

# Threads: one per (parent, teacher, student) triple
THREADS = {
    "thread-parent01-teacher01-aiden": {
        "uuid": "thread-parent01-teacher01-aiden",
        "parent_uuid": "u-parent-01",
        "teacher_uuid": "u-teacher-01",
        "student_uuid": "s-aiden-01",
        "last_post_at": "2026-04-01T14:00:00Z",
    },
    "thread-parent01-teacher04-aiden": {
        "uuid": "thread-parent01-teacher04-aiden",
        "parent_uuid": "u-parent-01",
        "teacher_uuid": "u-teacher-04",
        "student_uuid": "s-aiden-01",
        "last_post_at": "2026-03-31T10:00:00Z",
    },
}

TAGS = {
    "tag-important": {
        "uuid": "tag-important",
        "name": "important",
        "scope": "system",
        "owner_teacher_uuid": None,
        "is_selectable_by_parent": False,
        "is_selectable_by_teacher": True,
        "affects_business_logic": True,
    },
    "tag-question": {
        "uuid": "tag-question",
        "name": "question",
        "scope": "system",
        "owner_teacher_uuid": None,
        "is_selectable_by_parent": True,
        "is_selectable_by_teacher": True,
        "affects_business_logic": False,
    },
}

POSTS = [
    {
        "uuid": "post-001",
        "thread_uuid": "thread-parent01-teacher01-aiden",
        "title": "Week 8 English update",
        "content_markdown": "Aiden has shown great improvement in essay writing this week, scoring 18/20 on his persuasive writing task. His arguments are becoming well-structured. I'd encourage him to read more non-fiction to strengthen his vocabulary — newspaper articles work great.",
        "created_at": "2026-04-01T14:00:00Z",
        "updated_at": None,
        "author": {"uuid": "u-teacher-01", "display_name": "Ms. Thompson", "role": "teacher"},
        "tags": [{"uuid": "tag-important", "name": "important", "scope": "system"}],
        "reply_to_post_uuid": None,
    },
    {
        "uuid": "post-002",
        "thread_uuid": "thread-parent01-teacher01-aiden",
        "title": None,
        "content_markdown": "Thank you Ms. Thompson! He has been working hard on his essays each evening. We will look for more non-fiction books this weekend.",
        "created_at": "2026-04-01T15:00:00Z",
        "updated_at": None,
        "author": {"uuid": "u-parent-01", "display_name": "Li Wei", "role": "parent"},
        "tags": [],
        "reply_to_post_uuid": "post-001",
    },
    {
        "uuid": "post-003",
        "thread_uuid": "thread-parent01-teacher01-aiden",
        "title": "Reading comprehension assessment — April 10",
        "content_markdown": "A reminder that our reading comprehension assessment is on April 10, covering persuasive texts. A revision guide has been uploaded to the school portal. Please ensure Aiden reviews the anthology chapters 4–6 over the Easter break.",
        "created_at": "2026-03-29T09:00:00Z",
        "updated_at": None,
        "author": {"uuid": "u-teacher-01", "display_name": "Ms. Thompson", "role": "teacher"},
        "tags": [],
        "reply_to_post_uuid": None,
    },
    {
        "uuid": "post-004",
        "thread_uuid": "thread-parent01-teacher04-aiden",
        "title": "Ancient Rome unit — support needed",
        "content_markdown": "Aiden is finding the vocabulary in this unit particularly challenging. I've compiled a glossary of key terms on the school portal. 10 minutes of reading together each evening and quizzing him on the terms would make a significant difference.",
        "created_at": "2026-03-31T10:00:00Z",
        "updated_at": None,
        "author": {"uuid": "u-teacher-04", "display_name": "Mr. Nguyen", "role": "teacher"},
        "tags": [{"uuid": "tag-important", "name": "important", "scope": "system"}],
        "reply_to_post_uuid": None,
    },
]

SUBJECT_STATS = {
    "s-aiden-01": {
        "sub-eng": {
            "score": 75.0,
            "progress": 0.68,
            "assignment_completion_rate": 0.88,
            "attendance_rate": 0.96,
            "term_scores": [65, 68, 70, 72, 70, 73, 74, 75],
            "class_avg":   [68, 69, 70, 70, 71, 72, 72, 72],
        },
        "sub-math": {
            "score": 82.0,
            "progress": 0.75,
            "assignment_completion_rate": 0.95,
            "attendance_rate": 0.98,
            "term_scores": [62, 68, 74, 70, 78, 80, 82, 82],
            "class_avg":   [65, 67, 70, 68, 72, 74, 75, 75],
        },
        "sub-sci": {
            "score": 91.0,
            "progress": 0.85,
            "assignment_completion_rate": 0.98,
            "attendance_rate": 0.99,
            "term_scores": [78, 80, 84, 85, 87, 89, 90, 91],
            "class_avg":   [72, 73, 74, 76, 77, 78, 79, 79],
        },
        "sub-hass": {
            "score": 55.0,
            "progress": 0.50,
            "assignment_completion_rate": 0.70,
            "attendance_rate": 0.92,
            "term_scores": [64, 62, 60, 58, 56, 55, 54, 55],
            "class_avg":   [66, 67, 67, 68, 68, 68, 69, 69],
        },
        "sub-pe": {
            "score": 91.0,
            "progress": 0.90,
            "assignment_completion_rate": 0.99,
            "attendance_rate": 1.00,
            "term_scores": [82, 84, 86, 88, 89, 90, 90, 91],
            "class_avg":   [75, 76, 77, 78, 78, 79, 79, 80],
        },
        "sub-arts": {
            "score": 79.0,
            "progress": 0.74,
            "assignment_completion_rate": 0.90,
            "attendance_rate": 0.97,
            "term_scores": [72, 74, 76, 75, 77, 78, 78, 79],
            "class_avg":   [70, 71, 72, 72, 73, 74, 74, 74],
        },
    },
    "s-priya-01": {
        "sub-eng":  {"score": 88.0, "progress": 0.82, "assignment_completion_rate": 0.97, "attendance_rate": 0.99, "term_scores": [80, 82, 84, 86, 87, 87, 88, 88], "class_avg": [68, 69, 70, 70, 71, 72, 72, 72]},
        "sub-math": {"score": 91.0, "progress": 0.88, "assignment_completion_rate": 0.98, "attendance_rate": 1.00, "term_scores": [82, 84, 86, 88, 89, 90, 91, 91], "class_avg": [65, 67, 70, 68, 72, 74, 75, 75]},
    },
    "s-james-01": {
        "sub-eng":  {"score": 62.0, "progress": 0.55, "assignment_completion_rate": 0.75, "attendance_rate": 0.90, "term_scores": [65, 63, 62, 60, 61, 62, 62, 62], "class_avg": [68, 69, 70, 70, 71, 72, 72, 72]},
        "sub-math": {"score": 70.0, "progress": 0.65, "assignment_completion_rate": 0.85, "attendance_rate": 0.94, "term_scores": [62, 64, 66, 67, 68, 69, 70, 70], "class_avg": [65, 67, 70, 68, 72, 74, 75, 75]},
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def ok(data, status=200):
    return jsonify({"data": data}), status


def ok_list(data, page=1, page_size=20, total=None):
    if total is None:
        total = len(data)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    sliced = data[start: start + page_size]
    return jsonify({
        "data": sliced,
        "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    }), 200


def err(code, message, status=400, details=None):
    return jsonify({"error": {"code": code, "message": message, "details": details or {}}}), status


def now_iso():
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def make_at(user_uuid: str) -> str:
    payload = {
        "sub": user_uuid,
        "type": "access",
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=AT_EXP_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def make_rt(user_uuid: str) -> str:
    token = str(uuid_lib.uuid4())
    REFRESH_TOKENS[token] = user_uuid
    return token


def set_at_cookie(resp, token: str):
    resp.set_cookie(
        "access_token", token,
        httponly=True, samesite="Lax", secure=False,
        max_age=AT_EXP_MINUTES * 60, path="/",
    )


def set_rt_cookie(resp, token: str):
    resp.set_cookie(
        "refresh_token", token,
        httponly=True, samesite="Lax", secure=False,
        max_age=RT_EXP_DAYS * 86400, path="/api/auth/refresh",
    )


def clear_cookies(resp):
    resp.set_cookie("access_token", "", expires=0, path="/")
    resp.set_cookie("refresh_token", "", expires=0, path="/api/auth/refresh")


def decode_at(token: str):
    """Returns payload dict or raises jwt.ExpiredSignatureError / jwt.InvalidTokenError."""
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


def get_current_user():
    """Read access_token cookie, return user dict or None."""
    token = request.cookies.get("access_token")
    if not token:
        return None, "missing"
    try:
        payload = decode_at(token)
        user = USERS.get(payload["sub"])
        return user, None
    except jwt.ExpiredSignatureError:
        return None, "expired"
    except jwt.InvalidTokenError:
        return None, "invalid"


def require_auth(f):
    """Decorator: enforce valid access_token."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user, reason = get_current_user()
        if user is None:
            if reason == "expired":
                return err("access_token_expired", "Access token has expired.", 401)
            return err("unauthenticated", "Authentication required.", 401)
        return f(user, *args, **kwargs)
    return wrapper


def ensure_user_state(user_uuid: str):
    if user_uuid not in USER_STATE:
        USER_STATE[user_uuid] = {
            "read_reports": set(),
            "archived_reports": set(),
            "read_announcements": set(),
            "read_threads": set(),
        }
    elif "read_threads" not in USER_STATE[user_uuid]:
        USER_STATE[user_uuid]["read_threads"] = set()


def check_origin():
    origin = request.headers.get("Origin", "")
    # Dev mock server: allow any localhost/127.0.0.1 origin, or empty (Vite proxy same-origin)
    if origin and not (
        origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")
    ):
        return err("origin_not_allowed", "Origin not allowed.", 403)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
def login():
    if e := check_origin():
        return e
    body = request.get_json(silent=True) or {}
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    user = next((u for u in USERS.values() if u["email"].lower() == email), None)
    if not user or user["password"] != password:
        return err("unauthenticated", "Invalid email or password.", 401)

    at = make_at(user["uuid"])
    rt = make_rt(user["uuid"])

    resp = make_response(jsonify({
        "data": {
            "user": {k: user[k] for k in ("uuid", "role", "display_name", "email", "avatar_url")}
        }
    }), 200)
    set_at_cookie(resp, at)
    set_rt_cookie(resp, rt)
    return resp


@app.post("/api/auth/refresh")
def refresh():
    if e := check_origin():
        return e
    rt = request.cookies.get("refresh_token")
    if not rt or rt not in REFRESH_TOKENS:
        return err("refresh_token_expired", "Refresh token invalid or expired.", 401)

    user_uuid = REFRESH_TOKENS[rt]
    at = make_at(user_uuid)

    resp = make_response(jsonify({"data": {"success": True}}), 200)
    set_at_cookie(resp, at)
    return resp


@app.post("/api/auth/logout")
@require_auth
def logout(user):
    if e := check_origin():
        return e
    rt = request.cookies.get("refresh_token")
    if rt:
        REFRESH_TOKENS.pop(rt, None)
    resp = make_response(jsonify({"data": {"success": True}}), 200)
    clear_cookies(resp)
    return resp


@app.post("/api/auth/logout_all")
@require_auth
def logout_all(user):
    if e := check_origin():
        return e
    tokens_to_del = [k for k, v in REFRESH_TOKENS.items() if v == user["uuid"]]
    for t in tokens_to_del:
        del REFRESH_TOKENS[t]
    resp = make_response(jsonify({"data": {"success": True}}), 200)
    clear_cookies(resp)
    return resp


@app.get("/api/me")
@require_auth
def get_me(user):
    return ok({k: user[k] for k in ("uuid", "role", "display_name", "email", "phone_number", "avatar_url")})


@app.patch("/api/me")
@require_auth
def update_me(user):
    if e := check_origin():
        return e
    body = request.get_json(silent=True) or {}
    for field in ("display_name", "phone_number", "avatar_url"):
        if field in body:
            user[field] = body[field]
    return ok({k: user[k] for k in ("uuid", "role", "display_name", "email", "phone_number", "avatar_url")})


# ═══════════════════════════════════════════════════════════════════════════════
# SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

DEFAULT_SETTINGS = {
    "language": None, "timezone": None, "theme": "system",
    "high_contrast_mode": False, "tts_enabled": False,
    "email_digest_enabled": False, "email_post_notification_enabled": False,
    "default_report_time_range": "30d", "default_announcement_time_range": "30d",
}
USER_SETTINGS: dict[str, dict] = {}


@app.get("/api/settings")
@require_auth
def get_settings(user):
    s = USER_SETTINGS.get(user["uuid"], DEFAULT_SETTINGS.copy())
    return ok(s)


@app.patch("/api/settings")
@require_auth
def update_settings(user):
    if e := check_origin():
        return e
    if user["uuid"] not in USER_SETTINGS:
        USER_SETTINGS[user["uuid"]] = DEFAULT_SETTINGS.copy()
    body = request.get_json(silent=True) or {}
    for k in DEFAULT_SETTINGS:
        if k in body and body[k] is not None:
            USER_SETTINGS[user["uuid"]][k] = body[k]
    return ok(USER_SETTINGS[user["uuid"]])


# ═══════════════════════════════════════════════════════════════════════════════
# PARENT — STUDENTS
# ═══════════════════════════════════════════════════════════════════════════════

def get_parent_students(parent_uuid: str) -> list:
    uuids = [b["student_uuid"] for b in PARENT_STUDENT_BINDINGS if b["parent_uuid"] == parent_uuid]
    return [STUDENTS[u] for u in uuids if u in STUDENTS]


@app.get("/api/parents/me/students")
@require_auth
def parent_students(user):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    students = get_parent_students(user["uuid"])
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))
    return ok_list(students, page, page_size)


@app.get("/api/parents/me/students/<student_uuid>/dashboard")
@require_auth
def parent_dashboard(user, student_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    student = STUDENTS.get(student_uuid)
    if not student:
        return err("not_found", "Student not found.", 404)

    stats = SUBJECT_STATS.get(student_uuid, {})

    # Build subjects list (SubjectSummary[])
    subjects = []
    for s_uuid, s_stats in stats.items():
        subj = SUBJECTS.get(s_uuid)
        if not subj:
            continue
        teacher = USERS.get(subj["teacher_uuid"], {})
        subjects.append({
            "uuid": subj["uuid"],
            "name": subj["name"],
            "code": subj["code"],
            "color": subj["color"],
            "score": s_stats["score"],
            "progress": round(s_stats["progress"] * 100) if s_stats.get("progress") is not None else None,
            "teacher": {"uuid": teacher.get("uuid"), "display_name": teacher.get("display_name"), "email": teacher.get("email")},
        })

    scores = [s["score"] for s in stats.values()]
    overall = round(sum(scores) / len(scores), 1) if scores else 0
    completions = [s["assignment_completion_rate"] for s in stats.values()]
    avg_completion = round(sum(completions) / len(completions) * 100) if completions else 0
    at_risk_count = sum(1 for s in stats.values() if s["score"] < 60)

    # SummaryCard[]
    summary_cards = [
        {"label": "overallScore",  "value": f"{overall}%",         "sub": "Term 2, Week 8", "trend": "up",   "color": "a1"},
        {"label": "attendance",    "value": "94%",                  "sub": "This term",      "trend": "flat", "color": "a2"},
        {"label": "assignments",   "value": f"{avg_completion}%",   "sub": "Completion rate","trend": "up",   "color": "a3"},
        {"label": "atRisk",        "value": str(at_risk_count),     "sub": "Needs attention","color": "a4"},
    ]

    # subject_chart: ChartDataPoint[] per subject (bar chart)
    subject_chart = []
    for s in subjects:
        s_stat = stats.get(s["uuid"], {})
        class_avg_arr = s_stat.get("class_avg", [])
        class_avg_last = class_avg_arr[-1] if class_avg_arr else 0
        subject_chart.append({"label": s["name"], "value": s_stat.get("score", 0), "avg": class_avg_last})

    # trend_chart: ChartDataPoint[] using English scores as proxy for overall trend
    eng_scores = stats.get("sub-eng", stats.get(next(iter(stats), ""), {})).get("term_scores", [])
    trend_chart = [{"label": f"Wk{i+1}", "value": v} for i, v in enumerate(eng_scores)]

    # important_post_banners: ImportantPostBanner[]
    def get_subject_for_teacher(teacher_uuid):
        for a in TEACHING_ASSIGNMENTS:
            if a["teacher_uuid"] == teacher_uuid and a["student_uuid"] == student_uuid:
                return SUBJECTS.get(a["subject_uuid"], {}).get("name", "")
        return ""

    important_posts = [
        {
            "uuid": p["uuid"],
            "title": p.get("title") or p["content_markdown"][:60],
            "subject": get_subject_for_teacher(p["author"]["uuid"]),
            "teacher_name": p["author"]["display_name"],
            "created_at": p["created_at"],
        }
        for p in (POSTS + RUNTIME_POSTS)
        if any(t["name"] == "important" for t in p.get("tags", []))
    ]

    return ok({
        "student": {
            "uuid": student["uuid"],
            "display_name": student["full_name"],
            "grade": student["grade_level"],
            "class_name": student["class_name"],
            "birthday": student.get("birthday"),
        },
        "summary_cards": summary_cards,
        "subject_chart": subject_chart,
        "trend_chart": trend_chart,
        "important_post_banners": important_posts,
        "subjects": subjects,
    })


@app.get("/api/parents/me/students/<student_uuid>/subjects")
@require_auth
def parent_subjects(user, student_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    stats = SUBJECT_STATS.get(student_uuid, {})
    assignments = [a for a in TEACHING_ASSIGNMENTS if a["student_uuid"] == student_uuid]
    seen = set()
    result = []
    for a in assignments:
        subj = SUBJECTS.get(a["subject_uuid"])
        teacher = USERS.get(a["teacher_uuid"])
        if subj and teacher and subj["uuid"] not in seen:
            seen.add(subj["uuid"])
            s_stat = stats.get(subj["uuid"], {})
            result.append({
                "uuid": subj["uuid"],
                "name": subj["name"],
                "code": subj["code"],
                "color": subj["color"],
                "score": s_stat.get("score"),
                "progress": s_stat.get("progress"),
                "teacher": {"uuid": teacher["uuid"], "display_name": teacher["display_name"], "email": teacher.get("email")},
            })
    return ok(result)


@app.get("/api/parents/me/students/<student_uuid>/subjects/<subject_uuid>")
@require_auth
def parent_subject_detail(user, student_uuid, subject_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    subj = SUBJECTS.get(subject_uuid)
    student = STUDENTS.get(student_uuid)
    if not subj or not student:
        return err("not_found", "Not found.", 404)

    teacher = USERS.get(subj["teacher_uuid"], {})
    stats = SUBJECT_STATS.get(student_uuid, {}).get(subject_uuid, {})

    term_scores = stats.get("term_scores", [])
    class_avg   = stats.get("class_avg", [])
    current_score = stats.get("score", 0)
    term_avg = round(sum(term_scores) / len(term_scores), 1) if term_scores else current_score
    highest  = max(term_scores) if term_scores else current_score
    lowest   = min(term_scores) if term_scores else current_score
    class_avg_last = class_avg[-1] if class_avg else 0

    trend_data     = [{"label": f"Wk{i+1}", "value": v} for i, v in enumerate(term_scores)]
    class_avg_data = [{"label": f"Wk{i+1}", "value": v} for i, v in enumerate(class_avg)]
    timeline = TIMELINES.get(subject_uuid, [])

    # Posts: teacher posts in threads involving this student
    thread_uuids = {t["uuid"] for t in THREADS.values() if t["student_uuid"] == student_uuid}
    subject_posts = [
        p for p in (POSTS + RUNTIME_POSTS)
        if p["thread_uuid"] in thread_uuids and p["author"]["uuid"] == subj["teacher_uuid"]
    ]

    return ok({
        "subject": {
            "uuid": subj["uuid"],
            "name": subj["name"],
            "code": subj["code"],
            "color": subj["color"],
            "teacher": {"uuid": teacher.get("uuid"), "display_name": teacher.get("display_name"), "email": teacher.get("email")},
        },
        "overview": {
            "current_score": current_score,
            "term_avg": term_avg,
            "highest": highest,
            "lowest": lowest,
            "class_avg": class_avg_last,
        },
        "trend_data": trend_data,
        "class_avg_data": class_avg_data,
        "timeline": timeline,
        "posts": subject_posts,
    })


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/parents/me/students/<student_uuid>/reports")
@require_auth
def parent_reports(user, student_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    ensure_user_state(user["uuid"])
    us = USER_STATE[user["uuid"]]

    reports = [r for r in REPORTS.values() if r["student_uuid"] == student_uuid]
    result = []
    for r in reports:
        is_read = r["uuid"] in us["read_reports"]
        result.append({
            "uuid": r["uuid"],
            "title": r["title"],
            "week": r.get("week", 0),
            "term": r.get("term", 2),
            "created_at": r["created_at"],
            "is_read": is_read,
            "subjects": r.get("subjects", []),
        })

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))
    return ok_list(result, page, page_size)


@app.get("/api/parents/me/students/<student_uuid>/reports/<report_uuid>")
@require_auth
def parent_report_detail(user, student_uuid, report_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    r = REPORTS.get(report_uuid)
    if not r or r["student_uuid"] != student_uuid:
        return err("not_found", "Report not found.", 404)
    ensure_user_state(user["uuid"])
    us = USER_STATE[user["uuid"]]
    student = STUDENTS.get(student_uuid, {})
    return ok({
        "uuid": r["uuid"],
        "title": r["title"],
        "week": r.get("week", 0),
        "term": r.get("term", 2),
        "created_at": r["created_at"],
        "is_read": report_uuid in us["read_reports"],
        "subjects": r.get("subjects", []),
        "content_markdown": r.get("content_markdown", ""),
        "student": {
            "uuid": student.get("uuid", student_uuid),
            "display_name": student.get("full_name", ""),
            "grade": student.get("grade_level"),
            "class_name": student.get("class_name"),
        },
    })


@app.post("/api/reports/<report_uuid>/read")
@require_auth
def mark_report_read(user, report_uuid):
    if e := check_origin():
        return e
    r = REPORTS.get(report_uuid)
    if not r:
        return err("not_found", "Report not found.", 404)
    ensure_user_state(user["uuid"])
    USER_STATE[user["uuid"]]["read_reports"].add(report_uuid)
    return ok({"report_uuid": report_uuid, "is_read": True, "read_at": now_iso()})


@app.post("/api/reports/<report_uuid>/archive")
@require_auth
def archive_report(user, report_uuid):
    if e := check_origin():
        return e
    r = REPORTS.get(report_uuid)
    if not r:
        return err("not_found", "Report not found.", 404)
    ensure_user_state(user["uuid"])
    USER_STATE[user["uuid"]]["archived_reports"].add(report_uuid)
    return ok({"report_uuid": report_uuid, "is_archived": True, "archived_at": now_iso()})


@app.post("/api/reports/<report_uuid>/unarchive")
@require_auth
def unarchive_report(user, report_uuid):
    if e := check_origin():
        return e
    ensure_user_state(user["uuid"])
    USER_STATE[user["uuid"]]["archived_reports"].discard(report_uuid)
    return ok({"report_uuid": report_uuid, "is_archived": False})


@app.post("/api/reports/<report_uuid>/generate")
@require_auth
def generate_full_report(user, report_uuid):
    """AI生成全文报告（含学科、活动、老师观察、顾问建议），支持多语言。"""
    if e := check_origin():
        return e
    body = request.get_json(silent=True) or {}
    lang = (body.get("language") or "en").lower()

    r = REPORTS.get(report_uuid)
    if not r:
        return err("not_found", "Report not found.", 404)

    cache_key = (report_uuid, lang)
    if cache_key in REPORT_FULL_CACHE:
        return ok({"content_markdown": REPORT_FULL_CACHE[cache_key], "cached": True})

    student_uuid = r["student_uuid"]
    student = STUDENTS.get(student_uuid, {})
    stats    = SUBJECT_STATS.get(student_uuid, {})
    subjects = r.get("subjects", [])

    # School activities (announcements)
    activities = [a for a in ANNOUNCEMENTS.values()]

    # Teacher posts / observations for this student
    thread_uuids = {t["uuid"] for t in THREADS.values() if t.get("student_uuid") == student_uuid}
    teacher_posts = [
        p for p in (POSTS + RUNTIME_POSTS)
        if p["thread_uuid"] in thread_uuids and p["author"].get("role") == "teacher"
    ]

    lang_name = LANG_NAMES.get(lang, "English")
    student_name = student.get("full_name", "the student")
    avg_score = round(sum(s["score"] for s in subjects) / len(subjects), 1) if subjects else 0

    subject_lines = "\n".join(
        f"- {s['subject_name']}: {s['score']}% — {s['summary']}" for s in subjects
    )
    activity_lines = "\n".join(
        f"- [{a.get('category','School')}] {a['title']}: {a['body_preview'][:120]}" for a in activities
    )
    teacher_lines = "\n".join(
        f"- {p['author']['display_name']}: {p.get('title') or ''} — {p['content_markdown'][:200]}"
        for p in teacher_posts[:6]
    )

    system_prompt = (
        f"You are a warm, professional educational consultant writing a comprehensive weekly progress report for a parent. "
        f"Write entirely in {lang_name}. Use clear markdown formatting with these sections in order: "
        f"1) Executive Summary (2–3 sentences), "
        f"2) Academic Performance (one subsection per subject with score, detailed feedback, specific home tips), "
        f"3) School Activities & Events (from the data), "
        f"4) Teacher Observations (synthesise teacher notes), "
        f"5) Consultant Recommendations & This Week's Action Items (numbered, specific, actionable). "
        f"Be encouraging but honest. Personalise using the student's name. Aim for ~600–900 words."
    )
    user_prompt = (
        f"Student: {student_name} | Report: {r['title']} | Term {r.get('term',2)}, Week {r.get('week','?')} | Date: {r['created_at'][:10]}\n"
        f"Overall average: {avg_score}%\n\n"
        f"SUBJECT PERFORMANCE:\n{subject_lines}\n\n"
        f"SCHOOL ACTIVITIES & EVENTS:\n{activity_lines}\n\n"
        f"TEACHER NOTES & OBSERVATIONS:\n{teacher_lines}"
    )

    try:
        content = deepseek_chat(
            [{"role": "system", "content": system_prompt},
             {"role": "user",   "content": user_prompt}],
            temperature=0.45, max_tokens=3000,
        )
    except Exception as exc:
        return err("ai_error", f"Report generation failed: {exc}", 502)

    REPORT_FULL_CACHE[cache_key] = content
    return ok({"content_markdown": content, "cached": False})


# ═══════════════════════════════════════════════════════════════════════════════
# ANNOUNCEMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/parents/me/students/<student_uuid>/announcements")
@require_auth
def parent_announcements(user, student_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    ensure_user_state(user["uuid"])
    us = USER_STATE[user["uuid"]]
    anns = [a for a in ANNOUNCEMENTS.values() if a["student_uuid"] == student_uuid]
    result = []
    for a in anns:
        result.append({
            "uuid": a["uuid"],
            "title": a["title"],
            "body_preview": a.get("body_preview", a.get("content_markdown", "")[:140]),
            "created_at": a.get("created_at", a.get("published_at", "")),
            "is_read": a["uuid"] in us["read_announcements"],
            "author": a.get("author"),
            "category": a.get("category"),
        })
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))
    return ok_list(result, page, page_size)


@app.get("/api/announcements/<ann_uuid>")
@require_auth
def get_announcement(user, ann_uuid):
    a = ANNOUNCEMENTS.get(ann_uuid)
    if not a:
        return err("not_found", "Announcement not found.", 404)
    ensure_user_state(user["uuid"])
    return ok({**a, "is_read": ann_uuid in USER_STATE[user["uuid"]]["read_announcements"]})


@app.post("/api/announcements/<ann_uuid>/read")
@require_auth
def mark_announcement_read(user, ann_uuid):
    if e := check_origin():
        return e
    a = ANNOUNCEMENTS.get(ann_uuid)
    if not a:
        return err("not_found", "Announcement not found.", 404)
    ensure_user_state(user["uuid"])
    USER_STATE[user["uuid"]]["read_announcements"].add(ann_uuid)
    return ok({"announcement_uuid": ann_uuid, "is_read": True, "read_at": now_iso()})


@app.post("/api/threads/<thread_uuid>/read")
@require_auth
def mark_thread_read(user, thread_uuid):
    if e := check_origin():
        return e
    ensure_user_state(user["uuid"])
    USER_STATE[user["uuid"]]["read_threads"].add(thread_uuid)
    return ok({"thread_uuid": thread_uuid, "is_read": True, "read_at": now_iso()})


# ═══════════════════════════════════════════════════════════════════════════════
# DISCUSSIONS — PARENT SIDE
# ═══════════════════════════════════════════════════════════════════════════════

def get_thread(parent_uuid, teacher_uuid, student_uuid):
    for t in THREADS.values():
        if t["parent_uuid"] == parent_uuid and t["teacher_uuid"] == teacher_uuid and t["student_uuid"] == student_uuid:
            return t
    # lazy create
    new_uuid = f"thread-{parent_uuid}-{teacher_uuid}-{student_uuid}"
    thread = {
        "uuid": new_uuid,
        "parent_uuid": parent_uuid,
        "teacher_uuid": teacher_uuid,
        "student_uuid": student_uuid,
        "last_post_at": None,
    }
    THREADS[new_uuid] = thread
    return thread


@app.get("/api/parents/me/students/<student_uuid>/discussions/teachers")
@require_auth
def parent_discussion_teachers(user, student_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    teacher_uuids = list({a["teacher_uuid"] for a in TEACHING_ASSIGNMENTS if a["student_uuid"] == student_uuid})
    stats = SUBJECT_STATS.get(student_uuid, {})
    result = []
    for t_uuid in teacher_uuids:
        teacher = USERS.get(t_uuid)
        if not teacher:
            continue
        # Subject this teacher teaches to this student
        assignment = next((a for a in TEACHING_ASSIGNMENTS if a["teacher_uuid"] == t_uuid and a["student_uuid"] == student_uuid), None)
        subj = SUBJECTS.get(assignment["subject_uuid"]) if assignment else None
        thread = get_thread(user["uuid"], t_uuid, student_uuid)
        thread_posts = sorted([p for p in POSTS + RUNTIME_POSTS if p["thread_uuid"] == thread["uuid"]], key=lambda p: p["created_at"])
        ensure_user_state(user["uuid"])
        read_threads = USER_STATE[user["uuid"]]["read_threads"]
        unread = 0 if thread["uuid"] in read_threads else sum(1 for p in thread_posts if p["author"]["role"] == "teacher")
        latest = thread_posts[-1] if thread_posts else None
        s_stat = stats.get(subj["uuid"], {}) if subj else {}
        result.append({
            "teacher": {
                "uuid": teacher["uuid"],
                "display_name": teacher["display_name"],
                "email": teacher["email"],
                "avatar_url": teacher.get("avatar_url"),
            },
            "thread_uuid": thread["uuid"],
            "last_post_at": latest["created_at"] if latest else thread.get("last_post_at"),
            "unread_count": unread,
            "subject": {
                "uuid": subj["uuid"] if subj else "",
                "name": subj["name"] if subj else "General",
                "code": subj["code"] if subj else "",
                "color": subj["color"] if subj else "#999",
                "score": s_stat.get("score"),
                "progress": s_stat.get("progress"),
            },
            "latest_message_preview": latest["content_markdown"][:80] if latest else None,
        })
    return ok(result)


@app.get("/api/parents/me/students/<student_uuid>/discussions/teachers/<teacher_uuid>")
@require_auth
def parent_discussion_thread(user, student_uuid, teacher_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    student = STUDENTS.get(student_uuid)
    teacher = USERS.get(teacher_uuid)
    if not student or not teacher:
        return err("not_found", "Not found.", 404)

    thread = get_thread(user["uuid"], teacher_uuid, student_uuid)
    all_posts = [p for p in POSTS + RUNTIME_POSTS if p["thread_uuid"] == thread["uuid"]]

    keyword = request.args.get("keyword", "").lower()
    tag_filter = request.args.get("tag", "")
    if keyword:
        all_posts = [p for p in all_posts if keyword in (p.get("title") or "").lower() or keyword in p["content_markdown"].lower()]
    if tag_filter:
        all_posts = [p for p in all_posts if any(t["name"] == tag_filter for t in p.get("tags", []))]

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))
    start = (page - 1) * page_size
    paged_posts = all_posts[start: start + page_size]
    total = len(all_posts)

    return jsonify({
        "data": {
            "student": {"uuid": student["uuid"], "sid": student["sid"], "full_name": student["full_name"]},
            "teacher": {"uuid": teacher["uuid"], "display_name": teacher["display_name"], "email": teacher["email"], "avatar_url": None},
            "thread": {"uuid": thread["uuid"], "last_post_at": thread.get("last_post_at")},
            "available_tags": list(TAGS.values()),
            "posts": paged_posts,
        },
        "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": max(1, (total + page_size - 1) // page_size)},
    }), 200


# ═══════════════════════════════════════════════════════════════════════════════
# DISCUSSIONS — TEACHER SIDE
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/teachers/me/students/<student_uuid>/discussions/parents")
@require_auth
def teacher_discussion_parents(user, student_uuid):
    if user["role"] != "teacher":
        return err("role_not_allowed", "Only teachers can access this.", 403)
    student = STUDENTS.get(student_uuid)
    if not student:
        return err("not_found", "Student not found.", 404)

    parent_uuids = list({b["parent_uuid"] for b in PARENT_STUDENT_BINDINGS if b["student_uuid"] == student_uuid})
    result = []
    for p_uuid in parent_uuids:
        parent = USERS.get(p_uuid)
        if not parent:
            continue
        thread = get_thread(p_uuid, user["uuid"], student_uuid)
        thread_posts = [p for p in POSTS + RUNTIME_POSTS if p["thread_uuid"] == thread["uuid"]]
        ensure_user_state(user["uuid"])
        read_threads = USER_STATE[user["uuid"]]["read_threads"]
        unread = 0 if thread["uuid"] in read_threads else sum(1 for p in thread_posts if p["author"]["role"] == "parent")
        result.append({
            "parent": {"uuid": parent["uuid"], "display_name": parent["display_name"], "email": parent["email"], "avatar_url": None},
            "thread": {"uuid": thread["uuid"], "last_post_at": thread.get("last_post_at"), "unread_post_count": unread},
        })
    return ok(result)


@app.get("/api/teachers/me/students/<student_uuid>/discussions/parents/<parent_uuid>")
@require_auth
def teacher_discussion_thread(user, student_uuid, parent_uuid):
    if user["role"] != "teacher":
        return err("role_not_allowed", "Only teachers can access this.", 403)
    student = STUDENTS.get(student_uuid)
    parent = USERS.get(parent_uuid)
    if not student or not parent:
        return err("not_found", "Not found.", 404)

    thread = get_thread(parent_uuid, user["uuid"], student_uuid)
    all_posts = [p for p in POSTS + RUNTIME_POSTS if p["thread_uuid"] == thread["uuid"]]

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))
    start = (page - 1) * page_size
    paged_posts = all_posts[start: start + page_size]
    total = len(all_posts)

    return jsonify({
        "data": {
            "student": {"uuid": student["uuid"], "sid": student["sid"], "full_name": student["full_name"]},
            "parent": {"uuid": parent["uuid"], "display_name": parent["display_name"], "email": parent["email"], "avatar_url": None},
            "thread": {"uuid": thread["uuid"], "last_post_at": thread.get("last_post_at")},
            "available_tags": list(TAGS.values()),
            "posts": paged_posts,
        },
        "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": max(1, (total + page_size - 1) // page_size)},
    }), 200


# ═══════════════════════════════════════════════════════════════════════════════
# TEACHER — STUDENTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/teachers/me/students")
@require_auth
def teacher_students(user):
    if user["role"] != "teacher":
        return err("role_not_allowed", "Only teachers can access this.", 403)
    assigned_uuids = list({a["student_uuid"] for a in TEACHING_ASSIGNMENTS if a["teacher_uuid"] == user["uuid"]})
    keyword = request.args.get("search", request.args.get("keyword", "")).lower()
    result = []
    for s_uuid in assigned_uuids:
        s = STUDENTS.get(s_uuid)
        if not s:
            continue
        if keyword and keyword not in s["full_name"].lower():
            continue
        stats = SUBJECT_STATS.get(s_uuid, {})
        scores = [v["score"] for v in stats.values()]
        avg = round(sum(scores) / len(scores), 1) if scores else 0
        at_risk = avg < 65 or any(v["score"] < 55 for v in stats.values())
        # Build subjects with scores
        subjects = []
        for subj_uuid, s_stat in stats.items():
            subj = SUBJECTS.get(subj_uuid)
            if subj:
                subjects.append({"uuid": subj["uuid"], "name": subj["name"], "code": subj["code"], "color": subj["color"], "score": s_stat["score"]})
        # Count unread messages from any parent of this student
        parent_bindings = [b for b in PARENT_STUDENT_BINDINGS if b["student_uuid"] == s_uuid]
        unread_msgs = 0
        for binding in parent_bindings:
            thread = get_thread(binding["parent_uuid"], user["uuid"], s_uuid)
            thread_posts = [p for p in POSTS + RUNTIME_POSTS if p["thread_uuid"] == thread["uuid"]]
            unread_msgs += sum(1 for p in thread_posts if p["author"]["role"] == "parent")
        result.append({
            "student": {
                "uuid": s["uuid"],
                "display_name": s["full_name"],
                "grade": s["grade_level"],
                "class_name": s["class_name"],
                "overall_score": avg,
            },
            "overall_score": avg,
            "at_risk": at_risk,
            "unread_messages": unread_msgs,
            "subjects": subjects,
        })
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))
    return ok_list(result, page, page_size)


@app.get("/api/teachers/me/students/<student_uuid>/dashboard")
@require_auth
def teacher_dashboard(user, student_uuid):
    if user["role"] != "teacher":
        return err("role_not_allowed", "Only teachers can access this.", 403)
    student = STUDENTS.get(student_uuid)
    if not student:
        return err("not_found", "Student not found.", 404)
    return ok({
        "student": student,
        "dashboard_context": {"last_updated_at": now_iso(), "selected_range": "30d", "unread_post_count": 0, "unread_announcement_count": 0},
        "summary_cards": {"overall_performance_index": 74.0, "assignment_completion_rate": 0.88, "attendance_rate": 0.94, "ai_summary": None},
        "charts": {},
        "important_post_banners": [],
        "teacher_actions": {"can_create_report": True, "can_publish_announcement": True, "can_manage_tags": True},
    })


# ═══════════════════════════════════════════════════════════════════════════════
# POSTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/threads/<thread_uuid>/posts")
@require_auth
def create_post(user, thread_uuid):
    if e := check_origin():
        return e
    thread = THREADS.get(thread_uuid)
    if not thread:
        return err("not_found", "Thread not found.", 404)

    body = request.get_json(silent=True) or {}
    content = (body.get("content_markdown") or "").strip()
    if not content:
        return err("validation_error", "content_markdown is required.", 422)

    tag_uuids = body.get("tag_uuids", [])
    # parent can only use selectable-by-parent tags
    resolved_tags = []
    for t_uuid in tag_uuids:
        tag = TAGS.get(t_uuid)
        if not tag:
            continue
        if user["role"] == "parent" and not tag["is_selectable_by_parent"]:
            return err("forbidden", f"Tag '{tag['name']}' cannot be used by parents.", 403)
        resolved_tags.append({"uuid": tag["uuid"], "name": tag["name"], "scope": tag["scope"]})

    new_post = {
        "uuid": f"post-{uuid_lib.uuid4().hex[:8]}",
        "thread_uuid": thread_uuid,
        "title": body.get("title"),
        "content_markdown": content,
        "created_at": now_iso(),
        "updated_at": None,
        "author": {"uuid": user["uuid"], "display_name": user["display_name"], "role": user["role"]},
        "tags": resolved_tags,
        "reply_to_post_uuid": body.get("reply_to_post_uuid"),
    }
    RUNTIME_POSTS.append(new_post)
    THREADS[thread_uuid]["last_post_at"] = new_post["created_at"]
    return ok(new_post, 201)


@app.patch("/api/posts/<post_uuid>")
@require_auth
def update_post(user, post_uuid):
    if e := check_origin():
        return e
    all_posts = POSTS + RUNTIME_POSTS
    post = next((p for p in all_posts if p["uuid"] == post_uuid), None)
    if not post:
        return err("not_found", "Post not found.", 404)
    if post["author"]["uuid"] != user["uuid"]:
        return err("forbidden", "You can only edit your own posts.", 403)

    body = request.get_json(silent=True) or {}
    if "content_markdown" in body and body["content_markdown"]:
        post["content_markdown"] = body["content_markdown"]
    if "title" in body:
        post["title"] = body["title"]
    post["updated_at"] = now_iso()
    return ok(post)


@app.delete("/api/posts/<post_uuid>")
@require_auth
def delete_post(user, post_uuid):
    if e := check_origin():
        return e
    # check runtime posts first
    for i, p in enumerate(RUNTIME_POSTS):
        if p["uuid"] == post_uuid:
            if p["author"]["uuid"] != user["uuid"]:
                return err("forbidden", "You can only delete your own posts.", 403)
            RUNTIME_POSTS.pop(i)
            return ok({"success": True})
    # check static posts
    post = next((p for p in POSTS if p["uuid"] == post_uuid), None)
    if not post:
        return err("not_found", "Post not found.", 404)
    if post["author"]["uuid"] != user["uuid"]:
        return err("forbidden", "You can only delete your own posts.", 403)
    return ok({"success": True})


# ═══════════════════════════════════════════════════════════════════════════════
# TAGS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/teachers/me/tags")
@require_auth
def teacher_tags(user):
    if user["role"] != "teacher":
        return err("role_not_allowed", "Only teachers can access this.", 403)
    scope = request.args.get("scope", "all")
    result = [
        t for t in TAGS.values()
        if scope == "all"
        or t["scope"] == scope
        or (t["scope"] == "teacher_private" and t.get("owner_teacher_uuid") == user["uuid"])
    ]
    return ok(result)


@app.post("/api/teachers/me/tags")
@require_auth
def create_tag(user, ):
    if e := check_origin():
        return e
    if user["role"] != "teacher":
        return err("role_not_allowed", "Only teachers can access this.", 403)
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    if not name:
        return err("validation_error", "name is required.", 422)
    # check duplicate
    if any(t["name"] == name and t.get("owner_teacher_uuid") == user["uuid"] for t in TAGS.values()):
        return err("duplicate_tag_name", f"Tag '{name}' already exists.", 409)
    new_tag = {
        "uuid": f"tag-{uuid_lib.uuid4().hex[:8]}",
        "name": name,
        "scope": "teacher_private",
        "owner_teacher_uuid": user["uuid"],
        "is_selectable_by_parent": body.get("is_selectable_by_parent", False),
        "is_selectable_by_teacher": True,
        "affects_business_logic": False,
    }
    TAGS[new_tag["uuid"]] = new_tag
    return ok(new_tag, 201)


# ═══════════════════════════════════════════════════════════════════════════════
# AI — DeepSeek 集成
# ═══════════════════════════════════════════════════════════════════════════════

def deepseek_chat(messages: list[dict], temperature: float = 0.7, max_tokens: int = 1024) -> str:
    """调用 DeepSeek Chat API，返回回复文本；失败时抛出异常。"""
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY 未配置")
    resp = http_requests.post(
        f"{DEEPSEEK_BASE_URL}/chat/completions",
        headers={
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": DEEPSEEK_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


LANG_NAMES = {
    "en": "English", "zh": "Chinese (Simplified)", "vi": "Vietnamese",
    "ar": "Arabic", "fr": "French", "es": "Spanish", "pt": "Portuguese",
    "de": "German", "ja": "Japanese", "ko": "Korean", "it": "Italian",
    "hi": "Hindi", "th": "Thai", "ms": "Malay", "id": "Indonesian", "tl": "Filipino (Tagalog)",
}

# 聊天记录存储: {user_uuid: [{"role":..., "content":..., "ts":...}, ...]}
CHAT_HISTORY: dict[str, list[dict]] = {}

# 内容翻译缓存: {(text_hash, lang): translated_text}
TRANSLATION_CACHE: dict[tuple, str] = {}

# 全文报告生成缓存: {(report_uuid, lang): content_markdown}
REPORT_FULL_CACHE: dict[tuple, str] = {}


def build_student_context(student_uuid: str) -> str:
    """把学生的真实数据组装成 AI 系统提示词片段。"""
    student = STUDENTS.get(student_uuid)
    if not student:
        return ""

    stats = SUBJECT_STATS.get(student_uuid, {})
    lines = [
        f"\n\n## Student Data for {student['full_name']} (Grade: {student['grade_level']}, Class: {student['class_name']})",
    ]
    for subj_uuid, s in stats.items():
        subj = SUBJECTS.get(subj_uuid, {})
        teacher = USERS.get(subj.get("teacher_uuid", ""), {})
        lines.append(
            f"- {subj.get('name', subj_uuid)}: score {s['score']}/100, "
            f"attendance {int(s['attendance_rate']*100)}%, "
            f"assignment completion {int(s['assignment_completion_rate']*100)}%, "
            f"teacher: {teacher.get('display_name', 'N/A')}"
        )

    # 最近报告摘要
    recent_reports = sorted(
        [r for r in REPORTS.values() if r["student_uuid"] == student_uuid],
        key=lambda r: r["created_at"], reverse=True
    )[:2]
    if recent_reports:
        lines.append("\n## Recent Reports")
        for r in recent_reports:
            lines.append(f"- [{r['created_at'][:10]}] {r['title']}")

    return "\n".join(lines)


@app.post("/api/ai/chat")
@require_auth
def ai_chat(user):
    """通用 AI 助手对话，支持学生数据上下文和聊天记录持久化。
    Body: {
        "messages": [{"role": "user"|"assistant", "content": "..."}],
        "context": {
            "student_uuid": "s-aiden-01",   // 注入学生真实数据
            "report_uuid": "r-001",          // 注入简报内容
            "ui_language": "zh"              // AI 默认回复语言
        }
    }
    """
    if e := check_origin():
        return e
    body = request.get_json(silent=True) or {}
    messages: list[dict] = body.get("messages") or []
    if not messages:
        return err("validation_error", "messages 不能为空", 422)

    context = body.get("context") or {}
    ui_lang = context.get("ui_language", "en")
    lang_name = LANG_NAMES.get(ui_lang, "English")

    system_parts: list[str] = [
        f"You are a helpful school-home communication assistant for Academy Linker. "
        f"Be concise, warm, and supportive. Always respond in {lang_name} unless the user explicitly writes in another language. "
        f"You have access to real student data provided below — use it to give specific, accurate answers."
    ]

    # 注入学生真实数据
    student_uuid = context.get("student_uuid")
    if student_uuid:
        student_ctx = build_student_context(student_uuid)
        if student_ctx:
            system_parts.append(student_ctx)

    # 注入简报上下文
    report_uuid = context.get("report_uuid")
    if report_uuid:
        report = REPORTS.get(report_uuid)
        if report:
            content = report.get("translated_content_markdown") or report.get("content_markdown", "")
            system_parts.append(
                f"\n\n## Current Report: {report['title']}\n\n{content}"
            )

    system_msg = {"role": "system", "content": "\n".join(system_parts)}
    full_messages = [system_msg] + messages

    try:
        reply = deepseek_chat(full_messages, temperature=0.7, max_tokens=800)
    except Exception as exc:
        return err("ai_error", f"AI 服务异常: {exc}", 502)

    # 保存聊天记录
    hist = CHAT_HISTORY.setdefault(user["uuid"], [])
    for m in messages[-2:]:  # 只存最新的用户消息
        if m.get("role") == "user":
            hist.append({"role": "user", "content": m["content"], "ts": now_iso()})
    hist.append({"role": "assistant", "content": reply, "ts": now_iso()})
    # 只保留最近 100 条
    CHAT_HISTORY[user["uuid"]] = hist[-100:]

    return ok({"reply": reply, "role": "assistant"})


@app.get("/api/ai/chat/history")
@require_auth
def ai_chat_history(user):
    """返回当前用户的 AI 聊天记录（最近 50 条）。"""
    hist = CHAT_HISTORY.get(user["uuid"], [])
    return ok(hist[-50:])


@app.post("/api/ai/insight")
@require_auth
def ai_insight(user):
    """为学科页面生成 AI Insight，不保存聊天记录。
    Body: { "subject_name": "Mathematics", "current_score": 82, "term_avg": 74, "ui_language": "zh" }
    Returns: { "summary": "...", "suggestions": ["...","...","..."] }
    """
    if e := check_origin():
        return e
    body = request.get_json(silent=True) or {}
    subject_name = body.get("subject_name", "the subject")
    current_score = body.get("current_score", "N/A")
    term_avg = body.get("term_avg", "N/A")
    student_uuid = body.get("student_uuid")
    ui_lang = body.get("ui_language", "en")
    lang_name = LANG_NAMES.get(ui_lang, "English")

    system_parts = [
        f"You are an AI assistant for a school parent portal called Academy Linker. "
        f"You generate concise, warm, parent-facing subject insights. "
        f"Always respond in {lang_name}. Your response must be ONLY valid JSON with no markdown fences."
    ]
    if student_uuid:
        ctx = build_student_context(student_uuid)
        if ctx:
            system_parts.append(ctx)

    user_prompt = (
        f"Generate an AI insight for the student's {subject_name} subject. "
        f"Current score: {current_score}%. Term average: {term_avg}%. "
        f"Write in {lang_name}. "
        f'Reply with ONLY this JSON (no markdown, no explanation): '
        f'{{"summary":"2 concise sentences in {lang_name}","suggestions":["action tip 1","action tip 2","action tip 3"]}}'
    )

    messages = [
        {"role": "system", "content": "\n".join(system_parts)},
        {"role": "user", "content": user_prompt},
    ]
    try:
        reply = deepseek_chat(messages, temperature=0.5, max_tokens=400)
    except Exception as exc:
        return err("ai_error", f"AI 服务异常: {exc}", 502)

    # 解析 JSON（AI 可能包裹在 ```json ... ```）
    match = re.search(r'\{[\s\S]*\}', reply)
    if match:
        try:
            parsed = json.loads(match.group())
            if "summary" in parsed and "suggestions" in parsed:
                return ok(parsed)
        except Exception:
            pass

    # 回退：把整段文本作为 summary
    return ok({"summary": reply.strip(), "suggestions": []})


@app.post("/api/content/translate")
@require_auth
def translate_content(user):
    """翻译任意文本内容（带缓存）。
    Body: { "text": "...", "target_language": "zh", "source_language": "en" }
    """
    if e := check_origin():
        return e
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    target_lang = (body.get("target_language") or "zh").lower()
    source_lang = (body.get("source_language") or "en").lower()

    if not text:
        return err("validation_error", "text 不能为空", 422)
    if target_lang == source_lang:
        return ok({"translated_text": text, "cached": True})

    cache_key = (hash(text), target_lang)
    if cache_key in TRANSLATION_CACHE:
        return ok({"translated_text": TRANSLATION_CACHE[cache_key], "cached": True})

    lang_name = LANG_NAMES.get(target_lang, target_lang)
    messages = [
        {
            "role": "system",
            "content": (
                f"Translate the following text into {lang_name}. "
                f"Rules: (1) Preserve ALL Markdown formatting. "
                f"(2) Keep abbreviations, acronyms (e.g. HASS, PE, IT, STEM), proper nouns, "
                f"subject codes, and names unchanged — do NOT expand or explain them. "
                f"(3) Output ONLY the translated text, no explanations or additions."
            ),
        },
        {"role": "user", "content": text},
    ]
    try:
        translated = deepseek_chat(messages, temperature=0.2, max_tokens=2048)
    except Exception as exc:
        return err("ai_error", f"翻译失败: {exc}", 502)

    TRANSLATION_CACHE[cache_key] = translated
    return ok({"translated_text": translated, "cached": False})


@app.post("/api/reports/<report_uuid>/translate")
@require_auth
def translate_report(user, report_uuid):
    """将简报翻译为指定语言。
    Body: { "target_language": "zh" }
    """
    if e := check_origin():
        return e
    report = REPORTS.get(report_uuid)
    if not report:
        return err("not_found", "Report not found.", 404)

    body = request.get_json(silent=True) or {}
    target_lang = (body.get("target_language") or "en").lower()
    lang_name = LANG_NAMES.get(target_lang, target_lang)

    original = report.get("content_markdown", "")
    if report.get("original_language") == target_lang:
        # 目标语言与原文相同，无需翻译
        report["translation_status"] = "not_required"
        report["translated_content_markdown"] = None
        report["display_language"] = target_lang
        return ok(report)

    messages = [
        {
            "role": "system",
            "content": (
                f"You are a professional translator. Translate the following Markdown student report "
                f"into {lang_name}. Preserve all Markdown formatting, headings, bold, bullet points, "
                f"and emojis exactly. Output ONLY the translated Markdown, no explanations."
            ),
        },
        {"role": "user", "content": original},
    ]

    try:
        translated = deepseek_chat(messages, temperature=0.3, max_tokens=2048)
    except Exception as exc:
        return err("ai_error", f"翻译失败: {exc}", 502)

    report["translated_content_markdown"] = translated
    report["translated_language"] = target_lang
    report["display_language"] = target_lang
    report["translation_status"] = "translated"
    report["translated_at"] = now_iso()

    return ok(report)


@app.post("/api/reports/<report_uuid>/summarize")
@require_auth
def summarize_report(user, report_uuid):
    """用 AI 对简报生成简短摘要。
    Body: { "language": "zh" }   // 可选，默认与简报原文语言一致
    """
    if e := check_origin():
        return e
    report = REPORTS.get(report_uuid)
    if not report:
        return err("not_found", "Report not found.", 404)

    body = request.get_json(silent=True) or {}
    lang_code = (body.get("language") or report.get("original_language") or "en").lower()
    lang_name = LANG_NAMES.get(lang_code, lang_code)

    content = report.get("translated_content_markdown") or report.get("content_markdown", "")

    messages = [
        {
            "role": "system",
            "content": (
                f"You are a helpful assistant for parents. Summarize the following student progress report "
                f"in 3-4 concise bullet points in {lang_name}. Focus on key takeaways and action items. "
                f"Output ONLY the bullet points."
            ),
        },
        {"role": "user", "content": content},
    ]

    try:
        summary = deepseek_chat(messages, temperature=0.5, max_tokens=400)
    except Exception as exc:
        return err("ai_error", f"摘要生成失败: {exc}", 502)

    return ok({"report_uuid": report_uuid, "summary": summary, "language": lang_code})


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

def require_admin(f):
    """Decorator: enforce admin role."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        user, reason = get_current_user()
        if user is None:
            if reason == "expired":
                return err("access_token_expired", "Access token has expired.", 401)
            return err("unauthenticated", "Authentication required.", 401)
        if user["role"] != "admin":
            return err("forbidden", "Admin access required.", 403)
        return f(user, *args, **kwargs)
    return wrapper


def _teacher_summary(t: dict) -> dict:
    return {
        "uuid": t["uuid"],
        "display_name": t["display_name"],
        "email": t["email"],
        "phone_number": t.get("phone_number"),
        "subjects": [
            s["name"] for s_uuid, s in SUBJECTS.items()
            if s.get("teacher_uuid") == t["uuid"]
        ],
        "student_count": len(set(
            a["student_uuid"] for a in TEACHING_ASSIGNMENTS if a["teacher_uuid"] == t["uuid"]
        )),
    }


def _class_summary(c: dict) -> dict:
    teacher = USERS.get(c.get("homeroom_teacher_uuid") or "", {})
    students = [
        {"uuid": s["uuid"], "display_name": s["preferred_name"], "full_name": s["full_name"],
         "sid": s["sid"]}
        for uid in c.get("student_uuids", [])
        if (s := STUDENTS.get(uid))
    ]
    return {
        "uuid": c["uuid"],
        "name": c["name"],
        "grade_level": c["grade_level"],
        "homeroom_teacher_uuid": c.get("homeroom_teacher_uuid"),
        "homeroom_teacher_name": teacher.get("display_name"),
        "student_count": len(students),
        "students": students,
    }


def _parent_summary(p: dict) -> dict:
    bound = [
        {"uuid": s["uuid"], "display_name": s["preferred_name"], "full_name": s["full_name"],
         "sid": s["sid"]}
        for b in PARENT_STUDENT_BINDINGS if b["parent_uuid"] == p["uuid"]
        if (s := STUDENTS.get(b["student_uuid"]))
    ]
    return {
        "uuid": p["uuid"],
        "display_name": p["display_name"],
        "email": p["email"],
        "phone_number": p.get("phone_number"),
        "students": bound,
    }


@app.get("/api/admin/overview")
@require_admin
def admin_overview(user):
    teachers = [u for u in USERS.values() if u["role"] == "teacher"]
    parents  = [u for u in USERS.values() if u["role"] == "parent"]
    return ok({
        "teacher_count": len(teachers),
        "student_count": len(STUDENTS),
        "parent_count":  len(parents),
        "class_count":   len(CLASSES),
    })


# ── Teachers ─────────────────────────────────────────────────

@app.get("/api/admin/teachers")
@require_admin
def admin_list_teachers(user):
    teachers = [_teacher_summary(u) for u in USERS.values() if u["role"] == "teacher"]
    return ok(teachers)


@app.post("/api/admin/teachers")
@require_admin
def admin_create_teacher(user):
    if e := check_origin(): return e
    body = request.get_json(silent=True) or {}
    display_name = (body.get("display_name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "password123").strip()
    phone_number = (body.get("phone_number") or "").strip() or None

    if not display_name or not email:
        return err("validation_error", "display_name and email are required.", 422)
    if any(u["email"].lower() == email for u in USERS.values()):
        return err("conflict", "Email already in use.", 409)

    new_uuid = f"u-teacher-{str(uuid_lib.uuid4())[:8]}"
    USERS[new_uuid] = {
        "uuid": new_uuid, "role": "teacher",
        "display_name": display_name, "email": email,
        "phone_number": phone_number, "avatar_url": None,
        "password": password,
    }
    return ok(_teacher_summary(USERS[new_uuid])), 201


@app.patch("/api/admin/teachers/<teacher_uuid>")
@require_admin
def admin_update_teacher(user, teacher_uuid):
    if e := check_origin(): return e
    t = USERS.get(teacher_uuid)
    if not t or t["role"] != "teacher":
        return err("not_found", "Teacher not found.", 404)
    body = request.get_json(silent=True) or {}
    for field in ("display_name", "email", "phone_number"):
        if field in body:
            t[field] = body[field]
    if "password" in body and body["password"]:
        t["password"] = body["password"]
    return ok(_teacher_summary(t))


# ── Classes ──────────────────────────────────────────────────

@app.get("/api/admin/classes")
@require_admin
def admin_list_classes(user):
    return ok([_class_summary(c) for c in CLASSES.values()])


@app.post("/api/admin/classes")
@require_admin
def admin_create_class(user):
    if e := check_origin(): return e
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    grade_level = (body.get("grade_level") or "").strip()
    if not name:
        return err("validation_error", "name is required.", 422)

    new_uuid = f"cls-{str(uuid_lib.uuid4())[:8]}"
    CLASSES[new_uuid] = {
        "uuid": new_uuid,
        "name": name,
        "grade_level": grade_level,
        "homeroom_teacher_uuid": body.get("homeroom_teacher_uuid") or None,
        "student_uuids": [],
    }
    return ok(_class_summary(CLASSES[new_uuid])), 201


@app.patch("/api/admin/classes/<class_uuid>")
@require_admin
def admin_update_class(user, class_uuid):
    if e := check_origin(): return e
    c = CLASSES.get(class_uuid)
    if not c:
        return err("not_found", "Class not found.", 404)
    body = request.get_json(silent=True) or {}
    if "name" in body: c["name"] = body["name"]
    if "grade_level" in body: c["grade_level"] = body["grade_level"]
    if "homeroom_teacher_uuid" in body: c["homeroom_teacher_uuid"] = body["homeroom_teacher_uuid"] or None
    if "add_student_uuid" in body:
        sid = body["add_student_uuid"]
        if sid and sid not in c["student_uuids"]:
            if sid not in STUDENTS:
                return err("not_found", "Student not found.", 404)
            c["student_uuids"].append(sid)
            # update student's class_name
            STUDENTS[sid]["class_name"] = c["name"]
    if "remove_student_uuid" in body:
        sid = body["remove_student_uuid"]
        c["student_uuids"] = [u for u in c["student_uuids"] if u != sid]
    return ok(_class_summary(c))


# ── Students ─────────────────────────────────────────────────

@app.get("/api/admin/students")
@require_admin
def admin_list_students(user):
    result = []
    for s in STUDENTS.values():
        parent_uuids = [b["parent_uuid"] for b in PARENT_STUDENT_BINDINGS if b["student_uuid"] == s["uuid"]]
        parents = [{"uuid": p["uuid"], "display_name": p["display_name"]} for pu in parent_uuids if (p := USERS.get(pu))]
        result.append({
            "uuid": s["uuid"], "sid": s["sid"],
            "full_name": s["full_name"], "preferred_name": s["preferred_name"],
            "class_name": s["class_name"], "grade_level": s["grade_level"],
            "parents": parents,
        })
    return ok(result)


@app.post("/api/admin/students")
@require_admin
def admin_create_student(user):
    if e := check_origin(): return e
    body = request.get_json(silent=True) or {}
    full_name = (body.get("full_name") or "").strip()
    preferred_name = (body.get("preferred_name") or full_name.split()[0] if full_name else "").strip()
    sid_val = (body.get("sid") or "").strip()
    class_name = (body.get("class_name") or "").strip()
    grade_level = (body.get("grade_level") or "").strip()

    if not full_name:
        return err("validation_error", "full_name is required.", 422)
    if not sid_val:
        sid_val = f"S{str(uuid_lib.uuid4().int)[:7]}"

    new_uuid = f"s-{str(uuid_lib.uuid4())[:8]}"
    STUDENTS[new_uuid] = {
        "uuid": new_uuid, "sid": sid_val,
        "full_name": full_name, "preferred_name": preferred_name,
        "class_name": class_name, "grade_level": grade_level,
        "avatar_url": None,
    }
    # auto-add to class if class_name matches
    for c in CLASSES.values():
        if c["name"] == class_name and new_uuid not in c["student_uuids"]:
            c["student_uuids"].append(new_uuid)
            break
    return ok(STUDENTS[new_uuid]), 201


# ── Parents ──────────────────────────────────────────────────

@app.get("/api/admin/parents")
@require_admin
def admin_list_parents(user):
    parents = [_parent_summary(u) for u in USERS.values() if u["role"] == "parent"]
    return ok(parents)


@app.post("/api/admin/parents")
@require_admin
def admin_create_parent(user):
    if e := check_origin(): return e
    body = request.get_json(silent=True) or {}
    display_name = (body.get("display_name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "password123").strip()
    phone_number = (body.get("phone_number") or "").strip() or None

    if not display_name or not email:
        return err("validation_error", "display_name and email are required.", 422)
    if any(u["email"].lower() == email for u in USERS.values()):
        return err("conflict", "Email already in use.", 409)

    new_uuid = f"u-parent-{str(uuid_lib.uuid4())[:8]}"
    USERS[new_uuid] = {
        "uuid": new_uuid, "role": "parent",
        "display_name": display_name, "email": email,
        "phone_number": phone_number, "avatar_url": None,
        "password": password,
    }
    return ok(_parent_summary(USERS[new_uuid])), 201


@app.post("/api/admin/bindings")
@require_admin
def admin_bind_student(user):
    if e := check_origin(): return e
    body = request.get_json(silent=True) or {}
    parent_uuid  = body.get("parent_uuid", "")
    student_uuid = body.get("student_uuid", "")
    if not parent_uuid or not student_uuid:
        return err("validation_error", "parent_uuid and student_uuid required.", 422)
    p = USERS.get(parent_uuid)
    if not p or p["role"] != "parent":
        return err("not_found", "Parent not found.", 404)
    if student_uuid not in STUDENTS:
        return err("not_found", "Student not found.", 404)
    if any(b["parent_uuid"] == parent_uuid and b["student_uuid"] == student_uuid for b in PARENT_STUDENT_BINDINGS):
        return err("conflict", "Binding already exists.", 409)
    PARENT_STUDENT_BINDINGS.append({"parent_uuid": parent_uuid, "student_uuid": student_uuid})
    return ok({"parent_uuid": parent_uuid, "student_uuid": student_uuid}), 201


@app.delete("/api/admin/bindings")
@require_admin
def admin_unbind_student(user):
    if e := check_origin(): return e
    body = request.get_json(silent=True) or {}
    parent_uuid  = body.get("parent_uuid", "")
    student_uuid = body.get("student_uuid", "")
    before = len(PARENT_STUDENT_BINDINGS)
    PARENT_STUDENT_BINDINGS[:] = [
        b for b in PARENT_STUDENT_BINDINGS
        if not (b["parent_uuid"] == parent_uuid and b["student_uuid"] == student_uuid)
    ]
    if len(PARENT_STUDENT_BINDINGS) == before:
        return err("not_found", "Binding not found.", 404)
    return ok({"removed": True})


# ═══════════════════════════════════════════════════════════════════════════════
# INCIDENT REPORTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/parents/me/students/<student_uuid>/incidents")
@require_auth
def create_incident_report(user, student_uuid):
    if e := check_origin(): return e
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    body = request.get_json(silent=True) or {}
    incident_type = body.get("type", "").strip()
    description   = body.get("description", "").strip()
    is_anonymous  = bool(body.get("is_anonymous", False))
    if not incident_type or not description:
        return err("validation_error", "type and description are required.", 400)
    report = {
        "uuid":         f"inc-{str(uuid_lib.uuid4())[:8]}",
        "student_uuid": student_uuid,
        "parent_uuid":  None if is_anonymous else user["uuid"],
        "type":         incident_type,
        "description":  description,
        "is_anonymous": is_anonymous,
        "status":       "received",
        "submitted_at": now_iso(),
    }
    INCIDENT_REPORTS.append(report)
    return ok({"uuid": report["uuid"], "status": "received"}, 201)


# ═══════════════════════════════════════════════════════════════════════════════
# LEAVE REQUESTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/parents/me/students/<student_uuid>/leave")
@require_auth
def get_leave_requests(user, student_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    requests_for_student = [r for r in LEAVE_REQUESTS if r["student_uuid"] == student_uuid]
    requests_for_student.sort(key=lambda r: r["submitted_at"], reverse=True)
    return ok_list(requests_for_student)


@app.post("/api/parents/me/students/<student_uuid>/leave")
@require_auth
def create_leave_request(user, student_uuid):
    if e := check_origin(): return e
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    body = request.get_json(silent=True) or {}
    leave_type = body.get("type", "").strip()
    start_date = body.get("start_date", "").strip()
    end_date = body.get("end_date", "").strip()
    reason = body.get("reason", "").strip()
    if not leave_type or not start_date or not end_date:
        return err("validation_error", "type, start_date and end_date are required.", 400)
    new_req = {
        "uuid": f"leave-{str(uuid_lib.uuid4())[:8]}",
        "student_uuid": student_uuid,
        "type": leave_type,
        "start_date": start_date,
        "end_date": end_date,
        "reason": reason,
        "status": "pending",
        "submitted_at": now_iso(),
    }
    LEAVE_REQUESTS.append(new_req)
    return ok(new_req, 201)


# ═══════════════════════════════════════════════════════════════════════════════
# STARTUP
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  Academy Linker — Mock Backend")
    print("  http://localhost:8000")
    print()
    print("  测试账号:")
    print("    家长  li.wei@email.com        / password123")
    print("    教师  thompson@westside.edu.au / password123")
    print("    管理员 admin@westside.edu.au   / admin123")
    print()
    ai_status = "✅ 已配置" if DEEPSEEK_API_KEY else "❌ 未配置 (设置 DEEPSEEK_API_KEY)"
    print(f"  DeepSeek AI: {ai_status}")
    print()
    print("  AI 接口:")
    print("    POST /api/ai/chat                        — 通用 AI 对话")
    print("    POST /api/reports/<uuid>/translate        — 简报翻译")
    print("    POST /api/reports/<uuid>/summarize        — 简报 AI 摘要")
    print()
    print("  前端 dev server 地址: http://localhost:5173")
    print("=" * 60)
    app.run(host="0.0.0.0", port=8000, debug=True)
