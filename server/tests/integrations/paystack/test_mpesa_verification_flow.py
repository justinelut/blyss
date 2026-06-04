"""Endpoint tests for the new M-Pesa verification flow.

Covers:
* `POST .../mpesa/initiate-verification` — happy path, validation error,
  Paystack-rejected charge.
* `POST .../mpesa/finalize-verification` — happy path (charge succeeded
  → org becomes active), failure path (charge failed → 422 +
  subaccount_status=failed), missing-mpesa-number guard.
* The legacy `POST .../mpesa` route still works (delegates to
  initiate-verification).

All Paystack network calls are mocked at the service layer via patch.
"""

from __future__ import annotations

from unittest.mock import patch
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from polar.models import Organization
from polar.models.organization import PayoutMethod
from tests.fixtures.auth import AuthSubjectFixture
from tests.fixtures.database import SaveFixture


VALID_PHONE = "+254712345678"
VERIFY_REFERENCE = "blyss_verify_ref_001"


class TestInitiateMPesaVerification:
    """`POST .../mpesa/initiate-verification`."""

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_happy_path_charges_and_persists_number(
        self,
        client: AsyncClient,
        session: AsyncSession,
        organization: Organization,
    ) -> None:
        with patch(
            "polar.integrations.paystack.endpoints.paystack.charge_mobile_money",
            return_value={
                "reference": VERIFY_REFERENCE,
                "status": "pending",
                "display_text": "Check your phone",
                "raw": {},
            },
        ) as mock_charge:
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}"
                f"/mpesa/initiate-verification",
                json={"mpesa_number": VALID_PHONE},
            )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["reference"] == VERIFY_REFERENCE
        assert body["status"] == "pending"
        assert "phone" in body["display_text"].lower()

        mock_charge.assert_called_once()
        call_kwargs = mock_charge.call_args.kwargs
        assert call_kwargs["amount"] == 10000  # KSh 100 in kobo
        assert call_kwargs["phone"] == VALID_PHONE
        assert call_kwargs["provider"] == "mpesa"

        # Re-fetch (test client expunges session between requests).
        from polar.organization.repository import OrganizationRepository
        repo = OrganizationRepository.from_session(session)
        refreshed = await repo.get_by_id(organization.id)
        assert refreshed is not None
        assert refreshed.mpesa_number == VALID_PHONE
        assert refreshed.mpesa_verified is False
        assert refreshed.payout_method == PayoutMethod.MPESA

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_rejects_invalid_phone_format(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        response = await client.post(
            f"/v1/integrations/paystack/organizations/{organization.id}"
            f"/mpesa/initiate-verification",
            json={"mpesa_number": "0712345678"},  # missing +254
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_paystack_charge_failure_returns_422(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        with patch(
            "polar.integrations.paystack.endpoints.paystack.charge_mobile_money",
            side_effect=Exception("Paystack rejected"),
        ):
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}"
                f"/mpesa/initiate-verification",
                json={"mpesa_number": VALID_PHONE},
            )
        assert response.status_code == 422
        assert "M-Pesa verification" in response.json()["detail"]

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_unknown_organization_returns_404(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.post(
            f"/v1/integrations/paystack/organizations/{uuid4()}"
            f"/mpesa/initiate-verification",
            json={"mpesa_number": VALID_PHONE},
        )
        assert response.status_code == 404


class TestFinalizeMPesaVerification:
    """`POST .../mpesa/finalize-verification`."""

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_charge_success_provisions_subaccount(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        # Pre-condition: org has an mpesa_number on file (initiate ran).
        organization.mpesa_number = VALID_PHONE
        organization.payout_method = PayoutMethod.MPESA
        await save_fixture(organization)

        with (
            patch(
                "polar.integrations.paystack.endpoints.paystack.verify_transaction",
                return_value={"status": "success", "reference": VERIFY_REFERENCE},
            ) as mock_verify,
            patch(
                "polar.integrations.paystack.endpoints.paystack.create_subaccount",
                return_value={
                    "subaccount_code": "ACCT_test_xxx",
                    "status": "active",
                },
            ) as mock_create,
        ):
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}"
                f"/mpesa/finalize-verification",
                json={"reference": VERIFY_REFERENCE},
            )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["mpesa_verified"] is True
        assert body["subaccount_code"] == "ACCT_test_xxx"
        assert body["subaccount_status"] == "active"

        mock_verify.assert_called_once_with(VERIFY_REFERENCE)
        mock_create.assert_called_once()
        sub_kwargs = mock_create.call_args.kwargs
        assert sub_kwargs["settlement_bank"] == "MPESA"
        assert sub_kwargs["account_number"] == VALID_PHONE
        assert sub_kwargs["percentage_charge"] == 20.0

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_charge_failed_marks_subaccount_failed(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        organization.mpesa_number = VALID_PHONE
        organization.payout_method = PayoutMethod.MPESA
        await save_fixture(organization)

        with patch(
            "polar.integrations.paystack.endpoints.paystack.verify_transaction",
            return_value={"status": "failed", "reference": VERIFY_REFERENCE},
        ):
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}"
                f"/mpesa/finalize-verification",
                json={"reference": VERIFY_REFERENCE},
            )

        assert response.status_code == 422
        assert "did not succeed" in response.json()["detail"]

        from polar.organization.repository import OrganizationRepository
        repo = OrganizationRepository.from_session(session)
        refreshed = await repo.get_by_id(organization.id)
        assert refreshed is not None
        assert str(refreshed.subaccount_status) == "failed"
        assert refreshed.mpesa_verified is False

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_missing_mpesa_number_returns_422(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        # Org has no mpesa_number on file — finalize should refuse.
        response = await client.post(
            f"/v1/integrations/paystack/organizations/{organization.id}"
            f"/mpesa/finalize-verification",
            json={"reference": VERIFY_REFERENCE},
        )
        assert response.status_code == 422
        assert "initiate-verification" in response.json()["detail"]

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_subaccount_creation_failure_returns_422(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        organization.mpesa_number = VALID_PHONE
        organization.payout_method = PayoutMethod.MPESA
        await save_fixture(organization)

        with (
            patch(
                "polar.integrations.paystack.endpoints.paystack.verify_transaction",
                return_value={"status": "success", "reference": VERIFY_REFERENCE},
            ),
            patch(
                "polar.integrations.paystack.endpoints.paystack.create_subaccount",
                side_effect=Exception("Paystack subaccount rejected"),
            ),
        ):
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}"
                f"/mpesa/finalize-verification",
                json={"reference": VERIFY_REFERENCE},
            )

        assert response.status_code == 422
        from polar.organization.repository import OrganizationRepository
        repo = OrganizationRepository.from_session(session)
        refreshed = await repo.get_by_id(organization.id)
        assert refreshed is not None
        assert str(refreshed.subaccount_status) == "failed"
        # The charge succeeded, so mpesa_verified stays True.
        assert refreshed.mpesa_verified is True


class TestLegacyConfigureMpesa:
    """`POST .../mpesa` should still work (delegates to initiate)."""

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_legacy_route_delegates(
        self,
        client: AsyncClient,
        session: AsyncSession,
        organization: Organization,
    ) -> None:
        with patch(
            "polar.integrations.paystack.endpoints.paystack.charge_mobile_money",
            return_value={
                "reference": "ref_legacy",
                "status": "pending",
                "display_text": "Check your phone",
                "raw": {},
            },
        ):
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/mpesa",
                json={"mpesa_number": VALID_PHONE},
            )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["reference"] == "ref_legacy"
        assert body["status"] == "pending"
