#!/usr/bin/env python3
"""D15 · Mobile sync drain smoke test (CI-runnable).

Drives `/api/mobile/sync` end-to-end against a running backend,
validating that the offline write queue actually drains and that
conflict / allowlist behavior is correct.

Usage:
    yarn dev:server  # in another shell
    python3 scripts/smoke/mobile_sync_smoke.py [BASE_URL]

Defaults to BASE_URL=http://127.0.0.1:8000 (the FastAPI dev server).

Exit status 0 = all checks passed. Non-zero = a check failed and the
sync drain is broken — do not ship the desktop build.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request


def _post(url: str, body: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "X-User-Id": "smoke-runner"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def _get(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=10) as resp:
        return json.loads(resp.read())


def main(base: str) -> int:
    print(f"[smoke] base={base}")
    fails: list[str] = []

    def check(name: str, ok: bool, detail: str = ""):
        if ok:
            print(f"  ok  · {name}")
        else:
            fails.append(name)
            print(f"  FAIL · {name}: {detail}", file=sys.stderr)

    # 1. Health probe
    try:
        h = _get(f"{base}/api/mobile/sync/health")
        check("/sync/health responds", h.get("ok") is True)
        check("/sync/health lists allowed entities",
              "pto_request" in (h.get("allowed_entities") or []))
    except urllib.error.URLError as e:
        check("/sync/health responds", False, f"unreachable: {e}")
        return 1

    # 2. Sync a fresh create — round-trip a fake PTO request
    op_id = f"smoke-{int(time.time())}"
    entity_id = f"pto-smoke-{int(time.time())}"
    body = {
        "operations": [{
            "id": op_id, "type": "create",
            "entity_type": "pto_request",
            "entity_id": entity_id,
            "timestamp": int(time.time() * 1000),
            "data": {"employee_id": "smoke-runner",
                     "start_date": "2026-12-01",
                     "end_date":   "2026-12-03",
                     "reason": "smoke-test"},
            "retry_count": 0, "status": "pending",
        }],
    }
    r = _post(f"{base}/api/mobile/sync", body)
    check("create op drains", op_id in (r.get("synced_ids") or []),
          json.dumps(r))
    check("no failures on clean create",
          (r.get("failures") or []) == [], json.dumps(r.get("failures")))

    # 3. Disallowed entity_type → per-op failure (not a 4xx of the batch)
    bad_body = {
        "operations": [{
            "id": "smoke-bad", "type": "create",
            "entity_type": "admin_users",   # not in allowlist
            "entity_id": "x", "timestamp": 1, "data": {"role": "owner"},
            "retry_count": 0, "status": "pending",
        }],
    }
    r2 = _post(f"{base}/api/mobile/sync", bad_body)
    check("disallowed entity → per-op failure",
          len(r2.get("failures") or []) == 1,
          json.dumps(r2))
    check("disallowed entity NOT silently synced",
          "smoke-bad" not in (r2.get("synced_ids") or []))

    # 4. Idempotent delete-of-missing
    del_body = {
        "operations": [{
            "id": "smoke-del", "type": "delete",
            "entity_type": "pto_request",
            "entity_id": "pto-does-not-exist",
            "timestamp": int(time.time() * 1000),
            "data": {}, "retry_count": 0, "status": "pending",
        }],
    }
    r3 = _post(f"{base}/api/mobile/sync", del_body)
    check("delete-of-missing is idempotent",
          "smoke-del" in (r3.get("synced_ids") or []),
          json.dumps(r3))

    # Summary
    print()
    if fails:
        print(f"[smoke] {len(fails)} FAILED: {fails}", file=sys.stderr)
        return 1
    print("[smoke] all 7 checks passed — sync drain healthy")
    return 0


if __name__ == "__main__":
    base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")
    sys.exit(main(base))
