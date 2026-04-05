from __future__ import annotations

from enum import StrEnum


class UserRole(StrEnum):
    PARENT = 'parent'
    TEACHER = 'teacher'
    ADMIN = 'admin'


class TranslationStatus(StrEnum):
    NOT_REQUIRED = 'not_required'
    PENDING = 'pending'
    COMPLETED = 'completed'
    FAILED = 'failed'
    STALE = 'stale'


class ReportType(StrEnum):
    WEEKLY = 'weekly'
    MONTHLY = 'monthly'
    CUSTOM = 'custom'


class ReportSourceType(StrEnum):
    AI = 'ai'
    TEACHER = 'teacher'


class AnnouncementCategory(StrEnum):
    ANNOUNCEMENT = 'announcement'
    TASK = 'task'


class TagScope(StrEnum):
    SYSTEM = 'system'
    TEACHER_PRIVATE = 'teacher_private'


class Theme(StrEnum):
    SYSTEM = 'system'
    LIGHT = 'light'
    DARK = 'dark'


class TimeRange(StrEnum):
    ALL_TIME = 'all_time'
    DAYS_7 = '7d'
    DAYS_30 = '30d'
    DAYS_90 = '90d'


class SessionStatus(StrEnum):
    ACTIVE = 'active'
    REVOKED = 'revoked'
    EXPIRED = 'expired'



