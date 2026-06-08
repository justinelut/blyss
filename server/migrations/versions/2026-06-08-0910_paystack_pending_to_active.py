"""flip orphan-pending Paystack subaccounts to active

Revision ID: paystack_pending_to_active_001
Revises: seed_product_categories_001
Create Date: 2026-06-08 09:10:00.000000

A bug in paystack/service.py mapped Paystack's `is_verified` flag
to our `subaccount_status`. Paystack uses `is_verified` for their
internal manual KYC review (takes days, gated behind support
review) — but the subaccount is FUNCTIONALLY active for split
payments the moment Paystack's `active: true` is returned.

Effect: every creator who finished M-Pesa verification got
`subaccount_status='pending'` even though splits would have
landed on their subaccount immediately. The dashboard read
`pending` and refused to mark the payouts setup complete,
blocking product creation.

Fix in service.py was to read `data.active` instead. This
migration backfills the existing rows so creators don't need
to re-verify.

Selection rule: subaccount_code is set, doesn't start with the
synthetic 'ACCT_test_' prefix (those are bypass leftovers,
already fixed by the runtime synthetic-code clearer in c27391a),
and subaccount_status is 'pending'. Any active or failed rows
left alone.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "paystack_pending_to_active_001"
down_revision = "seed_product_categories_001"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE organizations
            SET subaccount_status = 'active'
            WHERE subaccount_code IS NOT NULL
              AND subaccount_code NOT LIKE 'ACCT_test_%'
              AND subaccount_status = 'pending'
            """
        )
    )


def downgrade() -> None:
    # No safe downgrade — we don't track which rows were flipped
    # vs which were originally active. Leaving them active under
    # downgrade is the safer error mode (creators keep receiving
    # payouts) than reverting to pending (creators get blocked).
    pass
