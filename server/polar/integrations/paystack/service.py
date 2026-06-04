from typing import Any

import httpx
import structlog

from polar.config import settings
from polar.exceptions import PolarError
from polar.logfire import instrument_httpx
from polar.logging import Logger

log: Logger = structlog.get_logger()


class PaystackError(PolarError):
    """Base exception for Paystack-related errors."""

    pass


class PaystackAuthenticationError(PaystackError):
    """Raised when API authentication fails."""

    def __init__(self, message: str):
        super().__init__(message, 401)


class PaystackValidationError(PaystackError):
    """Raised when API request validation fails."""

    def __init__(self, message: str, field: str | None = None):
        self.field = field
        super().__init__(message, 422)


class PaystackNetworkError(PaystackError):
    """Raised when network communication with Paystack fails."""

    def __init__(self, message: str):
        super().__init__(message, 503)


class PaystackTransactionError(PaystackError):
    """Raised when transaction processing fails."""

    def __init__(self, message: str, transaction_reference: str | None = None):
        self.transaction_reference = transaction_reference
        super().__init__(message, 422)


class PaystackService:
    """Service for interacting with Paystack API."""

    def __init__(self) -> None:
        """Initialize PaystackService with API credentials and HTTP client."""
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        self.base_url = "https://api.paystack.co"

        # Set up HTTP client with proper headers.
        # NOTE on User-Agent: api.paystack.co is fronted by Cloudflare. With a
        # bare Python User-Agent (httpx default) Cloudflare's bot management
        # returns HTTP 403 + error code 1010 ("owner has banned your access
        # based on your browser's signature"). A browser-style UA passes. We
        # pin a Chrome-on-Linux UA — Paystack does not advertise a programmatic
        # User-Agent allowlist publicly, so we use a stable browser fingerprint
        # rather than promising httpx's version stays unbanned.
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json",
                "User-Agent": (
                    "Mozilla/5.0 (X11; Linux x86_64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
            },
            timeout=30.0,
        )

        # Instrument the HTTP client for observability
        instrument_httpx(self._client)

    async def initialize_transaction(
        self,
        *,
        email: str,
        amount: int,
        currency: str = "KES",
        reference: str,
        subaccount: str | None = None,
        channels: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Initialize a payment transaction.

        Args:
            email: Customer email address
            amount: Amount in kobo (KES cents) - 100 kobo = 1 KES
            currency: Transaction currency (default: KES)
            reference: Unique transaction reference
            subaccount: Subaccount code for payment splitting (optional).
                When None, the full amount goes to Blyss's main Paystack
                account and creator earnings are tracked in Blyss's DB.
            channels: Restrict the channels Paystack offers the buyer
                (e.g. ["card", "mobile_money"]). When None, Paystack shows
                every channel enabled on the merchant account.
            metadata: Optional transaction metadata

        Returns:
            dict containing authorization_url and reference

        Raises:
            PaystackAuthenticationError: If API authentication fails
            PaystackValidationError: If request validation fails
            PaystackNetworkError: If network communication fails
            PaystackTransactionError: If transaction initialization fails
        """
        # Prepare request payload — only include subaccount when provided so
        # Paystack doesn't choke on a literal null value.
        payload: dict[str, Any] = {
            "email": email,
            "amount": amount,
            "currency": currency,
            "reference": reference,
        }
        if subaccount:
            payload["subaccount"] = subaccount
        if channels:
            payload["channels"] = channels
        if metadata:
            payload["metadata"] = metadata

        # Log the API call with sanitized parameters (no sensitive data)
        log.info(
            "paystack.transaction.initialize",
            email=email,
            amount=amount,
            currency=currency,
            reference=reference,
            subaccount=subaccount,
            has_metadata=metadata is not None,
        )

        try:
            # Make POST request to Paystack API
            response = await self._client.post(
                "/transaction/initialize",
                json=payload,
            )

            # Handle different response status codes
            if response.status_code == 401:
                error_message = "Paystack API authentication failed"
                log.error(
                    "paystack.api.error",
                    error_type="authentication",
                    status_code=response.status_code,
                )
                raise PaystackAuthenticationError(error_message)

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                log.error(
                    "paystack.api.error",
                    error_type="validation",
                    error_message=error_message,
                    status_code=response.status_code,
                )
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                log.error(
                    "paystack.api.error",
                    error_type="server_error",
                    status_code=response.status_code,
                )
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            # Parse successful response
            response_data = response.json()

            if not response_data.get("status"):
                error_message = response_data.get(
                    "message", "Transaction initialization failed"
                )
                log.error(
                    "paystack.transaction.initialize.failed",
                    error_message=error_message,
                    reference=reference,
                )
                raise PaystackTransactionError(error_message, reference)

            # Extract transaction data
            data = response_data.get("data", {})
            authorization_url = data.get("authorization_url")
            response_reference = data.get("reference")

            log.info(
                "paystack.transaction.initialize.success",
                reference=response_reference,
                has_authorization_url=authorization_url is not None,
            )

            return {
                "authorization_url": authorization_url,
                "reference": response_reference,
                "access_code": data.get("access_code"),
            }

        except httpx.HTTPError as e:
            log.error(
                "paystack.api.error",
                error_type="network",
                error_message=str(e),
            )
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )

    async def verify_transaction(self, reference: str) -> dict[str, Any]:
        """
        Verify a transaction status.

        Args:
            reference: Transaction reference to verify

        Returns:
            dict containing transaction status and details

        Raises:
            PaystackAuthenticationError: If API authentication fails
            PaystackValidationError: If request validation fails
            PaystackNetworkError: If network communication fails
            PaystackTransactionError: If transaction verification fails
        """
        # Log the API call
        log.info(
            "paystack.transaction.verify",
            reference=reference,
        )

        try:
            # Make GET request to Paystack API
            response = await self._client.get(
                f"/transaction/verify/{reference}",
            )

            # Handle different response status codes
            if response.status_code == 401:
                error_message = "Paystack API authentication failed"
                log.error(
                    "paystack.api.error",
                    error_type="authentication",
                    status_code=response.status_code,
                )
                raise PaystackAuthenticationError(error_message)

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                log.error(
                    "paystack.api.error",
                    error_type="validation",
                    error_message=error_message,
                    status_code=response.status_code,
                )
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                log.error(
                    "paystack.api.error",
                    error_type="server_error",
                    status_code=response.status_code,
                )
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            # Parse successful response
            response_data = response.json()

            if not response_data.get("status"):
                error_message = response_data.get(
                    "message", "Transaction verification failed"
                )
                log.error(
                    "paystack.transaction.verify.failed",
                    error_message=error_message,
                    reference=reference,
                )
                raise PaystackTransactionError(error_message, reference)

            # Extract transaction data
            data = response_data.get("data", {})
            transaction_status = data.get("status")

            log.info(
                "paystack.transaction.verify.success",
                reference=reference,
                status=transaction_status,
            )

            return data

        except httpx.HTTPError as e:
            log.error(
                "paystack.api.error",
                error_type="network",
                error_message=str(e),
            )
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )

    async def charge_mobile_money(
        self,
        *,
        email: str,
        amount: int,
        phone: str,
        provider: str = "mpesa",
        currency: str = "KES",
        reference: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Initiate an inbound mobile-money charge (M-Pesa STK push).

        Hits Paystack `POST /charge` with the `mobile_money` channel. This is
        used for two flows:

          1. Buyer-side checkout where the customer chooses M-Pesa as the
             payment method (a buyer pays for a product).
          2. Creator-side payout-method verification — Blyss charges the
             creator's M-Pesa with KSh 100 (10000 kobo) before activating
             their payouts. The KSh 100 is non-refundable and stays in
             Blyss's main account; it's both proof that the number is
             real and a cheap anti-fraud signal.

        Returns a dict with the charge `reference`, `status`
        (`success` | `pending` | `failed`), and `display_text` — the
        instruction string Paystack returns for the buyer (e.g. the
        STK push prompt the user sees on their phone).

        Args:
            email: Customer email address
            amount: Amount in kobo (100 kobo = KES 1)
            phone: Mobile money phone number, Kenyan format (+254XXXXXXXXX)
            provider: Mobile money provider code (default "mpesa" for KE)
            currency: Currency code (default KES)
            reference: Optional unique reference. If None we generate one.
            metadata: Optional metadata stored on the charge

        Raises:
            PaystackAuthenticationError: If API authentication fails
            PaystackValidationError: If Paystack rejects the payload
            PaystackNetworkError: If network communication fails
            PaystackTransactionError: If charge creation fails
        """
        import uuid

        if reference is None:
            reference = f"momo_{uuid.uuid4().hex[:16]}"

        payload: dict[str, Any] = {
            "email": email,
            "amount": amount,
            "currency": currency,
            "reference": reference,
            "mobile_money": {"phone": phone, "provider": provider},
        }
        if metadata:
            payload["metadata"] = metadata

        log.info(
            "paystack.charge.mobile_money",
            email=email,
            amount=amount,
            phone=phone,
            provider=provider,
            reference=reference,
        )

        try:
            response = await self._client.post("/charge", json=payload)

            if response.status_code == 401:
                raise PaystackAuthenticationError(
                    "Paystack API authentication failed"
                )

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                log.error(
                    "paystack.api.error",
                    error_type="validation",
                    error_message=error_message,
                    status_code=response.status_code,
                )
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                log.error(
                    "paystack.api.error",
                    error_type="server_error",
                    status_code=response.status_code,
                )
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            response_data = response.json()
            if not response_data.get("status"):
                error_message = response_data.get(
                    "message", "Mobile money charge failed"
                )
                log.error(
                    "paystack.charge.mobile_money.failed",
                    error_message=error_message,
                    reference=reference,
                )
                raise PaystackTransactionError(error_message, reference)

            data = response_data.get("data", {})
            return {
                "reference": data.get("reference", reference),
                "status": data.get("status"),
                "display_text": data.get("display_text")
                or response_data.get("message")
                or "Check your phone for the M-Pesa STK push prompt.",
                "raw": data,
            }

        except (
            PaystackAuthenticationError,
            PaystackValidationError,
            PaystackNetworkError,
            PaystackTransactionError,
        ):
            raise
        except Exception as e:
            log.error(
                "paystack.charge.mobile_money.network_error",
                reference=reference,
                error=str(e),
            )
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )

    async def send_verification_transaction(
        self,
        *,
        mpesa_number: str,
        amount: int = 1000,
    ) -> dict[str, Any]:
        """
        Send a small transaction to verify M-Pesa number ownership.

        Args:
            mpesa_number: M-Pesa phone number in format +254XXXXXXXXX
            amount: Amount in kobo (default: 1000 = KES 10)

        Returns:
            dict containing transaction reference and status

        Raises:
            PaystackAuthenticationError: If API authentication fails
            PaystackValidationError: If request validation fails
            PaystackNetworkError: If network communication fails
            PaystackTransactionError: If transaction fails
        """
        # Generate a unique reference for the verification transaction
        import uuid

        reference = f"mpesa_verify_{uuid.uuid4().hex[:16]}"

        # Prepare request payload for transfer
        payload = {
            "source": "balance",
            "amount": amount,
            "recipient": mpesa_number,
            "reason": "M-Pesa number verification",
            "reference": reference,
        }

        # Log the API call with sanitized parameters
        log.info(
            "paystack.mpesa.verification.send",
            mpesa_number=mpesa_number,
            amount=amount,
            reference=reference,
        )

        try:
            # Make POST request to Paystack API
            response = await self._client.post(
                "/transfer",
                json=payload,
            )

            # Handle different response status codes
            if response.status_code == 401:
                error_message = "Paystack API authentication failed"
                log.error(
                    "paystack.api.error",
                    error_type="authentication",
                    status_code=response.status_code,
                )
                raise PaystackAuthenticationError(error_message)

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                log.error(
                    "paystack.api.error",
                    error_type="validation",
                    error_message=error_message,
                    status_code=response.status_code,
                )
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                log.error(
                    "paystack.api.error",
                    error_type="server_error",
                    status_code=response.status_code,
                )
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            # Parse successful response
            response_data = response.json()

            if not response_data.get("status"):
                error_message = response_data.get(
                    "message", "Verification transaction failed"
                )
                log.error(
                    "paystack.mpesa.verification.failed",
                    error_message=error_message,
                    reference=reference,
                )
                raise PaystackTransactionError(error_message, reference)

            # Extract transaction data
            data = response_data.get("data", {})
            transfer_status = data.get("status")

            log.info(
                "paystack.mpesa.verification.success",
                reference=reference,
                status=transfer_status,
            )

            return {
                "reference": reference,
                "status": transfer_status,
                "transfer_code": data.get("transfer_code"),
            }

        except httpx.HTTPError as e:
            log.error(
                "paystack.api.error",
                error_type="network",
                error_message=str(e),
            )
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )

    async def create_subaccount(
        self,
        *,
        business_name: str,
        settlement_bank: str | None = None,
        account_number: str | None = None,
        percentage_charge: float,
    ) -> dict[str, Any]:
        """
        Create a subaccount for automatic payment splits.

        Args:
            business_name: Name of the business/organization
            settlement_bank: Bank code for settlement (optional)
            account_number: Account number for settlement (optional)
            percentage_charge: Percentage of transaction to charge (e.g., 20.0 for 20%)

        Returns:
            dict containing subaccount_code and status

        Raises:
            PaystackAuthenticationError: If API authentication fails
            PaystackValidationError: If request validation fails
            PaystackNetworkError: If network communication fails
            PaystackTransactionError: If subaccount creation fails
        """
        # Prepare request payload
        payload = {
            "business_name": business_name,
            "percentage_charge": percentage_charge,
        }

        # Add optional settlement details if provided
        if settlement_bank and account_number:
            payload["settlement_bank"] = settlement_bank
            payload["account_number"] = account_number

        # Log the API call with sanitized parameters
        log.info(
            "paystack.subaccount.create",
            business_name=business_name,
            percentage_charge=percentage_charge,
            has_settlement_bank=settlement_bank is not None,
            has_account_number=account_number is not None,
        )

        try:
            # Make POST request to Paystack API
            response = await self._client.post(
                "/subaccount",
                json=payload,
            )

            # Handle different response status codes
            if response.status_code == 401:
                error_message = "Paystack API authentication failed"
                log.error(
                    "paystack.api.error",
                    error_type="authentication",
                    status_code=response.status_code,
                )
                raise PaystackAuthenticationError(error_message)

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                log.error(
                    "paystack.api.error",
                    error_type="validation",
                    error_message=error_message,
                    status_code=response.status_code,
                )
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                log.error(
                    "paystack.api.error",
                    error_type="server_error",
                    status_code=response.status_code,
                )
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            # Parse successful response
            response_data = response.json()

            if not response_data.get("status"):
                error_message = response_data.get(
                    "message", "Subaccount creation failed"
                )
                log.error(
                    "paystack.subaccount.create.failed",
                    error_message=error_message,
                    business_name=business_name,
                )
                raise PaystackTransactionError(error_message)

            # Extract subaccount data
            data = response_data.get("data", {})
            subaccount_code = data.get("subaccount_code")
            subaccount_status = data.get("is_verified", False)

            log.info(
                "paystack.subaccount.create.success",
                business_name=business_name,
                subaccount_code=subaccount_code,
                is_verified=subaccount_status,
            )

            return {
                "subaccount_code": subaccount_code,
                "status": "active" if subaccount_status else "pending",
                "business_name": data.get("business_name"),
                "percentage_charge": data.get("percentage_charge"),
            }

        except httpx.HTTPError as e:
            log.error(
                "paystack.api.error",
                error_type="network",
                error_message=str(e),
            )
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )

    async def update_subaccount(
        self,
        subaccount_code: str,
        *,
        settlement_bank: str | None = None,
        account_number: str | None = None,
    ) -> dict[str, Any]:
        """
        Update subaccount settlement details.

        Args:
            subaccount_code: The subaccount code to update
            settlement_bank: Bank code for settlement (optional)
            account_number: Account number for settlement (optional)

        Returns:
            dict containing updated subaccount details

        Raises:
            PaystackAuthenticationError: If API authentication fails
            PaystackValidationError: If request validation fails
            PaystackNetworkError: If network communication fails
            PaystackTransactionError: If subaccount update fails
        """
        # Prepare request payload with only provided fields
        payload = {}

        if settlement_bank is not None:
            payload["settlement_bank"] = settlement_bank

        if account_number is not None:
            payload["account_number"] = account_number

        # Log the API call with sanitized parameters
        log.info(
            "paystack.subaccount.update",
            subaccount_code=subaccount_code,
            has_settlement_bank=settlement_bank is not None,
            has_account_number=account_number is not None,
        )

        try:
            # Make PUT request to Paystack API
            response = await self._client.put(
                f"/subaccount/{subaccount_code}",
                json=payload,
            )

            # Handle different response status codes
            if response.status_code == 401:
                error_message = "Paystack API authentication failed"
                log.error(
                    "paystack.api.error",
                    error_type="authentication",
                    status_code=response.status_code,
                )
                raise PaystackAuthenticationError(error_message)

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                log.error(
                    "paystack.api.error",
                    error_type="validation",
                    error_message=error_message,
                    status_code=response.status_code,
                )
                raise PaystackValidationError(error_message)

            if response.status_code == 404:
                error_message = f"Subaccount {subaccount_code} not found"
                log.error(
                    "paystack.subaccount.update.not_found",
                    subaccount_code=subaccount_code,
                )
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                log.error(
                    "paystack.api.error",
                    error_type="server_error",
                    status_code=response.status_code,
                )
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            # Parse successful response
            response_data = response.json()

            if not response_data.get("status"):
                error_message = response_data.get("message", "Subaccount update failed")
                log.error(
                    "paystack.subaccount.update.failed",
                    error_message=error_message,
                    subaccount_code=subaccount_code,
                )
                raise PaystackTransactionError(error_message)

            # Extract updated subaccount data
            data = response_data.get("data", {})

            log.info(
                "paystack.subaccount.update.success",
                subaccount_code=subaccount_code,
                business_name=data.get("business_name"),
            )

            return {
                "subaccount_code": data.get("subaccount_code"),
                "business_name": data.get("business_name"),
                "settlement_bank": data.get("settlement_bank"),
                "account_number": data.get("account_number"),
                "percentage_charge": data.get("percentage_charge"),
                "is_verified": data.get("is_verified", False),
            }

        except httpx.HTTPError as e:
            log.error(
                "paystack.api.error",
                error_type="network",
                error_message=str(e),
            )
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )

    async def list_banks(self, country: str = "kenya") -> list[dict[str, Any]]:
        """List Paystack-recognized banks for the given country.

        Returns the raw `data` array from Paystack's `/bank` endpoint —
        each item is a dict with `code`, `name`, `slug`, etc. The
        dashboard's bank-payout dropdown consumes this list.
        """
        try:
            response = await self._client.get(
                "/bank", params={"country": country}
            )
            if response.status_code == 401:
                raise PaystackAuthenticationError(
                    "Paystack API authentication failed"
                )
            if response.status_code >= 500:
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )
            payload = response.json()
            if not payload.get("status"):
                raise PaystackTransactionError(
                    payload.get("message", "Failed to fetch banks")
                )
            return list(payload.get("data") or [])
        except (PaystackError,):
            raise
        except Exception as e:
            log.error("paystack.banks.list_failed", country=country, error=str(e))
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )


paystack = PaystackService()
