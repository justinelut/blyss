from decimal import Decimal
from typing import Any

import pytest
from pydantic import ValidationError

from polar.enums import SubscriptionRecurringInterval
from polar.kit.currency import PresentmentCurrency
from polar.models.product_price import ProductPriceAmountType
from polar.product.schemas import (
    ProductCreateRecurring,
    ProductPriceFixedCreate,
    ProductPriceMeteredUnitCreate,
)
from tests.fixtures.random_objects import METER_ID

# PostgreSQL int4 range limit
INT_MAX_VALUE = 2_147_483_647


@pytest.mark.parametrize(
    "name",
    [
        pytest.param("", id="empty string"),
        pytest.param("   ", id="whitespace only"),
        pytest.param("AA", id="below min length"),
        pytest.param("A" * 256, id="exceeds max length"),
    ],
)
def test_invalid_product_name(name: str) -> None:
    with pytest.raises(ValidationError) as exc_info:
        ProductCreateRecurring(
            name=name,
            recurring_interval=SubscriptionRecurringInterval.month,
            prices=[
                ProductPriceFixedCreate(
                    amount_type=ProductPriceAmountType.fixed,
                    price_amount=1000,
                    price_currency=PresentmentCurrency.usd,
                )
            ],
        )

    errors = exc_info.value.errors()
    assert len(errors) == 1
    assert errors[0]["type"] in ("too_short", "too_long")
    assert errors[0]["loc"] == ("name",)


@pytest.mark.parametrize(
    ("price_currency", "price_amount"),
    [
        (PresentmentCurrency.usd, 49),
        (PresentmentCurrency.inr, 5000),
    ],
)
def test_product_price_fixed_minimum_amount(
    price_currency: PresentmentCurrency, price_amount: int
) -> None:
    with pytest.raises(ValidationError) as exc_info:
        ProductPriceFixedCreate(
            amount_type=ProductPriceAmountType.fixed,
            price_amount=price_amount,
            price_currency=price_currency,
        )

    errors = exc_info.value.errors()
    assert len(errors) == 1


@pytest.mark.parametrize(
    "payload",
    [
        {"trial_interval_count": 1},
        {"trial_interval": SubscriptionRecurringInterval.month},
    ],
)
def test_incomplete_trial_configuration(payload: dict[str, Any]) -> None:
    with pytest.raises(ValidationError) as exc_info:
        ProductCreateRecurring(
            name="Product",
            recurring_interval=SubscriptionRecurringInterval.month,
            prices=[
                ProductPriceFixedCreate(
                    amount_type=ProductPriceAmountType.fixed,
                    price_amount=1000,
                    price_currency=PresentmentCurrency.usd,
                )
            ],
            **payload,
        )

    errors = exc_info.value.errors()
    assert len(errors) == 1
    assert errors[0]["type"] == "missing"
    assert (
        errors[0]["msg"]
        == "Both trial_interval and trial_interval_count must be set together."
    )


