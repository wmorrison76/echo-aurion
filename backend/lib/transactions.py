"""
D53.8 · MongoDB transaction helper.

D33 reconcile updates pos_failover_orders + pos_failover_sessions
+ pos_replay_log non-atomically. If the worker crashes mid-loop,
some orders are marked synced but the session counter wasn't
updated. D47 payroll post has the same shape — paystubs marked
posted before the run is locked.

This wrapper provides the with_transaction() context that wraps
an arbitrary callable in a Mongo transaction. Falls back to no-op
when the deployment is a standalone (single-node Mongo doesn't
support multi-doc tx) or when the FakeDb harness is in use.

Usage

    from lib.transactions import with_transaction

    def _do_reconcile():
        for o in pending:
            db["pos_failover_orders"].update_one(...)
            db["pos_replay_log"].insert_one(...)
        db["pos_failover_sessions"].update_one(...)

    result = with_transaction(_do_reconcile)

Doctrine alignment

  · §3.1 append-only: transactions are write-side; never affect
    read semantics.
  · D27 tenant isolation: transactions don't change isolation
    boundary — every query inside still filters by tenant_id.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Callable, TypeVar

logger = logging.getLogger("echo.transactions")

T = TypeVar("T")


@contextmanager
def transaction_session():
    """Yields a Mongo session if the deployment supports it, else
    None (caller should still proceed; ops will be non-atomic but
    behavior is unchanged from pre-transaction code)."""
    try:
        import database
        db = database.db
        client = getattr(db, "client", None)
        if client is None or not hasattr(client, "start_session"):
            # FakeDb or standalone Mongo without replica set
            yield None
            return
        session = client.start_session()
        try:
            with session.start_transaction():
                yield session
        finally:
            try: session.end_session()
            except Exception: pass
    except Exception as e:
        logger.warning(
            f"transaction_session unavailable; running non-atomic: {e}")
        yield None


def with_transaction(fn: Callable[..., T], *args, **kwargs) -> T:
    """Run fn(*args, **kwargs) inside a Mongo transaction if
    available. The fn should accept a `session` kwarg; if it
    doesn't, it'll just run without the session (caller's
    responsibility to thread session through their writes)."""
    with transaction_session() as session:
        if session and "session" not in kwargs:
            try:
                kwargs["session"] = session
                return fn(*args, **kwargs)
            except TypeError:
                # fn doesn't accept session; call without
                kwargs.pop("session", None)
                return fn(*args, **kwargs)
        return fn(*args, **kwargs)
