from sqlalchemy import Boolean, Integer, String
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column

from polar.kit.db.models import RecordModel


class CreatorCategory(RecordModel):
    """A creator category surfaced as a filter on the /creators directory and
    selectable by creators in onboarding + settings.

    Backoffice-managed: admins can add / rename / reorder / deactivate
    categories without a deploy. The initial set (Designers, Writers,
    Musicians, Educators, Photographers, Developers) is seeded by migration.
    The "All" tab on the directory is a UI-only filter and is NOT stored here.
    """

    __tablename__ = "creator_categories"

    # URL-safe stable identifier, e.g. "designers". Case-insensitive unique.
    slug: Mapped[str] = mapped_column(CITEXT, nullable=False, unique=True)
    # Human-readable label shown in the UI, e.g. "Designers".
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Ascending sort order for the filter strip.
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    # Soft toggle so a category can be hidden without deleting creator links.
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
