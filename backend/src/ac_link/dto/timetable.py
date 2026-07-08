from __future__ import annotations

from datetime import date, time
from uuid import UUID

from pydantic import BaseModel, field_validator


_VALID_WEEKDAYS = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}


class TimetableClassInfo(BaseModel):
    uuid: UUID
    name: str
    grade_level: str | None = None
    academic_year: str | None = None


class TimetableTeacherInfo(BaseModel):
    uuid: UUID
    display_name: str


class TimetableSubjectInfo(BaseModel):
    uuid: UUID
    name: str
    code: str | None = None


class TimetableEntryItem(BaseModel):
    uuid: UUID
    weekday: str
    period_index: int
    room_label: str | None = None
    start_time: time
    end_time: time
    effective_from: date
    effective_to: date | None = None
    is_active: bool
    subject: TimetableSubjectInfo
    teacher: TimetableTeacherInfo
    is_assigned_to_current_teacher: bool | None = None


class ClassTimetableData(BaseModel):
    class_info: TimetableClassInfo
    selected_date: date
    effective_from: date | None = None
    effective_to: date | None = None
    entries: list[TimetableEntryItem]
    available_subjects: list[TimetableSubjectInfo] = []
    available_teachers: list[TimetableTeacherInfo] = []


class TimetableEntryWrite(BaseModel):
    weekday: str
    period_index: int
    subject_uuid: UUID
    teacher_uuid: UUID
    room_label: str | None = None
    start_time: str
    end_time: str

    @field_validator('weekday')
    @classmethod
    def weekday_valid(cls, value: str) -> str:
        lowered = value.strip().lower()
        if lowered not in _VALID_WEEKDAYS:
            raise ValueError('weekday 非法')
        return lowered

    @field_validator('period_index')
    @classmethod
    def period_positive(cls, value: int) -> int:
        if value < 1:
            raise ValueError('period_index 必须 >= 1')
        return value


class ReplaceClassTimetableRequest(BaseModel):
    effective_from: str
    effective_to: str | None = None
    entries: list[TimetableEntryWrite]

    @field_validator('entries')
    @classmethod
    def entries_not_empty(cls, value: list[TimetableEntryWrite]) -> list[TimetableEntryWrite]:
        if not value:
            raise ValueError('entries 不能为空')
        seen: set[tuple[str, int]] = set()
        for item in value:
            key = (item.weekday, item.period_index)
            if key in seen:
                raise ValueError(f'重复课表槽位：{item.weekday} #{item.period_index}')
            seen.add(key)
        return value
