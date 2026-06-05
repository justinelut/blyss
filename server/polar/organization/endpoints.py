from __future__ import annotations

import builtins
from typing import cast

from fastapi import Depends, Query, Response, status
from sqlalchemy.orm import joinedload

from polar.account.schemas import Account as AccountSchema
from polar.account.service import account as account_service
from polar.auth.models import is_anonymous, is_user
from polar.auth.scope import Scope
from polar.config import settings
from polar.email.schemas import OrganizationInviteEmail, OrganizationInviteProps
from polar.email.sender import enqueue_email_template
from polar.exceptions import (
    NotPermitted,
    PolarRequestValidationError,
    ResourceNotFound,
    Unauthorized,
)
from polar.kit.pagination import ListResource, Pagination, PaginationParams, PaginationParamsQuery
from polar.models import Account, Organization
from polar.openapi import APITag
from polar.organization.repository import OrganizationReviewRepository
from polar.postgres import (
    AsyncReadSession,
    AsyncSession,
    get_db_read_session,
    get_db_session,
)
from polar.routing import APIRouter
from polar.user.service import user as user_service
from polar.user_organization.schemas import OrganizationMember, OrganizationMemberInvite
from polar.user_organization.service import (
    user_organization as user_organization_service,
)

from . import auth, sorting
from .schemas import (
    CreatorStorefrontSchema,
    CreatorSummarySchema,
    OrganizationAppealRequest,
    OrganizationAppealResponse,
    OrganizationCreate,
    OrganizationDeletionResponse,
    OrganizationID,
    OrganizationPaymentStatus,
    OrganizationPaymentStep,
    OrganizationReviewStatus,
    OrganizationUpdate,
    ProfileUpdateSchema,
)
from .schemas import Organization as OrganizationSchema
from .service import organization as organization_service

router = APIRouter(prefix="/organizations", tags=["organizations"])

OrganizationNotFound = {
    "description": "Organization not found.",
    "model": ResourceNotFound.schema(),
}


