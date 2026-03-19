import structlog

from polar.logging import Logger
from polar.worker import AsyncSessionMaker, CronTrigger, TaskPriority, actor

from .repository import CartRepository

log: Logger = structlog.get_logger()


@actor(
    actor_name="cart.cleanup_expired",
    cron_trigger=CronTrigger(hour=0, minute=0),
    priority=TaskPriority.LOW,
    max_retries=0,
)
async def cart_cleanup_expired() -> None:
    """Delete cart items older than 7 days."""
    async with AsyncSessionMaker() as session:
        repository = CartRepository.from_session(session)
        deleted_count = await repository.delete_expired(days=7)
        log.info("Cart cleanup completed", deleted_count=deleted_count)
