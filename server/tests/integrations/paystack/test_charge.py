"""Tests for generic charge(), submit_charge_step(), check_pending_charge().

Covers happy path, 401/422/5xx error paths, and masked logging assertions.
"""

from __future__ import annotations

import logging
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from polar.integrations.paystack.service import (
    PaystackAuthenticationError,
    PaystackNetworkError,
    PaystackService,
    PaystackTransactionError,
    PaystackValidationError,
)


@pytest.fixture
def svc() -> PaystackService:
    with (
        patch("polar.integrations.paystack.service.settings") as mock_settings,
        patch("polar.integrations.paystack.service.instrument_httpx"),
    ):
        mock_settings.PAYSTACK_SECRET_KEY = "sk_test_mock"
        service = PaystackService()
        service._client = AsyncMock(spec=httpx.AsyncClient)
        return service


def _ok(data: dict, message: str = "Charge attempted") -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = 200
    resp.json.return_value = {"status": True, "message": message, "data": data}
    return resp


def _err(status_code: int, message: str = "Error") -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json.return_value = {"status": False, "message": message}
    return resp


# ──── charge() ────


class TestChargeHappyPath:
    @pytest.mark.asyncio
    async def test_returns_reference_status_display_text(self, svc: PaystackService):
        svc._client.post.return_value = _ok(
            {"reference": "ref_1", "status": "pending", "display_text": "Enter OTP"}
        )
        result = await svc.charge({"email": "a@b.c", "amount": 5000})
        assert result["reference"] == "ref_1"
        assert result["status"] == "pending"
        assert result["display_text"] == "Enter OTP"
        assert result["raw"]["status"] == "pending"

    @pytest.mark.asyncio
    async def test_posts_to_charge_endpoint(self, svc: PaystackService):
        svc._client.post.return_value = _ok({"reference": "r", "status": "success"})
        await svc.charge({"email": "x@y.z", "amount": 100, "card": {"number": "4111111111111111"}})
        svc._client.post.assert_called_once()
        assert svc._client.post.call_args.args[0] == "/charge"


class TestChargeErrors:
    @pytest.mark.asyncio
    async def test_401_raises_auth_error(self, svc: PaystackService):
        svc._client.post.return_value = _err(401)
        with pytest.raises(PaystackAuthenticationError):
            await svc.charge({"email": "a@b.c", "amount": 100})

    @pytest.mark.asyncio
    async def test_422_raises_validation_error(self, svc: PaystackService):
        svc._client.post.return_value = _err(422, "Invalid card")
        with pytest.raises(PaystackValidationError):
            await svc.charge({"email": "a@b.c", "amount": 100})

    @pytest.mark.asyncio
    async def test_500_raises_network_error(self, svc: PaystackService):
        svc._client.post.return_value = _err(500)
        with pytest.raises(PaystackNetworkError):
            await svc.charge({"email": "a@b.c", "amount": 100})

    @pytest.mark.asyncio
    async def test_status_false_raises_transaction_error(self, svc: PaystackService):
        resp = MagicMock(spec=httpx.Response)
        resp.status_code = 200
        resp.json.return_value = {"status": False, "message": "Charge failed"}
        svc._client.post.return_value = resp
        with pytest.raises(PaystackTransactionError):
            await svc.charge({"email": "a@b.c", "amount": 100})

    @pytest.mark.asyncio
    async def test_network_exception_wrapped(self, svc: PaystackService):
        svc._client.post.side_effect = httpx.ConnectError("timeout")
        with pytest.raises(PaystackNetworkError):
            await svc.charge({"email": "a@b.c", "amount": 100})


