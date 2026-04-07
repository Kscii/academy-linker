from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ac_link.db.orm import (
    AiConversation,
    AiMessage,
    Announcement,
    AnnouncementCategory,
    AnnouncementUserState,
    Class,
    DiscussionThread,
    LearningPathwayItem,
    LearningPathwayItemStatus,
    ParentStudentBinding,
    Post,
    PostTag,
    Report,
    ReportSourceType,
    ReportType,
    ReportUserState,
    Resource,
    ResourceAudienceRole,
    Student,
    StudentExamScore,
    StudentIncidentReport,
    StudentLeaveRequest,
    StudentPeriodMetric,
    Subject,
    Tag,
    TagScope,
    TeachingAssignment,
    ThreadUserState,
    User,
    UserRole,
    UserSettings,
)
from ac_link.db.orm.enums import AiConversationContextType, AiMessageRole, IncidentStatus, IncidentType, LeaveRequestStatus, LeaveRequestType
from ac_link.services.auth_service import hash_password

from .models import DEFAULT_PASSWORD, DEMO_EMAIL_DOMAIN, DemoUserSpec


def now() -> datetime:
    return datetime.now(timezone.utc)


def parse_date(value: str) -> date:
    return date.fromisoformat(value)


def get_or_create_user(
    db: Session,
    *,
    spec: DemoUserSpec,
    is_active: bool = True,
    language: str = "en",
) -> User:
    user = db.scalar(select(User).where(User.email == spec.email))
    role = UserRole(spec.role)
    if user is None:
        user = User(
            role=role,
            email=spec.email,
            password_hash=hash_password(DEFAULT_PASSWORD),
            display_name=spec.display_name,
            phone_number=spec.phone_number,
            is_active=is_active,
        )
        db.add(user)
        db.flush()
    else:
        user.role = role
        user.display_name = spec.display_name
        user.phone_number = spec.phone_number
        user.is_active = is_active
        user.password_hash = hash_password(DEFAULT_PASSWORD)

    if user.settings is None:
        db.add(UserSettings(user_id=user.id, language=language))
    else:
        user.settings.language = language
    db.flush()
    return user


def get_or_create_subject(db: Session, *, name: str, code: str) -> Subject:
    subject = db.scalar(select(Subject).where(Subject.code == code))
    if subject is None:
        subject = Subject(name=name, code=code, is_active=True)
        db.add(subject)
    else:
        subject.name = name
        subject.is_active = True
    db.flush()
    return subject


def get_or_create_class(
    db: Session,
    *,
    name: str,
    grade_level: str,
    academic_year: str,
    homeroom_teacher: User | None,
) -> Class:
    item = db.scalar(select(Class).where(Class.name == name, Class.academic_year == academic_year))
    if item is None:
        item = Class(
            name=name,
            grade_level=grade_level,
            academic_year=academic_year,
            homeroom_teacher_user_id=homeroom_teacher.id if homeroom_teacher else None,
            is_active=True,
        )
        db.add(item)
    else:
        item.grade_level = grade_level
        item.academic_year = academic_year
        item.homeroom_teacher_user_id = homeroom_teacher.id if homeroom_teacher else None
        item.is_active = True
    db.flush()
    return item


def get_or_create_student(
    db: Session,
    *,
    sid: str,
    full_name: str,
    preferred_name: str | None,
    class_obj: Class | None,
    date_of_birth: str | None,
) -> Student:
    student = db.scalar(select(Student).where(Student.sid == sid))
    if student is None:
        student = Student(
            sid=sid,
            full_name=full_name,
            preferred_name=preferred_name,
            class_id=class_obj.id if class_obj else None,
            date_of_birth=parse_date(date_of_birth) if date_of_birth else None,
            is_active=True,
        )
        db.add(student)
    else:
        student.full_name = full_name
        student.preferred_name = preferred_name
        student.class_id = class_obj.id if class_obj else None
        student.date_of_birth = parse_date(date_of_birth) if date_of_birth else None
        student.is_active = True
    db.flush()
    return student


