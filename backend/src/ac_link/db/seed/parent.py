from __future__ import annotations

from ac_link.db.orm.enums import IncidentStatus, IncidentType, LeaveRequestStatus, LeaveRequestType
from sqlalchemy.orm import Session

from .teacher import run as run_teacher
from .helpers import create_incident_report, create_leave_request, reset_demo_parent_welfare


def run(db: Session) -> dict[str, object]:
    state = run_teacher(db)
    reset_demo_parent_welfare(db)
    users = state["users"]
    students = state["students"]

    create_leave_request(
        db,
        student=students["student_emma"],
        submitter=users["parent_chen"],
        leave_type=LeaveRequestType.SICK,
        start_date_value="2025-03-04",
        end_date_value="2025-03-04",
        reason="Fever and rest at home.",
        status=LeaveRequestStatus.APPROVED,
        school_note="Approved by year coordinator.",
    )
    create_leave_request(
        db,
        student=students["student_noah"],
        submitter=users["parent_chen"],
        leave_type=LeaveRequestType.PERSONAL,
        start_date_value="2025-03-15",
        end_date_value="2025-03-16",
        reason="Family ceremony.",
        status=LeaveRequestStatus.PENDING,
        school_note=None,
    )
    create_leave_request(
        db,
        student=students["student_olivia"],
        submitter=users["parent_wang"],
        leave_type=LeaveRequestType.FAMILY,
        start_date_value="2025-02-19",
        end_date_value="2025-02-20",
        reason="Travel for a family emergency.",
        status=LeaveRequestStatus.REJECTED,
        school_note="Please provide supporting documents next time.",
    )

    create_incident_report(
        db,
        student=students["student_emma"],
        reporter=users["parent_chen"],
        incident_type=IncidentType.BULLYING,
        description="Emma reported teasing during recess near the basketball court.",
        is_anonymous=False,
        status=IncidentStatus.INVESTIGATING,
    )
    create_incident_report(
        db,
        student=students["student_olivia"],
        reporter=None,
        incident_type=IncidentType.OTHER,
        description="Anonymous safety concern about supervision during pickup.",
        is_anonymous=True,
        status=IncidentStatus.SUBMITTED,
    )

    return state
