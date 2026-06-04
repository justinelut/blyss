"""Tests for inline Paystack charge endpoints.

Covers: GET payment-channels, POST charge, POST charge/submit/{action},
GET payment-status.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient

from polar.models import Checkout, Product
from tests.fixtures.database import SaveFixture
from tests.fixtures.random_objects import create_checkout


@pytest.fixture(
    params=[
        "/v1/checkouts",
        "/v1/checkouts/custom",
    ]
)
def api_prefix(request: pytest.FixtureRequest) -> str:
    return request.param


@pytest_asyncio.fixture
async def checkout_open(save_fixture: SaveFixture, product: Product) -> Checkout:
    return await create_checkout(
        save_fixture,
        products=[product],
        client_secret="cs_inline_test",
        payment_processor_metadata={},
    )


@pytest_asyncio.fixture
async def checkout_with_ref(save_fixture: SaveFixture, product: Product) -> Checkout:
    return await create_checkout(
        save_fixture,
        products=[product],
        client_secret="cs_ref_test",
        payment_processor_metadata={"charge_reference": "ref_abc", "charge_status": "pending"},
    )


@pytest.mark.asyncio
class TestGetPaymentChannels:
    async def test_not_existing(self, api_prefix: str, client: AsyncClient) -> None:
        response = await client.get(f"{api_prefix}/client/nonexistent/payment-channels")
        assert response.status_code == 404

    async def test_returns_channels(
        self, api_prefix: str, client: AsyncClient, checkout_open: Checkout
    ) -> None:
        response = await client.get(
            f"{api_prefix}/client/{checkout_open.client_secret}/payment-channels"
        )
        assert response.status_code == 200
        data = response.json()
        # Default product currency is USD — should get card only
        assert len(data) >= 1
        ids = [ch["id"] for ch in data]
        assert "card" in ids

    @patch("polar.checkout.endpoints.get_channels_for_currency")
    async def test_kes_channels(
        self,
        mock_get_ch,
        api_prefix: str,
        client: AsyncClient,
        checkout_open: Checkout,
    ) -> None:
        from polar.checkout.payment_channels import get_channels_for_currency as real_fn
        mock_get_ch.return_value = real_fn("KES")
        response = await client.get(
            f"{api_prefix}/client/{checkout_open.client_secret}/payment-channels"
        )
        assert response.status_code == 200
        data = response.json()
        ids = [ch["id"] for ch in data]
        assert "card" in ids
        assert "mobile_money" in ids
        assert "bank" in ids

    @patch("polar.checkout.endpoints.get_channels_for_currency")
    async def test_ngn_channels(
        self,
        mock_get_ch,
        api_prefix: str,
        client: AsyncClient,
        checkout_open: Checkout,
    ) -> None:
        from polar.checkout.payment_channels import get_channels_for_currency as real_fn
        mock_get_ch.return_value = real_fn("NGN")
        response = await client.get(
            f"{api_prefix}/client/{checkout_open.client_secret}/payment-channels"
        )
        assert response.status_code == 200
        data = response.json()
        ids = [ch["id"] for ch in data]
        assert len(ids) == 5
        assert "ussd" in ids

    @patch("polar.checkout.endpoints.get_channels_for_currency")
    async def test_ghs_channels(
        self,
        mock_get_ch,
        api_prefix: str,
        client: AsyncClient,
        checkout_open: Checkout,
    ) -> None:
        from polar.checkout.payment_channels import get_channels_for_currency as real_fn
        mock_get_ch.return_value = real_fn("GHS")
        response = await client.get(
            f"{api_prefix}/client/{checkout_open.client_secret}/payment-channels"
        )
        assert response.status_code == 200
        data = response.json()
        ids = [ch["id"] for ch in data]
        assert "mobile_money" in ids

    @patch("polar.checkout.endpoints.get_channels_for_currency")
    async def test_zar_channels(
        self,
        mock_get_ch,
        api_prefix: str,
        client: AsyncClient,
        checkout_open: Checkout,
    ) -> None:
        from polar.checkout.payment_channels import get_channels_for_currency as real_fn
        mock_get_ch.return_value = real_fn("ZAR")
        response = await client.get(
            f"{api_prefix}/client/{checkout_open.client_secret}/payment-channels"
        )
        assert response.status_code == 200
        data = response.json()
        ids = [ch["id"] for ch in data]
        assert "eft" in ids
        assert "qr" in ids


@pytest.mark.asyncio
class TestPostCharge:
    @patch("polar.checkout.endpoints.paystack_service")
    async def test_card_charge(
        self,
        mock_ps,
        api_prefix: str,
        client: AsyncClient,
        checkout_open: Checkout,
    ) -> None:
        mock_ps.charge = AsyncMock(return_value={
            "reference": "ref_card_1",
            "status": "send_otp",
            "display_text": "Enter the OTP sent to your phone",
            "raw": {"reference": "ref_card_1", "status": "send_otp"},
        })
        response = await client.post(
            f"{api_prefix}/client/{checkout_open.client_secret}/charge",
            json={
                "channel": "card",
                "card_number": "4084084084084081",
                "cvv": "408",
                "expiry_month": "01",
                "expiry_year": "30",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reference"] == "ref_card_1"
        assert data["status"] == "send_otp"

    @patch("polar.checkout.endpoints.paystack_service")
    async def test_mobile_money_charge(
        self,
        mock_ps,
        api_prefix: str,
        client: AsyncClient,
        checkout_open: Checkout,
    ) -> None:
        mock_ps.charge = AsyncMock(return_value={
            "reference": "ref_momo_1",
            "status": "pending",
            "display_text": "Check your phone for STK push",
            "raw": {"reference": "ref_momo_1", "status": "pending"},
        })
        response = await client.post(
            f"{api_prefix}/client/{checkout_open.client_secret}/charge",
            json={
                "channel": "mobile_money",
                "phone": "+254712345678",
                "provider": "mpesa",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reference"] == "ref_momo_1"
        assert data["status"] == "pending"

    async def test_card_missing_fields_returns_422(
        self, api_prefix: str, client: AsyncClient, checkout_open: Checkout
    ) -> None:
        response = await client.post(
            f"{api_prefix}/client/{checkout_open.client_secret}/charge",
            json={"channel": "card", "card_number": "4111111111111111"},
        )
        assert response.status_code == 422

    async def test_not_existing_checkout(
        self, api_prefix: str, client: AsyncClient
    ) -> None:
        response = await client.post(
            f"{api_prefix}/client/nonexist/charge",
            json={"channel": "card", "card_number": "4111111111111111", "cvv": "123", "expiry_month": "01", "expiry_year": "30"},
        )
        assert response.status_code == 404


@pytest.mark.asyncio
class TestPostChargeSubmit:
    @patch("polar.checkout.endpoints.paystack_service")
    async def test_submit_otp(
        self,
        mock_ps,
        api_prefix: str,
        client: AsyncClient,
        checkout_with_ref: Checkout,
    ) -> None:
        mock_ps.submit_charge_step = AsyncMock(return_value={
            "reference": "ref_abc",
            "status": "success",
            "display_text": "Approved",
            "raw": {"reference": "ref_abc", "status": "success"},
        })
        response = await client.post(
            f"{api_prefix}/client/{checkout_with_ref.client_secret}/charge/submit/otp",
            json={"value": "123456"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    async def test_invalid_action(
        self, api_prefix: str, client: AsyncClient, checkout_with_ref: Checkout
    ) -> None:
        response = await client.post(
            f"{api_prefix}/client/{checkout_with_ref.client_secret}/charge/submit/invalid",
            json={"value": "123"},
        )
        assert response.status_code == 404

    async def test_no_reference_returns_404(
        self, api_prefix: str, client: AsyncClient, checkout_open: Checkout
    ) -> None:
        response = await client.post(
            f"{api_prefix}/client/{checkout_open.client_secret}/charge/submit/otp",
            json={"value": "123456"},
        )
        assert response.status_code == 404


@pytest.mark.asyncio
class TestGetPaymentStatus:
    async def test_pending_no_reference(
        self,
        api_prefix: str,
        client: AsyncClient,
        checkout_open: Checkout,
    ) -> None:
        response = await client.get(
            f"{api_prefix}/client/{checkout_open.client_secret}/payment-status"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        assert "No charge initiated" in data["message"]

    @patch("polar.checkout.endpoints.paystack_service")
    async def test_success(
        self,
        mock_ps,
        api_prefix: str,
        client: AsyncClient,
        checkout_with_ref: Checkout,
    ) -> None:
        mock_ps.verify_transaction = AsyncMock(return_value={"status": "success"})
        response = await client.get(
            f"{api_prefix}/client/{checkout_with_ref.client_secret}/payment-status"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"

    @patch("polar.checkout.endpoints.paystack_service")
    async def test_failed(
        self,
        mock_ps,
        api_prefix: str,
        client: AsyncClient,
        checkout_with_ref: Checkout,
    ) -> None:
        mock_ps.verify_transaction = AsyncMock(return_value={
            "status": "failed",
            "gateway_response": "Declined",
        })
        response = await client.get(
            f"{api_prefix}/client/{checkout_with_ref.client_secret}/payment-status"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failed"

    @patch("polar.checkout.endpoints.paystack_service")
    async def test_requires_action(
        self,
        mock_ps,
        api_prefix: str,
        client: AsyncClient,
        checkout_with_ref: Checkout,
    ) -> None:
        mock_ps.verify_transaction = AsyncMock(side_effect=Exception("not found"))
        mock_ps.check_pending_charge = AsyncMock(return_value={
            "reference": "ref_abc",
            "status": "send_otp",
            "display_text": "Enter OTP",
            "raw": {},
        })
        response = await client.get(
            f"{api_prefix}/client/{checkout_with_ref.client_secret}/payment-status"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "requires_action"
        assert data["next_action"]["action"] == "otp"
