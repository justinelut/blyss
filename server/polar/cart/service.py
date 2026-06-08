from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from polar.auth.models import Anonymous, AuthSubject, User, is_user
from polar.cart.repository import CartRepository
from polar.exceptions import PolarError
from polar.models import CartItem, Organization, Product

if TYPE_CHECKING:
    from polar.models.checkout import Checkout


class CartError(PolarError):
    """Base class for cart-related errors."""


class RecurringProductNotAllowed(CartError):
    def __init__(self, product: Product) -> None:
        self.product = product
        message = f"Recurring products cannot be added to cart. Product {product.id} is a subscription."
        super().__init__(message, 422)


class ProductNotFound(CartError):
    def __init__(self, product_id: UUID) -> None:
        self.product_id = product_id
        message = f"Product {product_id} not found."
        super().__init__(message, 404)


class CartItemNotFound(CartError):
    def __init__(self, item_id: UUID) -> None:
        self.item_id = item_id
        message = f"Cart item {item_id} not found."
        super().__init__(message, 404)


class InvalidQuantity(CartError):
    def __init__(self, quantity: int) -> None:
        self.quantity = quantity
        message = f"Quantity must be between 1 and 100. Received: {quantity}"
        super().__init__(message, 422)


class EmptyCart(CartError):
    def __init__(self) -> None:
        super().__init__("Cart is empty.", 422)


class MultiOrganizationCart(CartError):
    def __init__(self) -> None:
        super().__init__(
            "Cart contains products from multiple creators. Check out one creator at a time.",
            422,
        )


class ProductOutOfStock(CartError):
    def __init__(self, product: Product) -> None:
        self.product = product
        message = f"Product {product.id} is out of stock."
        super().__init__(message, 422)


