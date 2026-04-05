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
AT_EXP_MINUTES = 15
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
    },
    "s-priya-01": {
        "uuid": "s-priya-01",
        "sid": "S2024022",
        "full_name": "Priya Sharma",
        "preferred_name": "Priya",
        "class_name": "7A",
        "grade_level": "Year 7",
        "avatar_url": None,
    },
    "s-james-01": {
        "uuid": "s-james-01",
        "sid": "S2024031",
        "full_name": "James O'Brien",
        "preferred_name": "James",
        "class_name": "7A",
        "grade_level": "Year 7",
        "avatar_url": None,
    },
}

SUBJECTS = {
    "subj-math": {
        "uuid": "subj-math",
        "name": "Mathematics",
        "code": "MATH",
        "teacher_uuid": "u-teacher-01",
    },
    "subj-eng": {
        "uuid": "subj-eng",
        "name": "English",
        "code": "ENG",
        "teacher_uuid": "u-teacher-02",
    },
    "subj-sci": {
        "uuid": "subj-sci",
        "name": "Science",
        "code": "SCI",
        "teacher_uuid": "u-teacher-03",
    },
    "subj-hass": {
        "uuid": "subj-hass",
        "name": "HASS",
        "code": "HASS",
        "teacher_uuid": "u-teacher-04",
    },
}

# parent → student bindings
PARENT_STUDENT_BINDINGS = [
    {"parent_uuid": "u-parent-01", "student_uuid": "s-aiden-01"},
]

# teacher → student → subject assignments
TEACHING_ASSIGNMENTS = [
    {"teacher_uuid": "u-teacher-01", "student_uuid": "s-aiden-01", "subject_uuid": "subj-math"},
    {"teacher_uuid": "u-teacher-01", "student_uuid": "s-priya-01", "subject_uuid": "subj-math"},
    {"teacher_uuid": "u-teacher-01", "student_uuid": "s-james-01", "subject_uuid": "subj-math"},
    {"teacher_uuid": "u-teacher-02", "student_uuid": "s-aiden-01", "subject_uuid": "subj-eng"},
    {"teacher_uuid": "u-teacher-03", "student_uuid": "s-aiden-01", "subject_uuid": "subj-sci"},
    {"teacher_uuid": "u-teacher-04", "student_uuid": "s-aiden-01", "subject_uuid": "subj-hass"},
]

REPORTS = {
    "r-001": {
        "uuid": "r-001",
        "student_uuid": "s-aiden-01",
        "title": "Week 8 Progress Report",
        "report_type": "weekly",
        "source_type": "ai",
        "created_at": "2026-04-01T08:00:00Z",
        "updated_at": "2026-04-01T08:00:00Z",
        "subject": {"uuid": None, "name": None},
        "content_markdown": """## Aiden's Week in Review

### Mathematics — Good Progress ✅
Scored **18/20** on the factoring quiz. His working-out method is really developing. Encourage 15-minute daily practice sessions.

### HASS — Needs Attention ⚠️
Struggling with Ancient Rome unit (55%). Ten minutes of evening reading together would help.

### This Week at Home
1. Quiz Aiden on Roman vocab
2. Ask about the Science experiment
3. Check essay draft
""",
        "original_content_markdown": """## Aiden's Week in Review\n\n### Mathematics — Good Progress ✅\nScored **18/20** on the factoring quiz.""",
        "translated_content_markdown": None,
        "display_language": "en",
        "original_language": "en",
        "translated_language": None,
        "translation_status": "not_required",
        "translated_at": None,
    },
    "r-002": {
        "uuid": "r-002",
        "student_uuid": "s-aiden-01",
        "title": "Term 2 Mid-Term Report",
        "report_type": "monthly",
        "source_type": "teacher",
        "created_at": "2026-03-15T10:00:00Z",
        "updated_at": "2026-03-15T10:00:00Z",
        "subject": {"uuid": "subj-math", "name": "Mathematics"},
        "content_markdown": "## Mathematics Mid-Term\n\nAiden is performing above average in Mathematics. Particular strengths in algebra.",
        "original_content_markdown": "## Mathematics Mid-Term\n\nAiden is performing above average in Mathematics.",
        "translated_content_markdown": None,
        "display_language": "en",
        "original_language": "en",
        "translated_language": None,
        "translation_status": "not_required",
        "translated_at": None,
    },
}

