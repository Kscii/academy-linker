from __future__ import annotations

from pydantic import BaseModel


class OptionItem(BaseModel):
    value: str
    label: str
    meta: dict[str, object] | None = None
