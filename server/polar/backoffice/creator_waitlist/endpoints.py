from fastapi import APIRouter, Depends, Request
from tagflow import tag, text

from polar.creator_waitlist.repository import CreatorWaitlistRepository
from polar.kit.countries import country_name
from polar.postgres import AsyncSession, get_db_session

from ..layout import layout

router = APIRouter()


@router.get("/", name="creator_waitlist:list")
async def list_page(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    repo = CreatorWaitlistRepository.from_session(session)
    entries = await repo.list_recent(limit=500)
    counts = await repo.counts_by_country()
    total = await repo.total_count()

    with layout(
        request,
        [("Creator waitlist", str(request.url_for("creator_waitlist:list")))],
        "creator_waitlist:list",
    ):
        with tag.div(classes="flex flex-col gap-6"):
            with tag.h1(classes="text-4xl"):
                text("Creator waitlist")
            with tag.p(classes="text-base-content/70"):
                text(
                    "Creators denied during AI review because their country "
                    "isn't enabled yet, who left their email. Use the demand "
                    "breakdown to decide which markets to open next. Enable a "
                    "country in Runtime settings → Allowed Creator Countries."
                )

            # Demand by country — highest first.
            with tag.div(classes="card bg-base-200"):
                with tag.div(classes="card-body"):
                    with tag.h2(classes="card-title"):
                        text(f"Demand by country ({total} total)")
                    if not counts:
                        with tag.p(classes="text-base-content/60"):
                            text("No waitlist entries yet.")
                    else:
                        with tag.div(classes="flex flex-wrap gap-2"):
                            for code, count in counts:
                                label = (
                                    f"{country_name(code) or code} ({code})"
                                    if code
                                    else "Unknown"
                                )
                                with tag.div(classes="badge badge-lg gap-2"):
                                    text(f"{label}: {count}")

            # Full entry list.
            with tag.div(classes="overflow-x-auto"):
                with tag.table(classes="table table-sm"):
                    with tag.thead():
                        with tag.tr():
                            for h in ["When", "Email", "Country", "Source"]:
                                with tag.th():
                                    text(h)
                    with tag.tbody():
                        for entry in entries:
                            with tag.tr():
                                with tag.td(classes="text-xs whitespace-nowrap"):
                                    text(
                                        entry.created_at.strftime("%Y-%m-%d %H:%M")
                                    )
                                with tag.td(classes="font-medium"):
                                    text(entry.email)
                                with tag.td():
                                    if entry.country_code:
                                        name = (
                                            country_name(entry.country_code)
                                            or entry.country_code
                                        )
                                        text(f"{name} ({entry.country_code})")
                                    else:
                                        text("—")
                                with tag.td(classes="text-xs"):
                                    text(entry.source or "—")
