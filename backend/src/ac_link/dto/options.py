from __future__ import annotations

from pydantic import BaseModel, Field


class SelectOption(BaseModel):
    value: str
    label: str
    meta: dict[str, str | None] = Field(default_factory=dict)


# Alias for backward compatibility
OptionItem = SelectOption
