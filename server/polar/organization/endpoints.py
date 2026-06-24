from __future__ import annotations

import builtins
from typing import cast

from fastapi import Depends, Query, Request, Response, status
from sqlalchemy.orm import joinedload

from polar.account.schemas import Account as AccountSchema
from polar.account.service import account as account_service
from polar.auth.dependencies import WebUserOrAnonymous
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
from polar.creator_waitlist.schemas import (
    CreatorWaitlistCreate,
    CreatorWaitlistEntryResponse,
)
from polar.creator_waitlist.service import creator_waitlist_service
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
from .theme_schemas import (
    StorefrontLayoutUpdate,
    StorefrontModulesUpdate,
    StorefrontPreviewBody,
    StorefrontTokensPreviewResponse,
    StorefrontTokensUpdate,
    StorefrontTokensUpdateResponse,
)
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
    Each row carries `products_count`, `total_orders`, and `total_earned`
    computed via scalar subqueries (no denormalised counters, no
    migration). Three subqueries × ~12 rows ≈ 30ms total — cheap
    enough that the SSR-cached homepage doesn't notice.
    """
    from sqlalchemy import func, select

    from polar.models import Order, Organization, Product
    from polar.models.order import OrderStatus
    from polar.organization.visibility import public_organization_filters

    # Per-organization scalar subqueries. `correlate(Organization)` is
    # required because Organization is in the OUTER select; without
    # the explicit correlation SQLAlchemy emits a Cartesian join.
    products_count_subq = (
        select(func.count(Product.id))
        .where(
            Product.organization_id == Organization.id,
            Product.is_archived.is_(False),
            Product.deleted_at.is_(None),
        )
        .correlate(Organization)
        .scalar_subquery()
    )
    orders_count_subq = (
        select(func.count(Order.id))
        .where(
            Order.product_id.in_(
                select(Product.id).where(
                    Product.organization_id == Organization.id
                )
            ),
            Order.status == OrderStatus.paid,
        )
        .correlate(Organization)
        .scalar_subquery()
    )
    total_earned_subq = (
        select(
            func.coalesce(
                func.sum(
                    Order.subtotal_amount
                    - Order.discount_amount
                    + Order.tax_amount
                    - Order.platform_fee_amount
                    - Order.refunded_amount
                ),
                0,
            )
        )
        .where(
            Order.product_id.in_(
                select(Product.id).where(
                    Product.organization_id == Organization.id
                )
            ),
            Order.status == OrderStatus.paid,
        )
        .correlate(Organization)
        .scalar_subquery()
    )

    statement = select(
        Organization,
        products_count_subq.label("products_count"),
        orders_count_subq.label("total_orders"),
        total_earned_subq.label("total_earned"),
    ).where(*public_organization_filters())

    statement = statement.order_by(Organization.created_at.desc()).limit(limit)

    result = await session.execute(statement)
    rows = result.unique().all()

    items: list[OrganizationSchema] = []
    for row in rows:
        org = row[0]
        # Attach the computed values BEFORE Pydantic validation so
        # `from_attributes=True` picks them up. Setting attributes on
        # the SQLAlchemy instance is fine — they're not column
        # writes, just instance-level attribute attachments that
        # Pydantic reads via getattr().
        org.products_count = int(row.products_count or 0)
        org.total_orders = int(row.total_orders or 0)
        org.total_earned = int(row.total_earned or 0)
        items.append(OrganizationSchema.model_validate(org))

    return ListResource.from_paginated_results(
        items,
        len(items),
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

    # Per-creator paid-order aggregates. ONE batched query for every
    # org in the directory rather than N scalar subqueries — Postgres
    # GROUP BY is materially cheaper for the 100-row directory case.
    # Indexes on Order.product_id (FK) + Product.organization_id (FK)
    # make this O(rows in matching paid orders).
    from sqlalchemy import func, select as _select

    from polar.models import Order, Product
    from polar.models.order import OrderStatus

    earnings_by_org: dict = {}
    org_ids = [o.id for o in organizations]
    if org_ids:
        rows = await session.execute(
            _select(
                Product.organization_id.label("org_id"),
                func.count(Order.id).label("orders_count"),
                func.coalesce(
                    func.sum(
                        Order.subtotal_amount
                        - Order.discount_amount
                        + Order.tax_amount
                        - Order.platform_fee_amount
                        - Order.refunded_amount
                    ),
                    0,
                ).label("earned"),
            )
            .join(Product, Product.id == Order.product_id)
            .where(
                Product.organization_id.in_(org_ids),
                Order.status == OrderStatus.paid,
            )
            .group_by(Product.organization_id)
        )
        for row in rows:
            earnings_by_org[row.org_id] = (
                int(row.orders_count or 0),
                int(row.earned or 0),
            )

    # Build response with product counts + earnings stats
    result = []
    for org in organizations:
        # Count non-archived products
        product_count = len([p for p in org.products if not p.is_archived])
        total_orders, total_earned = earnings_by_org.get(org.id, (0, 0))

        result.append(
            CreatorSummarySchema(
                id=org.id,
                name=org.name,
                slug=org.slug,
                avatar_url=org.avatar_url,
                product_count=product_count,
                total_orders=total_orders,
                total_earned=total_earned,
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
    auth_subject: WebUserOrAnonymous,
    currency: str | None = Query(
        None,
        description=(
            "Only include products the creator priced in this currency "
            "(e.g. 'usd', 'kes'). Geo-based display: a visitor sees a "
            "creator's products only in their own currency — no conversion. "
            "Omit to include all products."
        ),
    ),
    preview_theme: str | None = Query(
        None,
        description=(
            "HMAC-signed token referencing a saved draft of theme tokens "
            "(plan §19.6.3). When present, the response renders with the "
            "draft tokens in place of the saved theme. Token must come "
            "from the same organization's PATCH /storefront/tokens/preview "
            "endpoint and be unexpired (30-min TTL). An invalid / "
            "expired token is silently ignored — the response falls "
            "back to the saved theme. Drafts are scoped to the user "
            "who created them, so one creator's draft never leaks into "
            "another creator's storefront preview."
        ),
    ),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> CreatorStorefrontSchema:
    """Get creator storefront data by slug.

    This endpoint does not require authentication and returns the creator's
    profile information along with their products.
    """
    organization = await organization_service.get_creator_storefront(session, slug)

    if organization is None:
        raise ResourceNotFound()

    # Resolve preview-theme draft (if any). The draft replaces only
    # `theme_tokens`, `theme_layout`, AND `theme_modules` can all be
    # spliced from the preview draft. Each axis is independent — a
    # draft that only carries tokens leaves layout / modules falling
    # back to the saved row. Per plan §19.6.3.
    preview_tokens: dict[str, Any] | None = None
    preview_layout: str | None = None
    preview_modules: list[dict[str, Any]] | None = None
    if preview_theme:
        from polar.organization.theme_preview import get_theme_draft, verify_token

        decoded = verify_token(preview_theme)
        # Reject tokens that aren't for this org. Lets us return the
        # saved theme instead of someone else's preview if a stale
        # token bleeds through (defense in depth — the dashboard is
        # the only place these tokens are minted, but the endpoint
        # is public so we double-check here).
        if decoded is not None and decoded["org_id"] == str(organization.id):
            draft = await get_theme_draft(token=preview_theme)
            if draft is not None:
                preview_tokens = draft.get("tokens")
                preview_layout = draft.get("layout")
                preview_modules = draft.get("modules")

    # Convert non-archived SQLAlchemy products → public Product schema dicts.
    # Lazy-import the schema to avoid a circular import (product.schemas
    # imports OrganizationID from organization.schemas).
    from polar.product.schemas import Product as ProductSchema
    from polar.review.repository import ReviewRepository

    def _has_currency(product: object) -> bool:
        """True if the product has an active price the visitor can pay in.

        Mirrors the marketplace + PDP USD-fallback policy: visitor sees
        the product if it was priced in either the visitor's currency
        OR in USD (universal fallback). KES-only products stay hidden
        from a /us or /za visitor — Paystack can't charge USD/ZAR for
        a KES-only product.
        """
        if currency is None:
            return True
        currency_lc = currency.lower()
        allowed_currencies = {currency_lc, "usd"}
        for price in getattr(product, "prices", None) or []:
            if (
                not getattr(price, "is_archived", False)
                and (getattr(price, "price_currency", "") or "").lower()
                in allowed_currencies
            ):
                return True
        return False

    visible_products = [
        p
        for p in organization.products
        if not p.is_archived and _has_currency(p)
    ]

    # Active-subaccount gate. If the creator's subaccount isn't 'active'
    # (suspended / pending / closed at Paystack) buyers can't be charged,
    # so we hide their products from the public storefront until payouts
    # are reactivated. The creator profile stays visible — just no
    # purchasable products.
    #
    # EXCEPTION: the owning creator (or any user in the org) sees their
    # own products even when subaccount is inactive — they need to be
    # able to test/preview their own work. Storefront 'public' view is
    # what buyers see; the creator's dashboard product list shows the
    # full catalogue with an activation banner regardless.
    if getattr(organization, "subaccount_status", None) != "active":
        viewer_owns_org = False
        if auth_subject and is_user(auth_subject):
            from sqlalchemy import select
            from polar.models.user_organization import UserOrganization

            user_id = auth_subject.subject.id
            owner_check = await session.execute(
                select(UserOrganization.user_id).where(
                    UserOrganization.user_id == user_id,
                    UserOrganization.organization_id == organization.id,
                    UserOrganization.is_deleted.is_(False),
                )
            )
            viewer_owns_org = owner_check.first() is not None

        if not viewer_owns_org:
            visible_products = []

    # Batch-fetch aggregate ratings for all visible products in ONE query so
    # the storefront cards can show "4.8 · 32 reviews" without an N+1.
    review_repo = ReviewRepository.from_session(session)
    rating_map = await review_repo.get_rating_summaries_for_products(
        [p.id for p in visible_products]
    )

    products = []
    for p in visible_products:
        product_dict = ProductSchema.model_validate(
            p, from_attributes=True
        ).model_dump(mode="json")
        summary = rating_map.get(p.id)
        product_dict["review_summary"] = (
            {
                "average_rating": summary["average_rating"],
                "total_reviews": summary["total_reviews"],
            }
            if summary
            else None
        )
        products.append(product_dict)

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
        # Polar's native socials list — full {platform, url} entries
        # (twitter, instagram, youtube, facebook, linkedin, github, x,
        # tiktok, website, other). Frontend creator page reads this
        # directly so it can render every platform's icon, not just
        # the 3 that social_links typed.
        socials=[
            {"platform": s.get("platform", "other"), "url": s.get("url", "")}
            for s in (organization.socials or [])
            if s.get("url")
        ]
        if organization.socials
        else None,
        tipping_enabled=organization.tipping_enabled,
        # Storefront theme — plan §19. Frontend renders ThemeProvider
        # and dynamic-imports the right layout from these three values.
        theme_layout=preview_layout
        if preview_layout is not None
        else organization.theme_layout,
        theme_tokens=preview_tokens
        if preview_tokens is not None
        else (organization.theme_tokens or {}),
        theme_modules=preview_modules
        if preview_modules is not None
        else (organization.theme_modules or []),
        theme_version_hash=organization.theme_version_hash,
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


def _detect_request_country(request: Request) -> str | None:
    """Resolve the visitor's country from edge/proxy headers.

    Precedence mirrors the frontend geo middleware:
      1. cf-ipcountry      — Cloudflare (Blyss is behind CF in prod)
      2. x-vercel-ip-country
      3. x-blyss-country   — set by our Next.js middleware/proxy

    Returns a lowercase ISO alpha-2 code or None. The value is never
    taken from the request body — only from trusted edge headers — so
    a creator can't spoof their country by editing the create payload.
    """
    for header in ("cf-ipcountry", "x-vercel-ip-country", "x-blyss-country"):
        value = request.headers.get(header)
        if value and value.strip():
            code = value.strip().lower()
            # Cloudflare emits 'xx' / 't1' for unknown / Tor — treat as missing.
            if code not in {"xx", "t1"} and len(code) == 2:
                return code
    return None


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
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> Organization:
    """Create an organization."""
    creator_country = _detect_request_country(request)
    return await organization_service.create(
        session,
        organization_create,
        auth_subject,
        creator_country=creator_country,
    )


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


@router.patch(
    "/{id}/storefront/tokens",
    response_model=StorefrontTokensUpdateResponse,
    summary="Update Storefront Theme Tokens",
    responses={
        200: {"description": "Theme tokens updated."},
        403: {
            "description": "Caller is not a member of this organization.",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
        422: {"description": "Invalid token shape."},
    },
    tags=[APITag.private],
)
async def update_storefront_tokens(
    id: OrganizationID,
    tokens: StorefrontTokensUpdate,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> StorefrontTokensUpdateResponse:
    """Update the creator's storefront theme tokens.

    Per plan §19.6 + §19.8.2. The Pydantic model rejects unknown keys
    (extra='forbid') and any value outside the curated palette / font /
    display-style / motion enums returns 422 with the field path.

    On save, the SQLAlchemy `before_update` hook recomputes
    `theme_version_hash`, which acts as the SSR cache key for
    /creators/{slug} — so the next visitor gets a fresh render
    automatically. No explicit cache invalidation needed.

    The response is a minimal echo of the saved fields. The dashboard
    triggers a full reload after save so the SSR fetch of the org row
    picks the new tokens up — we don't need to return the whole
    storefront payload here. Returning the full payload is also
    actively HARMFUL: the org is loaded for write on this path
    without the eager-product-relationship that the public GET uses,
    and `Organization.products` is `lazy='raise'`.
    """
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    # Persist as a plain dict so the JSONB column round-trips cleanly
    # and the version-hash hook sees the new tokens before computing.
    organization.theme_tokens = tokens.model_dump(mode="json", exclude_none=False)
    session.add(organization)
    await session.flush()
    await session.refresh(organization)

    return StorefrontTokensUpdateResponse(
        theme_layout=organization.theme_layout,
        theme_tokens=organization.theme_tokens or {},
        theme_modules=organization.theme_modules or [],
        theme_version_hash=organization.theme_version_hash or "",
    )


@router.patch(
    "/{id}/storefront/layout",
    response_model=StorefrontTokensUpdateResponse,
    summary="Update Storefront Layout",
    responses={
        200: {"description": "Layout updated."},
        403: {
            "description": "Caller is not a member of this organization.",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
        422: {"description": "Layout outside the curated set."},
    },
    tags=[APITag.private],
)
async def update_storefront_layout(
    id: OrganizationID,
    body: StorefrontLayoutUpdate,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> StorefrontTokensUpdateResponse:
    """Switch the creator's storefront layout (§19.4).

    Layouts outside the closed enum return 422. The version hash hook
    bumps automatically so SSR caches invalidate on the next visitor.
    """
    organization = await organization_service.get(session, auth_subject, id)
    if organization is None:
        raise ResourceNotFound()

    organization.theme_layout = body.layout
    session.add(organization)
    await session.flush()
    await session.refresh(organization)

    return StorefrontTokensUpdateResponse(
        theme_layout=organization.theme_layout,
        theme_tokens=organization.theme_tokens or {},
        theme_modules=organization.theme_modules or [],
        theme_version_hash=organization.theme_version_hash or "",
    )


@router.patch(
    "/{id}/storefront/modules",
    response_model=StorefrontTokensUpdateResponse,
    summary="Update Storefront Modules",
    responses={
        200: {"description": "Module list updated."},
        403: {
            "description": "Caller is not a member of this organization.",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
        422: {"description": "Module outside the curated kinds."},
    },
    tags=[APITag.private],
)
async def update_storefront_modules(
    id: OrganizationID,
    body: StorefrontModulesUpdate,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> StorefrontTokensUpdateResponse:
    """Replace the creator's enabled modules list (§19.5).

    Sends the full list every time — no patch semantics. Empty list
    means no modules. Each EnabledModule.kind must be in the curated
    enum; unknown kinds return 422.
    """
    organization = await organization_service.get(session, auth_subject, id)
    if organization is None:
        raise ResourceNotFound()

    organization.theme_modules = [
        m.model_dump(mode="json", exclude_none=False) for m in body.modules
    ]
    session.add(organization)
    await session.flush()
    await session.refresh(organization)

    return StorefrontTokensUpdateResponse(
        theme_layout=organization.theme_layout,
        theme_tokens=organization.theme_tokens or {},
        theme_modules=organization.theme_modules or [],
        theme_version_hash=organization.theme_version_hash or "",
    )


@router.post(
    "/{id}/storefront/tokens/preview",
    response_model=StorefrontTokensPreviewResponse,
    summary="Save Theme Tokens Draft for Preview",
    responses={
        200: {"description": "Draft saved; use the returned token to preview."},
        403: {
            "description": "Caller is not a member of this organization.",
            "model": NotPermitted.schema(),
        },
        404: OrganizationNotFound,
        422: {"description": "Invalid token shape."},
    },
    tags=[APITag.private],
)
async def save_storefront_tokens_preview(
    id: OrganizationID,
    body: StorefrontPreviewBody,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> StorefrontTokensPreviewResponse:
    """Save a draft of theme tokens / layout / modules to Redis and
    return a signed token referencing it.

    The body is a wide envelope — each axis is optional. The
    dashboard sends whichever axes have unsaved changes; the public
    GET splice falls back to the saved row's value for missing axes.

    The dashboard's preview iframe loads `/creators/{slug}?preview_theme=<token>`
    which the storefront route validates and uses to render with the
    unsaved values. Drafts expire in 30 minutes and are scoped to one
    `(organization, user)` pair — the user's own token can't preview
    someone else's storefront.

    Per plan §19.6.3 + §19.7.3.
    """
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    if not is_user(auth_subject):
        raise Unauthorized()
    user_id = auth_subject.subject.id

    from .theme_preview import (
        STOREFRONT_THEME_DRAFT_TTL_SECONDS,
        save_theme_draft,
    )

    token = await save_theme_draft(
        organization_id=organization.id,
        user_id=user_id,
        tokens=body.tokens.model_dump(mode="json", exclude_none=False)
        if body.tokens is not None
        else None,
        layout=body.layout,
        modules=[m.model_dump(mode="json", exclude_none=False) for m in body.modules]
        if body.modules is not None
        else None,
    )
    return StorefrontTokensPreviewResponse(
        preview_token=token,
        expires_in=STOREFRONT_THEME_DRAFT_TTL_SECONDS,
    )


@router.delete(
    "/{id}/storefront/tokens/preview",
    status_code=204,
    response_class=Response,
    summary="Discard Storefront Theme Draft",
    responses={
        204: {"description": "Draft discarded."},
        404: OrganizationNotFound,
    },
    tags=[APITag.private],
)
async def discard_storefront_tokens_preview(
    id: OrganizationID,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    """Discard the in-flight draft for the current (org, user) pair.

    No-op if no draft exists. Lets the dashboard's "Discard" button
    clean up Redis without waiting for the 30-min TTL.
    """
    organization = await organization_service.get(session, auth_subject, id)

    if organization is None:
        raise ResourceNotFound()

    if not is_user(auth_subject):
        raise Unauthorized()
    user_id = auth_subject.subject.id

    from .theme_preview import discard_theme_draft

    await discard_theme_draft(organization_id=organization.id, user_id=user_id)
    return Response(status_code=204)


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
    # Handle authentication based on account_verification_only flag.
    #
    # account_verification_only is the buyer-side checkout probe: the
    # checkout form calls it to see whether the creator can accept
    # payments. It carries only public readiness info (no financials),
    # so it must work for ANYONE — anonymous visitors AND logged-in
    # buyers who are not members of this creator's org. Previously a
    # logged-in non-member fell into the scoped `else` branch, where
    # organization_service.get() returns None (members only) → 404.
    # Always use the public path for this flag.
    if account_verification_only:
        organization = await organization_service.get_anonymous(
            session,
            id,
            options=(joinedload(Organization.account).joinedload(Account.admin),),
        )
    elif is_anonymous(auth_subject):
        raise Unauthorized()
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
        denial_kind=review.denial_kind,
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
    "/{id}/waitlist",
    response_model=CreatorWaitlistEntryResponse,
    summary="Join Creator Waitlist",
    responses={
        200: {"description": "Added to the creator waitlist."},
        404: OrganizationNotFound,
    },
    tags=[APITag.private],
)
async def join_creator_waitlist(
    id: OrganizationID,
    waitlist_request: CreatorWaitlistCreate,
    auth_subject: auth.OrganizationsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> CreatorWaitlistEntryResponse:
    """Join the creator waitlist after a country-based review denial.

    The country is taken from the organization's stored creator_country
    (detected at signup) — never from the request — so demand figures
    stay trustworthy. Idempotent per (email, country).
    """
    organization = await organization_service.get(session, auth_subject, id)
    if organization is None:
        raise ResourceNotFound()

    user_id = auth_subject.subject.id if is_user(auth_subject) else None
    await creator_waitlist_service.join(
        session,
        email=waitlist_request.email,
        organization=organization,
        user_id=user_id,
    )
    await session.commit()
    return CreatorWaitlistEntryResponse(joined=True)


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
        denial_kind=review.denial_kind,
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
        creator_category=profile.creator_category,
    )

    return organization
