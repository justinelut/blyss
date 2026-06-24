"""Pure-unit shape tests for MarketplaceStatsResponse.

These exist to lock in the response contract that the homepage
hero, /start landing, and /creators directory all depend on. If
any field is renamed or removed without updating the four
SSR-fetching frontends, these tests fail before tsc does.
"""

from polar.marketplace_stats.schemas import MarketplaceStatsResponse


class TestMarketplaceStatsResponseShape:
    """Shape lock for /v1/marketplace/stats."""

    def test_constructs_with_zero_values(self) -> None:
        """Fresh deploy: every counter is 0, currency is set."""
        resp = MarketplaceStatsResponse(
            creators=0,
            products=0,
            total_paid_out=0,
            total_earned=0,
            total_paid_out_currency="kes",
            settlements_count=0,
        )
        assert resp.creators == 0
        assert resp.total_paid_out == 0
        assert resp.total_earned == 0
        assert resp.total_paid_out_currency == "kes"
        assert resp.settlements_count == 0

    def test_constructs_with_real_values(self) -> None:
        resp = MarketplaceStatsResponse(
            creators=42,
            products=187,
            total_paid_out=1_500_000,
            total_earned=2_100_000,
            total_paid_out_currency="kes",
            settlements_count=12,
        )
        assert resp.creators == 42
        assert resp.products == 187
        assert resp.total_paid_out == 1_500_000
        assert resp.total_earned == 2_100_000
        assert resp.settlements_count == 12

    def test_total_earned_field_is_int(self) -> None:
        """total_earned must be an int (cents/minor units), not Decimal."""
        assert "total_earned" in MarketplaceStatsResponse.model_fields
        # Pydantic resolves int as the annotation.
        anno = MarketplaceStatsResponse.model_fields["total_earned"].annotation
        assert anno is int

    def test_serialises_to_camelcase_or_snakecase(self) -> None:
        """Frontend reads snake_case keys directly off the response."""
        resp = MarketplaceStatsResponse(
            creators=1,
            products=1,
            total_paid_out=0,
            total_earned=500,
            total_paid_out_currency="kes",
            settlements_count=0,
        )
        dumped = resp.model_dump()
        # All four fields the frontend SSR readers depend on:
        assert dumped["creators"] == 1
        assert dumped["products"] == 1
        assert dumped["total_paid_out"] == 0
        assert dumped["total_earned"] == 500
        assert dumped["total_paid_out_currency"] == "kes"
        assert dumped["settlements_count"] == 0
