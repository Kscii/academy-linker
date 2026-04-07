from __future__ import annotations

from dataclasses import dataclass


DEMO_EMAIL_DOMAIN = "academy-link.test"
DEFAULT_PASSWORD = "DemoPass123!"


@dataclass(frozen=True)
class DemoUserSpec:
    key: str
    role: str
    email: str
    display_name: str
    phone_number: str | None = None


ADMIN_USER = DemoUserSpec(
    key="admin_primary",
    role="admin",
    email=f"admin.demo@{DEMO_EMAIL_DOMAIN}",
    display_name="Admin Demo",
)

TEACHER_USERS = (
    DemoUserSpec(
        key="teacher_ada",
        role="teacher",
        email=f"teacher.ada@{DEMO_EMAIL_DOMAIN}",
        display_name="Ada Teacher",
        phone_number="0400 100 001",
    ),
    DemoUserSpec(
        key="teacher_lin",
        role="teacher",
        email=f"teacher.lin@{DEMO_EMAIL_DOMAIN}",
        display_name="Lin Teacher",
        phone_number="0400 100 002",
    ),
)

PARENT_USERS = (
    DemoUserSpec(
        key="parent_chen",
        role="parent",
        email=f"parent.chen@{DEMO_EMAIL_DOMAIN}",
        display_name="Chen Parent",
        phone_number="0400 200 001",
    ),
    DemoUserSpec(
        key="parent_wang",
        role="parent",
        email=f"parent.wang@{DEMO_EMAIL_DOMAIN}",
        display_name="Wang Parent",
        phone_number="0400 200 002",
    ),
)

SUBJECT_SPECS = (
    ("mathematics", "Mathematics", "MATH"),
    ("english", "English", "ENG"),
    ("science", "Science", "SCI"),
    ("history", "History", "HIS"),
)

CLASS_SPECS = (
    ("year5_alpha", "Year 5 Alpha", "5", "2025"),
    ("year6_beta", "Year 6 Beta", "6", "2025"),
)

STUDENT_SPECS = (
    {
        "key": "student_emma",
        "sid": "DEMO-STU-001",
        "full_name": "Emma Student",
        "preferred_name": "Emma",
        "class_key": "year5_alpha",
        "date_of_birth": "2014-05-03",
    },
    {
        "key": "student_noah",
        "sid": "DEMO-STU-002",
        "full_name": "Noah Student",
        "preferred_name": "Noah",
        "class_key": "year5_alpha",
        "date_of_birth": "2014-08-19",
    },
    {
        "key": "student_olivia",
        "sid": "DEMO-STU-003",
        "full_name": "Olivia Student",
        "preferred_name": "Olivia",
        "class_key": "year6_beta",
        "date_of_birth": "2013-11-27",
    },
)

SYSTEM_TAG_SPECS = (
    ("follow-up", True, True, False),
    ("wellbeing", True, True, True),
    ("attendance", False, True, True),
)

PRIVATE_TAG_SPECS = (
    ("teacher_ada", "reading-focus"),
    ("teacher_ada", "homework-check"),
    ("teacher_lin", "science-lab"),
)

