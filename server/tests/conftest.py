import os

os.environ["POLAR_ENV"] = "testing"

# Setup Dramatiq broker before any imports
import dramatiq
from dramatiq.brokers.stub import StubBroker

# Create and set a stub broker for testing
_test_broker = StubBroker()
_test_broker.emit_after("process_boot")
dramatiq.set_broker(_test_broker)

from tests.fixtures import *  # noqa
import pytest


def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers."""
    config.addinivalue_line(
        "markers",
        "keep_session_state: Disable automatic session clearing before HTTP requests (for old tests only)",
    )

