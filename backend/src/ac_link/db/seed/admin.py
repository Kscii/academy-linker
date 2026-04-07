from __future__ import annotations

from sqlalchemy.orm import Session

from .base import run as run_base


def run(db: Session) -> dict[str, object]:
    state = run_base(db)
    return {
        "users": state["users"],
        "subjects": state["subjects"],
        "classes": state["classes"],
        "students": state["students"],
        "tags": state["tags"],
    }

