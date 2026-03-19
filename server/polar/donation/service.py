import secrets
from uuid import UUID

import structlog

from polar.exceptions import PolarError
from polar.integrations.paystack.service import paystack as paystack_service
from polar.kit.pagination import PaginationParams
from polar.models import Donation
from polar.postgres import AsyncSession

from .repository import DonationRepository

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

        transaction_data = await paystack_service.verify_transaction(payment_reference)

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


donation_service = DonationService()
