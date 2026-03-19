from fastapi import Depends, Query

from polar.auth.dependencies import WebUserRead
from polar.auth.models import AuthSubject, User
from polar.exceptions import ResourceNotFound
from polar.openapi import APITag
from polar.organization.schemas import OrganizationID
from polar.postgres import AsyncReadSession, get_db_read_session
from polar.routing import APIRouter

from .schemas import AnalyticsDashboard, ProductCartCount, ProductViewCount
from .service import analytics_service

router = APIRouter(
    prefix="/analytics",
    tags=["analytics", APITag.public],
)


@router.get(
    "/organization/{organization_id}",
    summary="Get Analytics Dashboard",
    response_model=AnalyticsDashboard,
)
async def get_analytics_dashboard(
    organization_id: OrganizationID,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    auth_subject: AuthSubject[User] = Depends(WebUserRead),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> AnalyticsDashboard:
    """
    Get analytics dashboard for a creator organization.
    Requires authentication.
    """
    from polar.organization.service import organization as organization_service

    # Verify user has access to this organization
    organization = await organization_service.get(session, organization_id)
    if organization is None:
        raise ResourceNotFound()

    # Check if user is a member of the organization
    from polar.member.service import member as member_service

    member = await member_service.get_by_user_and_organization(
        session, auth_subject.subject.id, organization_id
    )
    if member is None:
        raise ResourceNotFound()

    # Fetch all analytics data
    product_views = await analytics_service.get_product_view_counts(
        session, organization_id, days
    )
    add_to_cart_clicks = await analytics_service.get_add_to_cart_counts(
        session, organization_id, days
    )
    donations = await analytics_service.get_total_donations(
        session, organization_id, days
    )
    newsletter_growth = await analytics_service.get_newsletter_subscriber_growth(
        session, organization_id, days
    )
    rating_trends = await analytics_service.get_average_rating_trends(
        session, organization_id, days
    )

    return AnalyticsDashboard(
        product_views=[ProductViewCount(**pv) for pv in product_views],
        add_to_cart_clicks=[ProductCartCount(**ac) for ac in add_to_cart_clicks],
        donations=donations,
        newsletter_growth=newsletter_growth,
        rating_trends=rating_trends,
    )