@router.get(
    "/public",
    summary="List Public Organizations",
    response_model=ListResource[OrganizationSchema],
    tags=[APITag.public],
)
async def list_public_organizations(
    is_featured: bool | None = Query(None, description="Filter featured organizations"),
    limit: int = Query(6, ge=1, le=100, description="Items per page"),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[OrganizationSchema]:
    """
    List public organizations without authentication.

    This endpoint is used for the marketplace homepage to display trending creators.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from polar.models import Organization

    statement = select(Organization).where(
        Organization.is_deleted.is_(False),
        Organization.blocked_at.is_(None),
    )

    # Skip is_featured filter for now since profile_settings might not be set
    # if is_featured is not None:
    #     statement = statement.where(
    #         Organization.profile_settings["is_featured"].astext == str(is_featured).lower()
    #     )

    statement = statement.order_by(Organization.created_at.desc())
    statement = statement.limit(limit)

    result = await session.execute(statement)
    organizations = result.scalars().unique().all()

    return ListResource.from_paginated_results(
        [OrganizationSchema.model_validate(org) for org in organizations],
        len(organizations),
        PaginationParams(limit=limit, page=1),
    )


@router.get(
    "/",
    summary="List Organizations",
    response_model=ListResource[OrganizationSchema],
    tags=[APITag.public],
)
async def list(
    auth_subject: auth.OrganizationsRead,
    pagination: PaginationParamsQuery,
    sorting: sorting.ListSorting,
    slug: str | None = Query(None, description="Filter by slug."),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[OrganizationSchema]:
    """List organizations."""
    results, count = await organization_service.list(
        session,
        auth_subject,
        slug=slug,
        pagination=pagination,
        sorting=sorting,
    )

    return ListResource.from_paginated_results(
        [OrganizationSchema.model_validate(result) for result in results],
        count,
        pagination,
    )


@router.get(
    "/creators",
    summary="List Creators",
    response_model=builtins.list[CreatorSummarySchema],
    tags=[APITag.public],
)
async def list_creators(
    search: str | None = Query(None, description="Search creators by name."),
    limit: int = Query(default=100, le=100, description="Maximum number of results."),
    offset: int = Query(default=0, ge=0, description="Number of results to skip."),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> builtins.list[CreatorSummarySchema]:
    """List all creators with products.

    This endpoint does not require authentication and returns all creators
    that have at least one product available.
    """
    organizations = await organization_service.get_creators_directory(
        session, search=search, limit=limit, offset=offset
    )

    # Build response with product counts
    result = []
    for org in organizations:
        # Count non-archived products
        product_count = len([p for p in org.products if not p.is_archived])

        result.append(
            CreatorSummarySchema(
                id=org.id,
                name=org.name,
                slug=org.slug,
                avatar_url=org.avatar_url,
                product_count=product_count,
            )
        )

    return result


@router.get(
    "/creators/{slug}",
    summary="Get Creator Storefront",
    response_model=CreatorStorefrontSchema,
    responses={404: OrganizationNotFound},
    tags=[APITag.public],
)
async def get_creator(
    slug: str,
    session: AsyncReadSession = Depends(get_db_read_session),
) -> CreatorStorefrontSchema:
    """Get creator storefront data by slug.

    This endpoint does not require authentication and returns the creator's
    profile information along with their products.
    """
    organization = await organization_service.get_creator_storefront(session, slug)

    if organization is None:
        raise ResourceNotFound()

    # Convert non-archived SQLAlchemy products → public Product schema dicts.
    # Lazy-import the schema to avoid a circular import (product.schemas
    # imports OrganizationID from organization.schemas).
    from polar.product.schemas import Product as ProductSchema

    products = [
        ProductSchema.model_validate(p, from_attributes=True).model_dump(
            mode="json"
        )
        for p in organization.products
        if not p.is_archived
    ]

    # Convert socials list to SocialLinks format
    social_links_dict = {}
    if organization.socials:
        for social in organization.socials:
            platform = social.get("platform", "").lower()
            url = social.get("url", "")
            if platform and url:
                # Map platform names to schema fields
                if platform in ["x", "twitter"]:
                    social_links_dict["twitter"] = url
                elif platform == "instagram":
                    social_links_dict["instagram"] = url
                elif platform in ["website", "other"]:
                    if "website" not in social_links_dict:
                        social_links_dict["website"] = url

    return CreatorStorefrontSchema(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
        avatar_url=organization.avatar_url,
        cover_image_url=(organization.profile_settings or {}).get("cover_image_url"),
        bio=organization.bio,
        email=organization.email,
        social_links=social_links_dict if social_links_dict else None,
        tipping_enabled=organization.tipping_enabled,
        products=products,
    )


@router.get(
    "/{id}",
    summary="Get Organization",
    response_model=OrganizationSchema,
    responses={404: OrganizationNotFound},
    tags=[APITag.public],
)
async def get(
    id: OrganizationID,
    auth_subject: auth.OrganizationsRead,
    session: AsyncReadSession = Depends(get_db_read_session),
) -> Organization:
    """Get an organization by ID."""
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    return organization


@router.post(
    "/",
    response_model=OrganizationSchema,
    status_code=201,
    summary="Create Organization",
    responses={201: {"description": "Organization created."}},
    tags=[APITag.public],
)
async def create(
    organization_create: OrganizationCreate,
    auth_subject: auth.OrganizationsCreate,
    session: AsyncSession = Depends(get_db_session),
) -> Organization:
    """Create an organization."""
    return await organization_service.create(session, organization_create, auth_subject)


@router.patch(
    "/{id}",
    response_model=OrganizationSchema,
    summary="Update Organization",
    responses={
        200: {"description": "Organization updated."},
        403: {
            "description": "You don't have the permission to update this organization.",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
    },
    tags=[APITag.public],
)
async def update(
    id: OrganizationID,
    organization_update: OrganizationUpdate,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> Organization:
    """Update an organization."""
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    return await organization_service.update(session, organization, organization_update)


@router.delete(
    "/{id}",
    response_model=OrganizationDeletionResponse,
    summary="Delete Organization",
    responses={
        200: {"description": "Organization deleted or deletion request submitted."},
        403: {
            "description": "You don't have the permission to delete this organization.",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
    },
    tags=[APITag.private],
)
async def delete(
    id: OrganizationID,
    auth_subject: auth.OrganizationsWriteUser,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationDeletionResponse:
    """Request deletion of an organization.

    If the organization has no orders or active subscriptions, it will be
    immediately soft-deleted. If it has an account, the Stripe account will
    be deleted first.

    If deletion cannot proceed immediately (has orders, subscriptions, or
    Stripe deletion fails), a support ticket will be created for manual handling.
    """
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    result = await organization_service.request_deletion(
        session, auth_subject, organization
    )

    return OrganizationDeletionResponse(
        deleted=result.can_delete_immediately,
        requires_support=not result.can_delete_immediately,
        blocked_reasons=result.blocked_reasons,
    )


@router.get(
    "/{id}/account",
    response_model=AccountSchema,
    summary="Get Organization Account",
    responses={
        403: {
            "description": "User is not the admin of the account.",
            "model": NotPermitted.schema(),
        },
        404: {
            "description": "Organization not found or account not set.",
            "model": ResourceNotFound.schema(),
        },
    },
    tags=[APITag.private],
)
async def get_account(
    id: OrganizationID,
    auth_subject: auth.OrganizationsRead,
    session: AsyncReadSession = Depends(get_db_read_session),
) -> Account:
    """Get the account for an organization."""
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    if organization.account_id is None:
        raise ResourceNotFound()

    if is_user(auth_subject):
        user = auth_subject.subject
        if not await account_service.is_user_admin(
            session, organization.account_id, user
        ):
            raise NotPermitted("You are not the admin of this account")

    account = await account_service.get(session, auth_subject, organization.account_id)
    if account is None:
        raise ResourceNotFound()

    return account


@router.get(
    "/{id}/payment-status",
    response_model=OrganizationPaymentStatus,
    tags=[APITag.private],
    summary="Get Organization Payment Status",
    responses={404: OrganizationNotFound},
)
async def get_payment_status(
    id: OrganizationID,
    auth_subject: auth.OrganizationsReadOrAnonymous,
    session: AsyncReadSession = Depends(get_db_read_session),
    account_verification_only: bool = Query(
        False,
        description="Only perform account verification checks, skip product and integration checks",
    ),
) -> OrganizationPaymentStatus:
    """Get payment status and onboarding steps for an organization."""
    # Handle authentication based on account_verification_only flag
    if is_anonymous(auth_subject) and not account_verification_only:
        raise Unauthorized()
    elif is_anonymous(auth_subject):
        organization = await organization_service.get_anonymous(
            session,
            id,
            options=(joinedload(Organization.account).joinedload(Account.admin),),
        )
    else:
        # For authenticated users, check proper scopes (need at least one of these)
        required_scopes = {
            Scope.web_read,
            Scope.web_write,
            Scope.organizations_read,
            Scope.organizations_write,
        }
        if not (auth_subject.scopes & required_scopes):
            raise ResourceNotFound()
        organization = await organization_service.get(
            session,
            cast(auth.OrganizationsRead, auth_subject),
            id,
            options=(joinedload(Organization.account).joinedload(Account.admin),),
        )

    if organization is None:
        raise ResourceNotFound()

    payment_status = await organization_service.get_payment_status(
        session, organization, account_verification_only=account_verification_only
    )

    return OrganizationPaymentStatus(
        payment_ready=payment_status.payment_ready,
        steps=[
            OrganizationPaymentStep(**step.model_dump())
            for step in payment_status.steps
        ],
        organization_status=payment_status.organization_status,
    )


@router.get(
    "/{id}/members",
    response_model=ListResource[OrganizationMember],
    tags=[APITag.private],
)
async def members(
    id: OrganizationID,
    auth_subject: auth.OrganizationsRead,
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[OrganizationMember]:
    """List members in an organization."""
    from polar.organization.repository import OrganizationRepository

    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    members = await user_organization_service.list_by_org(session, id)

    # Get admin user to set is_admin flag
    org_repo = OrganizationRepository.from_session(session)
    admin_user = await org_repo.get_admin_user(session, organization)
    admin_user_id = admin_user.id if admin_user else None

    # Build response with is_admin flag
    member_items = []
    for m in members:
        member_data = OrganizationMember.model_validate(m)
        if admin_user_id and m.user_id == admin_user_id:
            member_data.is_admin = True
        member_items.append(member_data)

    return ListResource(
        items=member_items,
        pagination=Pagination(total_count=len(members), max_page=1),
    )


@router.post(
    "/{id}/members/invite",
    response_model=OrganizationMember,
    tags=[APITag.private],
)
async def invite_member(
    id: OrganizationID,
    invite_body: OrganizationMemberInvite,
    auth_subject: auth.OrganizationsWrite,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationMember:
    """Invite a user to join an organization."""
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    # Get or create user by email
    user, _ = await user_service.get_by_email_or_create(session, invite_body.email)

    # Check if user is already member of organization
    user_org = await user_organization_service.get_by_user_and_org(
        session, user.id, organization.id
    )
    if user_org is not None:
        response.status_code = status.HTTP_200_OK
        return OrganizationMember.model_validate(user_org)

    # Add user to organization
    await organization_service.add_user(session, organization, user)

    # Get the inviter's email (from auth subject)
    inviter_email = auth_subject.subject.email

    # Send invitation email
    email = invite_body.email
    enqueue_email_template(
        OrganizationInviteEmail(
            props=OrganizationInviteProps(
                email=email,
                organization_name=organization.name,
                inviter_email=inviter_email or "",
                invite_url=settings.generate_frontend_url(
                    f"/dashboard/{organization.slug}"
                ),
            )
        ),
        to_email_addr=email,
        subject=f"You've been invited to {organization.name} on Polar",
    )

    # Get the user organization relationship to return
    user_org = await user_organization_service.get_by_user_and_org(
        session, user.id, organization.id
    )

    if user_org is None:
        raise ResourceNotFound()

    response.status_code = status.HTTP_201_CREATED
    return OrganizationMember.model_validate(user_org)


@router.delete(
    "/{id}/members/leave",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=[APITag.private],
    responses={
        204: {"description": "Successfully left the organization."},
        403: {
            "description": "Cannot leave organization (admin or only member).",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
    },
)
async def leave_organization(
    id: OrganizationID,
    auth_subject: auth.OrganizationsWriteUser,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Leave an organization.

    Users can only leave an organization if they are not the admin
    and there is at least one other member.
    """
    from polar.organization.repository import OrganizationRepository

    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    user = auth_subject.subject

    # Check if user is the admin
    org_repo = OrganizationRepository.from_session(session)
    admin_user = await org_repo.get_admin_user(session, organization)

    if admin_user and admin_user.id == user.id:
        raise NotPermitted("Organization admins cannot leave the organization.")

    # Check if user is the only member
    member_count = await user_organization_service.get_member_count(session, id)
    if member_count <= 1:
        raise NotPermitted("Cannot leave organization as the only member.")

    # Remove the user from the organization
    await user_organization_service.remove_member(session, user.id, organization.id)


@router.delete(
    "/{id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=[APITag.private],
    responses={
        204: {"description": "Member successfully removed."},
        403: {
            "description": "Not authorized to remove members.",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
    },
)
async def remove_member(
    id: OrganizationID,
    user_id: str,
    auth_subject: auth.OrganizationsWriteUser,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Remove a member from an organization.

    Only organization admins can remove members.
    Admins cannot remove themselves.
    """
    from uuid import UUID as UUID_TYPE

    from polar.organization.repository import OrganizationRepository
    from polar.user_organization.service import (
        CannotRemoveOrganizationAdmin,
        UserNotMemberOfOrganization,
    )

    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    # Check if current user is the admin
    org_repo = OrganizationRepository.from_session(session)
    admin_user = await org_repo.get_admin_user(session, organization)

    if not admin_user or admin_user.id != auth_subject.subject.id:
        raise NotPermitted("Only organization admins can remove members.")

    try:
        target_user_id = UUID_TYPE(user_id)
    except ValueError:
        raise ResourceNotFound()

    try:
        await user_organization_service.remove_member_safe(
            session, target_user_id, organization.id
        )
    except UserNotMemberOfOrganization:
        raise ResourceNotFound()
    except CannotRemoveOrganizationAdmin:
        raise NotPermitted("Cannot remove the organization admin.")


@router.post(
    "/{id}/ai-validation",
    response_model=OrganizationReviewStatus,
    summary="Get AI Validation Status",
    responses={
        200: {"description": "AI validation status returned."},
        404: OrganizationNotFound,
    },
    tags=[APITag.private],
)
async def validate_with_ai(
    id: OrganizationID,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationReviewStatus:
    """Get the AI validation status. Review runs asynchronously in the background."""
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    review = await organization_service.get_ai_review(session, organization)

    if review is None:
        # Review is pending (background task not yet complete)
        return OrganizationReviewStatus()

    return OrganizationReviewStatus(
        verdict=review.verdict,  # type: ignore[arg-type]
        reason=review.reason,
        appeal_submitted_at=review.appeal_submitted_at,
        appeal_reason=review.appeal_reason,
        appeal_decision=review.appeal_decision,
        appeal_reviewed_at=review.appeal_reviewed_at,
    )


@router.post(
    "/{id}/appeal",
    response_model=OrganizationAppealResponse,
    summary="Submit Appeal for Organization Review",
    responses={
        200: {"description": "Appeal submitted successfully."},
        404: OrganizationNotFound,
        400: {"description": "Invalid appeal request."},
    },
    tags=[APITag.private],
)
async def submit_appeal(
    id: OrganizationID,
    appeal_request: OrganizationAppealRequest,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationAppealResponse:
    """Submit an appeal for organization review after AI validation failure."""
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    try:
        result = await organization_service.submit_appeal(
            session, organization, appeal_request.reason
        )

        return OrganizationAppealResponse(
            success=True,
            message="Appeal submitted successfully. Our team will review your case.",
            appeal_submitted_at=result.appeal_submitted_at,  # type: ignore[arg-type]
        )
    except ValueError as e:
        raise PolarRequestValidationError(
            [
                {
                    "type": "value_error",
                    "loc": ("body", "reason"),
                    "msg": e.args[0],
                    "input": appeal_request.reason,
                }
            ]
        )


@router.post(
    "/{id}/ai-onboarding-complete",
    response_model=OrganizationSchema,
    summary="Mark AI Onboarding Complete",
    responses={
        200: {"description": "AI onboarding marked as complete."},
        404: OrganizationNotFound,
    },
    tags=[APITag.private],
)
async def mark_ai_onboarding_complete(
    id: OrganizationID,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> Organization:
    """Mark the AI onboarding as completed for this organization."""
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    return await organization_service.mark_ai_onboarding_complete(session, organization)


@router.get(
    "/{id}/review-status",
    response_model=OrganizationReviewStatus,
    summary="Get Organization Review Status",
    responses={
        200: {"description": "Organization review status retrieved."},
        404: OrganizationNotFound,
    },
    tags=[APITag.private],
)
async def get_review_status(
    id: OrganizationID,
    auth_subject: auth.OrganizationsRead,
    session: AsyncReadSession = Depends(get_db_read_session),
) -> OrganizationReviewStatus:
    """Get the current review status and appeal information for an organization."""
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    review_repository = OrganizationReviewRepository.from_session(session)
    review = await review_repository.get_by_organization(organization.id)

    if review is None:
        return OrganizationReviewStatus()

    return OrganizationReviewStatus(
        verdict=review.verdict,  # type: ignore[arg-type]
        reason=review.reason,
        appeal_submitted_at=review.appeal_submitted_at,
        appeal_reason=review.appeal_reason,
        appeal_decision=review.appeal_decision,
        appeal_reviewed_at=review.appeal_reviewed_at,
    )


# Public Creator Endpoints


@router.patch(
    "/{id}/profile",
    response_model=OrganizationSchema,
    summary="Update Organization Profile",
    responses={
        200: {"description": "Profile updated successfully."},
        403: {
            "description": "You don't have permission to update this organization.",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
    },
    tags=[APITag.private],
)
async def update_organization_profile(
    id: OrganizationID,
    profile: ProfileUpdateSchema,
    auth_subject: auth.OrganizationsWriteUser,
    session: AsyncSession = Depends(get_db_session),
) -> Organization:
    """Update organization profile (bio and social links).

    This endpoint allows authenticated users to update their organization's
    public profile information including bio and social media links.
    """
    organization = await organization_service.update_creator_profile(
        session,
        auth_subject,
        id,
        bio=profile.bio,
        social_links=profile.social_links.model_dump(exclude_none=True)
        if profile.social_links
        else None,
    )

    return organization
