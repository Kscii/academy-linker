from __future__ import annotations

import os
from collections.abc import Generator

from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from ac_link.db.orm.base import Base
from ac_link.db import orm  # ensure models are imported before create_all


load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    init_db()