class TestChargeMaskedLogging:
    @pytest.mark.asyncio
    async def test_card_number_masked_in_logs(self, svc: PaystackService, caplog):
        svc._client.post.return_value = _ok({"reference": "r", "status": "success"})
        with caplog.at_level(logging.INFO):
            await svc.charge(
                {"email": "a@b.c", "amount": 100, "card": {"number": "4111111111111111", "cvv": "123"}}
            )
        # Full card number must not appear
        full_log = caplog.text
        assert "4111111111111111" not in full_log
        assert "123" not in full_log  # cvv stripped

    @pytest.mark.asyncio
    async def test_pin_omitted_from_logs(self, svc: PaystackService, caplog):
        svc._client.post.return_value = _ok({"reference": "r", "status": "success"})
        with caplog.at_level(logging.INFO):
            await svc.charge({"email": "a@b.c", "amount": 100, "pin": "1234"})
        assert "1234" not in caplog.text


# ──── submit_charge_step() ────


class TestSubmitChargeStep:
    @pytest.mark.asyncio
    async def test_happy_path_otp(self, svc: PaystackService):
        svc._client.post.return_value = _ok(
            {"reference": "ref_1", "status": "success", "display_text": "Approved"}
        )
        result = await svc.submit_charge_step("otp", "ref_1", "123456")
        assert result["status"] == "success"
        svc._client.post.assert_called_once()
        assert svc._client.post.call_args.args[0] == "/charge/submit_otp"

    @pytest.mark.asyncio
    async def test_invalid_action_raises(self, svc: PaystackService):
        with pytest.raises(PaystackValidationError):
            await svc.submit_charge_step("invalid", "ref", "val")

    @pytest.mark.asyncio
    async def test_401_raises_auth(self, svc: PaystackService):
        svc._client.post.return_value = _err(401)
        with pytest.raises(PaystackAuthenticationError):
            await svc.submit_charge_step("pin", "ref", "1234")

    @pytest.mark.asyncio
    async def test_422_raises_validation(self, svc: PaystackService):
        svc._client.post.return_value = _err(422, "Invalid OTP")
        with pytest.raises(PaystackValidationError):
            await svc.submit_charge_step("otp", "ref", "000")

    @pytest.mark.asyncio
    async def test_500_raises_network(self, svc: PaystackService):
        svc._client.post.return_value = _err(500)
        with pytest.raises(PaystackNetworkError):
            await svc.submit_charge_step("birthday", "ref", "1990-01-01")

    @pytest.mark.asyncio
    async def test_network_exception_wrapped(self, svc: PaystackService):
        svc._client.post.side_effect = httpx.TimeoutException("timeout")
        with pytest.raises(PaystackNetworkError):
            await svc.submit_charge_step("phone", "ref", "+2547")


# ──── check_pending_charge() ────


class TestCheckPendingCharge:
    @pytest.mark.asyncio
    async def test_happy_path(self, svc: PaystackService):
        svc._client.get.return_value = _ok(
            {"reference": "ref_1", "status": "pending", "display_text": "Waiting..."}
        )
        result = await svc.check_pending_charge("ref_1")
        assert result["status"] == "pending"
        svc._client.get.assert_called_once()
        assert svc._client.get.call_args.args[0] == "/charge/ref_1"

    @pytest.mark.asyncio
    async def test_401_raises_auth(self, svc: PaystackService):
        svc._client.get.return_value = _err(401)
        with pytest.raises(PaystackAuthenticationError):
            await svc.check_pending_charge("ref")

    @pytest.mark.asyncio
    async def test_422_raises_validation(self, svc: PaystackService):
        svc._client.get.return_value = _err(422, "Bad ref")
        with pytest.raises(PaystackValidationError):
            await svc.check_pending_charge("ref")

    @pytest.mark.asyncio
    async def test_500_raises_network(self, svc: PaystackService):
        svc._client.get.return_value = _err(500)
        with pytest.raises(PaystackNetworkError):
            await svc.check_pending_charge("ref")

    @pytest.mark.asyncio
    async def test_network_exception_wrapped(self, svc: PaystackService):
        svc._client.get.side_effect = httpx.ConnectError("fail")
        with pytest.raises(PaystackNetworkError):
            await svc.check_pending_charge("ref")