class TestProductPriceMeteredUnitCreate:
    """Test ProductPriceMeteredUnitCreate schema validation."""

    def test_valid_cap_amount_none(self) -> None:
        """Test that cap_amount can be None."""
        schema = ProductPriceMeteredUnitCreate(
            amount_type=ProductPriceAmountType.metered_unit,
            price_currency=PresentmentCurrency.usd,
            unit_amount=Decimal("1.0"),
            meter_id=METER_ID,
            cap_amount=None,
        )
        assert schema.cap_amount is None

    def test_valid_cap_amount_zero(self) -> None:
        """Test that cap_amount can be 0."""
        schema = ProductPriceMeteredUnitCreate(
            amount_type=ProductPriceAmountType.metered_unit,
            price_currency=PresentmentCurrency.usd,
            unit_amount=Decimal("1.0"),
            meter_id=METER_ID,
            cap_amount=0,
        )
        assert schema.cap_amount == 0

    def test_valid_cap_amount_positive(self) -> None:
        """Test that cap_amount can be a positive integer."""
        schema = ProductPriceMeteredUnitCreate(
            amount_type=ProductPriceAmountType.metered_unit,
            price_currency=PresentmentCurrency.usd,
            unit_amount=Decimal("1.0"),
            meter_id=METER_ID,
            cap_amount=100_000,
        )
        assert schema.cap_amount == 100_000

    def test_valid_cap_amount_max_value(self) -> None:
        """Test that cap_amount can be the maximum allowed value."""
        schema = ProductPriceMeteredUnitCreate(
            amount_type=ProductPriceAmountType.metered_unit,
            price_currency=PresentmentCurrency.usd,
            unit_amount=Decimal("1.0"),
            meter_id=METER_ID,
            cap_amount=INT_MAX_VALUE,
        )
        assert schema.cap_amount == INT_MAX_VALUE

    def test_invalid_cap_amount_negative(self) -> None:
        """Test that cap_amount cannot be negative."""
        with pytest.raises(ValidationError) as exc_info:
            ProductPriceMeteredUnitCreate(
                amount_type=ProductPriceAmountType.metered_unit,
                price_currency=PresentmentCurrency.usd,
                unit_amount=Decimal("1.0"),
                meter_id=METER_ID,
                cap_amount=-1,
            )

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "greater_than_equal"
        assert errors[0]["loc"] == ("cap_amount",)

    def test_invalid_cap_amount_exceeds_max(self) -> None:
        """Test that cap_amount cannot exceed INT_MAX_VALUE."""
        with pytest.raises(ValidationError) as exc_info:
            ProductPriceMeteredUnitCreate(
                amount_type=ProductPriceAmountType.metered_unit,
                price_currency=PresentmentCurrency.usd,
                unit_amount=Decimal("1.0"),
                meter_id=METER_ID,
                cap_amount=INT_MAX_VALUE + 1,
            )

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "less_than_equal"
        assert errors[0]["loc"] == ("cap_amount",)

    def test_invalid_cap_amount_way_too_large(self) -> None:
        """Test that cap_amount cannot be extremely large values like in the bug report."""
        with pytest.raises(ValidationError) as exc_info:
            ProductPriceMeteredUnitCreate(
                amount_type=ProductPriceAmountType.metered_unit,
                price_currency=PresentmentCurrency.usd,
                unit_amount=Decimal("1.0"),
                meter_id=METER_ID,
                cap_amount=100_000_000_000,  # The value from the bug report
            )

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "less_than_equal"
        assert errors[0]["loc"] == ("cap_amount",)


class TestProductCardStatsFields:
    """Per-listing card-stat fields on Product schema (orders_count,
    review_count, review_rating_avg). These are populated only by the
    public listing endpoint (/v1/products/public) — defaults must
    keep every other surface (dashboard reads, individual product
    detail) unaffected.
    """

    def test_orders_count_defaults_to_zero(self) -> None:
        """orders_count must default to 0 so legacy fetches that don't
        set it serialise without error."""
        from polar.product.schemas import Product

        # Direct model_fields access — no need to build a full Product
        # (which requires prices/benefits/medias/attached_custom_fields)
        # to assert the field exists with the expected default.
        assert "orders_count" in Product.model_fields
        assert Product.model_fields["orders_count"].default == 0

    def test_review_count_defaults_to_zero(self) -> None:
        from polar.product.schemas import Product

        assert "review_count" in Product.model_fields
        assert Product.model_fields["review_count"].default == 0

    def test_review_rating_avg_defaults_to_none(self) -> None:
        """Rating avg defaults to None, not 0.0 — so the frontend
        knows the difference between 'no reviews yet' and '0-star
        average' (which can't actually happen since rating is 1-5)."""
        from polar.product.schemas import Product

        assert "review_rating_avg" in Product.model_fields
        assert Product.model_fields["review_rating_avg"].default is None

    def test_review_rating_avg_accepts_float(self) -> None:
        """Avg field must be a nullable float."""
        from polar.product.schemas import Product

        anno = Product.model_fields["review_rating_avg"].annotation
        # Optional[float] / float | None resolves to a Union — verify
        # both float and NoneType are valid by checking via
        # Pydantic's TypeAdapter rather than introspecting Union form.
        from pydantic import TypeAdapter

        adapter = TypeAdapter(anno)
        assert adapter.validate_python(4.5) == 4.5
        assert adapter.validate_python(None) is None
