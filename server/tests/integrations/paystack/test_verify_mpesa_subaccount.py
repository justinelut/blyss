"""Tests for the lazy Paystack subaccount creation in verify_mpesa.

Background:
- Old flow: org-create enqueued a subaccount task that called Paystack with
  only business_name + percentage_charge. Paystack rejects that → status
  stuck on "pending" forever.
- New flow: org-create does nothing Paystack-side. verify_mpesa creates the
  subaccount lazily with full settlement details (settlement_bank=mpesa,
  account_number=mpesa_number) when no subaccount_code exists.

These tests pin the three branches:
1. No existing subaccount → create.
2. Existing subaccount → update.
3. Paystack call fails → mark failed, surface 422.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from polar.integrations.paystack.endpoints import verify_mpesa
from polar.models import Organization


def _make_org(*, subaccount_code: str | None, subaccount_status: str = "pending"):
    org = MagicMock(spec=Organization)
    org.id = uuid4()
    org.name = "Lagos Beats Studio"
    org.mpesa_number = "+254712345678"
    org.mpesa_verified = False
    org.subaccount_code = subaccount_code
    org.subaccount_status = subaccount_status
    return org


@pytest.mark.asyncio
class TestVerifyMpesaCreatesSubaccountWhenNone:
    async def test_creates_with_full_settlement_details(self) -> None:
        """When subaccount_code is None, verify_mpesa MUST call
        paystack.create_subaccount with settlement_bank=mpesa and the
        verified M-Pesa number — not just update."""
        org = _make_org(subaccount_code=None)

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=org)
        # Update returns the same org for chaining
        mock_repo.update = AsyncMock(return_value=org)

        mock_paystack = MagicMock()
        mock_paystack.create_subaccount = AsyncMock(
            return_value={
                "subaccount_code": "ACCT_freshcreated",
                "status": "active",
                "business_name": "Lagos Beats Studio",
                "percentage_charge": 20.0,
            }
        )
        mock_paystack.update_subaccount = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.paystack",
                mock_paystack,
            ),
            patch(
                "polar.integrations.paystack.endpoints.OrganizationSchema"
            ) as mock_schema,
        ):
            mock_repo_class.from_session.return_value = mock_repo
            mock_schema.model_validate.return_value = org

            await verify_mpesa(
                id=org.id,
                auth_subject=MagicMock(),
                session=MagicMock(),
            )

        # create was called with full settlement details
        mock_paystack.create_subaccount.assert_called_once_with(
            business_name="Lagos Beats Studio",
            settlement_bank="mpesa",
            account_number="+254712345678",
            percentage_charge=20.0,
        )
        # update_subaccount was NOT called — we only do that for existing codes
        mock_paystack.update_subaccount.assert_not_called()

        # repo.update was called twice: once for mpesa_verified, once for
        # subaccount_code + status
        update_calls = mock_repo.update.call_args_list
        assert len(update_calls) == 2

        first_call_dict = update_calls[0][1]["update_dict"]
        assert first_call_dict["mpesa_verified"] is True

        second_call_dict = update_calls[1][1]["update_dict"]
        assert second_call_dict["subaccount_code"] == "ACCT_freshcreated"
        assert second_call_dict["subaccount_status"] == "active"


@pytest.mark.asyncio
class TestVerifyMpesaUpdatesExistingSubaccount:
    async def test_updates_when_code_already_present(self) -> None:
        """When subaccount_code is set (legacy data), update instead of
        create. Status flips to 'active' on success."""
        org = _make_org(subaccount_code="ACCT_legacy123")

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=org)
        mock_repo.update = AsyncMock(return_value=org)

        mock_paystack = MagicMock()
        mock_paystack.update_subaccount = AsyncMock(return_value=None)
        mock_paystack.create_subaccount = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.paystack",
                mock_paystack,
            ),
            patch(
                "polar.integrations.paystack.endpoints.OrganizationSchema"
            ) as mock_schema,
        ):
            mock_repo_class.from_session.return_value = mock_repo
            mock_schema.model_validate.return_value = org

            await verify_mpesa(
                id=org.id,
                auth_subject=MagicMock(),
                session=MagicMock(),
            )

        mock_paystack.update_subaccount.assert_called_once_with(
            subaccount_code="ACCT_legacy123",
            settlement_bank="mpesa",
            account_number="+254712345678",
        )
        # create was NOT called
        mock_paystack.create_subaccount.assert_not_called()

        # repo.update called twice: mpesa_verified, then status=active
        update_calls = mock_repo.update.call_args_list
        assert len(update_calls) == 2
        assert update_calls[1][1]["update_dict"] == {"subaccount_status": "active"}


@pytest.mark.asyncio
class TestVerifyMpesaSubaccountFailureMarksFailed:
    async def test_create_failure_persists_failed_status_and_422s(self) -> None:
        """When Paystack create raises, persist subaccount_status='failed'
        and surface a 422 so the UI can offer Retry. The M-Pesa number stays
        marked verified — only the subaccount setup failed."""
        org = _make_org(subaccount_code=None)

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=org)
        mock_repo.update = AsyncMock(return_value=org)

        mock_paystack = MagicMock()
        mock_paystack.create_subaccount = AsyncMock(
            side_effect=Exception("Paystack rejected the request")
        )
        mock_paystack.update_subaccount = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.endpoints.OrganizationRepository"
            ) as mock_repo_class,
            patch(
                "polar.integrations.paystack.endpoints.paystack",
                mock_paystack,
            ),
            patch(
                "polar.integrations.paystack.endpoints.OrganizationSchema"
            ) as mock_schema,
        ):
            mock_repo_class.from_session.return_value = mock_repo
            mock_schema.model_validate.return_value = org

            with pytest.raises(HTTPException) as exc_info:
                await verify_mpesa(
                    id=org.id,
                    auth_subject=MagicMock(),
                    session=MagicMock(),
                )

        # 422 surfaces to the client (not a bare 500)
        assert exc_info.value.status_code == 422
        assert "retry" in exc_info.value.detail.lower()

        # And the failed status is persisted — Settings can show "Failed"
        # with a Retry button instead of a misleading "Pending" spinner.
        update_calls = mock_repo.update.call_args_list
        # First update was mpesa_verified=True; the LAST update is the
        # subaccount_status=failed write.
        assert update_calls[-1][1]["update_dict"] == {"subaccount_status": "failed"}
