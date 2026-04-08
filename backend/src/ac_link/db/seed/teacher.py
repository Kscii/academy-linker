from __future__ import annotations

from datetime import timedelta

from sqlalchemy.orm import Session

from ac_link.db.orm import AnnouncementCategory, LearningPathwayItemStatus, ReportSourceType, ReportType
from ac_link.db.orm.enums import AiConversationContextType, AiMessageRole, TtsResourceType

from .base import run as run_base
from .helpers import (
    add_post,
    create_ai_conversation,
    create_announcement,
    create_exam_score,
    create_learning_item,
    create_period_metric,
    create_report,
    create_tts_audio_cache,
    ensure_discussion_thread,
    now,
    reset_demo_teacher_content,
)


def run(db: Session) -> dict[str, object]:
    state = run_base(db)
    reset_demo_teacher_content(db)
    users = state["users"]
    students = state["students"]
    subjects = state["subjects"]
    tags = state["tags"]

    teacher_ada = users["teacher_ada"]
    teacher_lin = users["teacher_lin"]
    parent_chen = users["parent_chen"]
    parent_wang = users["parent_wang"]

    student_emma = students["student_emma"]
    student_noah = students["student_noah"]
    student_olivia = students["student_olivia"]

    math = subjects["mathematics"]
    english = subjects["english"]
    science = subjects["science"]
    history = subjects["history"]

    report_emma = create_report(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        title="Week 8 Mathematics Reflection",
        report_type=ReportType.WEEKLY,
        source_type=ReportSourceType.TEACHER,
        content="Emma showed strong problem solving in fractions and can now explain her reasoning clearly.",
        days_ago=3,
        read_for=parent_chen,
    )
    report_noah = create_report(
        db,
        student=student_noah,
        subject=science,
        author=teacher_ada,
        title="Monthly Science Progress",
        report_type=ReportType.MONTHLY,
        source_type=ReportSourceType.TEACHER,
        content="Noah participated well in the weather systems project and needs to improve submission consistency.",
        days_ago=12,
        archived_for=parent_chen,
    )
    report_olivia = create_report(
        db,
        student=student_olivia,
        subject=history,
        author=teacher_lin,
        title="AI Drafted History Summary",
        report_type=ReportType.CUSTOM,
        source_type=ReportSourceType.AI,
        content="Olivia is making steady progress in source analysis and historical writing.",
        days_ago=1,
        read_for=parent_wang,
    )

    published = now() - timedelta(days=2)
    announcement_emma = create_announcement(
        db,
        student=student_emma,
        subject=english,
        author=teacher_ada,
        title="Reading log reminder",
        category=AnnouncementCategory.TASK,
        content="Please submit the week 8 reading log by Friday.",
        is_important=True,
        published_at=published,
        due_at=published + timedelta(days=2),
        read_for=parent_chen,
    )
    announcement_noah = create_announcement(
        db,
        student=student_noah,
        subject=math,
        author=teacher_ada,
        title="Fractions showcase",
        category=AnnouncementCategory.ANNOUNCEMENT,
        content="Students will present their fractions work in class next Monday.",
        is_important=False,
        published_at=published - timedelta(days=4),
        due_at=None,
        read_for=None,
    )
    announcement_olivia = create_announcement(
        db,
        student=student_olivia,
        subject=science,
        author=teacher_lin,
        title="Science lab follow-up",
        category=AnnouncementCategory.TASK,
        content="Bring the signed lab safety sheet for the next experiment.",
        is_important=True,
        published_at=published - timedelta(days=1),
        due_at=published + timedelta(days=3),
        read_for=parent_wang,
    )

    thread_a = ensure_discussion_thread(db, student=student_emma, parent=parent_chen, teacher=teacher_ada)
    post_emma_teacher = add_post(
        db,
        thread=thread_a,
        author=teacher_ada,
        title="Weekly reading update",
        content="Emma finished two extra readers this week and is asking insightful questions.",
        tags=[tags["system:follow-up"], tags["teacher_ada:reading-focus"]],
    )
    post_emma_parent = add_post(
        db,
        thread=thread_a,
        author=parent_chen,
        title=None,
        content="Thank you. We will keep the evening reading routine going.",
        tags=[tags["system:wellbeing"]],
    )

    thread_b = ensure_discussion_thread(db, student=student_noah, parent=parent_chen, teacher=teacher_ada)
    post_noah_teacher = add_post(
        db,
        thread=thread_b,
        author=teacher_ada,
        title="Homework completion",
        content="Noah has missed two homework uploads. Could you help check the home routine this week?",
        tags=[tags["teacher_ada:homework-check"]],
    )

    thread_c = ensure_discussion_thread(db, student=student_olivia, parent=parent_wang, teacher=teacher_lin)
    post_olivia_teacher = add_post(
        db,
        thread=thread_c,
        author=teacher_lin,
        title="Science project praise",
        content="Olivia's volcano model showed strong planning and accurate observations.",
        tags=[tags["teacher_lin:science-lab"]],
    )

    create_exam_score(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        exam_name="Fractions Quiz",
        exam_date_value="2025-03-18",
        score=18,
        full_score=20,
        note="Careful working and clear method.",
    )
    create_exam_score(
        db,
        student=student_noah,
        subject=science,
        author=teacher_ada,
        exam_name="Weather Systems Test",
        exam_date_value="2025-03-11",
        score=71,
        full_score=100,
        note="Needs stronger written explanations.",
    )
    create_exam_score(
        db,
        student=student_olivia,
        subject=history,
        author=teacher_lin,
        exam_name="Source Analysis Checkpoint",
        exam_date_value="2025-03-20",
        score=42,
        full_score=50,
        note="Strong use of evidence.",
    )

    create_period_metric(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        snapshot_date_value="2025-03-21",
        term="2025-T1",
        progress=0.82,
        assignment_completion_rate=0.95,
        attendance_rate=0.98,
    )
    create_period_metric(
        db,
        student=student_noah,
        subject=science,
        author=teacher_ada,
        snapshot_date_value="2025-03-21",
        term="2025-T1",
        progress=0.67,
        assignment_completion_rate=0.74,
        attendance_rate=0.96,
    )
    create_period_metric(
        db,
        student=student_olivia,
        subject=history,
        author=teacher_lin,
        snapshot_date_value="2025-03-21",
        term="2025-T1",
        progress=0.88,
        assignment_completion_rate=0.91,
        attendance_rate=0.99,
    )
    create_period_metric(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        snapshot_date_value="2025-06-18",
        term="2025-T2",
        progress=0.87,
        assignment_completion_rate=0.93,
        attendance_rate=0.99,
    )

    create_learning_item(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        title="Master equivalent fractions",
        description="Use visual models and explanation sentences to justify answers.",
        status=LearningPathwayItemStatus.COMPLETED,
        week=6,
        display_order=1,
    )
    create_learning_item(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        title="Compare and order fractions",
        description="Focus on benchmark fractions and number line reasoning.",
        status=LearningPathwayItemStatus.IN_PROGRESS,
        week=8,
        display_order=2,
    )
    create_learning_item(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        title="Apply fractions to measurement",
        description="Next unit transfer task.",
        status=LearningPathwayItemStatus.UPCOMING,
        week=10,
        display_order=3,
    )

    create_ai_conversation(
        db,
        user=teacher_ada,
        title="Emma weekly report draft",
        context_type=AiConversationContextType.STUDENT,
        student=student_emma,
        subject=math,
        messages=[
            (AiMessageRole.USER, "Draft a warm and specific weekly math report for Emma."),
            (AiMessageRole.ASSISTANT, "Emma has built confidence in fractions and now explains her strategy clearly."),
        ],
    )

    for item, resource_type, stub in (
        (report_emma, TtsResourceType.REPORT, "demo-report-emma"),
        (report_noah, TtsResourceType.REPORT, "demo-report-noah"),
        (report_olivia, TtsResourceType.REPORT, "demo-report-olivia"),
        (announcement_emma, TtsResourceType.ANNOUNCEMENT, "demo-announcement-emma"),
        (announcement_noah, TtsResourceType.ANNOUNCEMENT, "demo-announcement-noah"),
        (announcement_olivia, TtsResourceType.ANNOUNCEMENT, "demo-announcement-olivia"),
        (post_emma_teacher, TtsResourceType.POST, "demo-post-emma-teacher"),
        (post_emma_parent, TtsResourceType.POST, "demo-post-emma-parent"),
        (post_noah_teacher, TtsResourceType.POST, "demo-post-noah-teacher"),
        (post_olivia_teacher, TtsResourceType.POST, "demo-post-olivia-teacher"),
    ):
        create_tts_audio_cache(
            db,
            resource_type=resource_type,
            resource_id=item.id,
            source_text=item.original_content_markdown if hasattr(item, "original_content_markdown") else item.content_markdown,
            source_language=getattr(item, "original_language", "en-AU") or "en-AU",
            file_stub=stub,
        )

    return state
