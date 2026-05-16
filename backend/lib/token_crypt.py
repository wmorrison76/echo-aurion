"""iter180 · token encryption at rest (Fernet)

Used to encrypt Outlook refresh tokens before persisting to MongoDB.

If TOKEN_ENCRYPTION_KEY is not set, falls through to plaintext storage with a
prominent warning log. Prior unencrypted records continue to decrypt fine — we
detect and re-encrypt on refresh.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

_FERNET = None


def _fernet():
    global _FERNET
    if _FERNET is not None:
        return _FERNET
    key = (os.environ.get("TOKEN_ENCRYPTION_KEY") or "").strip()
    if not key:
        logger.warning("TOKEN_ENCRYPTION_KEY not set — Outlook refresh tokens stored plaintext!")
        return None
    try:
        from cryptography.fernet import Fernet
        _FERNET = Fernet(key.encode() if isinstance(key, str) else key)
        return _FERNET
    except Exception as e:
        logger.error(f"Invalid TOKEN_ENCRYPTION_KEY ({e}) — falling back to plaintext")
        return None


def encrypt(token: str) -> str:
    """Encrypt a token for storage. Prefixes ciphertext with 'enc_v1:' sentinel."""
    if not token:
        return token
    f = _fernet()
    if f is None:
        return token
    try:
        return "enc_v1:" + f.encrypt(token.encode()).decode()
    except Exception as e:
        logger.error(f"encrypt failed: {e}")
        return token


def decrypt(value: Optional[str]) -> str:
    """Decrypt a stored value. Returns value unchanged if not encrypted (legacy)."""
    if not value:
        return value or ""
    if not value.startswith("enc_v1:"):
        return value  # legacy plaintext
    f = _fernet()
    if f is None:
        logger.error("encrypted value found but TOKEN_ENCRYPTION_KEY missing — cannot decrypt")
        return ""
    try:
        return f.decrypt(value[len("enc_v1:"):].encode()).decode()
    except Exception as e:
        logger.error(f"decrypt failed: {e}")
        return ""
