from __future__ import annotations

import argparse
from collections.abc import Callable

from sqlalchemy.orm import Session

from ac_link.db.db import SessionLocal, init_db

from . import admin, base, full_demo, parent, resources, teacher
from .helpers import reset_demo_data
from .models import ADMIN_USER, DEFAULT_PASSWORD, PARENT_USERS, TEACHER_USERS


ScenarioFn = Callable[[Session], dict[str, object]]

SCENARIOS: dict[str, ScenarioFn] = {
    "base": base.run,
    "admin": admin.run,
    "teacher": teacher.run,
    "parent": parent.run,
    "resources": resources.run,
    "full-demo": full_demo.run,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed local development/demo data into the database.")
    parser.add_argument("--scenario", choices=sorted(SCENARIOS.keys()), default="full-demo", help="Seed scenario to execute.")
    parser.add_argument("--reset", action="store_true", help="Delete existing demo data before seeding.")
    parser.add_argument("--verbose", action="store_true", help="Print detailed progress messages.")
    parser.add_argument("--with-auth-tokens", action="store_true", help="Print demo accounts and the shared password after seeding.")
    return parser.parse_args()


def print_accounts() -> None:
    print("\nDemo accounts")
    print(f"  password: {DEFAULT_PASSWORD}")
    print(f"  admin:   {ADMIN_USER.email}")
    for spec in TEACHER_USERS:
        print(f"  teacher: {spec.email}")
    for spec in PARENT_USERS:
        print(f"  parent:  {spec.email}")


def main() -> None:
    args = parse_args()
    init_db()

    db = SessionLocal()
    try:
        if args.reset:
            if args.verbose:
                print("Resetting existing demo data...")
            reset_demo_data(db)
            db.commit()

        if args.verbose:
            print(f"Running seed scenario: {args.scenario}")
        SCENARIOS[args.scenario](db)
        db.commit()
        print(f"Seed completed: {args.scenario}")
        if args.with_auth_tokens:
            print_accounts()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