def ensure_parent_binding(
    db: Session,
    *,
    parent: User,
    student: Student,
    relationship_label: str,
    is_primary: bool,
) -> ParentStudentBinding:
    binding = db.scalar(
        select(ParentStudentBinding).where(
            ParentStudentBinding.parent_user_id == parent.id,
            ParentStudentBinding.student_id == student.id,
        )
    )
    if binding is None:
        binding = ParentStudentBinding(
            parent_user_id=parent.id,
            student_id=student.id,
            relationship_label=relationship_label,
            is_primary=is_primary,
            is_active=True,
        )
        db.add(binding)
    else:
        binding.relationship_label = relationship_label
        binding.is_primary = is_primary
        binding.is_active = True
    db.flush()
    return binding


def ensure_teaching_assignment(
    db: Session,
    *,
    teacher: User,
    student: Student,
    subject: Subject,
    is_active: bool = True,
) -> TeachingAssignment:
    row = db.scalar(
        select(TeachingAssignment).where(
            TeachingAssignment.teacher_user_id == teacher.id,
            TeachingAssignment.student_id == student.id,
            TeachingAssignment.subject_id == subject.id,
        )
    )
    if row is None:
        row = TeachingAssignment(
            teacher_user_id=teacher.id,
            student_id=student.id,
            subject_id=subject.id,
            is_active=is_active,
        )
        db.add(row)
    else:
        row.is_active = is_active
    db.flush()
    return row


def ensure_tag(
    db: Session,
    *,
    name: str,
    scope: TagScope,
    owner: User | None,
    is_selectable_by_parent: bool,
    is_selectable_by_teacher: bool,
    affects_business_logic: bool,
) -> Tag:
    stmt = select(Tag).where(Tag.name == name, Tag.scope == scope)
    if owner is None:
        stmt = stmt.where(Tag.owner_teacher_user_id.is_(None))
    else:
        stmt = stmt.where(Tag.owner_teacher_user_id == owner.id)
    tag = db.scalar(stmt)
    if tag is None:
        tag = Tag(
            name=name,
            scope=scope,
            owner_teacher_user_id=owner.id if owner else None,
            is_selectable_by_parent=is_selectable_by_parent,
            is_selectable_by_teacher=is_selectable_by_teacher,
            affects_business_logic=affects_business_logic,
            is_active=True,
        )
        db.add(tag)
    else:
        tag.is_selectable_by_parent = is_selectable_by_parent
        tag.is_selectable_by_teacher = is_selectable_by_teacher
        tag.affects_business_logic = affects_business_logic
        tag.is_active = True
    db.flush()
    return tag


def ensure_discussion_thread(db: Session, *, student: Student, parent: User, teacher: User) -> DiscussionThread:
    thread = db.scalar(
        select(DiscussionThread).where(
            DiscussionThread.student_id == student.id,
            DiscussionThread.parent_user_id == parent.id,
            DiscussionThread.teacher_user_id == teacher.id,
        )
    )
    if thread is None:
        thread = DiscussionThread(
            student_id=student.id,
            parent_user_id=parent.id,
            teacher_user_id=teacher.id,
            last_post_at=now(),
        )
        db.add(thread)
        db.flush()
        db.add_all(
            [
                ThreadUserState(thread_id=thread.id, user_id=parent.id, unread_count_cache=0),
                ThreadUserState(thread_id=thread.id, user_id=teacher.id, unread_count_cache=0),
            ]
        )
    db.flush()
    return thread


def add_post(
    db: Session,
    *,
    thread: DiscussionThread,
    author: User,
    title: str | None,
    content: str,
    original_language: str = "en-AU",
    created_at: datetime | None = None,
    tags: Iterable[Tag] | None = None,
) -> Post:
    post = Post(
        thread_id=thread.id,
        author_user_id=author.id,
        title=title,
        content_markdown=content,
        original_language=original_language,
        created_at=created_at or now(),
        updated_at=created_at or now(),
    )
    db.add(post)
    db.flush()
    for tag in tags or ():
        db.add(PostTag(post_id=post.id, tag_id=tag.id))
    thread.last_post_at = post.created_at
    db.flush()
    return post


