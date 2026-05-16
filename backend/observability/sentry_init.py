"""
Sentry integration for FastAPI.
Activates only if SENTRY_DSN is set. Otherwise no-op.
Call init_sentry() early in server.py startup before app instantiation.
"""
import os
import logging

logger = logging.getLogger(__name__)


def init_sentry() -> bool:
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn:
        logger.info("Sentry DSN not set — skipping init (set SENTRY_DSN in backend/.env to enable)")
        return False
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning("sentry-sdk[fastapi] not installed — pip install sentry-sdk[fastapi]")
        return False

    def _scrub(event, _hint):
        # Strip request bodies that may contain PII (emails, names, card tokens)
        try:
            if "request" in event:
                event["request"].pop("data", None)
                # Also strip Authorization/Cookie headers
                headers = event["request"].get("headers", {})
                for h in list(headers.keys()):
                    if h.lower() in ("authorization", "cookie", "x-admin-token"):
                        headers[h] = "[redacted]"
        except Exception:
            pass
        return event

    sentry_sdk.init(
        dsn=dsn,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "development"),
        release=os.environ.get("SENTRY_RELEASE", "echoai3@dev"),
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        profiles_sample_rate=float(os.environ.get("SENTRY_PROFILES_SAMPLE_RATE", "0.1")),
        send_default_pii=False,  # explicit — do not send user PII
        before_send=_scrub,
        integrations=[FastApiIntegration(transaction_style="endpoint"), StarletteIntegration()],
    )
    logger.info(f"Sentry initialized (env={os.environ.get('SENTRY_ENVIRONMENT', 'development')})")
    return True
