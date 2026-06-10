"""Paystack create_refund builds the right payload + parses the response."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from polar.integrations.paystack.service import (
    PaystackService,
    PaystackTransactionError,
)

pytestmark = pytest.mark.asyncio


def _service_with_response(status_code: int, json_body: dict) -> PaystackService:
    svc = PaystackService()
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_body
    svc._client = MagicMock()
    svc._client.post = AsyncMock(return_value=resp)
    # No DB session -> env secret key path.
    return svc


async def test_create_refund_full_builds_payload() -> None:
    svc = _service_with_response(
        200, {"status": True, "data": {"id": 1, "status": "processed"}}
    )
    data = await svc.create_refund(transaction_reference="blyss_ref_1")
    assert data["status"] == "processed"
    # Full refund: no amount key in payload.
    _, kwargs = svc._client.post.call_args
    assert kwargs["json"] == {"transaction": "blyss_ref_1"}


async def test_create_refund_partial_includes_amount_and_note() -> None:
    svc = _service_with_response(200, {"status": True, "data": {"id": 2}})
    await svc.create_refund(
        transaction_reference="blyss_ref_2",
        amount=5000,
        merchant_note="duplicate",
    )
    _, kwargs = svc._client.post.call_args
    assert kwargs["json"] == {
        "transaction": "blyss_ref_2",
        "amount": 5000,
        "merchant_note": "duplicate",
    }


async def test_create_refund_failure_raises() -> None:
    svc = _service_with_response(
        200, {"status": False, "message": "Transaction not refundable"}
    )
    with pytest.raises(PaystackTransactionError):
        await svc.create_refund(transaction_reference="blyss_ref_3")