def create_report(
    db: Session,
    *,
    student: Student,
    subject: Subject | None,
    author: User,
    title: str,
    report_type: ReportType,
    source_type: ReportSourceType,
    content: str,
    original_language: str = "en-AU",
    days_ago: int = 0,
    archived_for: User | None = None,
    read_for: User | None = None,
) -> Report:
    ts = now() - timedelta(days=days_ago)
    report = Report(
        student_id=student.id,
        subject_id=subject.id if subject else None,
        author_user_id=author.id,
        title=title,
        report_type=report_type,
        source_type=source_type,
        period_start=(ts.date() - timedelta(days=7)),
        period_end=ts.date(),
        published_at=ts,
        content_markdown=content,
        original_content_markdown=content,
        original_language=original_language,
        archived_at=ts if archived_for else None,
        created_at=ts,
        updated_at=ts,
    )
    db.add(report)
    db.flush()
    for viewer in filter(None, [archived_for, read_for]):
        db.add(
            ReportUserState(
                report_id=report.id,
                user_id=viewer.id,
                is_read=viewer == read_for or viewer == archived_for,
                read_at=ts if viewer == read_for or viewer == archived_for else None,
                is_archived=viewer == archived_for,
                archived_at=ts if viewer == archived_for else None,
                created_at=ts,
                updated_at=ts,
            )
        )
    db.flush()
    return report


def create_announcement(
    db: Session,
    *,
    student: Student,
    subject: Subject | None,
    author: User,
    title: str,
    category: AnnouncementCategory,
    content: str,
    is_important: bool,
    published_at: datetime,
    due_at: datetime | None,
    read_for: User | None,
) -> Announcement:
    announcement = Announcement(
        student_id=student.id,
        subject_id=subject.id if subject else None,
        author_user_id=author.id,
        category=category,
        title=title,
        is_important=is_important,
        published_at=published_at,
        due_at=due_at,
        content_markdown=content,
        original_content_markdown=content,
        original_language="en-AU",
        created_at=published_at,
        updated_at=published_at,
    )
    db.add(announcement)
    db.flush()
    if read_for is not None:
        db.add(
            AnnouncementUserState(
                announcement_id=announcement.id,
                user_id=read_for.id,
                is_read=True,
                read_at=published_at + timedelta(hours=4),
                created_at=published_at,
                updated_at=published_at,
            )
        )
    db.flush()
    return announcement


def create_exam_score(
    db: Session,
    *,
    student: Student,
    subject: Subject,
    author: User,
    exam_name: str,
    exam_date_value: str,
    score: float,
    full_score: float,
    note: str | None,
) -> StudentExamScore:
    item = StudentExamScore(
        student_id=student.id,
        subject_id=subject.id,
        author_user_id=author.id,
        exam_name=exam_name,
        exam_date=parse_date(exam_date_value),
        score=score,
        full_score=full_score,
        note=note,
    )
    db.add(item)
    db.flush()
    return item


def create_period_metric(
    db: Session,
    *,
    student: Student,
    subject: Subject,
    author: User,
    snapshot_date_value: str,
    term: str,
    progress: float,
    assignment_completion_rate: float,
    attendance_rate: float,
) -> StudentPeriodMetric:
    item = StudentPeriodMetric(
        student_id=student.id,
        subject_id=subject.id,
        author_user_id=author.id,
        snapshot_date=parse_date(snapshot_date_value),
        term=term,
        progress=progress,
        assignment_completion_rate=assignment_completion_rate,
        attendance_rate=attendance_rate,
    )
    db.add(item)
    db.flush()
    return item


