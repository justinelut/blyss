from uuid import UUID

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column

from polar.kit.db.models import RecordModel


class CreatorWaitlistEntry(RecordModel):
    """A creator who was denied during AI review because their country isn't
    enabled yet, and who left their email to be notified when it opens.

    Captured silently with the country detected at signup (cf-ipcountry).
    Backoffice aggregates these by country so we can see where creator
    demand is concentrated and decide which markets to enable next.

    This is NOT shown to buyers and never exposes an allow/deny list — it
    only exists on the post-denial dashboard surface.
    """

    __tablename__ = "creator_waitlist_entries"
    __table_args__ = (
        # One entry per (email, country) so resubmits are idempotent.
        UniqueConstraint(
            "email", "country_code", name="uq_creator_waitlist_email_country"
        ),
    )

    # Case-insensitive — buyers paste emails with mixed case.
    email: Mapped[str] = mapped_column(CITEXT, nullable=False, index=True)

    # ISO 3166-1 alpha-2, lowercased. Detected server-side at the time the
    # waitlist form is submitted (from the org's stored creator_country).
    country_code: Mapped[str | None] = mapped_column(
        String(2), nullable=True, index=True
    )

    # Which surface captured the entry (e.g. "dashboard_country_denial").
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Optional links for follow-up + dedupe across a user's orgs.
    organization_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
