from __future__ import annotations

from sqlalchemy.orm import Session

from .parent import run as run_parent
from .resources import run as run_resources


def run(db: Session) -> dict[str, object]:
    state = run_parent(db)
    run_resources(db)
    return state

