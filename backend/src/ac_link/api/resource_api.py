"""
资源中心公开接口：/api/resources/*

权限要求：所有接口需登录（任意角色可访问），但返回内容按受众过滤。

包含：
  GET  /api/resources                     §12A.1 获取资源列表
  GET  /api/resources/categories          §12A.2 获取资源分类列表
  GET  /api/resources/{resource_uuid}     §12A.3 获取资源详情
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ac_link.common.deps import get_current_user
from ac_link.common.exceptions import Errors
from ac_link.crud import resource as resource_crud
from ac_link.crud import translation as translation_crud
from ac_link.db.db import get_db
from ac_link.db.orm.enums import ResourceAudienceRole, TranslationResourceType, UserRole
from ac_link.db.orm.user import User, UserSettings
from ac_link.dto.admin import PaginatedResponse, PaginationMeta
from ac_link.dto.auth import ApiResponse
from ac_link.dto.resource import (
    CategoryItem,
    ResourceDetail,
    ResourceListItem,
    TranslationBlock,
)
from ac_link.services.translation_helpers import (
    get_target_language,
    resolve_translation_block,
    resolve_translation_fields,
)

router = APIRouter(prefix="/api/resources", tags=["resources"])


# ── 辅助：翻译缓存查询 ─────────────────────────────────────────────────────────

def _get_target_lang(db: Session, user: User, request: Request) -> str:
    user_settings = db.query(UserSettings).filter(
        UserSettings.user_id == user.id
    ).first()
    return get_target_language(
        user_settings.language if user_settings else None,
        request.headers.get("accept-language"),
    )


def _viewer_role(user: User) -> str | None:
    """Admin 不受受众过滤，返回 None；其余角色返回对应 str。"""
    if user.role == UserRole.ADMIN:
        return None
    return str(user.role)


# ── GET /api/resources ────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse[ResourceListItem])
def list_resources(
    page: int = 1,
    page_size: int = 20,
    category: str | None = None,
    keyword: str | None = None,
    audience_role: str | None = None,
    sort: str = "published_at_desc",
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[ResourceListItem]:
    """获取已发布资源列表，仅返回当前用户受众范围内的资源（§12A.1）。"""
    items, total = resource_crud.list_resources(
        db,
        page=page,
        page_size=page_size,
        category=category,
        keyword=keyword,
        audience_role=audience_role,
        sort=sort,
        is_published_filter=True,
        viewer_role=_viewer_role(current_user),
    )

    target_lang = _get_target_lang(db, current_user, request)
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


# ── GET /api/resources/categories ─────────────────────────────────────────────
# 注意：此路由必须在 /{resource_uuid} 之前注册，避免路径冲突

@router.get("/categories", response_model=ApiResponse[list[CategoryItem]])
def list_categories(
    audience_role: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[list[CategoryItem]]:
    """获取已发布资源的分类列表，含各分类资源数量（§12A.2）。"""
    if current_user.role == UserRole.ADMIN:
        # Admin 可按任意 audience_role 过滤，不传则不过滤
        effective_audience = audience_role
    else:
        viewer = str(current_user.role)
        # 非 Admin：只允许过滤自己可见的范围（all 或与自身角色匹配）
        if audience_role in (None, viewer, ResourceAudienceRole.ALL):
            effective_audience = viewer  # 默认显示自身受众范围（含 all）
        else:
            # 请求了不属于自身受众的分类 → 直接返回空
            return ApiResponse(data=[])

    rows = resource_crud.list_categories(
        db, audience_role=effective_audience, published_only=True
    )
    return ApiResponse(data=[CategoryItem(**row) for row in rows])


# ── GET /api/resources/{resource_uuid} ────────────────────────────────────────

@router.get("/{resource_uuid}", response_model=ApiResponse[ResourceDetail])
def get_resource(
    resource_uuid: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[ResourceDetail]:
    """获取资源详情（§12A.3）。未发布或不属于当前受众范围返回 403。"""
    resource = resource_crud.get_resource_by_uuid(db, resource_uuid)
    if resource is None:
        raise Errors.not_found("资源不存在")

    # 权限校验：非 Admin 需符合发布状态 + 受众范围
    if current_user.role != UserRole.ADMIN:
        if not resource.is_published:
            raise Errors.forbidden()
        viewer_role = str(current_user.role)
        if resource.audience_role not in (ResourceAudienceRole.ALL, viewer_role):
            raise Errors.forbidden()

    target_lang = _get_target_lang(db, current_user, request)
    translation = translation_crud.get_translation(
        db, TranslationResourceType.RESOURCE, resource.id, target_lang
    )
    fields = resolve_translation_fields(
        resource.original_content_markdown, resource.original_language, translation
    )

    return ApiResponse(
        data=ResourceDetail(
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
    )