def create_learning_item(
    db: Session,
    *,
    student: Student,
    subject: Subject,
    author: User,
    title: str,
    description: str,
    status: LearningPathwayItemStatus,
    week: int,
    display_order: int,
) -> LearningPathwayItem:
    item = LearningPathwayItem(
        student_id=student.id,
        subject_id=subject.id,
        author_user_id=author.id,
        title=title,
        description=description,
        status=status,
        week=week,
        display_order=display_order,
    )
    db.add(item)
    db.flush()
    return item


def create_leave_request(
    db: Session,
    *,
    student: Student,
    submitter: User,
    leave_type: LeaveRequestType,
    start_date_value: str,
    end_date_value: str,
    reason: str,
    status: LeaveRequestStatus,
    school_note: str | None,
) -> StudentLeaveRequest:
    item = StudentLeaveRequest(
        student_id=student.id,
        submitter_user_id=submitter.id,
        type=leave_type,
        start_date=parse_date(start_date_value),
        end_date=parse_date(end_date_value),
        reason=reason,
        status=status,
        school_note=school_note,
    )
    db.add(item)
    db.flush()
    return item


def create_incident_report(
    db: Session,
    *,
    student: Student,
    reporter: User | None,
    incident_type: IncidentType,
    description: str,
    is_anonymous: bool,
    status: IncidentStatus,
) -> StudentIncidentReport:
    item = StudentIncidentReport(
        student_id=student.id,
        reporter_user_id=reporter.id if reporter else None,
        incident_type=incident_type,
        description=description,
        is_anonymous=is_anonymous,
        status=status,
    )
    db.add(item)
    db.flush()
    return item


def create_resource(
    db: Session,
    *,
    title: str,
    category_key: str,
    category_label: str,
    audience_role: ResourceAudienceRole,
    summary: str,
    content: str,
    published_days_ago: int,
    is_pinned: bool = False,
    external_url: str | None = None,
) -> Resource:
    published_at = now() - timedelta(days=published_days_ago)
    item = Resource(
        title=title,
        summary=summary,
        category_key=category_key,
        category_label=category_label,
        audience_role=audience_role,
        external_url=external_url,
        is_pinned=is_pinned,
        is_published=True,
        published_at=published_at,
        content_markdown=content,
        original_content_markdown=content,
        original_language="en-AU",
        created_at=published_at,
        updated_at=published_at,
    )
    db.add(item)
    db.flush()
    return item


def create_ai_conversation(
    db: Session,
    *,
    user: User,
    title: str,
    context_type: AiConversationContextType,
    student: Student | None = None,
    subject: Subject | None = None,
    messages: list[tuple[AiMessageRole, str]] | None = None,
) -> AiConversation:
    last_message_at = now()
    conversation = AiConversation(
        user_id=user.id,
        context_type=context_type,
        student_id=student.id if student else None,
        subject_id=subject.id if subject else None,
        title=title,
        is_archived=False,
        last_message_at=last_message_at,
        deleted_at=None,
    )
    db.add(conversation)
    db.flush()
    created_at = last_message_at - timedelta(minutes=max(len(messages or []), 1))
    for role, content in messages or []:
        created_at += timedelta(minutes=1)
        db.add(
            AiMessage(
                conversation_id=conversation.id,
                role=role,
                content_markdown=content,
                created_at=created_at,
            )
        )
    db.flush()
    return conversation


