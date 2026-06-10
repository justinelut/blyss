"""Earnings summary aggregate math (net = gross - fee - refunds)."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from polar.order.repository import OrderRepository

pytestmark = pytest.mark.asyncio


async def test_get_earnings_summary_computes_net(mocker) -> None:
    org_id = uuid.uuid4()

    # Stub the DB execution to return (gross, fee, refunded, count).
    result = MagicMock()
    result.one.return_value = (10000, 2000, 500, 3)
    session = MagicMock()
    session.execute = AsyncMock(return_value=result)

    repo = OrderRepository(session)
    summary = await repo.get_earnings_summary(org_id)

    assert summary["gross_amount"] == 10000
    assert summary["platform_fee_amount"] == 2000
    assert summary["refunded_amount"] == 500
    # net = 10000 - 2000 - 500
    assert summary["net_amount"] == 7500
    assert summary["orders_count"] == 3


async def test_get_earnings_summary_zero_orders(mocker) -> None:
    result = MagicMock()
    result.one.return_value = (0, 0, 0, 0)
    session = MagicMock()
    session.execute = AsyncMock(return_value=result)

    repo = OrderRepository(session)
    summary = await repo.get_earnings_summary(uuid.uuid4())

    assert summary == {
        "gross_amount": 0,
        "platform_fee_amount": 0,
        "refunded_amount": 0,
        "net_amount": 0,
        "orders_count": 0,
    }
