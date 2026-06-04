"""Endpoint tests for the bank-payout configuration flow.

Covers:
* `POST .../organizations/{id}/bank` — happy path (creates Paystack
  subaccount with bank settlement), failure path, and the
  update-existing-subaccount branch.
* `GET .../banks` — proxy returns the Paystack bank list.

All Paystack network calls are mocked at the service layer.
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


VALID_BANK_CODE = "01"  # KCB Bank
VALID_ACCOUNT_NUMBER = "1234567890"
VALID_ACCOUNT_NAME = "JANE WANJIRU"
EXPECTED_SUBACCOUNT_CODE = "ACCT_bank_test_xxx"


class TestConfigureBank:
    """`POST .../bank`."""

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_creates_subaccount_with_bank_settlement(
        self,
        client: AsyncClient,
        session: AsyncSession,
        organization: Organization,
    ) -> None:
        with patch(
            "polar.integrations.paystack.endpoints.paystack.create_subaccount",
            return_value={
                "subaccount_code": EXPECTED_SUBACCOUNT_CODE,
                "status": "active",
            },
        ) as mock_create:
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/bank",
                json={
                    "bank_code": VALID_BANK_CODE,
                    "account_number": VALID_ACCOUNT_NUMBER,
                    "account_name": VALID_ACCOUNT_NAME,
                },
            )

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["subaccount_code"] == EXPECTED_SUBACCOUNT_CODE
        assert body["payout_method"] == "bank"
        assert body["bank_code"] == VALID_BANK_CODE
        assert body["bank_account_number"] == VALID_ACCOUNT_NUMBER
        assert body["bank_account_name"] == VALID_ACCOUNT_NAME

        mock_create.assert_called_once()
        kwargs = mock_create.call_args.kwargs
        assert kwargs["settlement_bank"] == VALID_BANK_CODE
        assert kwargs["account_number"] == VALID_ACCOUNT_NUMBER
        assert kwargs["percentage_charge"] == 20.0

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_update_when_subaccount_exists(
        self,
        client: AsyncClient,
        session: AsyncSession,
        save_fixture: SaveFixture,
        organization: Organization,
    ) -> None:
        # Pre-condition: org already has a subaccount from a prior payout
        # configuration. Bank update should hit update_subaccount, not create.
        organization.subaccount_code = "ACCT_existing"
        await save_fixture(organization)

        with (
            patch(
                "polar.integrations.paystack.endpoints.paystack.update_subaccount",
                return_value={"subaccount_code": "ACCT_existing", "status": "active"},
            ) as mock_update,
            patch(
                "polar.integrations.paystack.endpoints.paystack.create_subaccount",
            ) as mock_create,
        ):
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/bank",
                json={
                    "bank_code": VALID_BANK_CODE,
                    "account_number": VALID_ACCOUNT_NUMBER,
                    "account_name": VALID_ACCOUNT_NAME,
                },
            )

        assert response.status_code == 200, response.text
        mock_update.assert_called_once()
        mock_create.assert_not_called()

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_invalid_payload_returns_422(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        response = await client.post(
            f"/v1/integrations/paystack/organizations/{organization.id}/bank",
            json={"bank_code": "", "account_number": "", "account_name": ""},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_paystack_failure_returns_422(
        self,
        client: AsyncClient,
        organization: Organization,
    ) -> None:
        with patch(
            "polar.integrations.paystack.endpoints.paystack.create_subaccount",
            side_effect=Exception("Paystack down"),
        ):
            response = await client.post(
                f"/v1/integrations/paystack/organizations/{organization.id}/bank",
                json={
                    "bank_code": VALID_BANK_CODE,
                    "account_number": VALID_ACCOUNT_NUMBER,
                    "account_name": VALID_ACCOUNT_NAME,
                },
            )
        assert response.status_code == 422
        assert "configure bank" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    @pytest.mark.auth(AuthSubjectFixture(subject="user"))
    async def test_unknown_organization_returns_404(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.post(
            f"/v1/integrations/paystack/organizations/{uuid4()}/bank",
            json={
                "bank_code": VALID_BANK_CODE,
                "account_number": VALID_ACCOUNT_NUMBER,
                "account_name": VALID_ACCOUNT_NAME,
            },
        )
        assert response.status_code == 404


class TestListBanks:
    """`GET .../banks` proxy."""

    @pytest.mark.asyncio
    async def test_returns_bank_list(
        self,
        client: AsyncClient,
    ) -> None:
        sample = [
            {"code": "01", "name": "KCB Bank", "country": "Kenya"},
            {"code": "03", "name": "Absa Bank Kenya", "country": "Kenya"},
        ]
        with patch(
            "polar.integrations.paystack.endpoints.paystack.list_banks",
            return_value=sample,
        ):
            response = await client.get(
                "/v1/integrations/paystack/banks?country=kenya"
            )
        assert response.status_code == 200
        body = response.json()
        assert body == sample

    @pytest.mark.asyncio
    async def test_paystack_failure_returns_502(
        self,
        client: AsyncClient,
    ) -> None:
        with patch(
            "polar.integrations.paystack.endpoints.paystack.list_banks",
            side_effect=Exception("network"),
        ):
            response = await client.get(
                "/v1/integrations/paystack/banks?country=kenya"
            )
        assert response.status_code == 502
