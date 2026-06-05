import re

from fastapi import APIRouter, Depends, Request
from tagflow import tag, text

from polar.creator_category.repository import CreatorCategoryRepository
from polar.models import CreatorCategory
from polar.postgres import AsyncSession, get_db_session

from ..components import button, modal
from ..dependencies import get_admin
from ..layout import layout
from ..responses import HXRedirectResponse
from ..toast import add_toast

router = APIRouter()


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


@router.get("/", name="creator_categories:list")
async def list_page(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    repo = CreatorCategoryRepository(session)
    categories = await repo.list_all()

    with layout(
        request,
        [("Creator categories", str(request.url_for("creator_categories:list")))],
        "creator_categories:list",
    ):
        with tag.div(classes="flex flex-col gap-6"):
            with tag.div(classes="flex items-center justify-between"):
                with tag.h1(classes="text-4xl"):
                    text("Creator categories")
                with button(
                    hx_get=str(request.url_for("creator_categories:new")),
                    hx_target="#modal",
                ):
                    text("Add category")
            with tag.p(classes="text-base-content/70"):
                text(
                    "Categories power the filter on the public /creators "
                    "directory and the picker in creator onboarding + settings. "
                    "Reorder via display order; deactivate to hide without "
                    "losing creator assignments."
                )

            with tag.div(classes="overflow-x-auto"):
                with tag.table(classes="table table-sm"):
                    with tag.thead():
                        with tag.tr():
                            for h in [
                                "Order",
                                "Name",
                                "Slug",
                                "Status",
                                "Actions",
                            ]:
                                with tag.th():
                                    text(h)
                    with tag.tbody():
                        for cat in categories:
                            with tag.tr():
                                with tag.td():
                                    text(str(cat.display_order))
                                with tag.td(classes="font-medium"):
                                    text(cat.name)
                                with tag.td(classes="font-mono text-xs"):
                                    text(cat.slug)
                                with tag.td():
                                    with tag.div(
                                        classes="badge badge-sm "
                                        + (
                                            "badge-success"
                                            if cat.is_active
                                            else "badge-neutral"
                                        )
                                    ):
                                        text("Active" if cat.is_active else "Hidden")
                                with tag.td():
                                    with tag.div(classes="flex gap-1"):
                                        with button(
                                            size="xs",
                                            hx_get=str(
                                                request.url_for(
                                                    "creator_categories:edit",
                                                    id=str(cat.id),
                                                )
                                            ),
                                            hx_target="#modal",
                                        ):
                                            text("Edit")


@router.get("/new", name="creator_categories:new")
async def new_modal(request: Request) -> None:
    with modal("Add category", open=True):
        with tag.form(
            method="POST",
            hx_post=str(request.url_for("creator_categories:create")),
            hx_target="body",
            classes="flex flex-col gap-4",
        ):
            with tag.label(classes="form-control w-full"):
                with tag.div(classes="label"):
                    with tag.span(classes="label-text"):
                        text("Name")
                with tag.input(
                    type="text",
                    name="name",
                    classes="input input-bordered w-full",
                    placeholder="e.g. Illustrators",
                    required=True,
                ):
                    pass
            with tag.label(classes="form-control w-full"):
                with tag.div(classes="label"):
                    with tag.span(classes="label-text"):
                        text("Display order")
                with tag.input(
                    type="number",
                    name="display_order",
                    value="0",
                    classes="input input-bordered w-full",
                ):
                    pass
            with tag.div(classes="modal-action"):
                with tag.form(method="dialog"):
                    with button(ghost=True):
                        text("Cancel")
                with button(variant="primary", type="submit"):
                    text("Create")


@router.post("/", name="creator_categories:create")
async def create(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    form = await request.form()
    name = str(form.get("name", "")).strip()
    display_order = int(str(form.get("display_order", "0")) or 0)

    if not name:
        await add_toast(request, "Name is required.", "error")
        return HXRedirectResponse(
            request, str(request.url_for("creator_categories:list"))
        )

    slug = _slugify(name)
    repo = CreatorCategoryRepository(session)
    existing = await repo.get_by_slug(slug)
    if existing is not None:
        await add_toast(request, f"Category '{slug}' already exists.", "error")
        return HXRedirectResponse(
            request, str(request.url_for("creator_categories:list"))
        )

    category = CreatorCategory(
        slug=slug,
        name=name,
        display_order=display_order,
        is_active=True,
    )
    session.add(category)
    await session.commit()
    await add_toast(request, f"Added category '{name}'.", "success")
    return HXRedirectResponse(
        request, str(request.url_for("creator_categories:list"))
    )


@router.get("/{id}/edit", name="creator_categories:edit")
async def edit_modal(
    request: Request,
    id: str,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    repo = CreatorCategoryRepository(session)
    from uuid import UUID

    category = await repo.get_by_id(UUID(id))
    if category is None:
        with modal("Not found", open=True):
            with tag.p():
                text("Category not found.")
        return

    with modal(f"Edit: {category.name}", open=True):
        with tag.form(
            method="POST",
            hx_post=str(
                request.url_for("creator_categories:update", id=str(category.id))
            ),
            hx_target="body",
            classes="flex flex-col gap-4",
        ):
            with tag.label(classes="form-control w-full"):
                with tag.div(classes="label"):
                    with tag.span(classes="label-text"):
                        text("Name")
                with tag.input(
                    type="text",
                    name="name",
                    value=category.name,
                    classes="input input-bordered w-full",
                    required=True,
                ):
                    pass
            with tag.label(classes="form-control w-full"):
                with tag.div(classes="label"):
                    with tag.span(classes="label-text"):
                        text("Display order")
                with tag.input(
                    type="number",
                    name="display_order",
                    value=str(category.display_order),
                    classes="input input-bordered w-full",
                ):
                    pass
            with tag.label(classes="label cursor-pointer justify-start gap-3"):
                checkbox_attrs = {
                    "type": "checkbox",
                    "name": "is_active",
                    "classes": "checkbox",
                }
                if category.is_active:
                    checkbox_attrs["checked"] = True
                with tag.input(**checkbox_attrs):
                    pass
                with tag.span(classes="label-text"):
                    text("Active")
            with tag.div(classes="modal-action"):
                with tag.form(method="dialog"):
                    with button(ghost=True):
                        text("Cancel")
                with button(variant="primary", type="submit"):
                    text("Save")


@router.post("/{id}", name="creator_categories:update")
async def update(
    request: Request,
    id: str,
    session: AsyncSession = Depends(get_db_session),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    from uuid import UUID

    repo = CreatorCategoryRepository(session)
    category = await repo.get_by_id(UUID(id))
    if category is None:
        await add_toast(request, "Category not found.", "error")
        return HXRedirectResponse(
            request, str(request.url_for("creator_categories:list"))
        )

    form = await request.form()
    name = str(form.get("name", "")).strip()
    if name:
        category.name = name
    category.display_order = int(str(form.get("display_order", "0")) or 0)
    category.is_active = form.get("is_active") is not None
    session.add(category)
    await session.commit()
    await add_toast(request, "Category updated.", "success")
    return HXRedirectResponse(
        request, str(request.url_for("creator_categories:list"))
    )
