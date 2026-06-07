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

    async def _resolve_secret_key(self, session: object | None) -> str:
        """Resolve the Paystack secret key with runtime_settings overlay.

        Order of precedence:
          1. runtime_settings overlay (set via /backoffice/runtime-settings)
             — lets ops swap test <-> live keys without redeploying.
          2. settings.PAYSTACK_SECRET_KEY (env var) — fallback.

        The overlay path requires a DB session. Callers that don't have one
        (background tasks, module-init paths) pass session=None and get the
        env var.
        """
        if session is None:
            return self.secret_key
        try:
            from polar.runtime_settings import runtime_settings  # lazy

            override = await runtime_settings.get(session, "PAYSTACK_SECRET_KEY")  # type: ignore[arg-type]
            if override:
                return override
        except Exception:
            # Runtime overlay table may be unavailable in some test
            # contexts. Fall back to env var quietly.
            pass
        return self.secret_key

    def _auth_headers(self, secret_key: str | None = None) -> dict[str, str]:
        """Build per-request auth headers, allowing override of the bearer
        token. Used to inject the runtime-overlaid secret key without
        rebuilding the long-lived httpx client."""
        return {
            "Authorization": f"Bearer {secret_key or self.secret_key}",
        }

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

    async def verify_transaction(
        self, reference: str, *, session: object | None = None
    ) -> dict[str, Any]:
        """
        Verify a transaction status.

        Args:
            reference: Transaction reference to verify
            session: Optional DB session to read the runtime-overlaid
                Paystack secret key from. Without it the env var is used.

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

        secret_key = await self._resolve_secret_key(session)

        try:
            # Make GET request to Paystack API
            response = await self._client.get(
                f"/transaction/verify/{reference}",
                headers=self._auth_headers(secret_key),
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

    def _mask_payload_for_logging(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Return a copy of the charge payload safe for logging.

        Masks card.number to last 4 digits and omits cvv/pin entirely.
        """
        safe = dict(payload)
        if "card" in safe:
            card = dict(safe["card"])
            if "number" in card:
                last4 = str(card["number"])[-4:]
                card["number"] = f"**** **** **** {last4}"
            card.pop("cvv", None)
            card.pop("pin", None)
            safe["card"] = card
        safe.pop("pin", None)
        return safe

    async def charge(
        self, payload: dict[str, Any], *, session: object | None = None
    ) -> dict[str, Any]:
        """Generic wrapper around Paystack POST /charge.

        Accepts the full payload dict and returns
        {reference, status, display_text, raw}. Pass `session` to honor any
        runtime_settings overlay on the Paystack secret key.
        """
        log.info(
            "paystack.charge",
            payload=self._mask_payload_for_logging(payload),
        )

        secret_key = await self._resolve_secret_key(session)

        try:
            response = await self._client.post(
                "/charge", json=payload, headers=self._auth_headers(secret_key)
            )

            if response.status_code == 401:
                raise PaystackAuthenticationError(
                    "Paystack API authentication failed"
                )

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                log.error(
                    "paystack.charge.error",
                    error_type="validation",
                    error_message=error_message,
                )
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                log.error(
                    "paystack.charge.error",
                    error_type="server_error",
                    status_code=response.status_code,
                )
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            response_data = response.json()
            if not response_data.get("status"):
                error_message = response_data.get("message", "Charge failed")
                log.error(
                    "paystack.charge.failed",
                    error_message=error_message,
                )
                raise PaystackTransactionError(error_message)

            data = response_data.get("data", {})
            return {
                "reference": data.get("reference", payload.get("reference")),
                "status": data.get("status"),
                "display_text": data.get("display_text")
                or response_data.get("message")
                or "",
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
            log.error("paystack.charge.network_error", error=str(e))
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )

    async def submit_charge_step(
        self,
        action: str,
        reference: str,
        value: str,
        *,
        session: object | None = None,
    ) -> dict[str, Any]:
        """Call POST /charge/submit_{action} (otp, pin, phone, birthday).

        Pass `session` so the runtime-overlaid Paystack secret key is used
        for the step submit, otherwise it falls back to the env-var key
        (which may be live while the original charge ran on test).
        """
        if action not in ("otp", "pin", "phone", "birthday"):
            raise PaystackValidationError(f"Invalid charge step action: {action}")

        log.info(
            "paystack.charge.submit_step",
            action=action,
            reference=reference,
        )

        try:
            secret_key = await self._resolve_secret_key(session)
            response = await self._client.post(
                f"/charge/submit_{action}",
                json={"reference": reference, action: value},
                headers=self._auth_headers(secret_key),
            )

            if response.status_code == 401:
                raise PaystackAuthenticationError(
                    "Paystack API authentication failed"
                )

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            response_data = response.json()
            if not response_data.get("status"):
                error_message = response_data.get("message", "Submit step failed")
                raise PaystackTransactionError(error_message, reference)

            data = response_data.get("data", {})
            return {
                "reference": data.get("reference", reference),
                "status": data.get("status"),
                "display_text": data.get("display_text")
                or response_data.get("message")
                or "",
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
                "paystack.charge.submit_step.network_error",
                action=action,
                error=str(e),
            )
            raise PaystackNetworkError(
                f"Network error communicating with Paystack: {e}"
            )

    async def check_pending_charge(
        self, reference: str, *, session: object | None = None
    ) -> dict[str, Any]:
        """Call GET /charge/{reference} to check a pending charge.

        Pass `session` so the runtime-overlaid Paystack secret key is used
        and the verify lands on the same account context (test/live) the
        original charge ran in.
        """
        log.info("paystack.charge.check_pending", reference=reference)

        try:
            secret_key = await self._resolve_secret_key(session)
            response = await self._client.get(
                f"/charge/{reference}",
                headers=self._auth_headers(secret_key),
            )

            if response.status_code == 401:
                raise PaystackAuthenticationError(
                    "Paystack API authentication failed"
                )

            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                raise PaystackValidationError(error_message)

            if response.status_code >= 500:
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            response_data = response.json()
            if not response_data.get("status"):
                error_message = response_data.get(
                    "message", "Check pending charge failed"
                )
                raise PaystackTransactionError(error_message, reference)

            data = response_data.get("data", {})
            return {
                "reference": data.get("reference", reference),
                "status": data.get("status"),
                "display_text": data.get("display_text")
                or response_data.get("message")
                or "",
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
                "paystack.charge.check_pending.network_error",
                reference=reference,
                error=str(e),
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
        session: object | None = None,
    ) -> dict[str, Any]:
        """Initiate an inbound mobile-money charge (M-Pesa STK push).

        Delegates to the generic charge() helper. Pass `session` so the
        runtime-overlaid Paystack secret key (test vs live) is honored.
        """
        import uuid

        if reference is None:
            # Customer-facing receipt prefix — Blyss-branded so the
            # buyer sees 'blyss_momo_…' on their receipt, not the bare
            # 'momo_…' which read as Paystack-internal jargon.
            reference = f"blyss_momo_{uuid.uuid4().hex[:16]}"

        payload: dict[str, Any] = {
            "email": email,
            "amount": amount,
            "currency": currency,
            "reference": reference,
            "mobile_money": {"phone": phone, "provider": provider},
        }
        if metadata:
            payload["metadata"] = metadata

        result = await self.charge(payload, session=session)
        # Provide M-Pesa-specific default display_text
        if not result.get("display_text"):
            result["display_text"] = (
                "Check your phone for the M-Pesa STK push prompt."
            )
        return result

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

        reference = f"blyss_verify_{uuid.uuid4().hex[:16]}"

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
        session: object | None = None,
    ) -> dict[str, Any]:
        """
        Create a subaccount for automatic payment splits.

        Args:
            business_name: Name of the business/organization
            settlement_bank: Bank code for settlement (optional)
            account_number: Account number for settlement (optional)
            percentage_charge: Percentage of transaction to charge (e.g., 20.0 for 20%)
            session: Optional DB session to read the runtime-overlaid
                Paystack secret key from. Without it the env var is used.

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
            secret_key = await self._resolve_secret_key(session)
            # Make POST request to Paystack API
            response = await self._client.post(
                "/subaccount",
                json=payload,
                headers=self._auth_headers(secret_key),
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
                # Surface the full upstream body to logs so ops can see
                # exactly which field paystack rejected (settlement_bank
                # code, account_number format, etc.). Without this the
                # 'M-Pesa charge succeeded but Paystack rejected the
                # subaccount' user-facing copy is the only signal.
                log.error(
                    "paystack.subaccount.create.validation_error",
                    error_message=error_message,
                    paystack_body=str(response_data)[:500],
                    payload_preview={
                        "settlement_bank": payload.get("settlement_bank"),
                        "has_account_number": bool(
                            payload.get("account_number")
                        ),
                    },
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
        session: object | None = None,
    ) -> dict[str, Any]:
        """
        Update subaccount settlement details.

        Args:
            subaccount_code: The subaccount code to update
            settlement_bank: Bank code for settlement (optional)
            account_number: Account number for settlement (optional)
            session: Optional DB session to read the runtime-overlaid
                Paystack secret key from. Without it the env var is used.

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
            secret_key = await self._resolve_secret_key(session)
            # Make PUT request to Paystack API
            response = await self._client.put(
                f"/subaccount/{subaccount_code}",
                json=payload,
                headers=self._auth_headers(secret_key),
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
