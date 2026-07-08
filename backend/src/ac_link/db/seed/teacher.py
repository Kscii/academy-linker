from __future__ import annotations

from datetime import timedelta

from sqlalchemy.orm import Session

from ac_link.db.orm import AnnouncementCategory, LearningPathwayItemStatus, ReportSourceType, ReportType
from ac_link.db.orm.enums import AiConversationContextType, AiMessageRole

from .base import run as run_base
from .helpers import (
    add_post,
    create_ai_conversation,
    create_announcement,
    create_exam_score,
    create_learning_item,
    create_period_metric,
    create_report,
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
    parent_park = users["parent_park"]

    student_emma = students["student_emma"]
    student_noah = students["student_noah"]
    student_olivia = students["student_olivia"]
    student_liam = students["student_liam"]
    student_sofia = students["student_sofia"]

    math = subjects["mathematics"]
    english = subjects["english"]
    science = subjects["science"]
    history = subjects["history"]

    # -----------------------------------------------------------------------
    # Reports
    # -----------------------------------------------------------------------
    create_report(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        title="T1 Week 5 Mathematics Check-in",
        report_type=ReportType.WEEKLY,
        source_type=ReportSourceType.TEACHER,
        content="Emma is making strong progress in place value and multiplication. She responds well to visual models and is beginning to explain her reasoning in writing.",
        days_ago=196,
        read_for=parent_chen,
    )
    create_report(
        db,
        student=student_emma,
        subject=english,
        author=teacher_ada,
        title="T2 Reading and Writing Monthly Summary",
        report_type=ReportType.MONTHLY,
        source_type=ReportSourceType.TEACHER,
        content="Emma has shown consistent growth in reading fluency and narrative writing. Her vocabulary use has broadened and she is beginning to craft more complex sentence structures.",
        days_ago=150,
        read_for=parent_chen,
    )
    create_report(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        title="T3 Mathematics Progress Report",
        report_type=ReportType.MONTHLY,
        source_type=ReportSourceType.TEACHER,
        content="Emma has demonstrated strong understanding of fractions and decimals this term. Her problem-solving confidence continues to grow and she regularly helps peers.",
        days_ago=90,
        read_for=parent_chen,
    )
    create_report(
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

    create_report(
        db,
        student=student_noah,
        subject=science,
        author=teacher_ada,
        title="T1 Science Introduction Report",
        report_type=ReportType.WEEKLY,
        source_type=ReportSourceType.TEACHER,
        content="Noah is curious and engaged during science experiments. He asks good questions but needs support in recording observations systematically.",
        days_ago=190,
        read_for=None,
    )
    create_report(
        db,
        student=student_noah,
        subject=math,
        author=teacher_ada,
        title="T2 Mathematics Mid-Term Summary",
        report_type=ReportType.MONTHLY,
        source_type=ReportSourceType.TEACHER,
        content="Noah has improved his multiplication recall and is working on applying strategies to multi-step problems. Homework submission consistency remains an area to develop.",
        days_ago=140,
        read_for=None,
    )
    create_report(
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

    create_report(
        db,
        student=student_olivia,
        subject=history,
        author=teacher_lin,
        title="T1 History Foundation Report",
        report_type=ReportType.WEEKLY,
        source_type=ReportSourceType.TEACHER,
        content="Olivia demonstrates strong historical thinking. She is able to identify cause and effect and enjoys source-based learning activities.",
        days_ago=185,
        read_for=parent_wang,
    )
    create_report(
        db,
        student=student_olivia,
        subject=science,
        author=teacher_lin,
        title="T2 Science Monthly Report",
        report_type=ReportType.MONTHLY,
        source_type=ReportSourceType.AI,
        content="Olivia is making excellent progress in experimental science. Her lab reports are detailed and she consistently applies the scientific method.",
        days_ago=120,
        read_for=parent_wang,
    )
    create_report(
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

    create_report(
        db,
        student=student_liam,
        subject=math,
        author=teacher_ada,
        title="T1 Mathematics Overview",
        report_type=ReportType.WEEKLY,
        source_type=ReportSourceType.TEACHER,
        content="Liam is building confidence in number operations. He benefits from hands-on activities and peer discussion. He is progressing steadily towards term goals.",
        days_ago=188,
        read_for=parent_park,
    )
    create_report(
        db,
        student=student_liam,
        subject=english,
        author=teacher_ada,
        title="T3 English Progress Report",
        report_type=ReportType.MONTHLY,
        source_type=ReportSourceType.TEACHER,
        content="Liam has grown considerably as a reader this term. His comprehension skills are developing well and he is beginning to write with more detail and voice.",
        days_ago=80,
        read_for=parent_park,
    )

    create_report(
        db,
        student=student_sofia,
        subject=science,
        author=teacher_lin,
        title="T2 Science Excellence Report",
        report_type=ReportType.MONTHLY,
        source_type=ReportSourceType.TEACHER,
        content="Sofia consistently performs at an advanced level in science. She drives inquiry in group work and produces thorough lab investigations with clear conclusions.",
        days_ago=130,
        read_for=parent_park,
    )
    create_report(
        db,
        student=student_sofia,
        subject=history,
        author=teacher_lin,
        title="T4 History Mid-Term Summary",
        report_type=ReportType.MONTHLY,
        source_type=ReportSourceType.AI,
        content="Sofia's historical analysis skills are outstanding. She selects relevant evidence, constructs well-structured arguments, and shows nuanced understanding of multiple perspectives.",
        days_ago=20,
        read_for=parent_park,
    )

    # -----------------------------------------------------------------------
    # Announcements
    # -----------------------------------------------------------------------
    base_ts = now()

    create_announcement(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        title="Fractions homework due Friday",
        category=AnnouncementCategory.TASK,
        content="Please complete pages 24–25 of the fractions workbook by this Friday. Show all working.",
        is_important=True,
        published_at=base_ts - timedelta(days=160),
        due_at=base_ts - timedelta(days=155),
        read_for=parent_chen,
    )
    create_announcement(
        db,
        student=student_emma,
        subject=english,
        author=teacher_ada,
        title="Book report submission",
        category=AnnouncementCategory.TASK,
        content="Emma's book report on Charlotte's Web is due next Wednesday. She has been working on her draft in class.",
        is_important=False,
        published_at=base_ts - timedelta(days=120),
        due_at=base_ts - timedelta(days=113),
        read_for=parent_chen,
    )
    create_announcement(
        db,
        student=student_emma,
        subject=english,
        author=teacher_ada,
        title="Reading log reminder",
        category=AnnouncementCategory.TASK,
        content="Please submit the week 8 reading log by Friday.",
        is_important=True,
        published_at=base_ts - timedelta(days=2),
        due_at=base_ts,
        read_for=parent_chen,
    )
    create_announcement(
        db,
        student=student_emma,
        subject=math,
        author=teacher_ada,
        title="Parent-teacher interview booking open",
        category=AnnouncementCategory.ANNOUNCEMENT,
        content="Bookings for the Term 4 parent-teacher interviews are now open via the school portal.",
        is_important=False,
        published_at=base_ts - timedelta(days=45),
        due_at=None,
        read_for=None,
    )

    create_announcement(
        db,
        student=student_noah,
        subject=math,
        author=teacher_ada,
        title="Fractions showcase",
        category=AnnouncementCategory.ANNOUNCEMENT,
        content="Students will present their fractions work in class next Monday.",
        is_important=False,
        published_at=base_ts - timedelta(days=6),
        due_at=None,
        read_for=None,
    )
    create_announcement(
        db,
        student=student_noah,
        subject=science,
        author=teacher_ada,
        title="Science fair registration",
        category=AnnouncementCategory.TASK,
        content="Noah is encouraged to submit a project proposal for the school science fair by end of term.",
        is_important=True,
        published_at=base_ts - timedelta(days=50),
        due_at=base_ts - timedelta(days=40),
        read_for=parent_chen,
    )
    create_announcement(
        db,
        student=student_noah,
        subject=math,
        author=teacher_ada,
        title="Homework club this week",
        category=AnnouncementCategory.ANNOUNCEMENT,
        content="Homework club runs Tuesday and Thursday lunchtimes in Room 12. Noah is welcome to attend for maths support.",
        is_important=False,
        published_at=base_ts - timedelta(days=18),
        due_at=None,
        read_for=None,
    )

    create_announcement(
        db,
        student=student_olivia,
        subject=science,
        author=teacher_lin,
        title="Science lab follow-up",
        category=AnnouncementCategory.TASK,
        content="Bring the signed lab safety sheet for the next experiment.",
        is_important=True,
        published_at=base_ts - timedelta(days=3),
        due_at=base_ts + timedelta(days=1),
        read_for=parent_wang,
    )
    create_announcement(
        db,
        student=student_olivia,
        subject=history,
        author=teacher_lin,
        title="Historical essay draft feedback",
        category=AnnouncementCategory.ANNOUNCEMENT,
        content="Olivia's essay draft has been returned with feedback. Please review and revise before the final submission date.",
        is_important=False,
        published_at=base_ts - timedelta(days=30),
        due_at=base_ts - timedelta(days=21),
        read_for=parent_wang,
    )
    create_announcement(
        db,
        student=student_olivia,
        subject=science,
        author=teacher_lin,
        title="Volcano model materials reminder",
        category=AnnouncementCategory.TASK,
        content="Please bring papier-mâché materials for the volcano project by Thursday.",
        is_important=True,
        published_at=base_ts - timedelta(days=90),
        due_at=base_ts - timedelta(days=87),
        read_for=parent_wang,
    )

    create_announcement(
        db,
        student=student_liam,
        subject=math,
        author=teacher_ada,
        title="Times tables practice",
        category=AnnouncementCategory.TASK,
        content="Liam is working on 7 and 8 times tables this week. A short practice each evening will help build fluency.",
        is_important=False,
        published_at=base_ts - timedelta(days=55),
        due_at=None,
        read_for=parent_park,
    )
    create_announcement(
        db,
        student=student_liam,
        subject=english,
        author=teacher_ada,
        title="Library reading challenge",
        category=AnnouncementCategory.ANNOUNCEMENT,
        content="Liam has signed up for the school library reading challenge. He needs to log 8 books by the end of term.",
        is_important=False,
        published_at=base_ts - timedelta(days=35),
        due_at=base_ts - timedelta(days=5),
        read_for=None,
    )

    create_announcement(
        db,
        student=student_sofia,
        subject=science,
        author=teacher_lin,
        title="Ecology fieldwork permission slip",
        category=AnnouncementCategory.TASK,
        content="Please sign and return the permission slip for the river ecology excursion by next Monday.",
        is_important=True,
        published_at=base_ts - timedelta(days=25),
        due_at=base_ts - timedelta(days=18),
        read_for=parent_park,
    )
    create_announcement(
        db,
        student=student_sofia,
        subject=history,
        author=teacher_lin,
        title="Extension reading recommendation",
        category=AnnouncementCategory.ANNOUNCEMENT,
        content="Sofia is ready for extension historical reading. The school library has a recommended list which we suggest exploring over the holidays.",
        is_important=False,
        published_at=base_ts - timedelta(days=10),
        due_at=None,
        read_for=parent_park,
    )

    # -----------------------------------------------------------------------
    # Discussion threads and posts
    # -----------------------------------------------------------------------
    thread_a = ensure_discussion_thread(db, student=student_emma, parent=parent_chen, teacher=teacher_ada)
    add_post(
        db,
        thread=thread_a,
        author=teacher_ada,
        title="Weekly reading update",
        content="Emma finished two extra readers this week and is asking insightful questions.",
        tags=[tags["system:follow-up"], tags["teacher_ada:reading-focus"]],
        created_at=base_ts - timedelta(days=14),
    )
    add_post(
        db,
        thread=thread_a,
        author=parent_chen,
        title=None,
        content="Thank you. We will keep the evening reading routine going.",
        tags=[tags["system:wellbeing"]],
        created_at=base_ts - timedelta(days=13),
    )
    add_post(
        db,
        thread=thread_a,
        author=teacher_ada,
        title="Fractions progress",
        content="Emma scored 18/20 on her fractions quiz today. She was very proud. We will now move into comparing mixed numbers.",
        tags=[tags["system:follow-up"]],
        created_at=base_ts - timedelta(days=5),
    )
    add_post(
        db,
        thread=thread_a,
        author=parent_chen,
        title=None,
        content="That is wonderful news! She has been practising at home with the fraction tiles you recommended.",
        created_at=base_ts - timedelta(days=4),
    )

    thread_b = ensure_discussion_thread(db, student=student_noah, parent=parent_chen, teacher=teacher_ada)
    add_post(
        db,
        thread=thread_b,
        author=teacher_ada,
        title="Homework completion",
        content="Noah has missed two homework uploads. Could you help check the home routine this week?",
        tags=[tags["teacher_ada:homework-check"]],
        created_at=base_ts - timedelta(days=20),
    )
    add_post(
        db,
        thread=thread_b,
        author=parent_chen,
        title=None,
        content="We will set a fixed homework time after dinner. Thank you for letting us know.",
        created_at=base_ts - timedelta(days=19),
    )
    add_post(
        db,
        thread=thread_b,
        author=teacher_ada,
        title="Science fair update",
        content="Noah submitted a great proposal for the science fair on cloud formation. Looking forward to seeing his project develop.",
        tags=[tags["system:follow-up"]],
        created_at=base_ts - timedelta(days=8),
    )

    thread_c = ensure_discussion_thread(db, student=student_olivia, parent=parent_wang, teacher=teacher_lin)
    add_post(
        db,
        thread=thread_c,
        author=teacher_lin,
        title="Science project praise",
        content="Olivia's volcano model showed strong planning and accurate observations.",
        tags=[tags["teacher_lin:science-lab"]],
        created_at=base_ts - timedelta(days=18),
    )
    add_post(
        db,
        thread=thread_c,
        author=parent_wang,
        title=None,
        content="She spent a lot of time on it at home. Glad it paid off!",
        created_at=base_ts - timedelta(days=17),
    )
    add_post(
        db,
        thread=thread_c,
        author=teacher_lin,
        title="History essay feedback",
        content="Olivia's draft essay shows excellent use of primary sources. I have left detailed feedback which she should review before resubmitting by Friday.",
        tags=[tags["system:follow-up"]],
        created_at=base_ts - timedelta(days=6),
    )

    thread_d = ensure_discussion_thread(db, student=student_liam, parent=parent_park, teacher=teacher_ada)
    add_post(
        db,
        thread=thread_d,
        author=teacher_ada,
        title="Check-in: Maths support",
        content="Liam is making solid progress but would benefit from some extra times-table practice at home. I have sent a practice sheet via the portal.",
        tags=[tags["teacher_ada:homework-check"]],
        created_at=base_ts - timedelta(days=12),
    )
    add_post(
        db,
        thread=thread_d,
        author=parent_park,
        title=None,
        content="Thank you, we will work through it together this weekend.",
        created_at=base_ts - timedelta(days=11),
    )

    thread_e = ensure_discussion_thread(db, student=student_sofia, parent=parent_park, teacher=teacher_lin)
    add_post(
        db,
        thread=thread_e,
        author=teacher_lin,
        title="Outstanding history performance",
        content="Sofia's recent historical essay was the strongest in the year group. I am recommending it for the school showcase.",
        tags=[tags["system:follow-up"]],
        created_at=base_ts - timedelta(days=9),
    )
    add_post(
        db,
        thread=thread_e,
        author=parent_park,
        title=None,
        content="We are so proud of her. History has always been her favourite subject.",
        tags=[tags["system:wellbeing"]],
        created_at=base_ts - timedelta(days=8),
    )

    # -----------------------------------------------------------------------
    # Exam scores – 8+ data points per student per subject for line charts
    # -----------------------------------------------------------------------

    # Emma – Mathematics
    for exam_name, exam_date, score in [
        ("T1 Number Quiz",          "2024-09-03", 14),
        ("T1 Fractions Assessment",  "2024-09-24", 15),
        ("T2 Multiplication Check", "2024-10-15", 15),
        ("T2 Decimals Test",        "2024-11-12", 16),
        ("T3 Geometry Quiz",        "2024-12-03", 16),
        ("T4 Statistics Check",     "2025-01-28", 17),
        ("T4 Decimals Assessment",  "2025-02-18", 17),
        ("T4 Fractions Quiz",       "2025-03-18", 18),
    ]:
        create_exam_score(
            db, student=student_emma, subject=math, author=teacher_ada,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=20,
            note=None,
        )

    # Emma – English
    for exam_name, exam_date, score in [
        ("T1 Reading Comprehension", "2024-09-10", 72),
        ("T1 Creative Writing",      "2024-10-01", 75),
        ("T2 Grammar Test",          "2024-10-22", 76),
        ("T2 Narrative Writing",     "2024-11-19", 78),
        ("T3 Reading Fluency",       "2024-12-10", 81),
        ("T4 Poetry Analysis",       "2025-01-21", 82),
        ("T4 Persuasive Writing",    "2025-02-25", 84),
        ("T4 Comprehension Assessment", "2025-03-12", 86),
    ]:
        create_exam_score(
            db, student=student_emma, subject=english, author=teacher_ada,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=100,
            note=None,
        )

    # Noah – Mathematics
    for exam_name, exam_date, score in [
        ("T1 Number Quiz",          "2024-09-05", 12),
        ("T1 Multiplication Test",  "2024-09-26", 13),
        ("T2 Fractions Check",      "2024-10-17", 13),
        ("T2 Mixed Operations",     "2024-11-14", 14),
        ("T3 Geometry Quiz",        "2024-12-05", 14),
        ("T4 Decimals Test",        "2025-01-30", 15),
        ("T4 Statistics Quiz",      "2025-02-20", 15),
        ("T4 Fractions Assessment", "2025-03-13", 14),
    ]:
        create_exam_score(
            db, student=student_noah, subject=math, author=teacher_ada,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=20,
            note=None,
        )

    # Noah – Science
    for exam_name, exam_date, score in [
        ("T1 Living Things Quiz",    "2024-09-12", 65),
        ("T2 Forces Test",           "2024-10-09", 63),
        ("T2 Materials Assessment",  "2024-11-06", 68),
        ("T3 Electricity Check",     "2024-12-03", 66),
        ("T4 Earth and Space Quiz",  "2025-01-28", 69),
        ("T4 Weather Systems Mid",   "2025-02-18", 70),
        ("Weather Systems Test",     "2025-03-11", 71),
        ("T4 Lab Report",            "2025-03-25", 73),
    ]:
        create_exam_score(
            db, student=student_noah, subject=science, author=teacher_ada,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=100,
            note=None,
        )

    # Olivia – Science
    for exam_name, exam_date, score in [
        ("T1 Life Cycles",         "2024-09-09", 77),
        ("T2 Chemistry Intro",     "2024-10-07", 79),
        ("T2 Physics Check",       "2024-11-04", 81),
        ("T3 Earth Science",       "2024-12-02", 78),
        ("T4 Biology Review",      "2025-01-27", 82),
        ("T4 Chemistry Lab",       "2025-02-17", 84),
        ("T4 Volcano Lab Report",  "2025-03-03", 86),
        ("T4 Ecology Assessment",  "2025-03-24", 88),
    ]:
        create_exam_score(
            db, student=student_olivia, subject=science, author=teacher_lin,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=100,
            note=None,
        )

    # Olivia – History
    for exam_name, exam_date, score in [
        ("T1 Ancient Civilisations",  "2024-09-16", 35),
        ("T2 Medieval History",       "2024-10-14", 37),
        ("T2 Trade Routes",           "2024-11-11", 38),
        ("T3 Industrial Revolution",  "2024-12-09", 39),
        ("T4 Modern History",         "2025-01-27", 40),
        ("T4 Source Analysis Mid",    "2025-02-24", 41),
        ("Source Analysis Checkpoint","2025-03-20", 42),
        ("T4 Historical Essay",       "2025-03-31", 44),
    ]:
        create_exam_score(
            db, student=student_olivia, subject=history, author=teacher_lin,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=50,
            note=None,
        )

    # Liam – Mathematics
    for exam_name, exam_date, score in [
        ("T1 Number Quiz",           "2024-09-04", 13),
        ("T1 Place Value Test",      "2024-09-25", 14),
        ("T2 Multiplication Check",  "2024-10-16", 14),
        ("T2 Fractions Quiz",        "2024-11-13", 15),
        ("T3 Decimals Test",         "2024-12-04", 15),
        ("T4 Statistics Quiz",       "2025-01-29", 16),
        ("T4 Geometry Assessment",   "2025-02-19", 16),
        ("T4 Mixed Operations",      "2025-03-14", 17),
    ]:
        create_exam_score(
            db, student=student_liam, subject=math, author=teacher_ada,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=20,
            note=None,
        )

    # Liam – English
    for exam_name, exam_date, score in [
        ("T1 Reading Comprehension", "2024-09-11", 68),
        ("T1 Narrative Writing",     "2024-10-02", 70),
        ("T2 Grammar Test",          "2024-10-23", 72),
        ("T2 Persuasive Writing",    "2024-11-20", 73),
        ("T3 Reading Assessment",    "2024-12-11", 74),
        ("T4 Poetry Reading",        "2025-01-22", 76),
        ("T4 Creative Writing",      "2025-02-26", 78),
        ("T4 Final Writing Task",    "2025-03-13", 79),
    ]:
        create_exam_score(
            db, student=student_liam, subject=english, author=teacher_ada,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=100,
            note=None,
        )

    # Sofia – Science
    for exam_name, exam_date, score in [
        ("T1 Life Cycles",           "2024-09-08", 80),
        ("T2 Chemistry Intro",       "2024-10-06", 82),
        ("T2 Physics Check",         "2024-11-03", 85),
        ("T3 Earth Science",         "2024-12-01", 83),
        ("T4 Biology Assessment",    "2025-01-26", 86),
        ("T4 Lab Investigation",     "2025-02-16", 88),
        ("T4 Ecology Lab Report",    "2025-03-02", 90),
        ("T4 Final Science Project", "2025-03-23", 92),
    ]:
        create_exam_score(
            db, student=student_sofia, subject=science, author=teacher_lin,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=100,
            note=None,
        )

    # Sofia – History
    for exam_name, exam_date, score in [
        ("T1 Ancient World",         "2024-09-15", 44),
        ("T2 Medieval Europe",       "2024-10-13", 45),
        ("T2 Age of Exploration",    "2024-11-10", 46),
        ("T3 Industrial Revolution", "2024-12-08", 44),
        ("T4 Modern History",        "2025-01-26", 46),
        ("T4 Primary Sources",       "2025-02-23", 47),
        ("T4 Historical Essay",      "2025-03-19", 48),
        ("T4 Final Assessment",      "2025-03-31", 49),
    ]:
        create_exam_score(
            db, student=student_sofia, subject=history, author=teacher_lin,
            exam_name=exam_name, exam_date_value=exam_date,
            score=score, full_score=50,
            note=None,
        )

    # -----------------------------------------------------------------------
    # Period metrics – monthly snapshots Oct 2024 → Mar 2025 (6 per combo)
    # -----------------------------------------------------------------------
    emma_math_metrics = [
        ("2024-10-31", "2024-T2", 0.62, 0.88, 0.96),
        ("2024-11-30", "2024-T2", 0.70, 0.91, 0.97),
        ("2024-12-31", "2024-T3", 0.74, 0.92, 0.98),
        ("2025-01-31", "2025-T4", 0.78, 0.93, 0.98),
        ("2025-02-28", "2025-T4", 0.80, 0.94, 0.99),
        ("2025-03-21", "2025-T4", 0.82, 0.95, 0.98),
    ]
    for snap_date, term, progress, completion, attendance in emma_math_metrics:
        create_period_metric(
            db, student=student_emma, subject=math, author=teacher_ada,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    emma_eng_metrics = [
        ("2024-10-31", "2024-T2", 0.60, 0.85, 0.96),
        ("2024-11-30", "2024-T2", 0.66, 0.88, 0.97),
        ("2024-12-31", "2024-T3", 0.71, 0.89, 0.98),
        ("2025-01-31", "2025-T4", 0.75, 0.90, 0.98),
        ("2025-02-28", "2025-T4", 0.79, 0.92, 0.99),
        ("2025-03-21", "2025-T4", 0.83, 0.93, 0.98),
    ]
    for snap_date, term, progress, completion, attendance in emma_eng_metrics:
        create_period_metric(
            db, student=student_emma, subject=english, author=teacher_ada,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    noah_math_metrics = [
        ("2024-10-31", "2024-T2", 0.50, 0.70, 0.94),
        ("2024-11-30", "2024-T2", 0.55, 0.72, 0.95),
        ("2024-12-31", "2024-T3", 0.58, 0.72, 0.96),
        ("2025-01-31", "2025-T4", 0.62, 0.73, 0.96),
        ("2025-02-28", "2025-T4", 0.65, 0.74, 0.97),
        ("2025-03-21", "2025-T4", 0.67, 0.74, 0.96),
    ]
    for snap_date, term, progress, completion, attendance in noah_math_metrics:
        create_period_metric(
            db, student=student_noah, subject=math, author=teacher_ada,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    noah_sci_metrics = [
        ("2024-10-31", "2024-T2", 0.52, 0.68, 0.94),
        ("2024-11-30", "2024-T2", 0.57, 0.71, 0.95),
        ("2024-12-31", "2024-T3", 0.59, 0.72, 0.96),
        ("2025-01-31", "2025-T4", 0.63, 0.73, 0.96),
        ("2025-02-28", "2025-T4", 0.65, 0.74, 0.96),
        ("2025-03-21", "2025-T4", 0.67, 0.74, 0.96),
    ]
    for snap_date, term, progress, completion, attendance in noah_sci_metrics:
        create_period_metric(
            db, student=student_noah, subject=science, author=teacher_ada,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    olivia_sci_metrics = [
        ("2024-10-31", "2024-T2", 0.68, 0.85, 0.97),
        ("2024-11-30", "2024-T2", 0.73, 0.87, 0.98),
        ("2024-12-31", "2024-T3", 0.76, 0.88, 0.99),
        ("2025-01-31", "2025-T4", 0.80, 0.89, 0.99),
        ("2025-02-28", "2025-T4", 0.84, 0.90, 0.99),
        ("2025-03-21", "2025-T4", 0.88, 0.91, 0.99),
    ]
    for snap_date, term, progress, completion, attendance in olivia_sci_metrics:
        create_period_metric(
            db, student=student_olivia, subject=science, author=teacher_lin,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    olivia_his_metrics = [
        ("2024-10-31", "2024-T2", 0.72, 0.88, 0.97),
        ("2024-11-30", "2024-T2", 0.76, 0.89, 0.99),
        ("2024-12-31", "2024-T3", 0.79, 0.90, 0.99),
        ("2025-01-31", "2025-T4", 0.83, 0.91, 0.99),
        ("2025-02-28", "2025-T4", 0.86, 0.91, 0.99),
        ("2025-03-21", "2025-T4", 0.88, 0.91, 0.99),
    ]
    for snap_date, term, progress, completion, attendance in olivia_his_metrics:
        create_period_metric(
            db, student=student_olivia, subject=history, author=teacher_lin,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    liam_math_metrics = [
        ("2024-10-31", "2024-T2", 0.55, 0.80, 0.93),
        ("2024-11-30", "2024-T2", 0.60, 0.82, 0.94),
        ("2024-12-31", "2024-T3", 0.63, 0.83, 0.95),
        ("2025-01-31", "2025-T4", 0.67, 0.84, 0.95),
        ("2025-02-28", "2025-T4", 0.71, 0.86, 0.96),
        ("2025-03-21", "2025-T4", 0.74, 0.87, 0.96),
    ]
    for snap_date, term, progress, completion, attendance in liam_math_metrics:
        create_period_metric(
            db, student=student_liam, subject=math, author=teacher_ada,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    liam_eng_metrics = [
        ("2024-10-31", "2024-T2", 0.57, 0.78, 0.93),
        ("2024-11-30", "2024-T2", 0.61, 0.80, 0.94),
        ("2024-12-31", "2024-T3", 0.65, 0.82, 0.95),
        ("2025-01-31", "2025-T4", 0.68, 0.83, 0.95),
        ("2025-02-28", "2025-T4", 0.72, 0.85, 0.96),
        ("2025-03-21", "2025-T4", 0.75, 0.86, 0.96),
    ]
    for snap_date, term, progress, completion, attendance in liam_eng_metrics:
        create_period_metric(
            db, student=student_liam, subject=english, author=teacher_ada,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    sofia_sci_metrics = [
        ("2024-10-31", "2024-T2", 0.78, 0.92, 0.98),
        ("2024-11-30", "2024-T2", 0.82, 0.94, 0.99),
        ("2024-12-31", "2024-T3", 0.84, 0.95, 0.99),
        ("2025-01-31", "2025-T4", 0.87, 0.96, 1.00),
        ("2025-02-28", "2025-T4", 0.90, 0.97, 1.00),
        ("2025-03-21", "2025-T4", 0.92, 0.97, 1.00),
    ]
    for snap_date, term, progress, completion, attendance in sofia_sci_metrics:
        create_period_metric(
            db, student=student_sofia, subject=science, author=teacher_lin,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    sofia_his_metrics = [
        ("2024-10-31", "2024-T2", 0.82, 0.94, 0.98),
        ("2024-11-30", "2024-T2", 0.85, 0.95, 0.99),
        ("2024-12-31", "2024-T3", 0.87, 0.96, 0.99),
        ("2025-01-31", "2025-T4", 0.90, 0.97, 1.00),
        ("2025-02-28", "2025-T4", 0.92, 0.97, 1.00),
        ("2025-03-21", "2025-T4", 0.94, 0.98, 1.00),
    ]
    for snap_date, term, progress, completion, attendance in sofia_his_metrics:
        create_period_metric(
            db, student=student_sofia, subject=history, author=teacher_lin,
            snapshot_date_value=snap_date, term=term,
            progress=progress, assignment_completion_rate=completion, attendance_rate=attendance,
        )

    # -----------------------------------------------------------------------
    # Learning pathway items
    # -----------------------------------------------------------------------
    create_learning_item(
        db, student=student_emma, subject=math, author=teacher_ada,
        title="Master equivalent fractions",
        description="Use visual models and explanation sentences to justify answers.",
        status=LearningPathwayItemStatus.COMPLETED, week=6, display_order=1,
    )
    create_learning_item(
        db, student=student_emma, subject=math, author=teacher_ada,
        title="Compare and order fractions",
        description="Focus on benchmark fractions and number line reasoning.",
        status=LearningPathwayItemStatus.IN_PROGRESS, week=8, display_order=2,
    )
    create_learning_item(
        db, student=student_emma, subject=math, author=teacher_ada,
        title="Apply fractions to measurement",
        description="Next unit transfer task.",
        status=LearningPathwayItemStatus.UPCOMING, week=10, display_order=3,
    )

    create_learning_item(
        db, student=student_noah, subject=science, author=teacher_ada,
        title="Identify forces in everyday situations",
        description="Match real-world examples to push, pull, gravity, and friction.",
        status=LearningPathwayItemStatus.COMPLETED, week=5, display_order=1,
    )
    create_learning_item(
        db, student=student_noah, subject=science, author=teacher_ada,
        title="Design a weather observation experiment",
        description="Plan and record daily observations over one week.",
        status=LearningPathwayItemStatus.IN_PROGRESS, week=8, display_order=2,
    )
    create_learning_item(
        db, student=student_noah, subject=science, author=teacher_ada,
        title="Write a scientific report on weather patterns",
        description="Use data to write a structured scientific report.",
        status=LearningPathwayItemStatus.UPCOMING, week=11, display_order=3,
    )

    create_learning_item(
        db, student=student_olivia, subject=history, author=teacher_lin,
        title="Analyse primary source documents",
        description="Identify perspective, purpose, and reliability of historical sources.",
        status=LearningPathwayItemStatus.COMPLETED, week=4, display_order=1,
    )
    create_learning_item(
        db, student=student_olivia, subject=history, author=teacher_lin,
        title="Construct an evidence-based argument",
        description="Write a structured historical paragraph using PEEL format.",
        status=LearningPathwayItemStatus.IN_PROGRESS, week=7, display_order=2,
    )
    create_learning_item(
        db, student=student_olivia, subject=history, author=teacher_lin,
        title="Complete extended essay on industrialisation",
        description="1000-word essay integrating multiple perspectives.",
        status=LearningPathwayItemStatus.UPCOMING, week=10, display_order=3,
    )

    create_learning_item(
        db, student=student_liam, subject=math, author=teacher_ada,
        title="Build multiplication fluency to 10×10",
        description="Use daily flash card practice and timed drills.",
        status=LearningPathwayItemStatus.IN_PROGRESS, week=7, display_order=1,
    )
    create_learning_item(
        db, student=student_liam, subject=math, author=teacher_ada,
        title="Apply multiplication to area problems",
        description="Use arrays and area models to solve real-world problems.",
        status=LearningPathwayItemStatus.UPCOMING, week=10, display_order=2,
    )

    create_learning_item(
        db, student=student_sofia, subject=science, author=teacher_lin,
        title="Design a controlled experiment",
        description="Formulate a testable hypothesis and identify variables.",
        status=LearningPathwayItemStatus.COMPLETED, week=3, display_order=1,
    )
    create_learning_item(
        db, student=student_sofia, subject=science, author=teacher_lin,
        title="Conduct ecology fieldwork",
        description="Collect and analyse biodiversity data from the school grounds.",
        status=LearningPathwayItemStatus.IN_PROGRESS, week=8, display_order=2,
    )
    create_learning_item(
        db, student=student_sofia, subject=science, author=teacher_lin,
        title="Present findings at science showcase",
        description="Prepare a poster and 3-minute oral presentation.",
        status=LearningPathwayItemStatus.UPCOMING, week=11, display_order=3,
    )

    # -----------------------------------------------------------------------
    # AI conversations
    # -----------------------------------------------------------------------
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
    create_ai_conversation(
        db,
        user=teacher_ada,
        title="Noah science support ideas",
        context_type=AiConversationContextType.STUDENT,
        student=student_noah,
        subject=science,
        messages=[
            (AiMessageRole.USER, "What scaffolding strategies can help Noah improve his scientific writing?"),
            (AiMessageRole.ASSISTANT, "Consider sentence starters, structured observation templates, and peer review pairs."),
            (AiMessageRole.USER, "Can you draft a structured observation sheet for weather experiments?"),
            (AiMessageRole.ASSISTANT, "Sure. The sheet includes: Date, Time, Sky cover (%), Wind direction, Precipitation, Temperature, and Notes."),
        ],
    )
    create_ai_conversation(
        db,
        user=teacher_lin,
        title="Olivia history extension tasks",
        context_type=AiConversationContextType.STUDENT,
        student=student_olivia,
        subject=history,
        messages=[
            (AiMessageRole.USER, "Suggest three extension tasks for a Year 6 student excelling in historical source analysis."),
            (AiMessageRole.ASSISTANT, "1. Compare two conflicting accounts of the same event. 2. Write a fictional diary entry from a historical figure. 3. Research and present on a lesser-known historical event using primary sources."),
        ],
    )
    create_ai_conversation(
        db,
        user=teacher_ada,
        title="Class-wide maths differentiation",
        context_type=AiConversationContextType.GLOBAL,
        student=None,
        subject=None,
        messages=[
            (AiMessageRole.USER, "How can I differentiate a fractions lesson for a mixed-ability Year 5 class?"),
            (AiMessageRole.ASSISTANT, "Group students into three tiers: visual manipulatives for foundational learners, word problems for on-level students, and open-ended investigation tasks for advanced learners."),
        ],
    )

    return state

