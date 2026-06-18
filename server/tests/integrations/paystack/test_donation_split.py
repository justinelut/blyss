"""Unit test for the Paystack donation-split contract.

Donations / tips on Blyss go 100% to the creator (less Paystack's
processing fee, which the creator's subaccount absorbs). The
mechanism is a per-transaction override on `initialize_transaction`:

    transaction_charge = 0     # Blyss keeps 0 of the principal
    bearer = "subaccount"      # Creator pays Paystack's fee

This test verifies those parameters land in the outgoing Paystack
payload correctly. No HTTP / DB needed — patches the underlying
httpx client and asserts on the payload shape.
"""

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_fake_response(payload: dict[str, Any]) -> MagicMock:
    """Mock httpx.Response with the success JSON Paystack returns."""
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {
        "status": True,
        "message": "Authorization URL created",
        "data": {
            "authorization_url": "https://checkout.paystack.com/x",
            "access_code": "AC_xyz",
            "reference": payload.get("reference", "ref"),
        },
    }
    response.raise_for_status = MagicMock()
    return response


@pytest.mark.asyncio
async def test_donation_split_payload_has_zero_transaction_charge() -> None:
    """initialize_transaction with transaction_charge=0 + bearer='subaccount'
    must put both fields in the JSON payload Paystack receives."""
    from polar.integrations.paystack.service import paystack

    captured: dict[str, Any] = {}

    async def fake_post(url: str, **kwargs: Any) -> Any:
        captured["url"] = url
        captured["json"] = kwargs.get("json")
        return _make_fake_response(kwargs.get("json", {}))

    with patch.object(paystack._client, "post", AsyncMock(side_effect=fake_post)):
        await paystack.initialize_transaction(
            email="donor@example.com",
            amount=5000,  # KSh 50 in kobo
            currency="KES",
            reference="blyss_tip_test",
            subaccount="ACCT_creator123",
            transaction_charge=0,
            bearer="subaccount",
            metadata={"donation_id": "abc", "is_donation": True},
        )

    body = captured["json"]
    assert body is not None
    assert body["subaccount"] == "ACCT_creator123"
    assert body["transaction_charge"] == 0, (
        "transaction_charge must be 0 on a donation — Blyss takes no cut"
    )
    assert body["bearer"] == "subaccount", (
        "bearer must be 'subaccount' so the creator's share absorbs the "
        "Paystack processing fee instead of Blyss's main account"
    )


@pytest.mark.asyncio
async def test_product_sale_payload_omits_split_overrides() -> None:
    """The standard product-sale flow (no transaction_charge / bearer)
    must NOT add those fields to the payload — that would override the
    subaccount's configured 80/20 split for marketplace fees."""
    from polar.integrations.paystack.service import paystack

    captured: dict[str, Any] = {}

    async def fake_post(url: str, **kwargs: Any) -> Any:
        captured["json"] = kwargs.get("json")
        return _make_fake_response(kwargs.get("json", {}))

    with patch.object(paystack._client, "post", AsyncMock(side_effect=fake_post)):
        await paystack.initialize_transaction(
            email="buyer@example.com",
            amount=200000,  # KSh 2000
            currency="KES",
            reference="blyss_order_test",
            subaccount="ACCT_creator123",
        )

    body = captured["json"]
    assert "transaction_charge" not in body, (
        "Standard product flow must not override the subaccount's "
        "configured percentage_charge (the 20% marketplace fee)"
    )
    assert "bearer" not in body, (
        "Standard product flow must let Paystack default the fee bearer; "
        "Blyss currently absorbs Paystack's fee on product sales"
    )