class CartService:
    async def add_item(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
        product_id: UUID,
        quantity: int = 1,
    ) -> tuple[CartItem, Product]:
        """Add a product to the cart or increment quantity if exists.

        Returns (cart_item, product) where product has all relations eagerly
        loaded — endpoints serialize this as CartItemResponse and need
        product.medias and product.attached_custom_fields populated.
        """
        if quantity < 1 or quantity > 100:
            raise InvalidQuantity(quantity)

        product = await self._get_product(session, product_id)

        if product.is_recurring:
            raise RecurringProductNotAllowed(product)

        if product.is_archived:
            raise ProductOutOfStock(product)

        user_id, session_token = self._extract_owner_identifiers(auth_subject)

        repository = CartRepository(session)
        cart_item = await repository.upsert_item(
            user_id=user_id,
            session_token=session_token,
            product_id=product_id,
            quantity=quantity,
            flush=True,
        )

        # The upsert's RETURNING + populate_existing can invalidate the
        # eager-loaded relations on Product in the identity map. Re-fetch
        # to guarantee product.product_medias and friends are populated
        # before the endpoint serializes CartItemResponse.
        product = await self._get_product(session, product_id)

        return cart_item, product

    async def remove_item(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
        item_id: UUID,
    ) -> None:
        """Remove a specific cart item."""
        user_id, session_token = self._extract_owner_identifiers(auth_subject)

        repository = CartRepository(session)
        cart_item = await repository.get_by_id_and_owner(
            item_id=item_id,
            user_id=user_id,
            session_token=session_token,
        )

        if cart_item is None:
            raise CartItemNotFound(item_id)

        await repository.delete(cart_item)

    async def get_cart(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
    ) -> dict:
        """Get all cart items with calculated totals."""
        user_id, session_token = self._extract_owner_identifiers(auth_subject)

        repository = CartRepository(session)
        if user_id is not None:
            cart_items = await repository.get_by_user(user_id)
        else:
            cart_items = await repository.get_by_session(session_token)

        items_data = []
        subtotal = 0

        for item in cart_items:
            product = item.product
            item_subtotal = self._calculate_item_subtotal(product, item.quantity)
            subtotal += item_subtotal

            items_data.append(
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product": product,
                    "quantity": item.quantity,
                    "subtotal": item_subtotal,
                    "created_at": item.created_at,
                    "modified_at": item.modified_at,
                }
            )

        tax = self._calculate_tax(subtotal)
        total = subtotal + tax

        return {
            "items": items_data,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "item_count": len(cart_items),
        }

    async def get_cart_grouped(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
    ) -> dict:
        """Group cart items by the creator who owns each product.

        Polar's transactional model is per-org. The buyer-facing
        marketplace cart is the aggregation of these per-org carts —
        one section per creator. Each section is independently
        checkable.

        Sorted by most-recently-modified item first so the creator the
        buyer most recently engaged with surfaces at the top of the
        cart drawer / page.
        """
        user_id, session_token = self._extract_owner_identifiers(auth_subject)

        repository = CartRepository(session)
        if user_id is not None:
            cart_items = await repository.get_by_user(user_id)
        else:
            cart_items = await repository.get_by_session(session_token)

        # Group by product.organization_id. Skip items whose product
        # somehow lacks an organization (shouldn't happen but defensive
        # for anyone hand-rolling test data).
        from collections import defaultdict

        by_org: dict[UUID, list] = defaultdict(list)
        org_meta: dict[UUID, dict] = {}
        latest_modified: dict[UUID, object] = {}

        for item in cart_items:
            product = item.product
            organization = product.organization
            if organization is None:
                continue
            org_id = organization.id
            by_org[org_id].append(item)
            org_meta[org_id] = {
                "id": organization.id,
                "slug": organization.slug,
                "name": organization.name,
                "avatar_url": organization.avatar_url,
            }
            existing_latest = latest_modified.get(org_id)
            if existing_latest is None or item.modified_at > existing_latest:
                latest_modified[org_id] = item.modified_at

        groups: list[dict] = []
        total_count = 0
        for org_id, items in by_org.items():
            subtotal = 0
            items_data = []
            for item in items:
                product = item.product
                item_subtotal = self._calculate_item_subtotal(
                    product, item.quantity
                )
                subtotal += item_subtotal
                items_data.append(
                    {
                        "id": item.id,
                        "product_id": item.product_id,
                        "product": product,
                        "quantity": item.quantity,
                        "subtotal": item_subtotal,
                        "created_at": item.created_at,
                        "modified_at": item.modified_at,
                    }
                )
            tax = self._calculate_tax(subtotal)
            total = subtotal + tax
            groups.append(
                {
                    "organization": org_meta[org_id],
                    "items": items_data,
                    "subtotal": subtotal,
                    "tax": tax,
                    "total": total,
                    "item_count": len(items),
                }
            )
            total_count += len(items)

        # Sort groups: most recently modified first
        groups.sort(
            key=lambda g: latest_modified[g["organization"]["id"]],
            reverse=True,
        )

        return {"groups": groups, "item_count": total_count}

    async def get_cart_for_organization(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
        organization_id: UUID,
    ) -> dict:
        """Return only the cart items belonging to one creator.

        Mirrors get_cart()'s shape so the existing CartResponse schema
        can serialize the result unchanged. Used by creator-storefront
        pages where the buyer should see only this creator's pending
        items, not other creators' carts.
        """
        user_id, session_token = self._extract_owner_identifiers(auth_subject)

        repository = CartRepository(session)
        if user_id is not None:
            cart_items = await repository.get_by_user(user_id)
        else:
            cart_items = await repository.get_by_session(session_token)

        # Filter by product.organization_id
        scoped = [
            item
            for item in cart_items
            if item.product.organization
            and item.product.organization.id == organization_id
        ]

        items_data = []
        subtotal = 0
        for item in scoped:
            product = item.product
            item_subtotal = self._calculate_item_subtotal(product, item.quantity)
            subtotal += item_subtotal
            items_data.append(
                {
                    "id": item.id,
                    "product_id": item.product_id,
                    "product": product,
                    "quantity": item.quantity,
                    "subtotal": item_subtotal,
                    "created_at": item.created_at,
                    "modified_at": item.modified_at,
                }
            )

        tax = self._calculate_tax(subtotal)
        total = subtotal + tax

        return {
            "items": items_data,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "item_count": len(scoped),
        }

    async def clear_cart(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
    ) -> None:
        """Remove all cart items for the customer."""
        user_id, session_token = self._extract_owner_identifiers(auth_subject)

        repository = CartRepository(session)
        if user_id is not None:
            cart_items = await repository.get_by_user(user_id)
        else:
            cart_items = await repository.get_by_session(session_token)

        for item in cart_items:
            await repository.delete(item)

    async def migrate_guest_cart(
        self,
        session: AsyncSession,
        session_token: str,
        user_id: UUID,
    ) -> int:
        """Migrate guest cart to user account on login."""
        repository = CartRepository(session)
        migrated_count = await repository.migrate_session_to_user(
            session_token=session_token,
            user_id=user_id,
            flush=True,
        )
        return migrated_count

    async def _get_product(self, session: AsyncSession, product_id: UUID) -> Product:
        """Get a product by ID or raise ProductNotFound.

        Eager-loads `product_medias`, `attached_custom_fields`, `all_prices`
        and `organization` so the cart's response schema (CartItemResponse →
        Product) can serialize without tripping `lazy="raise"`. Without these,
        `cart_item.product.medias` raises `InvalidRequestError`, which
        bubbles as a bare 500 with no CORS headers — the browser then
        reports it as a CORS error and the optimistic UI rolls back, which
        is what surfaces as "items added then instantly disappear".
        """
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                joinedload(Product.organization),
                selectinload(Product.product_medias),
                selectinload(Product.attached_custom_fields),
                selectinload(Product.all_prices),
            )
        )
        result = await session.execute(statement)
        product = result.unique().scalar_one_or_none()

        if product is None:
            raise ProductNotFound(product_id)

        return product

    def _extract_owner_identifiers(
        self, auth_subject: AuthSubject[User | Anonymous]
    ) -> tuple[UUID | None, str | None]:
        """Extract user_id or session_token from auth_subject."""
        if is_user(auth_subject):
            return auth_subject.subject.id, None
        else:
            if auth_subject.session is None:
                raise CartError("Anonymous user must have a session token", 401)
            session_token = str(auth_subject.session.id)
            return None, session_token

    def _calculate_item_subtotal(self, product: Product, quantity: int) -> int:
        """Calculate subtotal for a cart item (price * quantity in cents)."""
        if not product.prices:
            return 0

        price = product.prices[0]
        # Note: amount_type's column is plain String, so SQLAlchemy returns a
        # raw str at runtime (not the ProductPriceAmountType enum). String
        # comparison works either way; .value on a raw str raises AttributeError
        # which was the live cart 500 ('str' object has no attribute 'value').
        if str(price.amount_type) == "fixed":
            return price.price_amount * quantity

        return 0

    def _calculate_tax(self, subtotal: int) -> int:
        """Calculate estimated tax based on subtotal."""
        return 0

    async def create_checkout_from_cart(
        self,
        session: AsyncSession,
        auth_subject: AuthSubject[User | Anonymous],
        ip_geolocation_client: object | None = None,
        organization_id: UUID | None = None,
    ) -> "Checkout":
        """Create a hosted Polar checkout session from the buyer's cart.

        Loads the cart items belonging to the requesting user / guest
        session, builds a CheckoutCartCreate referencing every cart item,
        then dispatches to the existing checkout_service.create() flow which
        already supports the cart_items branch (multi-product hosted
        checkout where the buyer can complete payment for everything in
        one transaction). Returns the new Checkout — the endpoint exposes
        its `client_secret` so the frontend can redirect to
        `/checkout/{client_secret}`.

        When `organization_id` is provided (multi-creator marketplace
        flow), only items belonging to that creator are checked out —
        leaving other creators' items in the cart for separate
        sequential checkouts. Without the filter, the legacy
        single-creator-only path runs (cross-creator carts → 422).

        Raises:
          EmptyCart                  — cart is empty (or empty for the requested creator)
          MultiOrganizationCart      — cart spans creators AND no organization_id was provided
          (any error from checkout_service.create — e.g. recurring product)
        """
        # Local imports to avoid heavy module-load circular imports between
        # cart and checkout.
        from typing import cast as _cast

        from polar.auth.models import AuthSubject as _AuthSubject
        from polar.auth.scope import Scope
        from polar.checkout.schemas import CheckoutCartCreate
        from polar.checkout.service import checkout as checkout_service

        user_id, session_token = self._extract_owner_identifiers(auth_subject)

        repository = CartRepository(session)
        if user_id is not None:
            cart_items = await repository.get_by_user(user_id)
        else:
            assert session_token is not None
            cart_items = await repository.get_by_session(session_token)

        if not cart_items:
            raise EmptyCart()

        if organization_id is not None:
            # Filter to just this creator's items. Empty after filter is
            # the same as an empty cart from the buyer's POV.
            cart_items = [
                ci
                for ci in cart_items
                if ci.product.organization_id == organization_id
            ]
            if not cart_items:
                raise EmptyCart()
        else:
            # Backwards-compat path: enforce single-creator cart at the
            # service boundary. Prefer the new organization_id parameter
            # in new code paths.
            org_ids = {ci.product.organization_id for ci in cart_items}
            if len(org_ids) > 1:
                raise MultiOrganizationCart()

        organization = cart_items[0].product.organization

        # The downstream service is typed for AuthSubject[User|Organization]
        # but only uses auth_subject for org-scoped product lookups. The
        # cart-create branch uses cart_repository.get_by_id directly without
        # consulting auth_subject for cart-item ownership (the buyer owns
        # the cart by virtue of session-token / user-id; we already filtered
        # above). We construct an org-scoped AuthSubject so the downstream
        # path resolves cleanly.
        creator_auth = _AuthSubject(
            subject=organization,
            scopes={Scope.web_read, Scope.web_write, Scope.checkouts_write},
            session=None,
        )

        create_payload = CheckoutCartCreate(
            cart_items=[ci.id for ci in cart_items],
        )

        return await checkout_service.create(
            session,
            create_payload,
            _cast("_AuthSubject[User | Organization]", creator_auth),
            ip_geolocation_client,  # type: ignore[arg-type]
        )


cart = CartService()
