"""iter266.17 backend tests — BEO Messaging, Chef Outlet Auto-Build, GM Daily Briefing."""
import os
import re
import time
import uuid

import pytest
import requests

def _read_env(key, path):
    try:
        with open(path) as f:
            for line in f:
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        return ""
    return ""

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or _read_env("REACT_APP_BACKEND_URL", "/app/frontend/.env")).rstrip("/")
MONGO_URL = (os.environ.get("MONGO_URL")
             or _read_env("MONGO_URL", "/app/backend/.env"))
DB_NAME = (os.environ.get("DB_NAME")
           or _read_env("DB_NAME", "/app/backend/.env") or "test_database")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

DEMO_BEO = "demo-bf-rooftop-sunset"


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ───────── BEO Messaging ─────────

class TestBeoMessaging:
    def test_send_valid(self, http):
        r = http.post(f"{BASE_URL}/api/beo-messaging/send", json={
            "beo_id": DEMO_BEO,
            "sender_id": f"TEST_user_{uuid.uuid4().hex[:6]}",
            "sender_name": "Test User",
            "body": "Hello from test",
            "channel": "desktop",
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        m = data["message"]
        for k in ["id", "beo_id", "beo_name", "client_name", "event_date",
                  "sender_id", "body", "channel", "read_by", "created_at"]:
            assert k in m, f"missing field {k}: {m}"
        assert m["beo_id"] == DEMO_BEO
        assert m["read_by"] == []
        assert m["body"] == "Hello from test"

    def test_send_nonexistent_beo_returns_404(self, http):
        r = http.post(f"{BASE_URL}/api/beo-messaging/send", json={
            "beo_id": "does-not-exist-xyz",
            "sender_id": "TEST_u",
            "body": "hi",
        })
        assert r.status_code == 404, r.text

    def test_send_empty_body_returns_422(self, http):
        r = http.post(f"{BASE_URL}/api/beo-messaging/send", json={
            "beo_id": DEMO_BEO,
            "sender_id": "TEST_u",
            "body": "",
        })
        assert r.status_code == 422, r.text

    def test_get_thread(self, http):
        r = http.get(f"{BASE_URL}/api/beo-messaging/thread/{DEMO_BEO}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["beo_id"] == DEMO_BEO
        assert "beo_name" in data
        tmpl = data.get("auto_context_template", "")
        assert "BEO #" in tmpl
        assert "Client" in tmpl
        assert "Date" in tmpl
        assert "Guest Count" in tmpl
        assert isinstance(data["messages"], list)
        assert "count" in data

    def test_get_thread_nonexistent_404(self, http):
        r = http.get(f"{BASE_URL}/api/beo-messaging/thread/no-such-beo-zz")
        assert r.status_code == 404

    def test_send_3_then_sorted_ascending(self, http):
        # Use isolated BEO test, but only one exists - use demo and check ordering for 3 new
        # Get baseline count first
        beo = "demo-bf-poolside-brunch"
        r0 = http.get(f"{BASE_URL}/api/beo-messaging/thread/{beo}")
        assert r0.status_code == 200
        baseline = r0.json()["count"]

        bodies = [f"msg-{i}-{uuid.uuid4().hex[:6]}" for i in range(3)]
        for b in bodies:
            rr = http.post(f"{BASE_URL}/api/beo-messaging/send", json={
                "beo_id": beo, "sender_id": "TEST_seq", "body": b,
            })
            assert rr.status_code == 200
            time.sleep(0.05)

        r1 = http.get(f"{BASE_URL}/api/beo-messaging/thread/{beo}")
        data = r1.json()
        assert data["count"] == baseline + 3
        msgs = data["messages"]
        # ascending order
        timestamps = [m["created_at"] for m in msgs]
        assert timestamps == sorted(timestamps), "messages not sorted ascending"
        # last 3 should be ours
        assert [m["body"] for m in msgs[-3:]] == bodies

    def test_unread_grouped_by_beo_excludes_self(self, http):
        user_a = f"TEST_a_{uuid.uuid4().hex[:6]}"
        user_b = f"TEST_b_{uuid.uuid4().hex[:6]}"
        beo = "demo-bf-garden-gala"

        # A sends 2 to that BEO
        for b in ["a1", "a2"]:
            http.post(f"{BASE_URL}/api/beo-messaging/send", json={
                "beo_id": beo, "sender_id": user_a, "body": b,
            })
            time.sleep(0.05)

        # B fetches unread, must see BEO once (latest message only)
        r = http.get(f"{BASE_URL}/api/beo-messaging/unread", params={"user_id": user_b})
        assert r.status_code == 200, r.text
        data = r.json()
        threads = data["threads"]
        matching = [t for t in threads if t["beo_id"] == beo]
        assert len(matching) == 1, f"expected 1 thread for BEO, got {len(matching)}"
        # latest body should be "a2"
        assert matching[0]["last_body"] == "a2"

        # User A should NOT see their own messages
        r2 = http.get(f"{BASE_URL}/api/beo-messaging/unread", params={"user_id": user_a})
        threads_a = r2.json()["threads"]
        matching_a = [t for t in threads_a if t["beo_id"] == beo]
        # they may still see other senders' messages, but not from messages where sender==A
        # since only A sent here, A should not see this BEO
        assert len(matching_a) == 0, "user A should not see own messages"

    def test_mark_read_then_unread_drops_thread(self, http):
        sender = f"TEST_s_{uuid.uuid4().hex[:6]}"
        reader = f"TEST_r_{uuid.uuid4().hex[:6]}"
        beo = "demo-bf-beach-ceremony"

        # sender posts
        http.post(f"{BASE_URL}/api/beo-messaging/send", json={
            "beo_id": beo, "sender_id": sender, "body": "ping1",
        })
        http.post(f"{BASE_URL}/api/beo-messaging/send", json={
            "beo_id": beo, "sender_id": sender, "body": "ping2",
        })

        # reader sees thread
        u1 = http.get(f"{BASE_URL}/api/beo-messaging/unread", params={"user_id": reader}).json()
        assert any(t["beo_id"] == beo for t in u1["threads"])

        # mark read
        r = http.post(f"{BASE_URL}/api/beo-messaging/mark-read", json={
            "beo_id": beo, "user_id": reader,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body["marked"] >= 2

        # after mark-read, that BEO no longer in unread for reader
        u2 = http.get(f"{BASE_URL}/api/beo-messaging/unread", params={"user_id": reader}).json()
        assert not any(t["beo_id"] == beo for t in u2["threads"]), \
            "BEO should not appear in unread after mark-read"


# ───────── Chef Outlet Auto-Build ─────────

class TestChefAutoBuild:
    def test_auto_build_success(self, http):
        r = http.post(f"{BASE_URL}/api/chef-outlet/beo-timeline/{DEMO_BEO}/auto-build")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["recipes_built"] > 0
        assert data["prep_items_built"] > 0
        assert data["covers"] >= 0
        assert isinstance(data["recipes"], list)
        assert isinstance(data["prep_items"], list)
        # verify shape of a prep item
        if data["prep_items"]:
            p = data["prep_items"][0]
            for k in ["id", "beo_id", "item_name", "category", "quantity", "unit", "status"]:
                assert k in p

    def test_auto_build_idempotent(self, http):
        # run once
        r1 = http.post(f"{BASE_URL}/api/chef-outlet/beo-timeline/{DEMO_BEO}/auto-build").json()
        # detail before second run
        d1 = http.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{DEMO_BEO}/detail").json()
        n1 = len(d1.get("prep_items") or d1.get("prep") or [])

        # run again
        r2 = http.post(f"{BASE_URL}/api/chef-outlet/beo-timeline/{DEMO_BEO}/auto-build").json()
        d2 = http.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{DEMO_BEO}/detail").json()
        n2 = len(d2.get("prep_items") or d2.get("prep") or [])
        assert n2 == n1, f"prep items duplicated on rerun: {n1} -> {n2}"

    def test_auto_build_nonexistent_404(self, http):
        r = http.post(f"{BASE_URL}/api/chef-outlet/beo-timeline/does-not-exist-zzz/auto-build")
        assert r.status_code == 404

    def test_auto_build_empty_returns_400(self, http):
        # Seed an empty BEO directly via Mongo not possible from here; try a real BEO
        # the request statement implies empty-beo would 400. We'll try a deterministic empty BEO ID
        # by inserting via API if exists. Instead, send to a BEO we know is empty: create one.
        empty_id = f"TEST_empty_beo_{uuid.uuid4().hex[:6]}"
        # Try to seed by hitting a beo create endpoint if exists; otherwise rely on direct mongo.
        # Use pymongo via env to insert empty BEO
        from pymongo import MongoClient
        client = MongoClient(MONGO_URL)
        dbn = DB_NAME
        client[dbn]["beo_functions"].insert_one({
            "id": empty_id, "name": "TEST Empty", "expected_covers": 50,
            "menu_items": [], "menu_summary": "",
        })
        try:
            r = http.post(f"{BASE_URL}/api/chef-outlet/beo-timeline/{empty_id}/auto-build")
            assert r.status_code == 400, f"expected 400 for empty menu, got {r.status_code}: {r.text}"
        finally:
            client[dbn]["beo_functions"].delete_one({"id": empty_id})

    def test_approve_prep_all(self, http):
        # ensure auto-built first
        http.post(f"{BASE_URL}/api/chef-outlet/beo-timeline/{DEMO_BEO}/auto-build")
        r = http.post(f"{BASE_URL}/api/chef-outlet/beo-timeline/approve-prep", json={
            "beo_id": DEMO_BEO, "chef_id": "TEST_chef", "approve_all": True,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["approved"] > 0, data

    def test_detail_still_works(self, http):
        r = http.get(f"{BASE_URL}/api/chef-outlet/beo-timeline/{DEMO_BEO}/detail")
        assert r.status_code == 200, r.text


# ───────── GM Daily Briefing / Transfer Link ─────────

class TestGmBriefing:
    def test_gm_daily_briefing_html(self, http):
        r = http.get(f"{BASE_URL}/api/beverage-network/vip-precheck/gm-daily-briefing")
        assert r.status_code == 200, r.text
        assert "text/html" in r.headers.get("content-type", "")
        assert "GM Daily Briefing" in r.text
        assert "Echo AI" in r.text  # "Echo AI³"

    def test_gm_daily_briefing_30days(self, http):
        r = http.get(f"{BASE_URL}/api/beverage-network/vip-precheck/gm-daily-briefing",
                     params={"days_ahead": 30})
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
        # If shortfalls exist, there should be REQUEST TRANSFER links pointing to /api/beverage-network/transfer-link
        if "REQUEST TRANSFER" in r.text:
            assert "/api/beverage-network/transfer-link" in r.text
        else:
            # acceptable to have no shortfalls; report info
            print("No shortfalls returned in briefing - REQUEST TRANSFER not present (allowed)")

    def test_transfer_link_inserts_row(self, http):
        from pymongo import MongoClient
        client = MongoClient(MONGO_URL)
        dbn = DB_NAME
        gid = f"TEST_vip_{uuid.uuid4().hex[:6]}"
        sku = "Opus One"
        r = http.get(f"{BASE_URL}/api/beverage-network/transfer-link",
                     params={"guest_id": gid, "sku": sku, "qty": 1, "to_outlet": "pier-club"})
        assert r.status_code == 200, r.text
        assert "text/html" in r.headers.get("content-type", "")
        assert "Transfer" in r.text
        # confirm row inserted
        row = client[dbn]["beverage_transfers"].find_one({"guest_id": gid})
        assert row is not None, "no beverage_transfers row inserted"
        assert row["status"] == "pending"
        assert row["reason"] == "vip_pre_arrival_shortfall"
        # cleanup
        client[dbn]["beverage_transfers"].delete_many({"guest_id": gid})

    def test_vip_precheck_endpoint_still_works(self, http):
        # regression check
        r = http.post(f"{BASE_URL}/api/beverage-network/vip-precheck", json={
            "vip_id": "TEST_vip_regression",
            "party_size": 2,
            "preferred_beverages": ["Opus One"],
            "notify": False,
        })
        assert r.status_code == 200, r.text

    def test_availability_still_works(self, http):
        r = http.get(f"{BASE_URL}/api/beverage-network/availability")
        assert r.status_code == 200, r.text
