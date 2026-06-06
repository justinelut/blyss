"""Public Loops newsletter signup.

Tiny anonymous endpoint that accepts an email address and registers the
visitor as a Loops contact tagged for marketing. Used by the marketplace
footer's NewsletterSignup. No auth required.
"""

from __future__ import annotations

import re
import uuid

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field

from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter as PolarAPIRouter

from .client import (
    LoopsClientLogicalError,
    LoopsClientOperationalError,
    client as loops_client,
)


log = structlog.get_logger()

router: APIRouter = PolarAPIRouter(
    prefix="/integrations/loops",
    tags=["loops", APITag.public],
)


class NewsletterSignupRequest(BaseModel):
    email: EmailStr = Field(..., description="The visitor's email address.")
    first_name: str | None = Field(
        default=None,
        max_length=80,
        description="Optional first name shown in marketing emails.",
    )


class NewsletterSignupResponse(BaseModel):
    ok: bool = True


@router.post(
    "/newsletter",
    response_model=NewsletterSignupResponse,
    summary="Subscribe to the Blyss newsletter",
    description=(
        "Adds the visitor's email to Loops as a marketing-subscribed "
        "contact. Idempotent: re-submitting the same email upserts the "
        "existing contact rather than erroring."
    ),
)
async def newsletter_signup(
    body: NewsletterSignupRequest,
    session: AsyncSession = Depends(get_db_session),
) -> NewsletterSignupResponse:
    # Loops requires a userId. For anonymous newsletter sign-ups we don't
    # have a Blyss user; mint a deterministic UUID5 from the email so
    # repeated submissions update the same contact instead of creating
    # duplicates.
    NEWSLETTER_NS = uuid.UUID("3c9b0fe2-4a1b-5c2d-9e3f-1a2b3c4d5e6f")
    contact_id = str(uuid.uuid5(NEWSLETTER_NS, body.email.lower()))

    properties: dict = {
        "userId": contact_id,
        "userGroup": "newsletter",
        "subscribed": True,
        "source": "marketplace_footer",
    }
    if body.first_name:
        properties["firstName"] = body.first_name

    try:
        await loops_client.update_contact(
            body.email, contact_id, session=session, **properties
        )
    except LoopsClientLogicalError as e:
        # Loops 409 / 422 / etc. — surface a friendly response but log the
        # specifics so ops can see what's happening.
        log.warning(
            "loops.newsletter.logical_error",
            status=e.status_code,
            body=str(e.body)[:300],
        )
        # Don't bubble the 4xx; the visitor entered a valid email and we
        # silently absorb provider-side issues to avoid leaking them.
        return NewsletterSignupResponse(ok=True)
    except LoopsClientOperationalError as e:
        log.error("loops.newsletter.operational_error", error=str(e)[:300])
        return NewsletterSignupResponse(ok=True)
    except Exception as e:
        log.error(
            "loops.newsletter.unexpected_error",
            type=type(e).__name__,
            error=str(e)[:300],
        )
        return NewsletterSignupResponse(ok=True)

    return NewsletterSignupResponse(ok=True)
