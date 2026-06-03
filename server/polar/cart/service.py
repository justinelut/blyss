from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from polar.auth.models import Anonymous, AuthSubject, User, is_user
from polar.cart.repository import CartRepository
from polar.exceptions import PolarError
from polar.models import CartItem, Product


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


cart = CartService()
