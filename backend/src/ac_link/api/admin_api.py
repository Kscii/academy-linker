"""
Admin 管理接口：/api/admin/*

权限要求：所有接口仅允许 admin 角色访问。

包含：
  GET    /api/admin/users                              - 获取用户列表
  POST   /api/admin/users                              - 创建用户
  PATCH  /api/admin/users/{user_uuid}                  - 更新用户
  GET    /api/admin/classes                            - 获取班级列表
  POST   /api/admin/classes                            - 创建班级
  PATCH  /api/admin/classes/{class_uuid}               - 更新班级
  GET    /api/admin/students                           - 获取学生列表
  POST   /api/admin/students                           - 创建学生
  PATCH  /api/admin/students/{student_uuid}            - 更新学生
  POST   /api/admin/students/{student_uuid}/transfer-class  - 学生换班
  GET    /api/admin/bindings/parent_student            - 获取绑定列表
  POST   /api/admin/bindings/parent_student            - 创建绑定
  PATCH  /api/admin/bindings/parent_student/{uuid}     - 更新绑定
  GET    /api/admin/assignments/teaching               - 获取分配列表
  POST   /api/admin/assignments/teaching               - 创建分配
  PATCH  /api/admin/assignments/teaching/{uuid}        - 更新分配
  GET    /api/admin/tags/system                        - 获取系统 Tag 列表
  POST   /api/admin/tags/system                        - 创建系统 Tag
  PATCH  /api/admin/tags/system/{tag_uuid}             - 更新系统 Tag
  GET    /api/admin/resources                          - 获取资源列表
  POST   /api/admin/resources                          - 创建资源
  PATCH  /api/admin/resources/{resource_uuid}          - 更新资源
  DELETE /api/admin/resources/{resource_uuid}          - 删除资源
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ac_link.common.deps import require_admin
from ac_link.common.exceptions import AppError, Errors
from ac_link.crud import admin as admin_crud
from ac_link.crud import resource as resource_crud
from ac_link.crud import translation as translation_crud
from ac_link.db.db import get_db
from ac_link.db.orm.enums import ResourceAudienceRole, TagScope, TranslationResourceType, UserRole
from ac_link.db.orm.user import User, UserSettings
from ac_link.dto.admin import (
    AdminOverviewData,
    AssignmentListItem,
    BindingListItem,
    ClassDetail,
    ClassListItem,
    CreateAssignmentRequest,
    CreateBindingRequest,
    CreateClassRequest,
    CreateStudentRequest,
    CreateSystemTagRequest,
    CreateUserRequest,
    PaginatedResponse,
    PaginationMeta,
    StudentListItem,
    SystemTagItem,
    TransferClassRequest,
    TransferClassResult,
    UpdateAssignmentRequest,
    UpdateBindingRequest,
    UpdateClassRequest,
    UpdateStudentRequest,
    UpdateSystemTagRequest,
    UpdateUserRequest,
    UserListItem,
)
from ac_link.dto.auth import ApiResponse
from ac_link.dto.resource import (
    CreateResourceRequest,
    DeleteResourceResult,
    PaginatedResponse as _PaginatedResponse,  # noqa – 已通过 admin dto 导入，此处别名
    ResourceDetail,
    ResourceListItem,
    TranslationBlock,
    UpdateResourceRequest,
)
from ac_link.services import auth_service
from ac_link.services.translation_helpers import (
    get_target_language,
    resolve_translation_block,
    resolve_translation_fields,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── GET /api/admin/overview ───────────────────────────────────────────────────

@router.get("/overview", response_model=ApiResponse[AdminOverviewData])
def get_admin_overview(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminOverviewData]:
    """获取 Admin 首页总览统计（§11.0）。"""
    result = admin_crud.get_admin_overview(db)
    return ApiResponse(data=AdminOverviewData(**result))


# ─────────────────────────────────────────────────────────────────────────────
# 用户管理
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=PaginatedResponse[UserListItem])
def list_users(
    page: int = 1,
    page_size: int = 20,
    role: str | None = None,
    keyword: str | None = None,
    sort: str = "created_at_desc",
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaginatedResponse[UserListItem]:
    """获取用户列表，支持按 role/keyword 筛选、排序、分页。"""
    items, total = admin_crud.list_users(
        db, page=page, page_size=page_size, role=role, keyword=keyword, sort=sort
    )
    return PaginatedResponse(
        data=[UserListItem.model_validate(u) for u in items],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=admin_crud.calc_total_pages(total, page_size),
        ),
    )


@router.post("/users", response_model=ApiResponse[UserListItem], status_code=201)
def create_user(
    body: CreateUserRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[UserListItem]:
    """创建用户。密码满足强度规则后存储哈希值。邮箱重复返回 409。"""
    try:
        user = admin_crud.create_user(
            db,
            role=UserRole(body.role),
            email=str(body.email),
            password_hash=auth_service.hash_password(body.password),
            display_name=body.display_name,
            phone_number=body.phone_number,
            is_active=True,
        )
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise Errors.conflict("该邮箱已被使用")
    return ApiResponse(data=UserListItem.model_validate(user))


@router.patch("/users/{user_uuid}", response_model=ApiResponse[UserListItem])
def update_user(
    user_uuid: UUID,
    body: UpdateUserRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[UserListItem]:
    """更新用户资料或启用/停用账户。"""
    user = admin_crud.get_user_by_uuid(db, user_uuid)
    if user is None:
        raise Errors.not_found("用户不存在")
    updates = body.model_dump(exclude_unset=True)
    updated = admin_crud.update_user(db, user, **updates)
    db.commit()
    db.refresh(updated)
    return ApiResponse(data=UserListItem.model_validate(updated))


# ─────────────────────────────────────────────────────────────────────────────
# 学生管理
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/students", response_model=PaginatedResponse[StudentListItem])
def list_students(
    page: int = 1,
    page_size: int = 20,
    keyword: str | None = None,
    class_uuid: UUID | None = None,
    is_active: bool | None = None,
    sort: str = "created_at_desc",
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaginatedResponse[StudentListItem]:
    """获取学生列表，支持 keyword/班级/状态 筛选与排序。"""
    class_id: int | None = None
    if class_uuid is not None:
        cls_obj = admin_crud.get_class_by_uuid(db, class_uuid)
        if cls_obj is None:
            raise Errors.not_found("班级不存在")
        class_id = cls_obj.id

    items, total = admin_crud.list_students(
        db,
        page=page,
        page_size=page_size,
        keyword=keyword,
        class_id=class_id,
        is_active=is_active,
        sort=sort,
    )
    return PaginatedResponse(
        data=[StudentListItem.from_student(s) for s in items],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=admin_crud.calc_total_pages(total, page_size),
        ),
    )


@router.post("/students", response_model=ApiResponse[StudentListItem], status_code=201)
def create_student(
    body: CreateStudentRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[StudentListItem]:
    """创建学生。sid 全局唯一（非空时），重复返回 409。"""
    class_id: int | None = None
    if body.class_uuid is not None:
        cls_obj = admin_crud.get_class_by_uuid(db, body.class_uuid)
        if cls_obj is None:
            raise Errors.not_found("班级不存在")
        class_id = cls_obj.id

    try:
        fields = body.model_dump(exclude={'class_uuid'})
        fields['class_id'] = class_id
        student = admin_crud.create_student(db, **fields)
        db.commit()
        db.refresh(student)
    except IntegrityError:
        db.rollback()
        raise Errors.conflict("该学号（sid）已被使用")
    return ApiResponse(data=StudentListItem.from_student(student))


@router.patch("/students/{student_uuid}", response_model=ApiResponse[StudentListItem])
def update_student(
    student_uuid: UUID,
    body: UpdateStudentRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[StudentListItem]:
    """更新学生信息。"""
    student = admin_crud.get_student_by_uuid(db, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在")

    updates = body.model_dump(exclude_unset=True)
    if 'class_uuid' in updates:
        raw_class_uuid = updates.pop('class_uuid')
        if raw_class_uuid is not None:
            cls_obj = admin_crud.get_class_by_uuid(db, raw_class_uuid)
            if cls_obj is None:
                raise Errors.not_found("班级不存在")
            updates['class_id'] = cls_obj.id
        else:
            updates['class_id'] = None

    try:
        updated = admin_crud.update_student(db, student, **updates)
        db.commit()
        db.refresh(updated)
    except IntegrityError:
        db.rollback()
        raise Errors.conflict("该学号（sid）已被使用")
    return ApiResponse(data=StudentListItem.from_student(updated))


# ─────────────────────────────────────────────────────────────────────────────
# Parent-Student 绑定
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/bindings/parent_student", response_model=PaginatedResponse[BindingListItem])
def list_bindings(
    page: int = 1,
    page_size: int = 20,
    parent_uuid: UUID | None = None,
    student_uuid: UUID | None = None,
    is_active: bool | None = None,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaginatedResponse[BindingListItem]:
    """获取 Parent-Student 绑定列表。"""
    parent_user_id: int | None = None
    if parent_uuid is not None:
        parent = admin_crud.get_user_by_uuid(db, parent_uuid)
        if parent is None:
            raise Errors.not_found("家长用户不存在")
        parent_user_id = parent.id

    student_id: int | None = None
    if student_uuid is not None:
        student = admin_crud.get_student_by_uuid(db, student_uuid)
        if student is None:
            raise Errors.not_found("学生不存在")
        student_id = student.id

    items, total = admin_crud.list_bindings(
        db,
        page=page,
        page_size=page_size,
        parent_user_id=parent_user_id,
        student_id=student_id,
        is_active=is_active,
    )

    def _to_dto(b: object) -> BindingListItem:
        from ac_link.db.orm.academic import ParentStudentBinding as PSB
        assert isinstance(b, PSB)
        return BindingListItem(
            uuid=b.uuid,
            parent_uuid=b.parent_user.uuid,
            student_uuid=b.student.uuid,
            relationship_label=b.relationship_label,
            is_primary=b.is_primary,
            is_active=b.is_active,
            created_at=b.created_at,
        )

    return PaginatedResponse(
        data=[_to_dto(b) for b in items],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=admin_crud.calc_total_pages(total, page_size),
        ),
    )


@router.post("/bindings/parent_student", response_model=ApiResponse[BindingListItem], status_code=201)
def create_binding(
    body: CreateBindingRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[BindingListItem]:
    """
    创建 Parent-Student 绑定。
    - parent_uuid 指向的用户必须 role=parent
    - 同一学生最多有一条 is_active=true 的绑定
    """
    parent = admin_crud.get_user_by_uuid(db, body.parent_uuid)
    if parent is None:
        raise Errors.not_found("家长用户不存在")
    if parent.role != UserRole.PARENT:
        raise AppError(400, "bad_request", "指定用户的 role 不是 parent")

    student = admin_crud.get_student_by_uuid(db, body.student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在")

    if admin_crud.has_active_binding_for_student(db, student.id):
        raise Errors.conflict("该学生已存在一条 is_active=true 的绑定")

    try:
        binding = admin_crud.create_binding(
            db,
            parent_user_id=parent.id,
            student_id=student.id,
            relationship_label=body.relationship_label,
            is_primary=body.is_primary,
            is_active=True,
        )
        db.commit()
        db.refresh(binding)
    except IntegrityError:
        db.rollback()
        raise Errors.conflict("该家长与学生的绑定关系已存在")

    return ApiResponse(data=BindingListItem(
        uuid=binding.uuid,
        parent_uuid=parent.uuid,
        student_uuid=student.uuid,
        relationship_label=binding.relationship_label,
        is_primary=binding.is_primary,
        is_active=binding.is_active,
        created_at=binding.created_at,
    ))


@router.patch("/bindings/parent_student/{binding_uuid}", response_model=ApiResponse[BindingListItem])
def update_binding(
    binding_uuid: UUID,
    body: UpdateBindingRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[BindingListItem]:
    """更新绑定信息。is_active=false 停用绑定，不级联处理 discussion thread。"""
    binding = admin_crud.get_binding_by_uuid(db, binding_uuid)
    if binding is None:
        raise Errors.not_found("绑定关系不存在")

    updates = body.model_dump(exclude_unset=True)

    # 如果要开启 is_active，检查是否已有其他活跃绑定
    new_is_active = updates.get("is_active", binding.is_active)
    new_is_primary = updates.get("is_primary", binding.is_primary)
    if new_is_active and new_is_primary:
        if admin_crud.has_active_binding_for_student(db, binding.student_id, exclude_binding_id=binding.id):
            raise Errors.conflict("该学生已存在一条 is_active=true 的绑定")

    updated = admin_crud.update_binding(db, binding, **updates)
    db.commit()
    db.refresh(updated)

    return ApiResponse(data=BindingListItem(
        uuid=updated.uuid,
        parent_uuid=updated.parent_user.uuid,
        student_uuid=updated.student.uuid,
        relationship_label=updated.relationship_label,
        is_primary=updated.is_primary,
        is_active=updated.is_active,
        created_at=updated.created_at,
    ))


# ─────────────────────────────────────────────────────────────────────────────
# Teaching Assignment
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/assignments/teaching", response_model=PaginatedResponse[AssignmentListItem])
def list_assignments(
    page: int = 1,
    page_size: int = 20,
    teacher_uuid: UUID | None = None,
    student_uuid: UUID | None = None,
    subject_uuid: UUID | None = None,
    is_active: bool | None = None,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaginatedResponse[AssignmentListItem]:
    """获取 Teaching Assignment 列表。"""
    teacher_user_id: int | None = None
    if teacher_uuid is not None:
        teacher = admin_crud.get_user_by_uuid(db, teacher_uuid)
        if teacher is None:
            raise Errors.not_found("教师用户不存在")
        teacher_user_id = teacher.id

    student_id: int | None = None
    if student_uuid is not None:
        student = admin_crud.get_student_by_uuid(db, student_uuid)
        if student is None:
            raise Errors.not_found("学生不存在")
        student_id = student.id

    subject_id: int | None = None
    if subject_uuid is not None:
        subject = admin_crud.get_subject_by_uuid(db, subject_uuid)
        if subject is None:
            raise Errors.not_found("学科不存在")
        subject_id = subject.id

    items, total = admin_crud.list_assignments(
        db,
        page=page,
        page_size=page_size,
        teacher_user_id=teacher_user_id,
        student_id=student_id,
        subject_id=subject_id,
        is_active=is_active,
    )

    def _to_dto(a: object) -> AssignmentListItem:
        from ac_link.db.orm.academic import TeachingAssignment as TA
        assert isinstance(a, TA)
        return AssignmentListItem(
            uuid=a.uuid,
            teacher_uuid=a.teacher_user.uuid,
            student_uuid=a.student.uuid,
            subject_uuid=a.subject.uuid,
            is_active=a.is_active,
            created_at=a.created_at,
        )

    return PaginatedResponse(
        data=[_to_dto(a) for a in items],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=admin_crud.calc_total_pages(total, page_size),
        ),
    )


@router.post("/assignments/teaching", response_model=ApiResponse[AssignmentListItem], status_code=201)
def create_assignment(
    body: CreateAssignmentRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AssignmentListItem]:
    """
    创建 Teaching Assignment。
    - teacher_uuid 指向的用户必须 role=teacher
    - (teacher, student, subject) 三元组唯一
    """
    teacher = admin_crud.get_user_by_uuid(db, body.teacher_uuid)
    if teacher is None:
        raise Errors.not_found("教师用户不存在")
    if teacher.role != UserRole.TEACHER:
        raise AppError(400, "bad_request", "指定用户的 role 不是 teacher")

    student = admin_crud.get_student_by_uuid(db, body.student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在")

    subject = admin_crud.get_subject_by_uuid(db, body.subject_uuid)
    if subject is None:
        raise Errors.not_found("学科不存在")

    if admin_crud.get_assignment_by_triple(db, teacher.id, student.id, subject.id):
        raise Errors.conflict("该 (教师, 学生, 学科) 分配关系已存在")

    assignment = admin_crud.create_assignment(
        db,
        teacher_user_id=teacher.id,
        student_id=student.id,
        subject_id=subject.id,
        is_active=True,
    )
    db.commit()
    db.refresh(assignment)

    return ApiResponse(data=AssignmentListItem(
        uuid=assignment.uuid,
        teacher_uuid=teacher.uuid,
        student_uuid=student.uuid,
        subject_uuid=subject.uuid,
        is_active=assignment.is_active,
        created_at=assignment.created_at,
    ))


@router.patch("/assignments/teaching/{assignment_uuid}", response_model=ApiResponse[AssignmentListItem])
def update_assignment(
    assignment_uuid: UUID,
    body: UpdateAssignmentRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AssignmentListItem]:
    """更新 Teaching Assignment（is_homeroom / is_active）。"""
    assignment = admin_crud.get_assignment_by_uuid(db, assignment_uuid)
    if assignment is None:
        raise Errors.not_found("分配关系不存在")
    updates = body.model_dump(exclude_unset=True)
    updated = admin_crud.update_assignment(db, assignment, **updates)
    db.commit()
    db.refresh(updated)
    return ApiResponse(data=AssignmentListItem(
        uuid=updated.uuid,
        teacher_uuid=updated.teacher_user.uuid,
        student_uuid=updated.student.uuid,
        subject_uuid=updated.subject.uuid,
        is_active=updated.is_active,
        created_at=updated.created_at,
    ))


# ─────────────────────────────────────────────────────────────────────────────
# 系统 Tag
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/tags/system", response_model=ApiResponse[list[SystemTagItem]])
def list_system_tags(
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[list[SystemTagItem]]:
    """获取所有系统 Tag 列表。"""
    tags = admin_crud.list_system_tags(db)
    return ApiResponse(data=[SystemTagItem.model_validate(t) for t in tags])


@router.post("/tags/system", response_model=ApiResponse[SystemTagItem], status_code=201)
def create_system_tag(
    body: CreateSystemTagRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[SystemTagItem]:
    """创建系统 Tag。名称在 system scope 内唯一，重复返回 409 duplicate_tag_name。"""
    if admin_crud.get_system_tag_by_name(db, body.name):
        raise AppError(409, "duplicate_tag_name", f"系统 Tag '{body.name}' 已存在")
    try:
        tag = admin_crud.create_system_tag(
            db,
            name=body.name,
            scope=TagScope.SYSTEM,
            owner_teacher_user_id=None,
            is_selectable_by_parent=body.is_selectable_by_parent,
            is_selectable_by_teacher=body.is_selectable_by_teacher,
            affects_business_logic=body.affects_business_logic,
            is_active=True,
        )
        db.commit()
        db.refresh(tag)
    except IntegrityError:
        db.rollback()
        raise AppError(409, "duplicate_tag_name", f"系统 Tag '{body.name}' 已存在")
    return ApiResponse(data=SystemTagItem.model_validate(tag))


@router.patch("/tags/system/{tag_uuid}", response_model=ApiResponse[SystemTagItem])
def update_system_tag(
    tag_uuid: UUID,
    body: UpdateSystemTagRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[SystemTagItem]:
    """更新系统 Tag。"""
    tag = admin_crud.get_system_tag_by_uuid(db, tag_uuid)
    if tag is None:
        raise Errors.not_found("系统 Tag 不存在")
    updates = body.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] != tag.name:
        if admin_crud.get_system_tag_by_name(db, updates["name"]):
            raise AppError(409, "duplicate_tag_name", f"系统 Tag '{updates['name']}' 已存在")
    try:
        updated = admin_crud.update_tag(db, tag, **updates)
        db.commit()
        db.refresh(updated)
    except IntegrityError:
        db.rollback()
        raise AppError(409, "duplicate_tag_name", "Tag 名称冲突")
    return ApiResponse(data=SystemTagItem.model_validate(updated))


# ─────────────────────────────────────────────────────────────────────────────
# 班级管理
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/classes", response_model=PaginatedResponse[ClassListItem])
def list_classes(
    page: int = 1,
    page_size: int = 20,
    grade_level: str | None = None,
    academic_year: str | None = None,
    homeroom_teacher_uuid: UUID | None = None,
    is_active: bool | None = None,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ClassListItem]:
    """获取班级列表（§11.16）。"""
    homeroom_teacher_user_id: int | None = None
    if homeroom_teacher_uuid is not None:
        teacher = admin_crud.get_user_by_uuid(db, homeroom_teacher_uuid)
        if teacher is None:
            raise Errors.not_found("班主任用户不存在")
        homeroom_teacher_user_id = teacher.id

    items, total = admin_crud.list_classes(
        db,
        page=page,
        page_size=page_size,
        grade_level=grade_level,
        academic_year=academic_year,
        homeroom_teacher_user_id=homeroom_teacher_user_id,
        is_active=is_active,
    )
    data = [
        ClassListItem.from_class(c, student_count=admin_crud.count_students_in_class(db, c.id))
        for c in items
    ]
    return PaginatedResponse(
        data=data,
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=admin_crud.calc_total_pages(total, page_size),
        ),
    )


@router.post("/classes", response_model=ApiResponse[ClassDetail], status_code=201)
def create_class(
    body: CreateClassRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[ClassDetail]:
    """创建班级（§11.17）。"""
    if not body.name or not body.name.strip():
        raise AppError(422, "validation_error", "name 不可为空字符串")

    homeroom_teacher_user_id: int | None = None
    if body.homeroom_teacher_uuid is not None:
        teacher = admin_crud.get_user_by_uuid(db, body.homeroom_teacher_uuid)
        if teacher is None:
            raise Errors.not_found("班主任用户不存在")
        if teacher.role != UserRole.TEACHER or not teacher.is_active:
            raise AppError(400, "bad_request", "班主任必须是 active 的 teacher 用户")
        homeroom_teacher_user_id = teacher.id

    cls_obj = admin_crud.create_class(
        db,
        name=body.name.strip(),
        grade_level=body.grade_level,
        academic_year=body.academic_year,
        homeroom_teacher_user_id=homeroom_teacher_user_id,
        is_active=True,
    )
    db.commit()
    db.refresh(cls_obj)
    _ = cls_obj.homeroom_teacher
    return ApiResponse(data=ClassDetail.from_class(cls_obj))


@router.patch("/classes/{class_uuid}", response_model=ApiResponse[ClassDetail])
def update_class(
    class_uuid: UUID,
    body: UpdateClassRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[ClassDetail]:
    """更新班级（§11.18）。"""
    cls_obj = admin_crud.get_class_by_uuid(db, class_uuid)
    if cls_obj is None:
        raise Errors.not_found("班级不存在")

    updates = body.model_dump(exclude_unset=True)
    if 'homeroom_teacher_uuid' in updates:
        raw_ht_uuid = updates.pop('homeroom_teacher_uuid')
        if raw_ht_uuid is not None:
            teacher = admin_crud.get_user_by_uuid(db, raw_ht_uuid)
            if teacher is None:
                raise Errors.not_found("班主任用户不存在")
            if teacher.role != UserRole.TEACHER or not teacher.is_active:
                raise AppError(400, "bad_request", "班主任必须是 active 的 teacher 用户")
            updates['homeroom_teacher_user_id'] = teacher.id
        else:
            updates['homeroom_teacher_user_id'] = None

    if 'name' in updates and (not updates['name'] or not updates['name'].strip()):
        raise AppError(422, "validation_error", "name 不可为空字符串")

    updated = admin_crud.update_class(db, cls_obj, **updates)
    db.commit()
    db.refresh(updated)
    _ = updated.homeroom_teacher
    return ApiResponse(data=ClassDetail.from_class(updated))


# ─────────────────────────────────────────────────────────────────────────────
# 学生换班
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/students/{student_uuid}/transfer-class", response_model=ApiResponse[TransferClassResult])
def transfer_class(
    student_uuid: UUID,
    body: TransferClassRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[TransferClassResult]:
    """学生换班原子操作（§11.19）。"""
    student = admin_crud.get_student_by_uuid(db, student_uuid)
    if student is None:
        raise Errors.not_found("学生不存在")

    new_class = admin_crud.get_class_by_uuid(db, body.new_class_uuid)
    if new_class is None or not new_class.is_active:
        raise Errors.not_found("目标班级不存在或已停用")

    deactivated, created = admin_crud.transfer_student_class(db, student, new_class)
    db.commit()
    return ApiResponse(data=TransferClassResult(
        student_uuid=student.uuid,
        new_class_uuid=new_class.uuid,
        deactivated_assignment_count=deactivated,
        created_assignment_count=created,
    ))


# ─────────────────────────────────────────────────────────────────────────────
# 资源管理（§12A.4 ~ §12A.7）
# ─────────────────────────────────────────────────────────────────────────────

def _admin_resource_detail(
    db: Session,
    user: 'User',
    resource,
) -> ResourceDetail:
    """构建 ResourceDetail DTO（Admin 视图，不受翻译语言影响，直接展示原文）。"""
    from ac_link.db.orm.user import UserSettings as _UserSettings
    user_settings = db.query(_UserSettings).filter(
        _UserSettings.user_id == user.id
    ).first()
    target_lang = get_target_language(
        user_settings.language if user_settings else None
    )
    translation = translation_crud.get_translation(
        db, TranslationResourceType.RESOURCE, resource.id, target_lang
    )
    fields = resolve_translation_fields(
        resource.original_content_markdown, resource.original_language, translation
    )
    return ResourceDetail(
        uuid=resource.uuid,
        title=resource.title,
        summary=resource.summary,
        category_key=resource.category_key,
        category_label=resource.category_label,
        audience_role=str(resource.audience_role),
        cover_image_url=resource.cover_image_url,
        external_url=resource.external_url,
        is_pinned=resource.is_pinned,
        published_at=resource.published_at,
        **fields,
    )


@router.get("/resources", response_model=PaginatedResponse[ResourceListItem])
def admin_list_resources(
    page: int = 1,
    page_size: int = 20,
    category: str | None = None,
    keyword: str | None = None,
    audience_role: str | None = None,
    is_published: bool | None = None,
    sort: str = "created_at_desc",
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ResourceListItem]:
    """Admin 获取资源列表，可查未发布资源（§12A.4）。"""
    from ac_link.crud.resource import _ADMIN_SORTS
    items, total = resource_crud.list_resources(
        db,
        page=page,
        page_size=page_size,
        category=category,
        keyword=keyword,
        audience_role=audience_role,
        sort=sort,
        is_published_filter=is_published,  # None = 不过滤
        viewer_role=None,  # Admin 看全部受众
        sort_set=_ADMIN_SORTS,
    )

    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == _admin.id
    ).first()
    target_lang = get_target_language(
        user_settings.language if user_settings else None
    )
    resource_ids = [r.id for r in items]
    trans_map = translation_crud.get_translations_batch(
        db, TranslationResourceType.RESOURCE, resource_ids, target_lang
    )

    return PaginatedResponse(
        data=[
            ResourceListItem(
                uuid=r.uuid,
                title=r.title,
                summary=r.summary,
                category_key=r.category_key,
                category_label=r.category_label,
                audience_role=str(r.audience_role),
                cover_image_url=r.cover_image_url,
                external_url=r.external_url,
                is_pinned=r.is_pinned,
                published_at=r.published_at,
                translation=TranslationBlock(
                    **resolve_translation_block(r.original_language, trans_map.get(r.id))
                ),
            )
            for r in items
        ],
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=resource_crud.calc_total_pages(total, page_size),
        ),
    )


@router.post("/resources", response_model=ApiResponse[ResourceDetail], status_code=201)
def admin_create_resource(
    body: CreateResourceRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[ResourceDetail]:
    """Admin 创建资源（§12A.5）。"""
    try:
        audience = ResourceAudienceRole(body.audience_role)
    except ValueError:
        raise AppError(422, "invalid_audience_role", "audience_role 必须为 parent | teacher | all")

    resource = resource_crud.create_resource(
        db,
        title=body.title,
        summary=body.summary,
        content_markdown=body.content_markdown,
        category_key=body.category_key,
        category_label=body.category_label,
        audience_role=audience,
        cover_image_url=body.cover_image_url,
        external_url=body.external_url,
        is_pinned=body.is_pinned,
        is_published=body.is_published,
        published_at=body.published_at,
        original_language=body.original_language,
    )
    db.commit()
    db.refresh(resource)
    return ApiResponse(data=_admin_resource_detail(db, _admin, resource))


@router.patch("/resources/{resource_uuid}", response_model=ApiResponse[ResourceDetail])
def admin_update_resource(
    resource_uuid: UUID,
    body: UpdateResourceRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[ResourceDetail]:
    """Admin 更新资源（§12A.6）。若 content_markdown 变更，翻译缓存标记为 stale。"""
    resource = resource_crud.get_resource_by_uuid(db, resource_uuid)
    if resource is None:
        raise Errors.not_found("资源不存在")

    updates = body.model_dump(exclude_unset=True)

    if "audience_role" in updates and updates["audience_role"] is not None:
        try:
            updates["audience_role"] = ResourceAudienceRole(updates["audience_role"])
        except ValueError:
            raise AppError(422, "invalid_audience_role", "audience_role 必须为 parent | teacher | all")

    content_changed = (
        "content_markdown" in updates
        and updates["content_markdown"] != resource.content_markdown
    )

    resource_crud.update_resource(db, resource, **updates)

    if content_changed:
        translation_crud.mark_translations_stale(
            db, TranslationResourceType.RESOURCE, resource.id
        )

    db.commit()
    db.refresh(resource)
    return ApiResponse(data=_admin_resource_detail(db, _admin, resource))


@router.delete("/resources/{resource_uuid}", response_model=ApiResponse[DeleteResourceResult])
def admin_delete_resource(
    resource_uuid: UUID,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[DeleteResourceResult]:
    """Admin 删除资源（§12A.7）。"""
    resource = resource_crud.get_resource_by_uuid(db, resource_uuid)
    if resource is None:
        raise Errors.not_found("资源不存在")
    resource_crud.delete_resource(db, resource)
    db.commit()
    return ApiResponse(data=DeleteResourceResult(success=True))
