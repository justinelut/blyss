from typing import Annotated
from uuid import UUID

import structlog
from fastapi import Depends, HTTPException, Path

from polar.auth.dependencies import WebUserWrite
from polar.kit.pagination import ListResource, PaginationParams
from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.product.schemas import Product
from polar.routing import APIRouter

from .schemas import (
    CategoryCreate,
    CategoryPublic,
    CategoryUpdate,
    ProductCategoryAssignmentCreate,
)
from .service import (
    CategoryNotFoundError,
    CategorySlugAlreadyExistsError,
    ProductCategoryAssignmentAlreadyExistsError,
    ProductNotFoundError,
    category_service,
)

log = structlog.get_logger()

router = APIRouter(prefix="/categories", tags=["categories", APITag.public])


@router.post(
    "/",
    response_model=CategoryPublic,
    status_code=201,
    summary="Create Category",
    responses={
        201: {"description": "Category created successfully."},
        409: {"description": "Category slug already exists."},
    },
)
async def create_category(
    category_create: CategoryCreate,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> CategoryPublic:
    """Create new product category. Requires authentication."""
    try:
        category = await category_service.create_category(
            session,
            category_create.name,
            category_create.slug,
            category_create.description,
            category_create.display_order,
        )

        categories_with_counts = await category_service.get_all_categories_with_counts(
            session
        )
        category_dict = dict(categories_with_counts)
        product_count = category_dict.get(category, 0)

        return CategoryPublic(
            **category.__dict__,
            product_count=product_count,
        )

    except CategorySlugAlreadyExistsError:
        raise


@router.get(
    "/",
    response_model=ListResource[CategoryPublic],
    summary="List Categories",
    responses={200: {"description": "List of all active categories."}},
)
async def list_categories(
    session: AsyncSession = Depends(get_db_session),
) -> ListResource[CategoryPublic]:
    """Get all active categories with product counts. No authentication required."""
    categories_with_counts = await category_service.get_all_categories_with_counts(
        session
    )

    items = [
        CategoryPublic(
            **category.__dict__,
            product_count=count,
        )
        for category, count in categories_with_counts
    ]

    return ListResource(
        items=items,
        pagination={"total_count": len(items), "max_page": 1},
    )


@router.get(
    "/{slug}",
    response_model=CategoryPublic,
    summary="Get Category",
    responses={
        200: {"description": "Category details."},
        404: {"description": "Category not found."},
    },
)
async def get_category(
    slug: Annotated[str, Path(description="The category slug.")],
    session: AsyncSession = Depends(get_db_session),
) -> CategoryPublic:
    """Get category details by slug. No authentication required."""
    from .repository import CategoryRepository

    repository = CategoryRepository.from_session(session)
    category = await repository.get_by_slug(slug)

    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    product_count = await repository.get_product_count(category.id)

    return CategoryPublic(
        **category.__dict__,
        product_count=product_count,
    )


@router.get(
    "/{slug}/products",
    response_model=ListResource[Product],
    summary="Get Products in Category",
    responses={
        200: {"description": "List of products in category."},
        404: {"description": "Category not found."},
    },
)
async def get_category_products(
    slug: Annotated[str, Path(description="The category slug.")],
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db_session),
) -> ListResource[Product]:
    """Get products in category. No authentication required."""
    try:
        products, total_count = await category_service.get_products_by_category(
            session, slug, pagination
        )

        return ListResource(
            items=[Product.model_validate(product) for product in products],
            pagination={
                "total_count": total_count,
                "max_page": (total_count // pagination.limit) + 1,
            },
        )

    except CategoryNotFoundError:
        raise HTTPException(status_code=404, detail="Category not found")


@router.put(
    "/{id}",
    response_model=CategoryPublic,
    summary="Update Category",
    responses={
        200: {"description": "Category updated successfully."},
        404: {"description": "Category not found."},
    },
)
async def update_category(
    id: Annotated[UUID, Path(description="The category ID.")],
    category_update: CategoryUpdate,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> CategoryPublic:
    """Update category. Requires authentication."""
    try:
        category = await category_service.update_category(
            session,
            id,
            category_update.name,
            category_update.description,
            category_update.display_order,
            category_update.is_active,
        )

        from .repository import CategoryRepository

        repository = CategoryRepository.from_session(session)
        product_count = await repository.get_product_count(category.id)

        return CategoryPublic(
            **category.__dict__,
            product_count=product_count,
        )

    except CategoryNotFoundError:
        raise HTTPException(status_code=404, detail="Category not found")


@router.delete(
    "/{id}",
    status_code=204,
    summary="Delete Category",
    responses={
        204: {"description": "Category deleted successfully."},
        404: {"description": "Category not found."},
    },
)
async def delete_category(
    id: Annotated[UUID, Path(description="The category ID.")],
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Delete category. Requires authentication."""
    try:
        await category_service.delete_category(session, id)
    except CategoryNotFoundError:
        raise HTTPException(status_code=404, detail="Category not found")


@router.post(
    "/assignments",
    status_code=201,
    summary="Assign Product to Category",
    responses={
        201: {"description": "Product assigned to category successfully."},
        404: {"description": "Product or category not found."},
        409: {"description": "Product already assigned to category."},
    },
)
async def assign_product_to_category(
    assignment: ProductCategoryAssignmentCreate,
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    """Assign product to category. Requires authentication."""
    try:
        await category_service.assign_product_to_category(
            session,
            assignment.product_id,
            assignment.category_id,
        )
        return {"message": "Product assigned to category successfully"}

    except (ProductNotFoundError, CategoryNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ProductCategoryAssignmentAlreadyExistsError:
        raise HTTPException(
            status_code=409, detail="Product already assigned to category"
        )


@router.delete(
    "/assignments/{product_id}/{category_id}",
    status_code=204,
    summary="Unassign Product from Category",
    responses={
        204: {"description": "Product unassigned from category successfully."},
    },
)
async def unassign_product_from_category(
    product_id: Annotated[UUID, Path(description="The product ID.")],
    category_id: Annotated[UUID, Path(description="The category ID.")],
    auth_subject: WebUserWrite,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    """Unassign product from category. Requires authentication."""
    await category_service.unassign_product_from_category(
        session,
        product_id,
        category_id,
    )
