"""Encryption helpers for runtime settings.

Wraps cryptography.fernet.Fernet. Never logs plaintext values.
"""

from hashlib import sha256

from cryptography.fernet import Fernet, InvalidToken

from polar.exceptions import PolarError


class RuntimeSettingsCryptoError(PolarError):
    def __init__(self, message: str = "Encryption/decryption failed") -> None:
        super().__init__(message, status_code=500)


def encrypt(plaintext: str, key: bytes) -> bytes:
    try:
        return Fernet(key).encrypt(plaintext.encode())
    except Exception as e:
        raise RuntimeSettingsCryptoError(f"Encrypt failed: {type(e).__name__}") from e


def decrypt(ciphertext: bytes, key: bytes) -> str:
    try:
        return Fernet(key).decrypt(ciphertext).decode()
    except (InvalidToken, Exception) as e:
        raise RuntimeSettingsCryptoError(f"Decrypt failed: {type(e).__name__}") from e


def hash_value(plaintext: str) -> str:
    return sha256(plaintext.encode()).hexdigest()[:16]
