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


class ResourceAudienceRole(StrEnum):
    PARENT = 'parent'
    TEACHER = 'teacher'
    ALL = 'all'


class TranslationResourceType(StrEnum):
    REPORT = 'report'
    ANNOUNCEMENT = 'announcement'
    POST = 'post'
    RESOURCE = 'resource'


class TtsResourceType(StrEnum):
    REPORT = 'report'
    ANNOUNCEMENT = 'announcement'
    POST = 'post'
    RESOURCE = 'resource'
    AD_HOC = 'ad_hoc'


class TtsProvider(StrEnum):
    AZURE = 'azure'
    GOOGLE = 'gcp'
    GEMINI = 'gemini'


class AiConversationContextType(StrEnum):
    GLOBAL = 'global'
    STUDENT = 'student'
    SUBJECT = 'subject'


class AiMessageRole(StrEnum):
    USER = 'user'
    ASSISTANT = 'assistant'
    SYSTEM = 'system'


class LeaveRequestType(StrEnum):
    SICK = 'sick'
    PERSONAL = 'personal'
    FAMILY = 'family'
    OTHER = 'other'


class LeaveRequestStatus(StrEnum):
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'


class IncidentType(StrEnum):
    BULLYING = 'bullying'
    DRUGS = 'drugs'
    MISCONDUCT = 'misconduct'
    OTHER = 'other'


class IncidentStatus(StrEnum):
    SUBMITTED = 'submitted'
    INVESTIGATING = 'investigating'
    RESOLVED = 'resolved'


class LearningPathwayItemStatus(StrEnum):
    COMPLETED = 'completed'
    IN_PROGRESS = 'in_progress'
    UPCOMING = 'upcoming'
