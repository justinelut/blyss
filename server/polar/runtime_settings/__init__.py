"""Runtime-configurable secrets overlay.

DB rows with status='active' override env-based settings.
Requires POLAR_RUNTIME_SETTINGS_KEY env var (Fernet base64 32-byte key).

Generate a key for local dev:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from .service import runtime_settings

__all__ = ["runtime_settings"]
