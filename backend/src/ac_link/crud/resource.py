"""
资源中心 CRUD 层。

职责：resources 表的读写操作。

公开函数：
  list_resources         — 分页查询资源列表（支持发布状态/分类/关键字/受众/排序过滤）
  list_categories        — 按 category_key 分组统计资源分类
  get_resource_by_uuid   — 按 UUID 查找资源
  create_resource        — 创建资源
  update_resource        — 部分更新资源字段
  delete_resource        — 删除资源
  calc_total_pages       — 计算总页数
"""

from __future__ import annotations

import math
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from ac_link.common.exceptions import AppError
from ac_link.db.orm.content import Resource
from ac_link.db.orm.enums import ResourceAudienceRole

# 各场景合法排序值
_PUBLIC_SORTS = frozenset({"published_at_desc", "published_at_asc", "pinned_desc"})
_ADMIN_SORTS = frozenset({"created_at_desc", "published_at_desc", "title_asc"})

UNSET = object()


# ─────────────────────────────────────────────────────────────────────────────

def calc_total_pages(total: int, page_size: int) -> int:
    return math.ceil(total / page_size) if page_size > 0 else 0


def get_resource_by_uuid(db: Session, uuid: UUID) -> Resource | None:
    return db.query(Resource).filter(Resource.uuid == uuid).first()


def list_resources(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    category: str | None = None,
    keyword: str | None = None,
    audience_role: str | None = None,
    sort: str = "published_at_desc",
    is_published_filter: bool | None = True,
    # 调用方可传入当前用户角色（non-admin 场景拼受众过滤）
    viewer_role: str | None = None,
    sort_set: frozenset[str] | None = None,
) -> tuple[list[Resource], int]:
    """
    通用资源列表查询。

    - is_published_filter=True  → 只返回已发布（公开接口默认）
    - is_published_filter=None  → 不过滤（Admin 全量视图）
    - viewer_role 非 None 时在 is_published=True 记录中只返回 audience_role=all
      或 audience_role=<viewer_role> 的资源；Admin 不传此参数。
    """
    effective_sort_set = sort_set if sort_set is not None else _PUBLIC_SORTS
    if sort not in effective_sort_set:
        raise AppError(400, "invalid_sort", f"sort 可选值：{sorted(effective_sort_set)}")

    q = db.query(Resource)

    if is_published_filter is True:
        q = q.filter(Resource.is_published == True)  # noqa: E712
    elif is_published_filter is False:
        q = q.filter(Resource.is_published == False)  # noqa: E712
    # None → 不过滤

    if viewer_role is not None:
        q = q.filter(
            Resource.audience_role.in_([ResourceAudienceRole.ALL, viewer_role])
        )

    if audience_role is not None:
        q = q.filter(Resource.audience_role == audience_role)

    if category is not None:
        q = q.filter(Resource.category_key == category)

    if keyword is not None:
        like = f"%{keyword}%"
        q = q.filter(
            Resource.title.ilike(like)
            | Resource.summary.ilike(like)
            | Resource.content_markdown.ilike(like)
        )

    # 排序
    if sort == "published_at_asc":
        q = q.order_by(Resource.published_at.asc().nullsfirst())
    elif sort == "published_at_desc":
        q = q.order_by(Resource.published_at.desc().nullslast())
    elif sort == "pinned_desc":
        q = q.order_by(Resource.is_pinned.desc(), Resource.published_at.desc().nullslast())
    elif sort == "created_at_desc":
        q = q.order_by(Resource.created_at.desc())
    elif sort == "title_asc":
        q = q.order_by(Resource.title.asc())

    total: int = q.count()
    items: list[Resource] = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def list_categories(
    db: Session,
    *,
    audience_role: str | None = None,
    published_only: bool = True,
) -> list[dict]:
    """
    按 category_key 分组统计分类及资源数量。

    返回 list[{"key": str, "label": str, "resource_count": int}]，
    label 取该 key 下最后更新的一条记录的 category_label。
    """
    # 先在子查询中应用所有过滤条件，再聚合
    q = db.query(
        Resource.category_key,
        Resource.category_label,
        func.count(Resource.id).label("resource_count"),
    )
    if published_only:
        q = q.filter(Resource.is_published == True)  # noqa: E712
    if audience_role is not None:
        if audience_role == ResourceAudienceRole.ALL:
            q = q.filter(Resource.audience_role == ResourceAudienceRole.ALL)
        else:
            q = q.filter(
                Resource.audience_role.in_([ResourceAudienceRole.ALL, audience_role])
            )
    rows = (
        q.group_by(Resource.category_key, Resource.category_label)
        .order_by(Resource.category_key)
        .all()
    )

    # 同 key 若存在多个不同 label（人为不一致），合并累加 count，label 取第一个
    result: dict[str, dict] = {}
    for key, label, count in rows:
        if key not in result:
            result[key] = {"key": key, "label": label, "resource_count": count}
        else:
            result[key]["resource_count"] += count

    return list(result.values())


def create_resource(
    db: Session,
    *,
    title: str,
    summary: str | None,
    content_markdown: str,
    category_key: str,
    category_label: str,
    audience_role: ResourceAudienceRole,
    cover_image_url: str | None,
    external_url: str | None,
    is_pinned: bool,
    is_published: bool,
    published_at,
    original_language: str,
) -> Resource:
    resource = Resource(
        title=title,
        summary=summary,
        content_markdown=content_markdown,
        # original_content_markdown 与 content_markdown 同步（Admin 直接创作）
        original_content_markdown=content_markdown,
        category_key=category_key,
        category_label=category_label,
        audience_role=audience_role,
        cover_image_url=cover_image_url,
        external_url=external_url,
        is_pinned=is_pinned,
        is_published=is_published,
        published_at=published_at,
        original_language=original_language,
    )
    db.add(resource)
    db.flush()
    return resource


def update_resource(db: Session, resource: Resource, **fields) -> Resource:
    """部分更新资源。若 content_markdown 有变更，同步更新 original_content_markdown。"""
    if "content_markdown" in fields:
        resource.original_content_markdown = fields["content_markdown"]
    for key, value in fields.items():
        setattr(resource, key, value)
    db.flush()
    return resource


def delete_resource(db: Session, resource: Resource) -> None:
    db.delete(resource)
    db.flush()
