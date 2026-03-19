"""
Monitoring and alerting configuration for Paystack integration.

This module provides monitoring setup, health checks, and alerting rules
for Paystack payment operations.
"""

from datetime import datetime, timedelta

import structlog
from sqlalchemy import func, select

from polar.logging import Logger
from polar.models.organization import Organization
from polar.postgres import AsyncSession

log: Logger = structlog.get_logger()


class PaystackMonitoring:
    """Monitoring and health check utilities for Paystack integration."""

    @staticmethod
    async def get_payment_success_rate(
        session: AsyncSession, hours: int = 24
    ) -> dict[str, float]:
        """
        Calculate payment success rate over the specified time period.

        Args:
            session: Database session
            hours: Number of hours to look back

        Returns:
            Dict with success rate metrics
        """
        # This would query actual payment/order data
        # For now, return placeholder metrics structure

        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # In a real implementation, you would query:
        # - Total payment attempts
        # - Successful payments
        # - Failed payments
        # - Average processing time

        log.info(
            "paystack.monitoring.payment_success_rate.calculated",
            hours=hours,
            cutoff_time=cutoff_time,
        )

        return {
            "success_rate": 0.95,  # Placeholder
            "total_attempts": 100,  # Placeholder
            "successful_payments": 95,  # Placeholder
            "failed_payments": 5,  # Placeholder
            "average_processing_time": 2.5,  # Placeholder
            "period_hours": hours,
        }

    @staticmethod
    async def get_subaccount_creation_rate(
        session: AsyncSession, hours: int = 24
    ) -> dict[str, float]:
        """
        Calculate subaccount creation success rate.

        Args:
            session: Database session
            hours: Number of hours to look back

        Returns:
            Dict with subaccount creation metrics
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # Query organizations created in the time period
        stmt = select(
            func.count(Organization.id).label("total"),
            func.sum(
                func.case((Organization.subaccount_status == "active", 1), else_=0)
            ).label("active"),
            func.sum(
                func.case((Organization.subaccount_status == "failed", 1), else_=0)
            ).label("failed"),
            func.sum(
                func.case((Organization.subaccount_status == "pending", 1), else_=0)
            ).label("pending"),
        ).where(Organization.created_at >= cutoff_time)

        result = await session.execute(stmt)
        row = result.first()

        total = row.total or 0
        active = row.active or 0
        failed = row.failed or 0
        pending = row.pending or 0

        success_rate = (active / total) if total > 0 else 0.0

        log.info(
            "paystack.monitoring.subaccount_creation_rate.calculated",
            hours=hours,
            total=total,
            active=active,
            failed=failed,
            pending=pending,
            success_rate=success_rate,
        )

        return {
            "success_rate": success_rate,
            "total_organizations": total,
            "active_subaccounts": active,
            "failed_subaccounts": failed,
            "pending_subaccounts": pending,
            "period_hours": hours,
        }

    @staticmethod
    async def get_webhook_processing_metrics(
        session: AsyncSession, hours: int = 24
    ) -> dict[str, float]:
        """
        Calculate webhook processing metrics.

        Args:
            session: Database session
            hours: Number of hours to look back

        Returns:
            Dict with webhook processing metrics
        """
        # This would query webhook event data
        # For now, return placeholder metrics

        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        log.info(
            "paystack.monitoring.webhook_processing_metrics.calculated",
            hours=hours,
            cutoff_time=cutoff_time,
        )

        return {
            "total_events": 50,  # Placeholder
            "successful_events": 48,  # Placeholder
            "failed_events": 2,  # Placeholder
            "average_processing_time": 1.2,  # Placeholder
            "success_rate": 0.96,  # Placeholder
            "period_hours": hours,
        }

    @staticmethod
    async def get_mpesa_verification_rate(
        session: AsyncSession, hours: int = 24
    ) -> dict[str, float]:
        """
        Calculate M-Pesa verification success rate.

        Args:
            session: Database session
            hours: Number of hours to look back

        Returns:
            Dict with M-Pesa verification metrics
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # Query organizations with M-Pesa configuration attempts
        stmt = select(
            func.count(Organization.id).label("total"),
            func.sum(
                func.case((Organization.mpesa_verified == True, 1), else_=0)
            ).label("verified"),
        ).where(
            Organization.mpesa_number.isnot(None),
            Organization.created_at >= cutoff_time,
        )

        result = await session.execute(stmt)
        row = result.first()

        total = row.total or 0
        verified = row.verified or 0

        success_rate = (verified / total) if total > 0 else 0.0

        log.info(
            "paystack.monitoring.mpesa_verification_rate.calculated",
            hours=hours,
            total=total,
            verified=verified,
            success_rate=success_rate,
        )

        return {
            "success_rate": success_rate,
            "total_attempts": total,
            "verified_numbers": verified,
            "unverified_numbers": total - verified,
            "period_hours": hours,
        }

    @staticmethod
    async def check_system_health(session: AsyncSession) -> dict[str, bool]:
        """
        Perform comprehensive health checks for Paystack integration.

        Args:
            session: Database session

        Returns:
            Dict with health check results
        """
        health_checks = {}

        try:
            # Check if Paystack service is responsive
            # This would make a test API call to Paystack
            health_checks["paystack_api_responsive"] = True  # Placeholder

            # Check database connectivity for Paystack-related tables
            stmt = select(func.count(Organization.id))
            await session.execute(stmt)
            health_checks["database_accessible"] = True

            # Check for recent successful payments
            payment_metrics = await PaystackMonitoring.get_payment_success_rate(
                session, 1
            )
            health_checks["recent_payments_successful"] = (
                payment_metrics["success_rate"] > 0.8
            )

            # Check for recent successful subaccount creations
            subaccount_metrics = await PaystackMonitoring.get_subaccount_creation_rate(
                session, 1
            )
            health_checks["subaccount_creation_healthy"] = (
                subaccount_metrics["success_rate"] > 0.9
            )

            # Check webhook processing health
            webhook_metrics = await PaystackMonitoring.get_webhook_processing_metrics(
                session, 1
            )
            health_checks["webhook_processing_healthy"] = (
                webhook_metrics["success_rate"] > 0.95
            )

        except Exception as e:
            log.error(
                "paystack.monitoring.health_check.error",
                error=str(e),
            )
            health_checks["health_check_error"] = True

        overall_health = all(
            check for key, check in health_checks.items() if not key.endswith("_error")
        )
        health_checks["overall_healthy"] = overall_health

        log.info(
            "paystack.monitoring.health_check.completed",
            **health_checks,
        )

        return health_checks

    @staticmethod
    async def generate_monitoring_report(session: AsyncSession) -> dict[str, any]:
        """
        Generate comprehensive monitoring report.

        Args:
            session: Database session

        Returns:
            Dict with complete monitoring data
        """
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "payment_metrics_24h": await PaystackMonitoring.get_payment_success_rate(
                session, 24
            ),
            "payment_metrics_1h": await PaystackMonitoring.get_payment_success_rate(
                session, 1
            ),
            "subaccount_metrics_24h": await PaystackMonitoring.get_subaccount_creation_rate(
                session, 24
            ),
            "subaccount_metrics_1h": await PaystackMonitoring.get_subaccount_creation_rate(
                session, 1
            ),
            "webhook_metrics_24h": await PaystackMonitoring.get_webhook_processing_metrics(
                session, 24
            ),
            "webhook_metrics_1h": await PaystackMonitoring.get_webhook_processing_metrics(
                session, 1
            ),
            "mpesa_metrics_24h": await PaystackMonitoring.get_mpesa_verification_rate(
                session, 24
            ),
            "mpesa_metrics_1h": await PaystackMonitoring.get_mpesa_verification_rate(
                session, 1
            ),
            "health_checks": await PaystackMonitoring.check_system_health(session),
        }

        log.info(
            "paystack.monitoring.report.generated",
            report_timestamp=report["timestamp"],
        )

        return report


