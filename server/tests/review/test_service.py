"""Unit tests for ReviewService.

This module contains unit tests for the ReviewService class, focusing on
review creation with verified purchase validation, rating and text validation,
review update and delete authorization, and rating calculations.
"""

from uuid import uuid4

import pytest

from polar.models import Order, User
from polar.models.order import OrderStatus
from polar.review.service import (
    InvalidRatingError,
    NotVerifiedPurchaseError,
    OrderNotFoundError,
    ProductNotFoundError,
    ReviewAlreadyExistsError,
    ReviewNotFoundError,
    ReviewService,
    ReviewTextTooLongError,
    UnauthorizedReviewAccessError,
)
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_organization, create_product


@pytest.fixture
def mock_review_service() -> ReviewService:
    """Create a ReviewService instance for testing."""
    return ReviewService()


class TestCreateReview:
    """Tests for ReviewService.create_review method."""

    @pytest.mark.asyncio
    async def test_successful_review_creation(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test successful review creation with verified purchase."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=5,
            review_text="Excellent product!",
        )

        assert review.product_id == product.id
        assert review.user_id == user.id
        assert review.order_id == order.id
        assert review.rating == 5
        assert review.review_text == "Excellent product!"
        assert review.is_verified_purchase is True

    @pytest.mark.asyncio
    async def test_review_creation_without_text(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review creation with rating only, no text."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=4,
        )

        assert review.rating == 4
        assert review.review_text is None
        assert review.is_verified_purchase is True

    @pytest.mark.asyncio
    async def test_review_creation_invalid_rating_too_low(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review creation with rating below 1."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        with pytest.raises(InvalidRatingError) as exc_info:
            await mock_review_service.create_review(
                session,
                user_id=user.id,
                product_id=product.id,
                order_id=order.id,
                rating=0,
            )

        assert exc_info.value.rating == 0
        assert "must be between 1 and 5" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_review_creation_invalid_rating_too_high(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review creation with rating above 5."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        with pytest.raises(InvalidRatingError) as exc_info:
            await mock_review_service.create_review(
                session,
                user_id=user.id,
                product_id=product.id,
                order_id=order.id,
                rating=6,
            )

        assert exc_info.value.rating == 6
        assert "must be between 1 and 5" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_review_text_too_long(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review creation with text exceeding 1000 characters."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        long_text = "a" * 1001

        with pytest.raises(ReviewTextTooLongError) as exc_info:
            await mock_review_service.create_review(
                session,
                user_id=user.id,
                product_id=product.id,
                order_id=order.id,
                rating=5,
                review_text=long_text,
            )

        assert exc_info.value.length == 1001
        assert "1000 characters or less" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_review_text_exactly_1000_characters(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review creation with text exactly 1000 characters."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        text_1000 = "a" * 1000

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=5,
            review_text=text_1000,
        )

        assert review.review_text == text_1000
        assert len(review.review_text) == 1000

    @pytest.mark.asyncio
    async def test_review_creation_product_not_found(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review creation with non-existent product."""
        fake_product_id = uuid4()
        fake_order_id = uuid4()

        with pytest.raises(ProductNotFoundError) as exc_info:
            await mock_review_service.create_review(
                session,
                user_id=user.id,
                product_id=fake_product_id,
                order_id=fake_order_id,
                rating=5,
            )

        assert exc_info.value.product_id == fake_product_id

    @pytest.mark.asyncio
    async def test_review_creation_order_not_found(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review creation with non-existent order."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)
        fake_order_id = uuid4()

        with pytest.raises(OrderNotFoundError) as exc_info:
            await mock_review_service.create_review(
                session,
                user_id=user.id,
                product_id=product.id,
                order_id=fake_order_id,
                rating=5,
            )

        assert exc_info.value.order_id == fake_order_id

    @pytest.mark.asyncio
    async def test_review_creation_not_verified_purchase(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review creation without verified purchase."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.pending,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        with pytest.raises(NotVerifiedPurchaseError) as exc_info:
            await mock_review_service.create_review(
                session,
                user_id=user.id,
                product_id=product.id,
                order_id=order.id,
                rating=5,
            )

        assert exc_info.value.user_id == user.id
        assert exc_info.value.product_id == product.id

    @pytest.mark.asyncio
    async def test_review_already_exists(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test duplicate review creation for same user and product."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=5,
        )

        with pytest.raises(ReviewAlreadyExistsError) as exc_info:
            await mock_review_service.create_review(
                session,
                user_id=user.id,
                product_id=product.id,
                order_id=order.id,
                rating=4,
            )

        assert exc_info.value.user_id == user.id
        assert exc_info.value.product_id == product.id


class TestUpdateReview:
    """Tests for ReviewService.update_review method."""

    @pytest.mark.asyncio
    async def test_successful_review_update(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test successful review update by owner."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=3,
            review_text="It's okay",
        )

        updated_review = await mock_review_service.update_review(
            session,
            review_id=review.id,
            user_id=user.id,
            rating=5,
            review_text="Actually, it's excellent!",
        )

        assert updated_review.id == review.id
        assert updated_review.rating == 5
        assert updated_review.review_text == "Actually, it's excellent!"

    @pytest.mark.asyncio
    async def test_update_review_invalid_rating(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review update with invalid rating."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=3,
        )

        with pytest.raises(InvalidRatingError):
            await mock_review_service.update_review(
                session,
                review_id=review.id,
                user_id=user.id,
                rating=7,
            )

    @pytest.mark.asyncio
    async def test_update_review_text_too_long(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review update with text exceeding 1000 characters."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=3,
        )

        with pytest.raises(ReviewTextTooLongError):
            await mock_review_service.update_review(
                session,
                review_id=review.id,
                user_id=user.id,
                rating=4,
                review_text="a" * 1001,
            )

    @pytest.mark.asyncio
    async def test_update_review_not_found(
        self,
        session,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review update with non-existent review."""
        fake_review_id = uuid4()

        with pytest.raises(ReviewNotFoundError) as exc_info:
            await mock_review_service.update_review(
                session,
                review_id=fake_review_id,
                user_id=user.id,
                rating=5,
            )

        assert exc_info.value.review_id == fake_review_id

    @pytest.mark.asyncio
    async def test_update_review_unauthorized(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review update by non-owner."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=3,
        )

        other_user_id = uuid4()

        with pytest.raises(UnauthorizedReviewAccessError) as exc_info:
            await mock_review_service.update_review(
                session,
                review_id=review.id,
                user_id=other_user_id,
                rating=5,
            )

        assert exc_info.value.review_id == review.id


class TestDeleteReview:
    """Tests for ReviewService.delete_review method."""

    @pytest.mark.asyncio
    async def test_successful_review_deletion(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test successful review deletion by owner."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=3,
        )

        await mock_review_service.delete_review(
            session,
            review_id=review.id,
            user_id=user.id,
        )

        from polar.review.repository import ReviewRepository

        repository = ReviewRepository.from_session(session)
        deleted_review = await repository.get_by_id(review.id)
        assert deleted_review is None

    @pytest.mark.asyncio
    async def test_delete_review_not_found(
        self,
        session,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review deletion with non-existent review."""
        fake_review_id = uuid4()

        with pytest.raises(ReviewNotFoundError) as exc_info:
            await mock_review_service.delete_review(
                session,
                review_id=fake_review_id,
                user_id=user.id,
            )

        assert exc_info.value.review_id == fake_review_id

    @pytest.mark.asyncio
    async def test_delete_review_unauthorized(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test review deletion by non-owner."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        review = await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=3,
        )

        other_user_id = uuid4()

        with pytest.raises(UnauthorizedReviewAccessError) as exc_info:
            await mock_review_service.delete_review(
                session,
                review_id=review.id,
                user_id=other_user_id,
            )

        assert exc_info.value.review_id == review.id


class TestGetProductRatingSummary:
    """Tests for ReviewService.get_product_rating_summary method."""

    @pytest.mark.asyncio
    async def test_rating_summary_no_reviews(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
    ) -> None:
        """Test rating summary for product with no reviews."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        summary = await mock_review_service.get_product_rating_summary(
            session, product.id
        )

        assert summary["average_rating"] == 0.0
        assert summary["total_reviews"] == 0
        assert summary["rating_distribution"] == {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    @pytest.mark.asyncio
    async def test_rating_summary_single_review(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
        user: User,
    ) -> None:
        """Test rating summary with single review."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        order = Order(
            customer_id=user.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order = await save_fixture(order)

        await mock_review_service.create_review(
            session,
            user_id=user.id,
            product_id=product.id,
            order_id=order.id,
            rating=5,
        )

        summary = await mock_review_service.get_product_rating_summary(
            session, product.id
        )

        assert summary["average_rating"] == 5.0
        assert summary["total_reviews"] == 1
        assert summary["rating_distribution"][5] == 1
        assert summary["rating_distribution"][4] == 0

    @pytest.mark.asyncio
    async def test_rating_summary_multiple_reviews(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
    ) -> None:
        """Test rating summary with multiple reviews."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        from tests.fixtures.random_objects import create_user

        user1 = await create_user(save_fixture)
        user2 = await create_user(save_fixture)
        user3 = await create_user(save_fixture)

        order1 = Order(
            customer_id=user1.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order2 = Order(
            customer_id=user2.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order3 = Order(
            customer_id=user3.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        await save_fixture(order1)
        await save_fixture(order2)
        await save_fixture(order3)

        await mock_review_service.create_review(
            session, user1.id, product.id, order1.id, rating=5
        )
        await mock_review_service.create_review(
            session, user2.id, product.id, order2.id, rating=4
        )
        await mock_review_service.create_review(
            session, user3.id, product.id, order3.id, rating=3
        )

        summary = await mock_review_service.get_product_rating_summary(
            session, product.id
        )

        assert summary["average_rating"] == 4.0
        assert summary["total_reviews"] == 3
        assert summary["rating_distribution"][5] == 1
        assert summary["rating_distribution"][4] == 1
        assert summary["rating_distribution"][3] == 1
        assert summary["rating_distribution"][2] == 0
        assert summary["rating_distribution"][1] == 0

    @pytest.mark.asyncio
    async def test_rating_distribution_calculation(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
    ) -> None:
        """Test rating distribution with various ratings."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        from tests.fixtures.random_objects import create_user

        users = [await create_user(save_fixture) for _ in range(10)]
        ratings = [5, 5, 5, 4, 4, 3, 3, 2, 1, 1]

        for user, rating in zip(users, ratings):
            order = Order(
                customer_id=user.id,
                product_id=product.id,
                status=OrderStatus.paid,
                subtotal_amount=10000,
                tax_amount=0,
                currency="KES",
                billing_reason="purchase",
                invoice_number=f"INV-{uuid4()}",
            )
            order = await save_fixture(order)
            await mock_review_service.create_review(
                session, user.id, product.id, order.id, rating=rating
            )

        summary = await mock_review_service.get_product_rating_summary(
            session, product.id
        )

        assert summary["total_reviews"] == 10
        assert summary["rating_distribution"][5] == 3
        assert summary["rating_distribution"][4] == 2
        assert summary["rating_distribution"][3] == 2
        assert summary["rating_distribution"][2] == 1
        assert summary["rating_distribution"][1] == 2

    @pytest.mark.asyncio
    async def test_rating_recalculation_after_deletion(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
    ) -> None:
        """Test rating recalculation after review deletion."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        from tests.fixtures.random_objects import create_user

        user1 = await create_user(save_fixture)
        user2 = await create_user(save_fixture)
        user3 = await create_user(save_fixture)

        order1 = Order(
            customer_id=user1.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order2 = Order(
            customer_id=user2.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order3 = Order(
            customer_id=user3.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        await save_fixture(order1)
        await save_fixture(order2)
        await save_fixture(order3)

        review1 = await mock_review_service.create_review(
            session, user1.id, product.id, order1.id, rating=5
        )
        await mock_review_service.create_review(
            session, user2.id, product.id, order2.id, rating=4
        )
        await mock_review_service.create_review(
            session, user3.id, product.id, order3.id, rating=3
        )

        summary_before = await mock_review_service.get_product_rating_summary(
            session, product.id
        )
        assert summary_before["average_rating"] == 4.0
        assert summary_before["total_reviews"] == 3

        await mock_review_service.delete_review(
            session, review_id=review1.id, user_id=user1.id
        )

        summary_after = await mock_review_service.get_product_rating_summary(
            session, product.id
        )
        assert summary_after["average_rating"] == 3.5
        assert summary_after["total_reviews"] == 2
        assert summary_after["rating_distribution"][5] == 0
        assert summary_after["rating_distribution"][4] == 1
        assert summary_after["rating_distribution"][3] == 1


class TestGetProductReviews:
    """Tests for ReviewService.get_product_reviews method."""

    @pytest.mark.asyncio
    async def test_get_product_reviews_empty(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
    ) -> None:
        """Test getting reviews for product with no reviews."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        reviews = await mock_review_service.get_product_reviews(session, product.id)

        assert len(reviews) == 0

    @pytest.mark.asyncio
    async def test_get_product_reviews_with_data(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
    ) -> None:
        """Test getting reviews for product with multiple reviews."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        from tests.fixtures.random_objects import create_user

        user1 = await create_user(save_fixture)
        user2 = await create_user(save_fixture)

        order1 = Order(
            customer_id=user1.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        order2 = Order(
            customer_id=user2.id,
            product_id=product.id,
            status=OrderStatus.paid,
            subtotal_amount=10000,
            tax_amount=0,
            currency="KES",
            billing_reason="purchase",
            invoice_number=f"INV-{uuid4()}",
        )
        await save_fixture(order1)
        await save_fixture(order2)

        await mock_review_service.create_review(
            session, user1.id, product.id, order1.id, rating=5, review_text="Great!"
        )
        await mock_review_service.create_review(
            session, user2.id, product.id, order2.id, rating=4, review_text="Good"
        )

        reviews = await mock_review_service.get_product_reviews(session, product.id)

        assert len(reviews) == 2
        assert any(r.rating == 5 for r in reviews)
        assert any(r.rating == 4 for r in reviews)

    @pytest.mark.asyncio
    async def test_get_product_reviews_pagination(
        self,
        session,
        save_fixture: SaveFixture,
        mock_review_service: ReviewService,
    ) -> None:
        """Test review pagination."""
        organization = await create_organization(save_fixture)
        product = await create_product(save_fixture, organization=organization)

        from tests.fixtures.random_objects import create_user

        users = [await create_user(save_fixture) for _ in range(5)]

        for user in users:
            order = Order(
                customer_id=user.id,
                product_id=product.id,
                status=OrderStatus.paid,
                subtotal_amount=10000,
                tax_amount=0,
                currency="KES",
                billing_reason="purchase",
                invoice_number=f"INV-{uuid4()}",
            )
            order = await save_fixture(order)
            await mock_review_service.create_review(
                session, user.id, product.id, order.id, rating=5
            )

        page1 = await mock_review_service.get_product_reviews(
            session, product.id, limit=2, offset=0
        )
        page2 = await mock_review_service.get_product_reviews(
            session, product.id, limit=2, offset=2
        )

        assert len(page1) == 2
        assert len(page2) == 2
        assert page1[0].id != page2[0].id
