from __future__ import annotations

from enum import Enum

from sqlalchemy import Enum as SAEnum


def enum_column(enum_cls: type[Enum], name: str) -> SAEnum:
    return SAEnum(enum_cls, name=name, native_enum=False, validate_strings=True)
