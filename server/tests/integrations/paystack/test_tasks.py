"""Unit tests for Paystack webhook event handlers."""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from dramatiq import Retry

from polar.integrations.paystack.tasks import charge_failed, charge_success
from polar.models.checkout import CheckoutStatus


class TestChargeSuccess:
    """Unit tests for charge_success webhook handler."""

    @pytest.mark.asyncio
    async def test_successful_charge_creates_order(self) -> None:
        """Test that a successful charge creates an order and updates checkout."""
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()
        transaction_reference = "test_ref_12345"

        event_data = {
            "event": "charge.success",
            "data": {
                "reference": transaction_reference,
                "amount": 100000,
                "currency": "KES",
                "status": "success",
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        verified_transaction = {
            "status": "success",
            "reference": transaction_reference,
            "amount": 100000,
            "currency": "KES",
            "metadata": {"checkout_id": str(checkout_id)},
        }

        mock_checkout = MagicMock()
        mock_checkout.id = checkout_id
        mock_checkout.status = CheckoutStatus.open
        mock_checkout.order = None
        mock_checkout.product = MagicMock()
        mock_checkout.product.is_recurring = False

        mock_order = MagicMock()
        mock_order.id = uuid.uuid4()
        mock_order.stripe_invoice_id = None

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()
        mock_session.flush = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.paystack") as mock_paystack,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch(
                "polar.integrations.paystack.tasks.order_service"
            ) as mock_order_service,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_paystack.verify_transaction = AsyncMock(
                return_value=verified_transaction
            )
            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)
            mock_checkout_service.update = AsyncMock(return_value=mock_checkout)
            mock_order_service.create_from_checkout_one_time = AsyncMock(
                return_value=mock_order
            )

            await charge_success(event_id)

            mock_paystack.verify_transaction.assert_called_once_with(
                transaction_reference
            )
            mock_checkout_service.get.assert_called_once_with(mock_session, checkout_id)
            mock_checkout_service.update.assert_called_once()
            mock_order_service.create_from_checkout_one_time.assert_called_once_with(
                mock_session, mock_checkout, payment=None
            )
            assert mock_order.stripe_invoice_id == transaction_reference

    @pytest.mark.asyncio
    async def test_missing_reference_logs_error(self) -> None:
        """Test that missing transaction reference logs an error."""
        event_id = uuid.uuid4()

        event_data = {
            "event": "charge.success",
            "data": {
                "amount": 100000,
                "currency": "KES",
                "status": "success",
            },
        }

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.log") as mock_log,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            await charge_success(event_id)

            mock_log.error.assert_called_once()
            assert "missing_reference" in str(mock_log.error.call_args)

    @pytest.mark.asyncio
    async def test_invalid_transaction_status_logs_warning(self) -> None:
        """Test that invalid transaction status logs a warning."""
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()
        transaction_reference = "test_ref_12345"

        event_data = {
            "event": "charge.success",
            "data": {
                "reference": transaction_reference,
                "amount": 100000,
                "currency": "KES",
                "status": "success",
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        verified_transaction = {
            "status": "pending",
            "reference": transaction_reference,
            "amount": 100000,
            "currency": "KES",
            "metadata": {"checkout_id": str(checkout_id)},
        }

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.paystack") as mock_paystack,
            patch("polar.integrations.paystack.tasks.log") as mock_log,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_paystack.verify_transaction = AsyncMock(
                return_value=verified_transaction
            )

            await charge_success(event_id)

            mock_log.warning.assert_called_once()
            assert "invalid_status" in str(mock_log.warning.call_args)

    @pytest.mark.asyncio
    async def test_missing_checkout_id_logs_error(self) -> None:
        """Test that missing checkout ID logs an error."""
        event_id = uuid.uuid4()
        transaction_reference = "test_ref_12345"

        event_data = {
            "event": "charge.success",
            "data": {
                "reference": transaction_reference,
                "amount": 100000,
                "currency": "KES",
                "status": "success",
                "metadata": {},
            },
        }

        verified_transaction = {
            "status": "success",
            "reference": transaction_reference,
            "amount": 100000,
            "currency": "KES",
            "metadata": {},
        }

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.paystack") as mock_paystack,
            patch("polar.integrations.paystack.tasks.log") as mock_log,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_paystack.verify_transaction = AsyncMock(
                return_value=verified_transaction
            )

            await charge_success(event_id)

            mock_log.error.assert_called_once()
            assert "missing_checkout_id" in str(mock_log.error.call_args)

    @pytest.mark.asyncio
    async def test_checkout_not_found_retries(self) -> None:
        """Test that checkout not found triggers retry."""
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()
        transaction_reference = "test_ref_12345"

        event_data = {
            "event": "charge.success",
            "data": {
                "reference": transaction_reference,
                "amount": 100000,
                "currency": "KES",
                "status": "success",
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        verified_transaction = {
            "status": "success",
            "reference": transaction_reference,
            "amount": 100000,
            "currency": "KES",
            "metadata": {"checkout_id": str(checkout_id)},
        }

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.paystack") as mock_paystack,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch("polar.integrations.paystack.tasks.can_retry") as mock_can_retry,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_paystack.verify_transaction = AsyncMock(
                return_value=verified_transaction
            )
            mock_checkout_service.get = AsyncMock(return_value=None)
            mock_can_retry.return_value = True

            with pytest.raises(Retry):
                await charge_success(event_id)

    @pytest.mark.asyncio
    async def test_existing_order_skips_creation(self) -> None:
        """Test that existing order skips order creation."""
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()
        transaction_reference = "test_ref_12345"

        event_data = {
            "event": "charge.success",
            "data": {
                "reference": transaction_reference,
                "amount": 100000,
                "currency": "KES",
                "status": "success",
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        verified_transaction = {
            "status": "success",
            "reference": transaction_reference,
            "amount": 100000,
            "currency": "KES",
            "metadata": {"checkout_id": str(checkout_id)},
        }

        mock_order = MagicMock()
        mock_order.id = uuid.uuid4()

        mock_checkout = MagicMock()
        mock_checkout.id = checkout_id
        mock_checkout.status = CheckoutStatus.confirmed
        mock_checkout.order = mock_order

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.paystack") as mock_paystack,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch(
                "polar.integrations.paystack.tasks.order_service"
            ) as mock_order_service,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_paystack.verify_transaction = AsyncMock(
                return_value=verified_transaction
            )
            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)

            await charge_success(event_id)

            mock_order_service.create_from_checkout_one_time.assert_not_called()


class TestChargeFailed:
    """Unit tests for charge_failed webhook handler."""

    @pytest.mark.asyncio
    async def test_failed_charge_updates_checkout(self) -> None:
        """Test that a failed charge updates checkout status to failed."""
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()
        transaction_reference = "test_ref_12345"

        event_data = {
            "event": "charge.failed",
            "data": {
                "reference": transaction_reference,
                "amount": 100000,
                "currency": "KES",
                "status": "failed",
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        mock_checkout = MagicMock()
        mock_checkout.id = checkout_id
        mock_checkout.status = CheckoutStatus.open

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)
            mock_checkout_service.update = AsyncMock(return_value=mock_checkout)

            await charge_failed(event_id)

            mock_checkout_service.get.assert_called_once_with(mock_session, checkout_id)
            mock_checkout_service.update.assert_called_once()
            update_call_args = mock_checkout_service.update.call_args
            assert update_call_args[1]["update_dict"]["status"] == CheckoutStatus.failed

    @pytest.mark.asyncio
    async def test_missing_reference_logs_error(self) -> None:
        """Test that missing transaction reference logs an error."""
        event_id = uuid.uuid4()

        event_data = {
            "event": "charge.failed",
            "data": {
                "amount": 100000,
                "currency": "KES",
                "status": "failed",
            },
        }

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch("polar.integrations.paystack.tasks.log") as mock_log,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            await charge_failed(event_id)

            mock_log.error.assert_called_once()
            assert "missing_reference" in str(mock_log.error.call_args)

    @pytest.mark.asyncio
    async def test_checkout_not_found_retries(self) -> None:
        """Test that checkout not found triggers retry."""
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()
        transaction_reference = "test_ref_12345"

        event_data = {
            "event": "charge.failed",
            "data": {
                "reference": transaction_reference,
                "amount": 100000,
                "currency": "KES",
                "status": "failed",
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
            patch("polar.integrations.paystack.tasks.can_retry") as mock_can_retry,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_checkout_service.get = AsyncMock(return_value=None)
            mock_can_retry.return_value = True

            with pytest.raises(Retry):
                await charge_failed(event_id)

    @pytest.mark.asyncio
    async def test_already_failed_checkout_skips_update(self) -> None:
        """Test that already failed checkout skips update."""
        event_id = uuid.uuid4()
        checkout_id = uuid.uuid4()
        transaction_reference = "test_ref_12345"

        event_data = {
            "event": "charge.failed",
            "data": {
                "reference": transaction_reference,
                "amount": 100000,
                "currency": "KES",
                "status": "failed",
                "metadata": {"checkout_id": str(checkout_id)},
            },
        }

        mock_checkout = MagicMock()
        mock_checkout.id = checkout_id
        mock_checkout.status = CheckoutStatus.failed

        mock_event = MagicMock()
        mock_event.id = event_id
        mock_event.paystack_data = event_data

        mock_session = AsyncMock()

        with (
            patch(
                "polar.integrations.paystack.tasks.AsyncSessionMaker"
            ) as mock_session_maker,
            patch(
                "polar.integrations.paystack.tasks.external_event_service"
            ) as mock_external_event_service,
            patch(
                "polar.integrations.paystack.tasks.checkout_service"
            ) as mock_checkout_service,
        ):
            mock_session_maker.return_value.__aenter__.return_value = mock_session
            mock_session_maker.return_value.__aexit__.return_value = None

            mock_external_event_service.handle_paystack.return_value.__aenter__.return_value = mock_event
            mock_external_event_service.handle_paystack.return_value.__aexit__.return_value = None

            mock_checkout_service.get = AsyncMock(return_value=mock_checkout)

            await charge_failed(event_id)

            mock_checkout_service.update.assert_not_called()
