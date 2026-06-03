"""Import users from server/scripts/users.json.

Used to seed the production database with creators who signed up before the
current backend was live. The source is the legacy auth dump at
`server/scripts/users.json` (better-auth shape).

Behaviour:
- Idempotent — looks up by lower-cased email, updates existing rows, creates
  new rows otherwise.
- Promotes any user whose `role == "admin"` in the source to `is_admin=True`.
- Sets `email_verified=True` for any source row marked as verified.
- Copies the source's avatar URL into the User's `avatar_url`.
- Does NOT touch organizations — creators link orgs separately via the
  dashboard. This script ONLY handles the User row.

Usage (from server/ with .env loaded):

    uv run python scripts/import_users.py
    uv run python scripts/import_users.py path/to/other-users.json
"""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

from polar.kit.db.postgres import create_async_sessionmaker
from polar.models import User
from polar.postgres import create_async_engine


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        # better-auth dump uses naive "YYYY-MM-DD HH:MM:SS.mmm" — assume UTC.
        return datetime.fromisoformat(value).replace(tzinfo=UTC)
    except ValueError:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None


async def import_users(source_path: Path) -> tuple[int, int, int]:
    """Returns (created, updated, skipped)."""
    payload = json.loads(source_path.read_text())
    if not isinstance(payload, list):
        raise SystemExit(f"{source_path} does not contain a JSON array")

    engine = create_async_engine("script")
    Session = create_async_sessionmaker(engine)

    created = updated = skipped = 0

    async with Session() as session:
        for raw in payload:
            email = (raw.get("email") or "").strip().lower()
            if not email:
                skipped += 1
                continue

            is_admin_source = (raw.get("role") or "").lower() == "admin"
            email_verified = bool(raw.get("email_verified"))
            avatar_url = raw.get("image") or None
            created_at = _parse_dt(raw.get("created_at")) or datetime.now(UTC)

            existing = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()

            if existing is None:
                user = User(
                    id=uuid4(),
                    email=email,
                    email_verified=email_verified,
                    is_admin=is_admin_source,
                    avatar_url=avatar_url,
                    accepted_terms_of_service=True,
                    created_at=created_at,
                )
                session.add(user)
                created += 1
                print(f"  + created  {email} (admin={is_admin_source})")
            else:
                changed = False
                if email_verified and not existing.email_verified:
                    existing.email_verified = True
                    changed = True
                if is_admin_source and not existing.is_admin:
                    existing.is_admin = True
                    changed = True
                if avatar_url and not existing.avatar_url:
                    existing.avatar_url = avatar_url
                    changed = True
                if changed:
                    updated += 1
                    print(f"  ~ updated  {email}")
                else:
                    skipped += 1

        await session.commit()

    await engine.dispose()
    return created, updated, skipped


def main() -> None:
    source = Path(
        sys.argv[1] if len(sys.argv) > 1 else Path(__file__).with_name("users.json")
    )
    if not source.exists():
        raise SystemExit(f"Source not found: {source}")

    print(f"Importing users from {source}")
    created, updated, skipped = asyncio.run(import_users(source))
    print()
    print(f"Done. created={created} updated={updated} skipped={skipped}")


if __name__ == "__main__":
    main()
