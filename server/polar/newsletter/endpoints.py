from typing import Annotated
from uuid import UUID

from fastapi import Depends, Path

from polar.auth.dependencies import WebUserRead
from polar.exceptions import ResourceNotFound
from polar.kit.pagination import ListResource
from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .schemas import NewsletterSubscriptionCreate, NewsletterSubscriptionPublic
from .service import (
    NewsletterAlreadySubscribedError,
    NewsletterSubscriptionNotFoundError,
    newsletter_service,
)
from .tasks import send_subscription_confirmation

router = APIRouter(prefix="/newsletter", tags=["newsletter", APITag.public])


@router.post(
    "/subscribe",
    response_model=NewsletterSubscriptionPublic,
    status_code=201,
    summary="Subscribe to Newsletter",
    responses={
        201: {"description": "Newsletter subscription created."},
        409: {"description": "Email already subscribed."},
    },
)
async def subscribe_to_newsletter(
    subscription_create: NewsletterSubscriptionCreate,
    session: AsyncSession = Depends(get_db_session),
) -> NewsletterSubscriptionPublic:
    try:
        subscription = await newsletter_service.subscribe(
            session,
            subscription_create.email,
            subscription_create.organization_id,
        )

        send_subscription_confirmation.send(
            subscription.email,
            subscription.unsubscribe_token,
            subscription.organization_id,
        )

        return NewsletterSubscriptionPublic.model_validate(subscription)

    except NewsletterAlreadySubscribedError:
        raise


@router.post(
    "/unsubscribe/{token}",
    summary="Unsubscribe from Newsletter",
    responses={
        200: {"description": "Successfully unsubscribed."},
        404: {"description": "Subscription not found."},
    },
)
async def unsubscribe_from_newsletter(
    token: Annotated[str, Path(description="The unsubscribe token.")],
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    try:
        await newsletter_service.unsubscribe(session, token)
        return {"message": "Successfully unsubscribed from newsletter"}
    except NewsletterSubscriptionNotFoundError:
        raise ResourceNotFound()


@router.get(
    "/creator/{organization_id}/subscribers",
    response_model=ListResource[NewsletterSubscriptionPublic],
    summary="Get Newsletter Subscribers",
    responses={200: {"description": "List of newsletter subscribers."}},
)
async def get_creator_subscribers(
    organization_id: Annotated[UUID, Path(description="The organization ID.")],
    auth_subject: WebUserRead,
    session: AsyncSession = Depends(get_db_session),
) -> ListResource[NewsletterSubscriptionPublic]:
    subscribers = await newsletter_service.get_subscribers(session, organization_id)

    return ListResource(
        items=[NewsletterSubscriptionPublic.model_validate(sub) for sub in subscribers],
        pagination={"total_count": len(subscribers), "max_page": 1},
    )
