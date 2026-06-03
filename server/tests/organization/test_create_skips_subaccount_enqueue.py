"""Locks in the invariant that org-creation does NOT auto-enqueue
Paystack subaccount creation.

Background:
- The legacy flow enqueued `paystack.organization.create_subaccount` on
  every org-create. That task called Paystack's /subaccount endpoint with
  only `business_name + percentage_charge`, which Paystack rejects (or
  silently leaves unverified) without `settlement_bank + account_number`.
  Result: every fresh org showed a spinning "Pending" pill on Settings →
  Payouts forever.
- The fix is to defer subaccount creation to the M-Pesa / bank verification
  endpoints, which know the settlement details. Org-create stays fast and
  side-effect-free except for the canonical `organization.created` event.

This test pins that behaviour so a future refactor can't silently
re-introduce the bad enqueue.
"""

from __future__ import annotations

import pytest
from pytest_mock import MockerFixture

from polar.auth.models import AuthSubject
from polar.models import User
from polar.organization.schemas import OrganizationCreate
from polar.organization.service import organization as organization_service
from polar.postgres import AsyncSession


@pytest.mark.asyncio
@pytest.mark.auth
class TestOrgCreateDoesNotEnqueuePaystackSubaccount:
    async def test_create_only_enqueues_organization_created(
        self,
        mocker: MockerFixture,
        auth_subject: AuthSubject[User],
        session: AsyncSession,
    ) -> None:
        """Org-create must enqueue ONLY `organization.created`. The legacy
        `paystack.organization.create_subaccount` job is no longer fired."""
        enqueue_job_mock = mocker.patch(
            "polar.organization.service.enqueue_job"
        )

        organization = await organization_service.create(
            session,
            OrganizationCreate(name="Lazy Subaccount Co", slug="lazy-subaccount-co"),
            auth_subject,
        )

        # Exactly one call, exactly the expected actor name.
        assert enqueue_job_mock.call_count == 1, (
            f"Expected one enqueue_job call (organization.created); "
            f"got {enqueue_job_mock.call_args_list}"
        )
        call = enqueue_job_mock.call_args_list[0]
        actor_name = call.args[0] if call.args else call.kwargs.get("actor_name")
        assert actor_name == "organization.created"

        # And the Paystack actor name is specifically NOT among the calls.
        all_actors = [
            (c.args[0] if c.args else c.kwargs.get("actor_name"))
            for c in enqueue_job_mock.call_args_list
        ]
        assert "paystack.organization.create_subaccount" not in all_actors, (
            "Org-create must not auto-enqueue Paystack subaccount creation. "
            "Subaccount creation is deferred to verify_mpesa / bank setup."
        )

        # And the org row itself reflects the deferred state — no subaccount
        # code yet, status defaults to PENDING (which the UI must render as
        # 'Not configured', not as a spinning Pending pill).
        assert organization.subaccount_code is None
        assert organization.subaccount_status == "pending"
