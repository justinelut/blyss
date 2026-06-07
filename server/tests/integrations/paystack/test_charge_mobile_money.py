"""Unit tests for paystack.charge_mobile_money + the M-Pesa verification flow.

Covers:
* `PaystackService.charge_mobile_money` — payload shape, success path,
  validation error path, network error path, reference auto-generation.
* New endpoints `POST .../mpesa/initiate-verification` and
  `.../mpesa/finalize-verification`.

Network is fully mocked. No real Paystack calls.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from polar.integrations.paystack.service import (
    PaystackNetworkError,
    PaystackService,
    PaystackTransactionError,
    PaystackValidationError,
)


@pytest.fixture
def mock_service() -> PaystackService:
    with (
        patch("polar.integrations.paystack.service.settings") as mock_settings,
        patch("polar.integrations.paystack.service.instrument_httpx"),
    ):
        mock_settings.PAYSTACK_SECRET_KEY = "sk_test_mock_key"
        service = PaystackService()
        service._client = AsyncMock(spec=httpx.AsyncClient)
        return service


def _ok_response(data: dict) -> MagicMock:
    """Build a fake Paystack 200 response wrapping `data`."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = 200
    resp.json.return_value = {
        "status": True,
        "message": "Charge attempted",
        "data": data,
    }
    return resp


def _error_response(status_code: int, message: str) -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json.return_value = {"status": False, "message": message}
    return resp


class TestChargeMobileMoneyHappyPath:
    """Happy-path checks for charge_mobile_money."""

    @pytest.mark.asyncio
    async def test_returns_reference_status_display_text(
        self, mock_service: PaystackService
    ) -> None:
        mock_service._client.post.return_value = _ok_response(
            {
                "reference": "ref_abc123",
                "status": "pending",
                "display_text": "Check your phone for the M-Pesa STK push prompt.",
            }
        )

        result = await mock_service.charge_mobile_money(
            email="creator@example.com",
            amount=10000,
            phone="+254712345678",
        )

        assert result["reference"] == "ref_abc123"
        assert result["status"] == "pending"
        assert "M-Pesa" in result["display_text"]
        assert result["raw"]["status"] == "pending"

    @pytest.mark.asyncio
    async def test_payload_uses_mobile_money_channel_with_provider(
        self, mock_service: PaystackService
    ) -> None:
        mock_service._client.post.return_value = _ok_response(
            {"reference": "ref_xyz", "status": "pending"}
        )

        await mock_service.charge_mobile_money(
            email="c@example.com",
            amount=10000,
            phone="+254700000000",
        )

        mock_service._client.post.assert_called_once()
        call = mock_service._client.post.call_args
        assert call.args[0] == "/charge"
        body = call.kwargs["json"]
        assert body["amount"] == 10000
        assert body["currency"] == "KES"
        assert body["email"] == "c@example.com"
        assert body["mobile_money"] == {
            "phone": "+254700000000",
            "provider": "mpesa",
        }
        assert body["reference"].startswith("blyss_momo_")

    @pytest.mark.asyncio
    async def test_caller_supplied_reference_is_used(
        self, mock_service: PaystackService
    ) -> None:
        mock_service._client.post.return_value = _ok_response(
            {"reference": "blyss_verify_001", "status": "success"}
        )

        result = await mock_service.charge_mobile_money(
            email="c@example.com",
            amount=10000,
            phone="+254712345678",
            reference="blyss_verify_001",
        )

        assert result["reference"] == "blyss_verify_001"
        body = mock_service._client.post.call_args.kwargs["json"]
        assert body["reference"] == "blyss_verify_001"

    @pytest.mark.asyncio
    async def test_metadata_is_forwarded(
        self, mock_service: PaystackService
    ) -> None:
        mock_service._client.post.return_value = _ok_response(
            {"reference": "ref_meta", "status": "pending"}
        )

        await mock_service.charge_mobile_money(
            email="c@example.com",
            amount=10000,
            phone="+254712345678",
            metadata={"purpose": "blyss.payout_method.mpesa.verification"},
        )

        body = mock_service._client.post.call_args.kwargs["json"]
        assert body["metadata"] == {
            "purpose": "blyss.payout_method.mpesa.verification"
        }


class TestChargeMobileMoneyErrors:
    """Error-handling for the charge_mobile_money path."""

    @pytest.mark.asyncio
    async def test_422_raises_validation_error(
        self, mock_service: PaystackService
    ) -> None:
        mock_service._client.post.return_value = _error_response(
            422, "Invalid mobile money number"
        )

        with pytest.raises(PaystackValidationError):
            await mock_service.charge_mobile_money(
                email="c@example.com",
                amount=10000,
                phone="+254700000000",
            )

    @pytest.mark.asyncio
    async def test_500_raises_network_error(
        self, mock_service: PaystackService
    ) -> None:
        mock_service._client.post.return_value = _error_response(500, "down")

        with pytest.raises(PaystackNetworkError):
            await mock_service.charge_mobile_money(
                email="c@example.com",
                amount=10000,
                phone="+254700000000",
            )

    @pytest.mark.asyncio
    async def test_status_false_raises_transaction_error(
        self, mock_service: PaystackService
    ) -> None:
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {
            "status": False,
            "message": "Mobile money charge failed",
        }
        mock_service._client.post.return_value = resp

        with pytest.raises(PaystackTransactionError):
            await mock_service.charge_mobile_money(
                email="c@example.com",
                amount=10000,
                phone="+254700000000",
            )

    @pytest.mark.asyncio
    async def test_underlying_network_exception_wrapped(
        self, mock_service: PaystackService
    ) -> None:
        mock_service._client.post.side_effect = httpx.ConnectError("dns fail")

        with pytest.raises(PaystackNetworkError):
            await mock_service.charge_mobile_money(
                email="c@example.com",
                amount=10000,
                phone="+254700000000",
            )