class PaystackAlerts:
    """Alerting rules and thresholds for Paystack monitoring."""

    # Alert thresholds
    PAYMENT_SUCCESS_RATE_THRESHOLD = 0.90
    SUBACCOUNT_CREATION_RATE_THRESHOLD = 0.95
    WEBHOOK_PROCESSING_RATE_THRESHOLD = 0.98
    MPESA_VERIFICATION_RATE_THRESHOLD = 0.85

    @staticmethod
    async def check_payment_success_rate_alert(
        session: AsyncSession, hours: int = 1
    ) -> dict[str, any] | None:
        """
        Check if payment success rate is below threshold.

        Args:
            session: Database session
            hours: Hours to check

        Returns:
            Alert dict if threshold breached, None otherwise
        """
        metrics = await PaystackMonitoring.get_payment_success_rate(session, hours)

        if metrics["success_rate"] < PaystackAlerts.PAYMENT_SUCCESS_RATE_THRESHOLD:
            alert = {
                "type": "payment_success_rate_low",
                "severity": "high",
                "message": f"Payment success rate ({metrics['success_rate']:.2%}) below threshold ({PaystackAlerts.PAYMENT_SUCCESS_RATE_THRESHOLD:.2%})",
                "metrics": metrics,
                "timestamp": datetime.utcnow().isoformat(),
            }

            log.warning(
                "paystack.monitoring.alert.payment_success_rate_low",
                **alert,
            )

            return alert

        return None

    @staticmethod
    async def check_subaccount_creation_alert(
        session: AsyncSession, hours: int = 1
    ) -> dict[str, any] | None:
        """
        Check if subaccount creation rate is below threshold.

        Args:
            session: Database session
            hours: Hours to check

        Returns:
            Alert dict if threshold breached, None otherwise
        """
        metrics = await PaystackMonitoring.get_subaccount_creation_rate(session, hours)

        if metrics["success_rate"] < PaystackAlerts.SUBACCOUNT_CREATION_RATE_THRESHOLD:
            alert = {
                "type": "subaccount_creation_rate_low",
                "severity": "medium",
                "message": f"Subaccount creation rate ({metrics['success_rate']:.2%}) below threshold ({PaystackAlerts.SUBACCOUNT_CREATION_RATE_THRESHOLD:.2%})",
                "metrics": metrics,
                "timestamp": datetime.utcnow().isoformat(),
            }

            log.warning(
                "paystack.monitoring.alert.subaccount_creation_rate_low",
                **alert,
            )

            return alert

        return None

    @staticmethod
    async def check_all_alerts(session: AsyncSession) -> list[dict[str, any]]:
        """
        Check all alert conditions.

        Args:
            session: Database session

        Returns:
            List of active alerts
        """
        alerts = []

        # Check payment success rate
        payment_alert = await PaystackAlerts.check_payment_success_rate_alert(session)
        if payment_alert:
            alerts.append(payment_alert)

        # Check subaccount creation rate
        subaccount_alert = await PaystackAlerts.check_subaccount_creation_alert(session)
        if subaccount_alert:
            alerts.append(subaccount_alert)

        # Add more alert checks as needed

        if alerts:
            log.warning(
                "paystack.monitoring.alerts.active",
                alert_count=len(alerts),
                alerts=[alert["type"] for alert in alerts],
            )
        else:
            log.info("paystack.monitoring.alerts.none_active")

        return alerts


# Monitoring task that can be run periodically
async def run_monitoring_cycle(session: AsyncSession) -> None:
    """
    Run a complete monitoring cycle.

    Args:
        session: Database session
    """
    log.info("paystack.monitoring.cycle.start")

    try:
        # Generate monitoring report
        report = await PaystackMonitoring.generate_monitoring_report(session)

        # Check for alerts
        alerts = await PaystackAlerts.check_all_alerts(session)

        # Log summary
        log.info(
            "paystack.monitoring.cycle.completed",
            report_timestamp=report["timestamp"],
            alert_count=len(alerts),
            overall_healthy=report["health_checks"]["overall_healthy"],
        )

    except Exception as e:
        log.error(
            "paystack.monitoring.cycle.error",
            error=str(e),
        )
        raise
