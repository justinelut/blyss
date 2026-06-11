"""Google Analytics 4 public configuration endpoint.

Exposes the GA Measurement ID (G-XXXXXXXXXX) so the Next.js public site
can mount the gtag.js script via @next/third-parties/google. The ID is
public by definition — leaking it doesn't leak data — so we keep it
non-sensitive in the runtime_settings registry and serve it from an
unauthenticated endpoint cached at the edge.

Set / change the measurement ID via the backoffice runtime_settings UI
(category: other, key: GA_MEASUREMENT_ID). Empty value disables
analytics entirely (no script tag is emitted) — useful in staging.
"""

from fastapi import Depends
from pydantic import BaseModel, Field

from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter
from polar.runtime_settings.service import (
    runtime_settings as rs_service,
)

router = APIRouter(
    prefix="/integrations/google-analytics",
    tags=["integrations_google_analytics"],
    include_in_schema=False,
)


class GoogleAnalyticsPublicConfigResponse(BaseModel):
    """The GA Measurement ID, or empty string when unset.

    Empty string (rather than null / 404) keeps the frontend code path
    simple: render the analytics tag only when this is truthy.
    """

    measurement_id: str = Field(
        default="",
        description=(
            "GA4 measurement ID, format G-XXXXXXXXXX. Empty string "
            "when no ID is configured (analytics disabled)."
        ),
    )


@router.get(
    "/public-config",
    response_model=GoogleAnalyticsPublicConfigResponse,
)
async def google_analytics_public_config(
    session: AsyncSession = Depends(get_db_session),
) -> GoogleAnalyticsPublicConfigResponse:
    """Return the GA4 measurement ID for client-side gtag.js init.

    Public endpoint (no auth) — the measurement ID is a public token,
    intended to be shipped to every browser that loads the marketplace.
    Frontend (root layout server component) calls this once per request
    and renders the GoogleAnalytics tag inline when truthy.
    """
    measurement_id = ""
    try:
        override = await rs_service.get(session, "GA_MEASUREMENT_ID")
        if override:
            measurement_id = override.strip()
    except Exception:
        # runtime_settings is the source of truth; if it can't be read
        # we just don't mount analytics rather than 500ing the layout.
        pass

    return GoogleAnalyticsPublicConfigResponse(measurement_id=measurement_id)
