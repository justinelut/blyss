"""Pure-unit tests for the public paystack-settlements schema.

Validates the response shape that powers the dashboard's
BlyssPayoutLedger — the contract between the SQLAlchemy
PaystackSettlement model and the frontend's PaystackSettlement TS
interface.
"""

from datetime import datetime, timezone
from uuid import uuid4

from polar.models.paystack_settlement import (
    PaystackSettlement,
    PaystackSettlementStatus,
)
from polar.paystack_settlement.schemas import PaystackSettlementResponse


def _make_settlement(**overrides: object) -> PaystackSettlement:
    """Build a fresh in-memory PaystackSettlement (not committed)."""
    defaults: dict[str, object] = {
        "id": uuid4(),
        "created_at": datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc),
        "modified_at": None,
        "deleted_at": None,
        "organization_id": uuid4(),
        "paystack_transfer_id": "12345",
        "paystack_transfer_code": "TRF_abc",
        "paystack_subaccount_code": "ACCT_xyz",
        "amount": 800_000,  # 8000 KES in kobo
        "currency": "kes",
        "settled_at": datetime(2026, 6, 17, 14, 0, tzinfo=timezone.utc),
        "status": PaystackSettlementStatus.success,
        "recipient_name": "Jane Doe",
        "recipient_account_last4": "5678",
        "raw_event": {"event": "transfer.success"},
    }
    defaults.update(overrides)
    return PaystackSettlement(**defaults)  # type: ignore[arg-type]


class TestPaystackSettlementResponse:
    def test_round_trip_success(self) -> None:
        settlement = _make_settlement()
        response = PaystackSettlementResponse.model_validate(
            settlement, from_attributes=True
        )
        assert response.paystack_transfer_id == "12345"
        assert response.status == PaystackSettlementStatus.success
        assert response.amount == 800_000
        assert response.currency == "kes"
        assert response.recipient_name == "Jane Doe"
        assert response.recipient_account_last4 == "5678"

    def test_pending_no_settled_at(self) -> None:
        settlement = _make_settlement(
            status=PaystackSettlementStatus.pending,
            settled_at=None,
        )
        response = PaystackSettlementResponse.model_validate(
            settlement, from_attributes=True
        )
        assert response.status == PaystackSettlementStatus.pending
        assert response.settled_at is None

    def test_failed_carries_recipient(self) -> None:
        settlement = _make_settlement(
            status=PaystackSettlementStatus.failed,
        )
        response = PaystackSettlementResponse.model_validate(
            settlement, from_attributes=True
        )
        assert response.status == PaystackSettlementStatus.failed
        # Recipient info still present on failed settlements so the
        # creator knows which destination Paystack tried.
        assert response.recipient_name == "Jane Doe"

    def test_unmatched_settlement_org_id_null(self) -> None:
        settlement = _make_settlement(organization_id=None)
        response = PaystackSettlementResponse.model_validate(
            settlement, from_attributes=True
        )
        assert response.organization_id is None

    def test_status_enum_values(self) -> None:
        for status in [
            PaystackSettlementStatus.pending,
            PaystackSettlementStatus.success,
            PaystackSettlementStatus.failed,
            PaystackSettlementStatus.reversed,
        ]:
            settlement = _make_settlement(status=status)
            response = PaystackSettlementResponse.model_validate(
                settlement, from_attributes=True
            )
            assert response.status == status

    def test_serialises_to_dict(self) -> None:
        # The endpoint serialises this model back through Pydantic
        # before returning JSON — confirm the round-trip preserves
        # types (datetime → ISO string, UUID → str).
        settlement = _make_settlement()
        response = PaystackSettlementResponse.model_validate(
            settlement, from_attributes=True
        )
        dump = response.model_dump(mode="json")
        assert isinstance(dump["paystack_transfer_id"], str)
        assert isinstance(dump["amount"], int)
        assert isinstance(dump["settled_at"], str)
        assert isinstance(dump["organization_id"], str)