ANNOUNCEMENTS = {
    "ann-001": {
        "uuid": "ann-001",
        "student_uuid": "s-aiden-01",
        "category": "announcement",
        "title": "Easter Holiday Notice",
        "content_markdown": "School will be closed **28 March – 14 April** for Easter holidays. Term 2 begins Monday 28 April.",
        "original_content_markdown": "School will be closed 28 March – 14 April for Easter holidays.",
        "translated_content_markdown": None,
        "display_language": "en",
        "original_language": "en",
        "translated_language": None,
        "translation_status": "not_required",
        "translated_at": None,
        "published_at": "2026-03-25T09:00:00Z",
        "due_at": None,
        "is_important": True,
        "author": {"uuid": "u-teacher-01", "display_name": "Ms. Thompson", "role": "teacher"},
    },
    "ann-002": {
        "uuid": "ann-002",
        "student_uuid": "s-aiden-01",
        "category": "task",
        "title": "Mid-Term Exam — April 10",
        "content_markdown": "Mathematics mid-term exam covering **linear functions and quadratic expressions**. Review chapters 4–6.",
        "original_content_markdown": "Mathematics mid-term exam covering linear functions and quadratic expressions.",
        "translated_content_markdown": None,
        "display_language": "en",
        "original_language": "en",
        "translated_language": None,
        "translation_status": "not_required",
        "translated_at": None,
        "published_at": "2026-04-01T10:00:00Z",
        "due_at": "2026-04-10T09:00:00Z",
        "is_important": True,
        "author": {"uuid": "u-teacher-01", "display_name": "Ms. Thompson", "role": "teacher"},
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
        "title": "Week 8 progress update",
        "content_markdown": "Aiden has shown great improvement in algebra this week, scoring 18/20 on his factoring quiz. His working-out method is really developing. I'd encourage him to continue the daily 15-minute practice sessions — they're clearly making a difference.",
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
        "content_markdown": "Thank you! He has been working hard each evening. Will keep it up.",
        "created_at": "2026-04-01T15:00:00Z",
        "updated_at": None,
        "author": {"uuid": "u-parent-01", "display_name": "Li Wei", "role": "parent"},
        "tags": [],
        "reply_to_post_uuid": "post-001",
    },
    {
        "uuid": "post-003",
        "thread_uuid": "thread-parent01-teacher01-aiden",
        "title": "Upcoming mid-term exam — April 10",
        "content_markdown": "Just a reminder that our mid-term exam is on April 10, covering linear functions and quadratic expressions. A revision sheet has been uploaded to the school portal. Please ensure Aiden reviews chapters 4–6 over the Easter break.",
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
        "subj-math": {
            "score": 82.0,
            "progress": 0.75,
            "assignment_completion_rate": 0.95,
            "attendance_rate": 0.98,
            "term_scores": [62, 68, 74, 70, 78, 80, 82, 82],
            "class_avg": [65, 67, 70, 68, 72, 74, 75, 75],
        },
        "subj-eng": {
            "score": 68.0,
            "progress": 0.60,
            "assignment_completion_rate": 0.82,
            "attendance_rate": 0.95,
            "term_scores": [72, 70, 68, 65, 66, 68, 69, 68],
            "class_avg": [70, 71, 72, 72, 73, 74, 73, 73],
        },
        "subj-sci": {
            "score": 91.0,
            "progress": 0.85,
            "assignment_completion_rate": 0.98,
            "attendance_rate": 0.99,
            "term_scores": [78, 80, 84, 85, 87, 89, 90, 91],
            "class_avg": [72, 73, 74, 76, 77, 78, 79, 79],
        },
        "subj-hass": {
            "score": 55.0,
            "progress": 0.50,
            "assignment_completion_rate": 0.70,
            "attendance_rate": 0.92,
            "term_scores": [64, 62, 60, 58, 56, 55, 54, 55],
            "class_avg": [66, 67, 67, 68, 68, 68, 69, 69],
        },
    }
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
        }


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

    ensure_user_state(user["uuid"])
    us = USER_STATE[user["uuid"]]
    unread_posts = sum(
        1 for p in POSTS
        if p["thread_uuid"].startswith("thread-" + user["uuid"].replace("u-parent-", "parent") )
        and p["author"]["role"] == "teacher"
    )

    # simple dashboard data
    stats = SUBJECT_STATS.get(student_uuid, {})
    subject_statistics = []
    for subj_uuid, s in stats.items():
        subj = SUBJECTS.get(subj_uuid, {})
        subject_statistics.append({
            "subject_uuid": subj_uuid,
            "subject_name": subj.get("name", ""),
            "score": s["score"],
            "progress": s["progress"],
            "assignment_completion_rate": s["assignment_completion_rate"],
        })

    bar_chart = [{"subject_uuid": su, "subject_name": SUBJECTS.get(su, {}).get("name", ""), "value": v["score"]}
                 for su, v in stats.items()]

    important_posts = [
        {
            "post_uuid": p["uuid"],
            "teacher_uuid": p["author"]["uuid"],
            "teacher_display_name": p["author"]["display_name"],
            "title": p.get("title"),
            "preview_text": p["content_markdown"][:120],
            "created_at": p["created_at"],
        }
        for p in POSTS
        if any(t["name"] == "important" for t in p.get("tags", []))
    ]

    return ok({
        "student": student,
        "dashboard_context": {
            "last_updated_at": now_iso(),
            "selected_range": request.args.get("range", "30d"),
            "unread_post_count": 2,
            "unread_announcement_count": 1,
        },
        "summary_cards": {
            "overall_performance_index": 74.0,
            "assignment_completion_rate": 0.88,
            "attendance_rate": 0.94,
            "ai_summary": {
                "display_text": "Aiden is performing well overall. Mathematics shows strong upward trend. HASS needs attention — consider evening reading together.",
                "original_text": "Aiden is performing well overall.",
                "translated_text": None,
                "display_language": "en",
                "original_language": "en",
                "translated_language": None,
                "translation_status": "not_required",
                "translated_at": None,
            },
        },
        "subject_statistics": subject_statistics,
        "charts": {
            "subject_score_bar_chart": bar_chart,
            "subject_completion_bar_chart": [
                {"subject_uuid": su, "subject_name": SUBJECTS.get(su, {}).get("name", ""), "value": v["assignment_completion_rate"]}
                for su, v in stats.items()
            ],
            "learning_progress_chart": [
                {"label": f"2026-0{i+1}-01", "value": round(0.5 + i * 0.04, 2)}
                for i in range(8)
            ],
        },
        "important_post_banners": important_posts,
    })


