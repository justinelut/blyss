import builtins
from typing import Annotated, Literal

from fastapi import Depends, Query, Request
from pydantic import UUID4

from polar.auth.dependencies import WebUserOrAnonymous
from polar.auth.models import Anonymous, AuthSubject, User
from polar.benefit.schemas import BenefitID
from polar.exceptions import NotPermitted, PolarRequestValidationError, ResourceNotFound
from polar.kit.metadata import MetadataQuery, get_metadata_query_openapi_schema
from polar.kit.pagination import (
    ListResource,
    Pagination,
    PaginationParams,
    PaginationParamsQuery,
)
from polar.kit.schemas import MultipleQueryFilter
from polar.kit.sorting import Sorting, SortingGetter
from polar.models import Product
from polar.models.product import ProductVisibility
from polar.openapi import APITag
from polar.organization.schemas import OrganizationID
from polar.postgres import (
    AsyncReadSession,
    AsyncSession,
    get_db_read_session,
    get_db_session,
)
from polar.product.repository import ProductRepository
from polar.routing import APIRouter

from . import auth
from .schemas import Product as ProductSchema
from .schemas import ProductBenefitsUpdate, ProductCreate, ProductID, ProductUpdate
from .service import product as product_service
from .sorting import ProductSortProperty

router = APIRouter(
    prefix="/products",
    tags=["products", APITag.public, APITag.mcp],
)

ProductNotFound = {
    "description": "Product not found.",
    "model": ResourceNotFound.schema(),
}


ListSorting = Annotated[
    list[Sorting[ProductSortProperty]],
    Depends(SortingGetter(ProductSortProperty, ["-created_at"])),
]