def reset_demo_data(db: Session) -> None:
    demo_users = list(db.scalars(select(User).where(User.email.like(f"%@{DEMO_EMAIL_DOMAIN}"))))
    demo_user_ids = [item.id for item in demo_users]
    demo_student_ids = list(
        db.scalars(select(Student.id).where(Student.sid.like("DEMO-STU-%")))
    )
    demo_subject_ids = list(
        db.scalars(select(Subject.id).where(Subject.code.in_(["MATH", "ENG", "SCI", "HIS"])))
    )
    demo_class_ids = list(
        db.scalars(select(Class.id).where(Class.name.in_(["Year 5 Alpha", "Year 6 Beta"])))
    )

    if demo_user_ids:
        db.execute(delete(UserSettings).where(UserSettings.user_id.in_(demo_user_ids)))
        db.execute(delete(AiConversation).where(AiConversation.user_id.in_(demo_user_ids)))

    if demo_student_ids:
        db.execute(delete(TeachingAssignment).where(TeachingAssignment.student_id.in_(demo_student_ids)))
        db.execute(delete(ParentStudentBinding).where(ParentStudentBinding.student_id.in_(demo_student_ids)))
        db.execute(delete(StudentExamScore).where(StudentExamScore.student_id.in_(demo_student_ids)))
        db.execute(delete(StudentPeriodMetric).where(StudentPeriodMetric.student_id.in_(demo_student_ids)))
        db.execute(delete(StudentLeaveRequest).where(StudentLeaveRequest.student_id.in_(demo_student_ids)))
        db.execute(delete(StudentIncidentReport).where(StudentIncidentReport.student_id.in_(demo_student_ids)))
        db.execute(delete(LearningPathwayItem).where(LearningPathwayItem.student_id.in_(demo_student_ids)))
        db.execute(delete(Announcement).where(Announcement.student_id.in_(demo_student_ids)))
        db.execute(delete(Report).where(Report.student_id.in_(demo_student_ids)))
        db.execute(delete(DiscussionThread).where(DiscussionThread.student_id.in_(demo_student_ids)))

    if demo_user_ids:
        db.execute(delete(Tag).where(Tag.owner_teacher_user_id.in_(demo_user_ids)))

    db.execute(delete(Tag).where(Tag.scope == TagScope.SYSTEM, Tag.name.in_(["follow-up", "wellbeing", "attendance"])))
    db.execute(delete(Resource).where(Resource.title.like("[DEMO]%")))

    if demo_student_ids:
        db.execute(delete(Student).where(Student.id.in_(demo_student_ids)))
    if demo_class_ids:
        db.execute(delete(Class).where(Class.id.in_(demo_class_ids)))
    if demo_subject_ids:
        db.execute(delete(Subject).where(Subject.id.in_(demo_subject_ids)))
    if demo_user_ids:
        db.execute(delete(User).where(User.id.in_(demo_user_ids)))
    db.flush()


def reset_demo_teacher_content(db: Session) -> None:
    demo_student_ids = list(db.scalars(select(Student.id).where(Student.sid.like("DEMO-STU-%"))))
    demo_user_ids = list(db.scalars(select(User.id).where(User.email.like(f"%@{DEMO_EMAIL_DOMAIN}"))))
    if demo_student_ids:
        db.execute(delete(StudentExamScore).where(StudentExamScore.student_id.in_(demo_student_ids)))
        db.execute(delete(StudentPeriodMetric).where(StudentPeriodMetric.student_id.in_(demo_student_ids)))
        db.execute(delete(LearningPathwayItem).where(LearningPathwayItem.student_id.in_(demo_student_ids)))
        db.execute(delete(Announcement).where(Announcement.student_id.in_(demo_student_ids)))
        db.execute(delete(Report).where(Report.student_id.in_(demo_student_ids)))
        db.execute(delete(DiscussionThread).where(DiscussionThread.student_id.in_(demo_student_ids)))
    if demo_user_ids:
        db.execute(delete(AiConversation).where(AiConversation.user_id.in_(demo_user_ids)))
    db.flush()


def reset_demo_parent_welfare(db: Session) -> None:
    demo_student_ids = list(db.scalars(select(Student.id).where(Student.sid.like("DEMO-STU-%"))))
    if demo_student_ids:
        db.execute(delete(StudentLeaveRequest).where(StudentLeaveRequest.student_id.in_(demo_student_ids)))
        db.execute(delete(StudentIncidentReport).where(StudentIncidentReport.student_id.in_(demo_student_ids)))
    db.flush()


def reset_demo_resources(db: Session) -> None:
    db.execute(delete(Resource).where(Resource.title.like("[DEMO]%")))
    db.flush()
