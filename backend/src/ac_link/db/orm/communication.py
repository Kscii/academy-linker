from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ac_link.db.orm.base import Base, uq
from ac_link.db.orm.enums import TagScope
from ac_link.db.orm.mixins import IntPrimaryKeyMixin, TimestampMixin, UUIDMixin
from ac_link.db.orm.sqltypes import enum_column

if TYPE_CHECKING:
    from ac_link.db.orm.academic import Student
    from ac_link.db.orm.user import User


class DiscussionThread(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'discussion_threads'
    __table_args__ = (
        UniqueConstraint(
            'student_id',
            'parent_user_id',
            'teacher_user_id',
            name=uq('discussion_threads', 'student_id', 'parent_user_id', 'teacher_user_id'),
        ),
        Index('ix_discussion_threads_parent_lookup', 'parent_user_id', 'student_id'),
        Index('ix_discussion_threads_teacher_lookup', 'teacher_user_id', 'student_id'),
        Index('ix_discussion_threads_last_post_at', 'last_post_at'),
    )

    student_id: Mapped[int] = mapped_column(ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    parent_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    teacher_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    last_post_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped['Student'] = relationship(back_populates='discussion_threads')
    parent_user: Mapped['User'] = relationship(back_populates='parent_threads', foreign_keys=[parent_user_id])
    teacher_user: Mapped['User'] = relationship(back_populates='teacher_threads', foreign_keys=[teacher_user_id])
    posts: Mapped[list['Post']] = relationship(back_populates='thread', cascade='all, delete-orphan')
    participant_states: Mapped[list['ThreadUserState']] = relationship(back_populates='thread', cascade='all, delete-orphan')


class ThreadUserState(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'thread_user_states'
    __table_args__ = (
        UniqueConstraint('thread_id', 'user_id', name=uq('thread_user_states', 'thread_id', 'user_id')),
        Index('ix_thread_user_states_user_unread', 'user_id', 'unread_count_cache'),
    )

    thread_id: Mapped[int] = mapped_column(ForeignKey('discussion_threads.id', ondelete='CASCADE'), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    last_read_post_id: Mapped[int | None] = mapped_column(ForeignKey('posts.id', ondelete='SET NULL'), nullable=True)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unread_count_cache: Mapped[int] = mapped_column(nullable=False, default=0)

    thread: Mapped['DiscussionThread'] = relationship(back_populates='participant_states')
    user: Mapped['User'] = relationship(back_populates='discussion_states')
    last_read_post: Mapped['Post | None'] = relationship(foreign_keys=[last_read_post_id])


class Post(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'posts'
    __table_args__ = (
        Index('ix_posts_thread_id_created_at', 'thread_id', 'created_at'),
        Index('ix_posts_author_user_id', 'author_user_id'),
        Index('ix_posts_reply_to_post_id', 'reply_to_post_id'),
    )

    thread_id: Mapped[int] = mapped_column(ForeignKey('discussion_threads.id', ondelete='CASCADE'), nullable=False)
    author_user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    reply_to_post_id: Mapped[int | None] = mapped_column(ForeignKey('posts.id', ondelete='SET NULL'), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    thread: Mapped['DiscussionThread'] = relationship(back_populates='posts')
    author_user: Mapped['User'] = relationship(back_populates='posts')
    reply_to_post: Mapped['Post | None'] = relationship(remote_side='Post.id')
    post_tags: Mapped[list['PostTag']] = relationship(back_populates='post', cascade='all, delete-orphan')


class Tag(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'tags'
    __table_args__ = (
        UniqueConstraint('owner_teacher_user_id', 'name', 'scope', name=uq('tags', 'owner_teacher_user_id', 'name', 'scope')),
        Index('uq_system_tags_name', 'name', unique=True, postgresql_where=text("scope = 'system'")),
        Index('ix_tags_scope_owner_teacher_user_id', 'scope', 'owner_teacher_user_id'),
    )

    name: Mapped[str] = mapped_column(String(64), nullable=False)
    scope: Mapped[TagScope] = mapped_column(enum_column(TagScope, 'tag_scope'), nullable=False)
    owner_teacher_user_id: Mapped[int | None] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    is_selectable_by_parent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_selectable_by_teacher: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    affects_business_logic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    owner_user: Mapped['User | None'] = relationship(back_populates='owned_tags', foreign_keys=[owner_teacher_user_id])
    post_bindings: Mapped[list['PostTag']] = relationship(back_populates='tag', cascade='all, delete-orphan')


class PostTag(Base, IntPrimaryKeyMixin, UUIDMixin, TimestampMixin):
    __tablename__ = 'post_tags'
    __table_args__ = (
        UniqueConstraint('post_id', 'tag_id', name=uq('post_tags', 'post_id', 'tag_id')),
        Index('ix_post_tags_tag_id_post_id', 'tag_id', 'post_id'),
    )

    post_id: Mapped[int] = mapped_column(ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    tag_id: Mapped[int] = mapped_column(ForeignKey('tags.id', ondelete='CASCADE'), nullable=False)

    post: Mapped['Post'] = relationship(back_populates='post_tags', foreign_keys=[post_id])
    tag: Mapped['Tag'] = relationship(back_populates='post_bindings', foreign_keys=[tag_id])
