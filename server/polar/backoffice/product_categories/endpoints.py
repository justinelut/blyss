"""Backoffice CRUD for ProductCategory.

Mirrors the existing creator_categories backoffice surface (DEVELOPMENT_GUIDE
points to it as the canonical pattern). Lets admins seed / edit /
deactivate the categories that creators tag products with — without
those, the public /categories index page just lists empty buckets.
"""

import re
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from tagflow import tag, text

from polar.category.repository import CategoryRepository
from polar.category.service import (
    CategoryNotFoundError,
    CategorySlugAlreadyExistsError,
    category_service,
)
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


@router.get("/", name="product_categories:list")
async def list_page(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    # get_all_categories_with_counts only returns active rows. To allow
    # admins to re-activate hidden categories we also pull every row
    # (including inactive) and overlay the count where we have one.
    from sqlalchemy import select
    from polar.models import ProductCategory

    categories_with_counts = await category_service.get_all_categories_with_counts(
        session
    )
    counts_by_id = {c.id: count for (c, count) in categories_with_counts}

    stmt = (
        select(ProductCategory)
        .where(ProductCategory.deleted_at.is_(None))
        .order_by(
            ProductCategory.display_order.asc(),
            ProductCategory.name.asc(),
        )
    )
    all_rows = list((await session.execute(stmt)).scalars().all())

    with layout(
        request,
        [("Product categories", str(request.url_for("product_categories:list")))],
        "product_categories:list",
    ):
        with tag.div(classes="flex flex-col gap-6"):
            with tag.div(classes="flex items-center justify-between"):
                with tag.h1(classes="text-4xl"):
                    text("Product categories")
                with button(
                    hx_get=str(request.url_for("product_categories:new")),
                    hx_target="#modal",
                ):
                    text("Add category")
            with tag.p(classes="text-base-content/70"):
                text(
                    "Tags creators apply to products at create / edit time. "
                    "Drives the public /categories index page and the "
                    "marketplace category filter rail. Reorder via display "
                    "order; deactivate to hide without losing existing "
                    "product assignments."
                )

            with tag.div(classes="overflow-x-auto"):
                with tag.table(classes="table table-sm"):
                    with tag.thead():
                        with tag.tr():
                            for h in [
                                "Order",
                                "Name",
                                "Slug",
                                "Description",
                                "Products",
                                "Status",
                                "Actions",
                            ]:
                                with tag.th():
                                    text(h)
                    with tag.tbody():
                        for cat in all_rows:
                            with tag.tr():
                                with tag.td():
                                    text(str(cat.display_order))
                                with tag.td(classes="font-medium"):
                                    text(cat.name)
                                with tag.td(classes="font-mono text-xs"):
                                    text(cat.slug)
                                with tag.td(classes="text-base-content/70 max-w-xs truncate"):
                                    text(cat.description or "—")
                                with tag.td():
                                    text(str(counts_by_id.get(cat.id, 0)))
                                with tag.td():
                                    with tag.div(
                                        classes="badge badge-sm "
                                        + (
                                            "badge-success"
                                            if cat.is_active
                                            else "badge-neutral"
                                        )
                                    ):
                                        text(
                                            "Active" if cat.is_active else "Hidden"
                                        )
                                with tag.td():
                                    with tag.div(classes="flex gap-1"):
                                        with button(
                                            size="xs",
                                            hx_get=str(
                                                request.url_for(
                                                    "product_categories:edit",
                                                    id=str(cat.id),
                                                )
                                            ),
                                            hx_target="#modal",
                                        ):
                                            text("Edit")


@router.get("/new", name="product_categories:new")
async def new_modal(request: Request) -> None:
    with modal("Add category", open=True):
        with tag.form(
            method="POST",
            hx_post=str(request.url_for("product_categories:create")),
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
                    placeholder="e.g. Templates",
                    required=True,
                ):
                    pass
            with tag.label(classes="form-control w-full"):
                with tag.div(classes="label"):
                    with tag.span(classes="label-text"):
                        text("Description (optional)")
                with tag.textarea(
                    name="description",
                    classes="textarea textarea-bordered w-full",
                    placeholder="Short blurb shown on the /categories index.",
                    rows=2,
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


@router.post("/", name="product_categories:create")
async def create(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    form = await request.form()
    name = str(form.get("name", "")).strip()
    description = str(form.get("description", "")).strip() or None
    display_order = int(str(form.get("display_order", "0")) or 0)

    if not name:
        await add_toast(request, "Name is required.", "error")
        return HXRedirectResponse(
            request, str(request.url_for("product_categories:list"))
        )

    slug = _slugify(name)
    try:
        await category_service.create_category(
            session,
            name=name,
            slug=slug,
            description=description,
            display_order=display_order,
        )
    except CategorySlugAlreadyExistsError:
        await add_toast(request, f"Category '{slug}' already exists.", "error")
        return HXRedirectResponse(
            request, str(request.url_for("product_categories:list"))
        )

    await session.commit()
    await add_toast(request, f"Added category '{name}'.", "success")
    return HXRedirectResponse(
        request, str(request.url_for("product_categories:list"))
    )


@router.get("/{id}/edit", name="product_categories:edit")
async def edit_modal(
    request: Request,
    id: str,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    repo = CategoryRepository.from_session(session)
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
                request.url_for("product_categories:update", id=str(category.id))
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
                        text("Description")
                with tag.textarea(
                    name="description",
                    classes="textarea textarea-bordered w-full",
                    rows=2,
                ):
                    text(category.description or "")
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


@router.post("/{id}", name="product_categories:update")
async def update(
    request: Request,
    id: str,
    session: AsyncSession = Depends(get_db_session),
    admin: object = Depends(get_admin),
) -> HXRedirectResponse:
    form = await request.form()
    name = str(form.get("name", "")).strip() or None
    description = str(form.get("description", "")).strip() or None
    display_order_raw = form.get("display_order")
    display_order = (
        int(str(display_order_raw)) if display_order_raw is not None else None
    )
    is_active = form.get("is_active") is not None

    try:
        await category_service.update_category(
            session,
            category_id=UUID(id),
            name=name,
            description=description,
            display_order=display_order,
            is_active=is_active,
        )
    except CategoryNotFoundError:
        await add_toast(request, "Category not found.", "error")
        return HXRedirectResponse(
            request, str(request.url_for("product_categories:list"))
        )

    await session.commit()
    await add_toast(request, "Category updated.", "success")
    return HXRedirectResponse(
        request, str(request.url_for("product_categories:list"))
    )
