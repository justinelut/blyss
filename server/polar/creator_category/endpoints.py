from fastapi import Depends

from polar.openapi import APITag
from polar.postgres import AsyncSession, get_db_session
from polar.routing import APIRouter

from .repository import CreatorCategoryRepository
from .schemas import CreatorCategorySchema

router = APIRouter(
    prefix="/creator-categories",
    tags=["creator_categories", APITag.public],
)


@router.get(
    "/",
    response_model=list[CreatorCategorySchema],
    summary="List Creator Categories",
    responses={200: {"description": "Active creator categories."}},
)
async def list_creator_categories(
    session: AsyncSession = Depends(get_db_session),
) -> list[CreatorCategorySchema]:
    """List active creator categories for the /creators directory filter.

    No authentication required. Ordered by display_order. The "All" tab is a
    UI-only concern and is not returned here.
    """
    repository = CreatorCategoryRepository.from_session(session)
    categories = await repository.list_all(active_only=True)
    return [
        CreatorCategorySchema.model_validate(c, from_attributes=True)
        for c in categories
    ]