@router.get(
    "/public",
    summary="List Public Products",
    response_model=ListResource[ProductSchema],
)
async def list_public_products(
    search: str | None = Query(None, description="Search products by name"),
    category: str | None = Query(None, description="Filter by category"),
    min_price: int | None = Query(None, description="Minimum price in cents", ge=0),
    max_price: int | None = Query(None, description="Maximum price in cents", ge=0),
    sort: Literal["newest", "price_asc", "price_desc"] = Query(
        "newest", description="Sort order"
    ),
    is_featured: bool | None = Query(None, description="Filter featured products"),
    is_recurring: bool | None = Query(
        None,
        description=(
            "Filter on whether the product is recurring (subscription) or "
            "one-time. Omit for both. true = subscriptions only, "
            "false = one-time only."
        ),
    ),
    organization_id: UUID4 | None = Query(
        None, description="Filter products by creator/organization id."
    ),
    currency: str | None = Query(
        None,
        description=(
            "Filter to products that have an active price in this currency "
            "(e.g. 'usd', 'kes'). Used for geo-based marketplace display: a "
            "visitor only sees products the creator priced in their currency "
            "— no conversion is applied. Omit to return products in any "
            "currency."
        ),
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(24, ge=1, le=100, description="Items per page"),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[ProductSchema]:
    """
    List public products without authentication.

    This endpoint is used for the marketplace homepage and allows filtering,
    searching, and sorting products.
    """
    from sqlalchemy import and_, case, func, or_, select
    from sqlalchemy.orm import selectinload

    from polar.models import (
        Organization,
        ProductPrice,
        ProductPriceCustom,
        ProductPriceFixed,
    )

    repository = ProductRepository.from_session(session)

    statement = (
        select(Product)
        .join(Organization, Organization.id == Product.organization_id)
        .where(
            Product.is_archived.is_(False),
            Product.is_deleted.is_(False),
            Product.visibility == ProductVisibility.public,
            # Active-subaccount gate. A creator whose Paystack subaccount is
            # not 'active' (suspended / pending verification / closed) cannot
            # legally receive a payout for a sale. Surfacing their products
            # to buyers leads to the dreaded 'inactive_subaccount' error at
            # checkout — a great way to lose a sale forever. Hide their
            # products from public lists until the subaccount is reactivated.
            # Creators still see their full catalogue in their dashboard
            # with a banner explaining why public visibility is paused.
            Organization.subaccount_status == "active",
        )
    )

    if search:
        statement = statement.where(Product.name.ilike(f"%{search}%"))

    if category:
        statement = statement.where(Product.user_metadata["category"].astext == category)

    if is_featured is not None:
        statement = statement.where(
            Product.user_metadata["is_featured"].astext == str(is_featured).lower()
        )

    if is_recurring is not None:
        statement = statement.where(Product.is_recurring.is_(is_recurring))

    if organization_id is not None:
        statement = statement.where(Product.organization_id == organization_id)

    if currency is not None:
        # Hard currency filter (NO conversion): only surface products that
        # the creator actually priced in the visitor's currency. A product
        # priced only in KES is invisible to a USD visitor, because Paystack
        # would charge in the product's own currency — showing it would be a
        # price the buyer can't actually pay.
        currency_lc = currency.lower()
        statement = statement.where(
            select(ProductPrice.id)
            .where(
                ProductPrice.product_id == Product.id,
                ProductPrice.is_archived.is_(False),
                ProductPrice.is_deleted.is_(False),
                func.lower(ProductPrice.price_currency) == currency_lc,
            )
            .exists()
        )

    price_join_added = False
    if min_price is not None or max_price is not None:
        if min_price is not None and max_price is not None and min_price > max_price:
            raise PolarRequestValidationError(
                [
                    {
                        "type": "value_error",
                        "loc": ("query", "min_price"),
                        "msg": "min_price must be less than or equal to max_price",
                        "input": min_price,
                    }
                ]
            )

        statement = (
            statement.join(
                ProductPrice,
                and_(
                    ProductPrice.product_id == Product.id,
                    ProductPrice.is_archived.is_(False),
                    ProductPrice.is_deleted.is_(False),
                ),
            )
            .outerjoin(
                ProductPriceFixed,
                ProductPriceFixed.id == ProductPrice.id,
            )
            .outerjoin(
                ProductPriceCustom,
                ProductPriceCustom.id == ProductPrice.id,
            )
        )
        price_join_added = True

        price_conditions = []
        if min_price is not None and max_price is not None:
            price_conditions.append(
                and_(
                    ProductPriceFixed.price_amount >= min_price,
                    ProductPriceFixed.price_amount <= max_price,
                )
            )
            price_conditions.append(
                and_(
                    ProductPriceCustom.minimum_amount >= min_price,
                    ProductPriceCustom.minimum_amount <= max_price,
                )
            )
        elif min_price is not None:
            price_conditions.append(ProductPriceFixed.price_amount >= min_price)
            price_conditions.append(ProductPriceCustom.minimum_amount >= min_price)
        elif max_price is not None:
            price_conditions.append(ProductPriceFixed.price_amount <= max_price)
            price_conditions.append(ProductPriceCustom.minimum_amount <= max_price)

        if price_conditions:
            statement = statement.where(or_(*price_conditions))

    if sort == "newest":
        statement = statement.order_by(Product.created_at.desc())
    elif sort in ("price_asc", "price_desc"):
        if not price_join_added:
            statement = (
                statement.join(
                    ProductPrice,
                    and_(
                        ProductPrice.product_id == Product.id,
                        ProductPrice.is_archived.is_(False),
                        ProductPrice.is_deleted.is_(False),
                    ),
                    isouter=True,
                )
                .outerjoin(
                    ProductPriceFixed,
                    ProductPriceFixed.id == ProductPrice.id,
                )
                .outerjoin(
                    ProductPriceCustom,
                    ProductPriceCustom.id == ProductPrice.id,
                )
            )

        price_value = case(
            (
                ProductPriceFixed.price_amount.is_not(None),
                ProductPriceFixed.price_amount,
            ),
            (
                ProductPriceCustom.minimum_amount.is_not(None),
                ProductPriceCustom.minimum_amount,
            ),
            else_=None,
        )

        if sort == "price_asc":
            statement = statement.order_by(price_value.asc().nullslast())
        else:
            statement = statement.order_by(price_value.desc().nullslast())

    statement = statement.distinct()

    statement = statement.options(
        selectinload(Product.product_medias),
        selectinload(Product.attached_custom_fields),
        selectinload(Product.all_prices),
        selectinload(Product.organization),
    )

    results, count = await repository.paginate(statement, limit=limit, page=page)

    return ListResource.from_paginated_results(
        [ProductSchema.model_validate(result) for result in results],
        count,
        PaginationParams(limit=limit, page=page),
    )


@router.get(
    "/",
    summary="List Products",
    response_model=ListResource[ProductSchema],
    openapi_extra={"parameters": [get_metadata_query_openapi_schema()]},
)
async def list(
    pagination: PaginationParamsQuery,
    sorting: ListSorting,
    auth_subject: auth.CreatorProductsRead,
    metadata: MetadataQuery,
    id: MultipleQueryFilter[ProductID] | None = Query(
        None, title="ProductID Filter", description="Filter by product ID."
    ),
    organization_id: MultipleQueryFilter[OrganizationID] | None = Query(
        None, title="OrganizationID Filter", description="Filter by organization ID."
    ),
    query: str | None = Query(None, description="Filter by product name."),
    is_archived: bool | None = Query(None, description="Filter on archived products."),
    is_recurring: bool | None = Query(
        None,
        description=(
            "Filter on recurring products. "
            "If `true`, only subscriptions tiers are returned. "
            "If `false`, only one-time purchase products are returned. "
        ),
    ),
    benefit_id: MultipleQueryFilter[BenefitID] | None = Query(
        None,
        title="BenefitID Filter",
        description="Filter products granting specific benefit.",
    ),
    visibility: builtins.list[ProductVisibility] | None = Query(
        default=None,
        description="Filter by visibility.",
    ),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[ProductSchema]:
    """List products."""
    results, count = await product_service.list(
        session,
        auth_subject,
        id=id,
        organization_id=organization_id,
        query=query,
        is_archived=is_archived,
        is_recurring=is_recurring,
        visibility=visibility,
        benefit_id=benefit_id,
        metadata=metadata,
        pagination=pagination,
        sorting=sorting,
    )

    return ListResource.from_paginated_results(
        [ProductSchema.model_validate(result) for result in results],
        count,
        pagination,
    )


@router.get(
    "/{id}",
    summary="Get Product",
    response_model=ProductSchema,
    responses={404: ProductNotFound},
)
async def get(
    id: ProductID,
    auth_subject: auth.CreatorProductsRead,
    session: AsyncReadSession = Depends(get_db_read_session),
) -> Product:
    """Get a product by ID."""
    product = await product_service.get(session, auth_subject, id)

    if product is None:
        raise ResourceNotFound()

    return product


@router.post(
    "/",
    response_model=ProductSchema,
    status_code=201,
    summary="Create Product",
    responses={201: {"description": "Product created."}},
)
async def create(
    product_create: ProductCreate,
    auth_subject: auth.CreatorProductsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> Product:
    """Create a product."""
    return await product_service.create(session, product_create, auth_subject)


@router.patch(
    "/{id}",
    response_model=ProductSchema,
    summary="Update Product",
    responses={
        200: {"description": "Product updated."},
        403: {
            "description": "You don't have the permission to update this product.",
            "model": NotPermitted.schema(),
        },
        404: ProductNotFound,
    },
)
async def update(
    id: ProductID,
    product_update: ProductUpdate,
    auth_subject: auth.CreatorProductsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> Product:
    """Update a product."""
    product = await product_service.get(session, auth_subject, id)

    if product is None:
        raise ResourceNotFound()

    return await product_service.update(session, product, product_update, auth_subject)


@router.post(
    "/{id}/benefits",
    response_model=ProductSchema,
    summary="Update Product Benefits",
    responses={
        200: {"description": "Product benefits updated."},
        403: {
            "description": "You don't have the permission to update this product.",
            "model": NotPermitted.schema(),
        },
        404: ProductNotFound,
    },
)
async def update_benefits(
    id: ProductID,
    benefits_update: ProductBenefitsUpdate,
    auth_subject: auth.CreatorProductsWrite,
    session: AsyncSession = Depends(get_db_session),
) -> Product:
    """Update benefits granted by a product."""
    product = await product_service.get(session, auth_subject, id)

    if product is None:
        raise ResourceNotFound()

    product, _, _ = await product_service.update_benefits(
        session, product, benefits_update.benefits, auth_subject
    )
    return product


@router.get(
    "/slug/{slug}",
    summary="Get Product by Slug",
    response_model=ProductSchema,
    responses={404: ProductNotFound},
)
async def get_product_by_slug(
    slug: str,
    request: Request,
    auth_subject: WebUserOrAnonymous,
    currency: str | None = Query(
        None,
        description=(
            "If set, the product must have an active price in this currency, "
            "otherwise it 404s (region-unavailable). No conversion is applied."
        ),
    ),
    session: AsyncSession = Depends(get_db_session),
) -> Product:
    """
    Get product details by slug.
    Accessible to anonymous users.
    Tracks view for analytics.
    """
    from uuid import uuid4

    from polar.auth.models import is_user

    repository = ProductRepository.from_session(session)

    product = await repository.get_by_slug(
        slug,
        options=repository.get_eager_options(),
    )

    if product is None:
        raise ResourceNotFound()

    # Active-subaccount gate. A buyer landing on a product whose creator's
    # subaccount is not 'active' would hit an 'inactive_subaccount' error
    # at checkout — terrible UX. 404 hides the product from public surfaces
    # until the creator reactivates payouts. The creator still sees the
    # product in their dashboard with an explanatory banner.
    if (
        product.organization is not None
        and getattr(product.organization, "subaccount_status", None) != "active"
    ):
        raise ResourceNotFound()

    # Hard currency gate (no conversion): if the visitor's currency was passed
    # and the creator didn't price this product in it, treat it as
    # region-unavailable (404) — the buyer couldn't be charged in their
    # currency anyway.
    if currency is not None:
        currency_lc = currency.lower()
        has_currency = any(
            not getattr(price, "is_archived", False)
            and (getattr(price, "price_currency", "") or "").lower() == currency_lc
            for price in (product.prices or [])
        )
        if not has_currency:
            raise ResourceNotFound()

    # Track product view for analytics
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid4())

    user_id = None
    if auth_subject and is_user(auth_subject):
        user_id = auth_subject.subject.id

    await repository.track_product_view(
        product_id=product.id,
        session_id=session_id,
        user_id=user_id,
    )

    return product


@router.get(
    "/{id}/related",
    summary="Get Related Products",
    response_model=ListResource[ProductSchema],
    responses={404: ProductNotFound},
)
async def get_related_products(
    id: ProductID,
    limit: int = Query(
        4, ge=1, le=12, description="Number of related products to return"
    ),
    session: AsyncReadSession = Depends(get_db_read_session),
) -> ListResource[ProductSchema]:
    """
    Get related products based on category and creator.
    Accessible to anonymous users.
    """
    repository = ProductRepository.from_session(session)

    product = await repository.get_by_id(id)
    if product is None:
        raise ResourceNotFound()

    related = await repository.get_related_products(
        product_id=id,
        organization_id=product.organization_id,
        limit=limit,
        options=repository.get_eager_options(),
    )

    items = [ProductSchema.model_validate(p) for p in related]
    return ListResource(
        items=items,
        pagination=Pagination(total_count=len(items), max_page=1),
    )


@router.post(
    "/{id}/track-add-to-cart",
    summary="Track Add to Cart Event",
    status_code=204,
)
async def track_add_to_cart(
    id: ProductID,
    request: Request,
    auth_subject: WebUserOrAnonymous,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """
    Track Add to Cart button click for analytics.
    Accessible to anonymous users.
    """
    from uuid import uuid4

    from polar.auth.models import is_user
    from polar.models import ProductCartEvent

    repository = ProductRepository.from_session(session)

    product = await repository.get_by_id(id)
    if product is None:
        raise ResourceNotFound()

    # Track Add to Cart event
    session_id = request.cookies.get("session_id")
    if not session_id:
        session_id = str(uuid4())

    user_id = None
    if auth_subject and is_user(auth_subject):
        user_id = auth_subject.subject.id

    cart_event = ProductCartEvent(
        product_id=id,
        session_id=session_id,
        user_id=user_id,
    )
    session.add(cart_event)
