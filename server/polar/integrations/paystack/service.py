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
        transaction_charge: int | None = None,
        bearer: str | None = None,
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
            transaction_charge: Override the platform's per-transaction
                cut, in kobo. When set (typically to 0), this OVERRIDES
                the subaccount's `percentage_charge` for this transaction
                only. Used by donation/tip flows where Blyss takes 0%
                and the creator keeps everything (less Paystack's fee).
            bearer: Who pays Paystack's processing fee. "account" =
                Blyss main account, "subaccount" = the creator's
                subaccount. Defaults to Paystack's account behaviour
                (main pays). Donation/tip flows pass "subaccount" so
                Blyss doesn't absorb the fee on a 0%-cut transaction.

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
        if transaction_charge is not None:
            # `transaction_charge` is the kobo amount the main account
            # keeps, expressed as an absolute value (not a %). Paystack
            # only honours it when `subaccount` is set; without a
            # subaccount the full amount lands on the main account
            # regardless. We always send it as int kobo.
            payload["transaction_charge"] = int(transaction_charge)
        if bearer is not None:
            # Paystack accepts "account" | "subaccount". We pass it
            # through unchanged; validation lives at the call site.
            payload["bearer"] = bearer

        # Log the API call with sanitized parameters (no sensitive data)
        log.info(
            "paystack.transaction.initialize",
            email=email,
            amount=amount,
            currency=currency,
            reference=reference,
            subaccount=subaccount,
            has_metadata=metadata is not None,
            transaction_charge=transaction_charge,
            bearer=bearer,
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

    async def create_refund(
        self,
        *,
        transaction_reference: str,
        amount: int | None = None,
        merchant_note: str | None = None,
        session: object | None = None,
    ) -> dict[str, Any]:
        """Create a refund for a Paystack transaction.

        Args:
            transaction_reference: the original charge reference.
            amount: amount in the smallest unit to refund. Omit for a full
                refund.
            merchant_note: optional reason recorded on Paystack.
            session: DB session so the runtime-overlaid secret key is used.

        Returns the Paystack refund `data` object. Raises the typed
        Paystack errors on failure.
        """
        payload: dict[str, Any] = {"transaction": transaction_reference}
        if amount is not None:
            payload["amount"] = amount
        if merchant_note:
            payload["merchant_note"] = merchant_note

        log.info(
            "paystack.refund.create",
            transaction_reference=transaction_reference,
            amount=amount,
        )

        secret_key = await self._resolve_secret_key(session)
        try:
            response = await self._client.post(
                "/refund",
                json=payload,
                headers=self._auth_headers(secret_key),
            )
            if response.status_code == 401:
                raise PaystackAuthenticationError(
                    "Paystack API authentication failed"
                )
            if response.status_code >= 500:
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )
            response_data = response.json()
            if not response_data.get("status"):
                error_message = response_data.get("message", "Refund failed")
                log.error(
                    "paystack.refund.failed",
                    error_message=error_message,
                    transaction_reference=transaction_reference,
                )
                raise PaystackTransactionError(
                    error_message, transaction_reference
                )
            log.info(
                "paystack.refund.success",
                transaction_reference=transaction_reference,
            )
            return response_data.get("data", {})
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

    async def charge_authorization(
        self,
        *,
        authorization_code: str,
        email: str,
        amount: int,
        currency: str,
        reference: str,
        metadata: dict[str, Any] | None = None,
        subaccount: str | None = None,
        session: object | None = None,
    ) -> dict[str, Any]:
        """Charge a stored Paystack authorization (off-session renewal).

        Used by the subscription renewal worker to bill again at the end of
        each period without re-prompting the buyer for card details. The
        authorization_code was captured from the FIRST charge.success
        webhook for this customer (P3a/3b) and stored on a PaymentMethod
        row linked to the Subscription.

        Returns the parsed `data` block from Paystack's response. The
        synchronous response includes `status` ('success' / 'failed' /
        'reversed' / etc) — unlike Stripe payment intents which require
        a webhook to confirm the charge actually went through.

        Args:
            authorization_code: 'AUTH_xxx' from a previous successful charge
            email: customer email (must match the original auth)
            amount: amount in lowest currency unit (kobo for KES)
            currency: ISO currency (e.g. 'KES')
            reference: unique idempotency key for this charge
            metadata: arbitrary data Paystack will echo back in the webhook
            subaccount: creator's subaccount code for split payouts
            session: optional DB session for runtime_settings secret key

        Raises:
            PaystackAuthenticationError, PaystackValidationError,
            PaystackNetworkError, PaystackTransactionError as for charge()
        """
        payload: dict[str, Any] = {
            "authorization_code": authorization_code,
            "email": email,
            "amount": amount,
            "currency": currency,
            "reference": reference,
        }
        if metadata is not None:
            payload["metadata"] = metadata
        if subaccount is not None:
            payload["subaccount"] = subaccount

        log.info(
            "paystack.charge_authorization",
            reference=reference,
            authorization_code=authorization_code[:8] + "…",  # don't echo full
            amount=amount,
            currency=currency,
        )

        secret_key = await self._resolve_secret_key(session)

        try:
            response = await self._client.post(
                "/transaction/charge_authorization",
                json=payload,
                headers=self._auth_headers(secret_key),
            )

            if response.status_code == 401:
                raise PaystackAuthenticationError(
                    "Paystack API authentication failed"
                )
            if response.status_code == 422:
                response_data = response.json()
                error_message = response_data.get("message", "Validation error")
                log.error(
                    "paystack.charge_authorization.validation_error",
                    reference=reference,
                    error_message=error_message,
                )
                raise PaystackValidationError(error_message)
            if response.status_code >= 500:
                log.error(
                    "paystack.charge_authorization.server_error",
                    reference=reference,
                    status_code=response.status_code,
                )
                raise PaystackNetworkError(
                    f"Paystack API server error: {response.status_code}"
                )

            response_data = response.json()
            if not response_data.get("status"):
                error_message = response_data.get("message", "Charge failed")
                log.error(
                    "paystack.charge_authorization.failed",
                    reference=reference,
                    error_message=error_message,
                )
                raise PaystackTransactionError(error_message)

            return response_data.get("data", {})
        except httpx.HTTPError as e:
            log.error(
                "paystack.charge_authorization.network_error",
                reference=reference,
                error=str(e),
            )
            raise PaystackNetworkError(str(e)) from e

    async def charge(
        self, payload: dict[str, Any], *, session: object | None = None
    ) -> dict[str, Any]:
        """Generic wrapper around Paystack POST /charge.

        Accepts the full payload dict and returns
        {reference, status, display_text, raw}. Pass `session` to honor any
        runtime_settings overlay on the Paystack secret key.
        """
        # Defense-in-depth: Paystack's KE individual M-PESA charge
        # requires provider='Mpesa' (capital M). Lowercase 'mpesa' (the
        # general mobile_money provider code Paystack publishes for
        # Ghana etc) is rejected for KES with 'Invalid provider'.
        # Normalize here so older callers / DB rows / cached UI state
        # don't break on the casing change.
        if (
            payload.get("currency") == "KES"
            and isinstance(payload.get("mobile_money"), dict)
            and payload["mobile_money"].get("provider", "").lower() == "mpesa"
        ):
            payload = {
                **payload,
                "mobile_money": {
                    **payload["mobile_money"],
                    "provider": "Mpesa",
                },
            }

        # Defense-in-depth currency normalization: Paystack returns the
        # misleading 'Invalid provider' error when currency is lowercase
        # (e.g. 'kes' instead of 'KES'). Verified live 2026-06-08.
        # Polar's DEFAULT_CURRENCY is 'kes' lowercase so checkouts/orders/
        # donations created via the default code path can inherit that.
        # Uppercase here so every /charge call lands cleanly regardless
        # of upstream casing.
        if isinstance(payload.get("currency"), str):
            payload = {**payload, "currency": payload["currency"].upper()}

        # Defense-in-depth: Paystack's KE M-PESA charge accepts the
        # provider value case-insensitively but only the spelling
        # 'mpesa' (no dash, not 'safaricom', not 'M-Pesa'). 'airtel'
        # and other Kenyan-mobile-money names also return 'Invalid
        # provider' on this account. Normalize known M-Pesa variants
        # to the canonical lowercase form. Verified against live
        # Paystack API on 2026-06-08.
        if (
            payload.get("currency") == "KES"
            and isinstance(payload.get("mobile_money"), dict)
        ):
            prov = payload["mobile_money"].get("provider", "")
            normalized = prov.lower().replace("-", "").replace(" ", "")
            if normalized in ("mpesa", "safaricom"):
                payload = {
                    **payload,
                    "mobile_money": {
                        **payload["mobile_money"],
                        "provider": "mpesa",
                    },
                }

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
                # Paystack often returns a misleading outer message
                # ('Charge attempted', 'Validation failed') while the
                # actual reason sits in data.message. Concatenate so
                # the surfaced error is actionable.
                outer = response_data.get("message", "Charge failed")
                inner_data = response_data.get("data", {}) or {}
                inner = inner_data.get("message") if isinstance(inner_data, dict) else None
                meta = response_data.get("meta", {}) or {}
                next_step = meta.get("nextStep") if isinstance(meta, dict) else None
                error_message = outer
                if inner and inner != outer:
                    error_message = f"{outer}: {inner}"
                if next_step:
                    error_message = f"{error_message} ({next_step})"
                log.error(
                    "paystack.charge.failed",
                    outer_message=outer,
                    inner_message=inner,
                    next_step=next_step,
                    response_code=response_data.get("code"),
                    response_type=response_data.get("type"),
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
            # Customer-facing receipt prefix — single 'blyss_' tag,
            # no leaky channel jargon (was 'blyss_momo_…' which read
            # as Paystack-internal mobile-money plumbing on the
            # receipt; users specifically asked to drop the 'momo_'
            # bit). 16 hex chars from uuid4 for collision safety.
            reference = f"blyss_{uuid.uuid4().hex[:16]}"

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
        description: str | None = None,
        primary_contact_email: str | None = None,
        primary_contact_name: str | None = None,
        primary_contact_phone: str | None = None,
        session: object | None = None,
    ) -> dict[str, Any]:
        """
        Create a subaccount for automatic payment splits.

        Per Paystack v2 docs (https://docs-v2.paystack.com/docs/api/subaccount/)
        the required fields are business_name, settlement_bank,
        account_number, percentage_charge. description /
        primary_contact_* are documented as optional but Paystack's
        Kenyan M-Pesa path frequently rejects subaccount creation when
        they're missing (response: 'Field validation failed' with no
        per-field detail). We pass them when callers provide them so
        the live flow has the best chance of succeeding.

        Args:
            business_name: Name of the business/organization
            settlement_bank: Bank code for settlement (e.g. 'MPESA' for
                Kenyan mobile money — see GET /bank?country=kenya)
            account_number: Account number (for M-Pesa, the MSISDN
                without the leading +, e.g. '254712345678')
            percentage_charge: Percentage of transaction to charge
            description: Optional description (often required in live
                mode for non-Nigerian rails)
            primary_contact_email: Optional contact email (often
                required in live mode)
            primary_contact_name: Optional contact name
            primary_contact_phone: Optional contact phone
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
        payload: dict[str, Any] = {
            "business_name": business_name,
            "percentage_charge": percentage_charge,
        }

        # Add optional settlement details if provided
        if settlement_bank and account_number:
            payload["settlement_bank"] = settlement_bank
            payload["account_number"] = account_number

        # Forward the contact / description fields when callers pass
        # them — Paystack uses them for compliance + payout
        # notifications. Live mode for Kenyan M-Pesa rejects when
        # they're absent.
        if description:
            payload["description"] = description
        if primary_contact_email:
            payload["primary_contact_email"] = primary_contact_email
        if primary_contact_name:
            payload["primary_contact_name"] = primary_contact_name
        if primary_contact_phone:
            payload["primary_contact_phone"] = primary_contact_phone

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

            if 400 <= response.status_code < 500:
                # Capture the real Paystack message for ANY 4xx
                # (was only 422). Live-mode 400 responses with
                # field-validation errors were previously swallowed
                # and raised as a generic 'Subaccount creation
                # failed', which gave creators no path to fix the
                # input. Now the message Paystack returned (e.g.
                # 'Settlement account not supported',
                # 'Account number is invalid for the provided bank
                # code') gets surfaced verbatim.
                try:
                    response_data = response.json()
                except Exception:
                    response_data = {"message": response.text[:300]}
                error_message = (
                    response_data.get("message") or "Validation error"
                )
                log.error(
                    "paystack.subaccount.create.validation_error",
                    error_message=error_message,
                    paystack_body=str(response_data)[:500],
                    payload_preview={
                        "settlement_bank": payload.get("settlement_bank"),
                        "has_account_number": bool(
                            payload.get("account_number")
                        ),
                        "has_description": bool(payload.get("description")),
                        "has_primary_contact_email": bool(
                            payload.get("primary_contact_email")
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
            # Paystack uses two flags. `is_verified` is their internal
            # manual KYC review which can take days and is NOT
            # required for the subaccount to receive split payments.
            # `active` flips to true the moment the subaccount is
            # provisioned and is what gates whether splits actually
            # land on it. We surface our own 'active' status off the
            # `active` flag so creators can sell immediately while
            # Paystack's KYC catches up in the background.
            is_active = bool(data.get("active", True))
            is_verified = bool(data.get("is_verified", False))

            log.info(
                "paystack.subaccount.create.success",
                business_name=business_name,
                subaccount_code=subaccount_code,
                is_active=is_active,
                is_verified=is_verified,
            )

            return {
                "subaccount_code": subaccount_code,
                "status": "active" if is_active else "pending",
                "is_verified": is_verified,
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

    async def fetch_subaccount(
        self,
        subaccount_code: str,
        *,
        session: object | None = None,
    ) -> dict[str, Any] | None:
        """Fetch a subaccount by code. Returns None if Paystack 404s
        (subaccount was deleted or the code never existed). Used by
        finalize_mpesa_verification to compare the existing
        subaccount's account_number against the just-verified M-Pesa
        number — Paystack's M-Pesa subaccount account_number is
        immutable, so when the creator changes their number we
        deactivate the old one and create fresh.
        """
        secret_key = await self._resolve_secret_key(session)
        try:
            response = await self._client.get(
                f"/subaccount/{subaccount_code}",
                headers=self._auth_headers(secret_key),
            )
            if response.status_code == 404:
                return None
            if response.status_code >= 400:
                # Treat any other error as 'unknown state' — the
                # caller will fall through to creating a fresh
                # subaccount, which is the safe default.
                log.warning(
                    "paystack.subaccount.fetch.error",
                    subaccount_code=subaccount_code,
                    status_code=response.status_code,
                )
                return None
            data = response.json().get("data", {})
            return data if isinstance(data, dict) else None
        except Exception as e:  # noqa: BLE001 — defensive, network blips
            log.warning(
                "paystack.subaccount.fetch.exception",
                subaccount_code=subaccount_code,
                error=str(e),
            )
            return None

    async def update_subaccount(
        self,
        subaccount_code: str,
        *,
        settlement_bank: str | None = None,
        account_number: str | None = None,
        active: bool | None = None,
        session: object | None = None,
    ) -> dict[str, Any]:
        """
        Update subaccount settlement details or activation state.

        Args:
            subaccount_code: The subaccount code to update
            settlement_bank: Bank code for settlement (optional)
            account_number: Account number for settlement (optional)
            active: Set true to activate, false to deactivate
                (used to retire old M-Pesa subaccounts when a creator
                changes their number — Paystack's M-Pesa subaccount
                account_number is immutable, so the only way to
                'change' it is deactivate-then-create-new).
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
        payload: dict[str, Any] = {}

        if settlement_bank is not None:
            payload["settlement_bank"] = settlement_bank

        if account_number is not None:
            payload["account_number"] = account_number

        if active is not None:
            payload["active"] = active

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