@app.get("/api/parents/me/students/<student_uuid>/subjects")
@require_auth
def parent_subjects(user, student_uuid):
    if user["role"] != "parent":
        return err("role_not_allowed", "Only parents can access this.", 403)
    assignments = [a for a in TEACHING_ASSIGNMENTS if a["student_uuid"] == student_uuid]
    result = []
    for a in assignments:
        subj = SUBJECTS.get(a["subject_uuid"])
        teacher = USERS.get(a["teacher_uuid"])
        if subj and teacher:
            result.append({
                "uuid": subj["uuid"],
                "name": subj["name"],
                "code": subj["code"],
                "teacher": {"uuid": teacher["uuid"], "display_name": teacher["display_name"]},
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

    return ok({
        "student": {"uuid": student["uuid"], "sid": student["sid"], "full_name": student["full_name"]},
        "subject": {
            "uuid": subj["uuid"],
            "name": subj["name"],
            "code": subj["code"],
            "teacher": {
                "uuid": teacher.get("uuid"),
                "display_name": teacher.get("display_name"),
                "email": teacher.get("email"),
            },
        },
        "overview": {
            "score": stats.get("score", 0),
            "progress": stats.get("progress", 0),
            "assignment_completion_rate": stats.get("assignment_completion_rate", 0),
            "attendance_rate": stats.get("attendance_rate", 0),
        },
        "timeline": [
            {"label": f"2026-0{i+1}-01", "score": v, "progress": round(0.5 + i * 0.04, 2)}
            for i, v in enumerate(stats.get("term_scores", []))
        ],
        "ai_summary": {
            "display_text": f"{student['preferred_name']} is showing {'strong' if stats.get('score', 0) >= 75 else 'developing'} performance in {subj['name']}.",
            "original_text": f"{student['preferred_name']} performance overview.",
            "translated_text": None,
            "display_language": "en",
            "original_language": "en",
            "translated_language": None,
            "translation_status": "not_required",
            "translated_at": None,
        },
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
    status_filter = request.args.get("status", "active")
    read_state = request.args.get("read_state", "all")

    result = []
    for r in reports:
        is_read = r["uuid"] in us["read_reports"]
        is_archived = r["uuid"] in us["archived_reports"]
        if status_filter == "active" and is_archived:
            continue
        if status_filter == "archived" and not is_archived:
            continue
        if read_state == "unread" and is_read:
            continue
        if read_state == "read" and not is_read:
            continue
        result.append({
            "uuid": r["uuid"],
            "title": r["title"],
            "report_type": r["report_type"],
            "source_type": r["source_type"],
            "created_at": r["created_at"],
            "is_read": is_read,
            "is_archived": is_archived,
            "subject": r["subject"],
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
    return ok({**r, "is_read": report_uuid in us["read_reports"], "is_archived": report_uuid in us["archived_reports"]})


@app.post("/api/reports/<report_uuid>/read")
@require_auth
def mark_report_read(user, report_uuid):
    if e := check_origin():
        return e
    r = REPORTS.get(report_uuid)
    if not r:
        return err("not_found", "Report not found.", 404)
    ensure_user_state(user["uuid"])
    if report_uuid in USER_STATE[user["uuid"]]["read_reports"]:
        return err("already_read", "Report already marked as read.", 409)
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
    category = request.args.get("category", "all")
    result = []
    for a in anns:
        if category not in ("all", a["category"]):
            continue
        result.append({
            "uuid": a["uuid"],
            "category": a["category"],
            "title": a["title"],
            "published_at": a["published_at"],
            "due_at": a.get("due_at"),
            "is_read": a["uuid"] in us["read_announcements"],
            "is_important": a["is_important"],
            "author": a["author"],
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
    # find all teachers who teach this student
    teacher_uuids = list({a["teacher_uuid"] for a in TEACHING_ASSIGNMENTS if a["student_uuid"] == student_uuid})
    result = []
    for t_uuid in teacher_uuids:
        teacher = USERS.get(t_uuid)
        if not teacher:
            continue
        thread = get_thread(user["uuid"], t_uuid, student_uuid)
        thread_posts = [p for p in POSTS + RUNTIME_POSTS if p["thread_uuid"] == thread["uuid"]]
        unread = sum(1 for p in thread_posts if p["author"]["role"] == "teacher")
        result.append({
            "teacher": {
                "uuid": teacher["uuid"],
                "display_name": teacher["display_name"],
                "email": teacher["email"],
                "avatar_url": teacher.get("avatar_url"),
            },
            "thread": {
                "uuid": thread["uuid"],
                "last_post_at": thread.get("last_post_at"),
                "unread_post_count": unread,
            },
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
        unread = sum(1 for p in thread_posts if p["author"]["role"] == "parent")
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
    keyword = request.args.get("keyword", "").lower()
    class_filter = request.args.get("class_name", "")
    result = []
    for s_uuid in assigned_uuids:
        s = STUDENTS.get(s_uuid)
        if not s:
            continue
        if keyword and keyword not in s["full_name"].lower() and keyword not in (s["sid"] or "").lower():
            continue
        if class_filter and s["class_name"] != class_filter:
            continue
        stats = SUBJECT_STATS.get(s_uuid, {})
        scores = [v["score"] for v in stats.values()]
        avg = round(sum(scores) / len(scores), 1) if scores else 0
        result.append({
            "uuid": s["uuid"],
            "sid": s["sid"],
            "full_name": s["full_name"],
            "class_name": s["class_name"],
            "grade_level": s["grade_level"],
            "overall_performance_index": avg,
            "last_activity_at": "2026-04-01T14:00:00Z",
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
                f"Preserve Markdown formatting if present. Output ONLY the translated text."
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
