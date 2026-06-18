"""End-to-end test for the donation.notify actor's email dispatch.

Guarantees that for every successful tip, BOTH emails fire:
  1. Donor thank-you receipt
  2. Creator notification

Mocks the repos + enqueue_job so we don't touch DB or Resend. The
test imports the underlying `notify_donation` async function (the
@actor wrapper returns the bare function in Polar's setup) and calls
it directly. Verifies enqueue_job is called twice with the right
to_email_addr in each message body — once for donor, once for creator.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4


def _make_donation(**overrides):
    d = MagicMock()
    d.id = uuid4()
    d.organization_id = uuid4()
    d.amount = 5000
    d.currency = "KES"
    d.donor_email = "donor@example.com"
    d.donor_name = "Jane"
    d.message = "Keep up the great work!"
    d.payment_reference = "blyss_tip_test_ref"
    d.payment_status = "succeeded"
    for k, v in overrides.items():
        setattr(d, k, v)
    return d


def _make_org(**overrides):
    o = MagicMock()
    o.id = uuid4()
    o.slug = "test-creator"
    o.name = "Test Creator"
    o.email = "creator@example.com"
    o.notification_settings = {"new_order": True, "new_subscription": True}
    for k, v in overrides.items():
        setattr(o, k, v)
    return o


async def _run(donation, organization):
    """Call notify_donation with patched repos + capture enqueue_job calls."""
    captured = []

    def fake_enqueue(actor_name, **kwargs):
        captured.append({"actor_name": actor_name, **kwargs})

    # Mock AsyncSessionMaker context manager — the actor uses
    # `async with AsyncSessionMaker() as session:` then passes session
    # into the repo factories which are also mocked.
    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=MagicMock())
    session_cm.__aexit__ = AsyncMock(return_value=None)

    # Polar's @actor decorator wraps the fn with `async with
    # JobQueueManager.open(...)` which needs a Redis connection. The
    # JobQueueManager is unrelated to the email dispatch we're
    # testing — patch its .open() to a no-op async context manager.
    job_cm = MagicMock()
    job_cm.__aenter__ = AsyncMock(return_value=None)
    job_cm.__aexit__ = AsyncMock(return_value=None)

    with patch(
        "polar.worker.RedisMiddleware.get",
        MagicMock(return_value=None),
    ), patch(
        "polar.worker.JobQueueManager.open",
        MagicMock(return_value=job_cm),
    ), patch(
        "polar.donation.tasks.AsyncSessionMaker",
        MagicMock(return_value=session_cm),
    ), patch(
        "polar.donation.repository.DonationRepository.from_session",
        MagicMock(
            return_value=MagicMock(get_by_id=AsyncMock(return_value=donation))
        ),
    ), patch(
        "polar.organization.repository.OrganizationRepository.from_session",
        MagicMock(
            return_value=MagicMock(get_by_id=AsyncMock(return_value=organization))
        ),
    ), patch(
        "polar.donation.tasks.enqueue_job",
        side_effect=fake_enqueue,
    ):
        from polar.donation.tasks import notify_donation
        await notify_donation(donation.id)

    return captured


def main() -> int:
    failed = 0

    # 1. Happy path: BOTH emails fire
    donation = _make_donation()
    org = _make_org()
    captured = asyncio.run(_run(donation, org))
    email_calls = [c for c in captured if c["actor_name"] == "email.send"]
    if len(email_calls) != 2:
        print(
            f"FAIL test_both_emails_fire: expected 2 email.send enqueues, got {len(email_calls)}"
        )
        for i, c in enumerate(email_calls):
            print(f"  call[{i}].to={c.get('to_email_addr')}")
        failed += 1
    else:
        recipients = sorted(c["to_email_addr"] for c in email_calls)
        if recipients != ["creator@example.com", "donor@example.com"]:
            print(f"FAIL: recipients={recipients}")
            failed += 1
        else:
            print("PASS test_both_emails_fire (donor + creator)")

    # 2. Creator opt-out: donor still fires, creator skipped
    org_optout = _make_org(
        notification_settings={"new_order": False, "new_subscription": True}
    )
    captured = asyncio.run(_run(donation, org_optout))
    creator_calls = [
        c for c in captured
        if c["actor_name"] == "email.send"
        and c.get("to_email_addr") == "creator@example.com"
    ]
    donor_calls = [
        c for c in captured
        if c["actor_name"] == "email.send"
        and c.get("to_email_addr") == "donor@example.com"
    ]
    if len(creator_calls) != 0 or len(donor_calls) != 1:
        print(
            f"FAIL test_creator_optout: creator_calls={len(creator_calls)}, donor_calls={len(donor_calls)}"
        )
        failed += 1
    else:
        print("PASS test_creator_optout (donor still fires)")

    # 3. Missing donor email: only creator fires
    donation_no_donor_email = _make_donation(donor_email=None)
    captured = asyncio.run(_run(donation_no_donor_email, org))
    email_calls = [c for c in captured if c["actor_name"] == "email.send"]
    if len(email_calls) != 1 or email_calls[0]["to_email_addr"] != "creator@example.com":
        print(
            f"FAIL test_no_donor_email: expected only creator call, got {[c.get('to_email_addr') for c in email_calls]}"
        )
        failed += 1
    else:
        print("PASS test_no_donor_email (creator still fires)")

    # 4. Missing creator email: only donor fires
    org_no_email = _make_org(email=None)
    captured = asyncio.run(_run(donation, org_no_email))
    email_calls = [c for c in captured if c["actor_name"] == "email.send"]
    if len(email_calls) != 1 or email_calls[0]["to_email_addr"] != "donor@example.com":
        print(
            f"FAIL test_no_creator_email: expected only donor call, got {[c.get('to_email_addr') for c in email_calls]}"
        )
        failed += 1
    else:
        print("PASS test_no_creator_email (donor still fires)")

    # 5. From-address is hello@blyss.co.ke (not legacy notifications.blyss.co.ke)
    captured = asyncio.run(_run(donation, org))
    email_calls = [c for c in captured if c["actor_name"] == "email.send"]
    bad = [
        c for c in email_calls
        if "notifications.blyss.co.ke" in (c.get("from_email_addr") or "")
    ]
    if bad:
        print(
            f"FAIL test_no_legacy_from: {len(bad)} emails still use notifications.blyss.co.ke"
        )
        failed += 1
    else:
        print("PASS test_no_legacy_from")

    # 6. html_content + subject are populated on every email
    captured = asyncio.run(_run(donation, org))
    email_calls = [c for c in captured if c["actor_name"] == "email.send"]
    for c in email_calls:
        if not c.get("html_content"):
            print(f"FAIL test_html_content: missing for {c.get('to_email_addr')}")
            failed += 1
        if not c.get("subject"):
            print(f"FAIL test_subject: missing for {c.get('to_email_addr')}")
            failed += 1
    else:
        print("PASS test_html_and_subject_populated")

    if failed == 0:
        print("\n✓ ALL donation-notify dispatch tests passed (6/6)")
        return 0
    print(f"\n✗ {failed} test(s) failed")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
