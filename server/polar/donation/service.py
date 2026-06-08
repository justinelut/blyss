import secrets
from uuid import UUID

import structlog

from polar.exceptions import PolarError
from polar.integrations.paystack.service import paystack as paystack_service
from polar.kit.pagination import PaginationParams
from polar.models import Donation, Organization
from polar.postgres import AsyncSession

from .repository import DonationRepository
from .schemas import (
    MAX_DONATION_AMOUNT,
    MIN_DONATION_AMOUNT,
    DonationChargeRequest,
)

log = structlog.get_logger()


class DonationError(PolarError): ...


class InvalidDonationAmountError(DonationError):
    def __init__(self, amount: int):
        self.amount = amount
        message = (
            f"Donation amount {amount} is invalid. Must be between 100 and 1000000."
        )
        super().__init__(message, 422)


class DonationNotFoundError(DonationError):
    def __init__(self, payment_reference: str):
        self.payment_reference = payment_reference
        message = f"Donation with payment reference {payment_reference} not found"
        super().__init__(message, 404)


class DonationService:
    async def initiate_donation(
        self,
        session: AsyncSession,
        organization_id: UUID,
        amount: int,
        donor_name: str,
        donor_email: str,
        message: str | None = None,
    ) -> tuple[Donation, str]:
        """
        Create donation record and initiate Paystack payment.
        Returns (donation, payment_url)
        """
        if amount < 100 or amount > 1000000:
            raise InvalidDonationAmountError(amount)

        repository = DonationRepository.from_session(session)

        payment_reference = f"donation_{secrets.token_urlsafe(16)}"

        donation = Donation(
            amount=amount,
            currency="KES",
            donor_name=donor_name,
            donor_email=donor_email,
            message=message,
            organization_id=organization_id,
            payment_reference=payment_reference,
            payment_status="pending",
        )

        donation = await repository.create(donation)

        from polar.organization.repository import OrganizationRepository

        org_repository = OrganizationRepository.from_session(session)
        organization = await org_repository.get_by_id(organization_id)

        if organization is None:
            raise DonationError(f"Organization {organization_id} not found", 404)

        if not organization.subaccount_code:
            raise DonationError(
                f"Organization {organization_id} does not have a Paystack subaccount configured",
                422,
            )

        paystack_response = await paystack_service.initialize_transaction(
            email=donor_email,
            amount=amount,
            currency="KES",
            reference=payment_reference,
            subaccount=organization.subaccount_code,
            metadata={
                "donation_id": str(donation.id),
                "organization_id": str(organization_id),
                "donor_name": donor_name,
            },
        )

        payment_url = paystack_response["authorization_url"]

        log.info(
            "donation.initiated",
            donation_id=donation.id,
            organization_id=organization_id,
            amount=amount,
            payment_reference=payment_reference,
        )

        return donation, payment_url

    async def confirm_donation(
        self,
        session: AsyncSession,
        payment_reference: str,
    ) -> Donation:
        """Confirm donation payment via Paystack webhook"""
        repository = DonationRepository.from_session(session)

        donation = await repository.get_by_payment_reference(payment_reference)
        if donation is None:
            raise DonationNotFoundError(payment_reference)

        transaction_data = await paystack_service.verify_transaction(
            payment_reference, session=session
        )

        if transaction_data.get("status") == "success":
            donation.payment_status = "success"
        else:
            donation.payment_status = "failed"

        session.add(donation)

        log.info(
            "donation.confirmed",
            donation_id=donation.id,
            payment_reference=payment_reference,
            payment_status=donation.payment_status,
        )

        return donation

    async def get_creator_donations(
        self,
        session: AsyncSession,
        organization_id: UUID,
        pagination: PaginationParams,
    ) -> tuple[list[Donation], int]:
        """Get donation history for creator"""
        repository = DonationRepository.from_session(session)
        return await repository.get_creator_donations(organization_id, pagination)

    async def initiate_donation_charge(
        self,
        session: AsyncSession,
        *,
        organization: Organization,
        charge: DonationChargeRequest,
    ) -> tuple[Donation, dict]:
        """Create a pending Donation and fire an inline Paystack /charge.

        Mirrors the buyer-checkout inline charge flow so the donor never leaves
        Blyss. Returns (donation, paystack_charge_result). The result dict has
        keys: reference, status, display_text, raw.

        The charge is split to the creator's Paystack subaccount when present;
        otherwise it falls back to the Blyss main account (no subaccount field)
        so tipping still works for creators who haven't finished payout setup.
        """
        amount = charge.amount
        if amount < MIN_DONATION_AMOUNT or amount > MAX_DONATION_AMOUNT:
            raise InvalidDonationAmountError(amount)

        repository = DonationRepository.from_session(session)
        payment_reference = f"donation_{secrets.token_urlsafe(16)}"

        # donor_name is optional on the inline tip form; fall back to a neutral
        # label so the NOT NULL column and receipt rendering stay well-formed.
        donor_name = (charge.donor_name or "").strip() or "Anonymous"

        donation = Donation(
            amount=amount,
            currency="KES",
            donor_name=donor_name,
            donor_email=charge.donor_email,
            message=charge.message,
            organization_id=organization.id,
            payment_reference=payment_reference,
            payment_status="pending",
        )
        donation = await repository.create(donation)

        payload: dict = {
            "email": charge.donor_email,
            "amount": amount,
            "currency": "KES",
            "reference": payment_reference,
            "metadata": {
                "donation_id": str(donation.id),
                "organization_id": str(organization.id),
                "donor_name": donor_name,
            },
        }
        # Split to the creator subaccount when configured; else Blyss main.
        if organization.subaccount_code:
            payload["subaccount"] = organization.subaccount_code

        _apply_channel_payload(payload, charge)

        result = await paystack_service.charge(payload, session=session)

        # Persist the returned reference + status (reference may be echoed back).
        donation.payment_reference = result.get("reference") or payment_reference
        status = result.get("status")
        if status == "success":
            donation.payment_status = "success"
        elif status == "failed":
            donation.payment_status = "failed"
        else:
            donation.payment_status = "pending"
        session.add(donation)

        log.info(
            "donation.charge.initiated",
            donation_id=donation.id,
            organization_id=organization.id,
            payment_reference=donation.payment_reference,
            channel=charge.channel,
            status=donation.payment_status,
        )

        return donation, result

    async def submit_donation_charge_step(
        self,
        session: AsyncSession,
        *,
        payment_reference: str,
        action: str,
        value: str,
    ) -> dict:
        """Submit an OTP/PIN/phone/birthday for a pending donation charge."""
        repository = DonationRepository.from_session(session)
        donation = await repository.get_by_payment_reference(payment_reference)
        if donation is None:
            raise DonationNotFoundError(payment_reference)

        result = await paystack_service.submit_charge_step(
            action, payment_reference, value, session=session
        )

        status = result.get("status")
        if status == "success":
            donation.payment_status = "success"
        elif status == "failed":
            donation.payment_status = "failed"
        session.add(donation)
        return result

    async def get_donation_payment_status(
        self,
        session: AsyncSession,
        *,
        payment_reference: str,
    ) -> dict:
        """Resolve the live status of a donation charge for the poller.

        Returns a dict shaped like DonationPaymentStatus:
        {status, message, next_action}. Persists terminal status transitions.
        """
        repository = DonationRepository.from_session(session)
        donation = await repository.get_by_payment_reference(payment_reference)
        if donation is None:
            raise DonationNotFoundError(payment_reference)

        # Fast path: already terminal in our DB.
        if donation.payment_status in ("success", "failed"):
            return {
                "status": donation.payment_status,
                "message": (
                    "Thank you! Your tip was received."
                    if donation.payment_status == "success"
                    else "The payment did not go through."
                ),
                "next_action": None,
            }

        # Verify against Paystack.
        try:
            tx = await paystack_service.verify_transaction(
                payment_reference, session=session
            )
            tx_status = tx.get("status")
            if tx_status == "success":
                donation.payment_status = "success"
                session.add(donation)
                return {
                    "status": "success",
                    "message": "Thank you! Your tip was received.",
                    "next_action": None,
                }
            if tx_status == "failed":
                donation.payment_status = "failed"
                session.add(donation)
                return {
                    "status": "failed",
                    "message": tx.get("gateway_response", "The payment failed."),
                    "next_action": None,
                }
        except Exception:
            # Fall through to pending-charge inspection below.
            pass

        try:
            pending = await paystack_service.check_pending_charge(payment_reference)
            p_status = pending.get("status")
            if p_status == "success":
                donation.payment_status = "success"
                session.add(donation)
                return {
                    "status": "success",
                    "message": "Thank you! Your tip was received.",
                    "next_action": None,
                }
            if p_status in ("send_otp", "send_pin", "send_phone", "send_birthday"):
                action = p_status.replace("send_", "")
                return {
                    "status": "requires_action",
                    "message": pending.get("display_text"),
                    "next_action": {
                        "action": action,
                        "display_text": pending.get("display_text"),
                    },
                }
        except Exception:
            pass

        return {"status": "pending", "message": None, "next_action": None}


def _apply_channel_payload(payload: dict, charge: DonationChargeRequest) -> None:
    """Translate the channel discriminator + fields into a Paystack /charge
    payload (same mapping as the buyer-checkout flow)."""
    ch = charge.channel
    if ch == "card":
        payload["card"] = {
            "number": charge.card_number,
            "cvv": charge.cvv,
            "expiry_month": charge.expiry_month,
            "expiry_year": charge.expiry_year,
        }
        if charge.pin:
            payload["pin"] = charge.pin
    elif ch == "mobile_money":
        payload["mobile_money"] = {
            "phone": charge.phone,
            "provider": charge.provider or "Mpesa",
        }
    elif ch == "bank":
        payload["bank"] = {
            "code": charge.bank_code,
            "account_number": charge.bank_account_number,
        }
    elif ch == "bank_transfer":
        payload["bank_transfer"] = {"account_expires_at": charge.account_expires_at}
    elif ch == "ussd":
        payload["ussd"] = {"type": charge.ussd_type}
    elif ch == "qr":
        payload["qr"] = {"provider": charge.qr_provider}
    elif ch == "eft":
        payload["eft"] = {"provider": charge.eft_provider}


donation_service = DonationService()
