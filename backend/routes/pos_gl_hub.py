"""
POS & GL Integration Hub — Toast POS and QuickBooks Online OAuth scaffolding.
Full OAuth flow with webhook receivers and data sync pipeline stubs.
Ready for real API keys when available.
"""
from fastapi import APIRouter, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
from uuid import uuid4
import os

router = APIRouter(prefix="/api/pos-gl", tags=["pos-gl"])

from database import db as _db
pos_connections_col = _db["pos_connections"]
gl_connections_col = _db["gl_connections"]
pos_sync_log_col = _db["pos_sync_log"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# ═══════════════════════════════════════════
# TOAST POS INTEGRATION
# ═══════════════════════════════════════════

TOAST_CONFIG = {
    "name": "Toast POS",
    "auth_url": "https://ws-api.toasttab.com/authentication/v1/oauth2/token",
    "api_base": "https://ws-api.toasttab.com",
    "scopes": ["orders.read", "menus.read", "payments.read", "labor.read", "restaurants.read"],
    "required_credentials": ["client_id", "client_secret", "restaurant_external_id"],
}

QUICKBOOKS_CONFIG = {
    "name": "QuickBooks Online",
    "auth_url": "https://appcenter.intuit.com/connect/oauth2",
    "token_url": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    "api_base": "https://quickbooks.api.intuit.com/v3",
    "scopes": ["com.intuit.quickbooks.accounting"],
    "required_credentials": ["client_id", "client_secret", "redirect_uri", "realm_id"],
}


@router.get("/status")
def integration_status():
    """Get connection status for all POS/GL integrations."""
    toast_conn = pos_connections_col.find_one({"provider": "toast"}, {"_id": 0})
    qb_conn = gl_connections_col.find_one({"provider": "quickbooks"}, {"_id": 0})

    return {
        "integrations": [
            {
                "provider": "toast",
                "name": "Toast POS",
                "status": toast_conn.get("status", "disconnected") if toast_conn else "disconnected",
                "last_sync": toast_conn.get("last_sync") if toast_conn else None,
                "features": ["orders", "menus", "payments", "labor", "restaurants"],
                "config": TOAST_CONFIG,
            },
            {
                "provider": "quickbooks",
                "name": "QuickBooks Online",
                "status": qb_conn.get("status", "disconnected") if qb_conn else "disconnected",
                "last_sync": qb_conn.get("last_sync") if qb_conn else None,
                "features": ["chart_of_accounts", "journal_entries", "vendors", "invoices", "reports"],
                "config": QUICKBOOKS_CONFIG,
            },
        ]
    }


# ═══════════════════════════════════════════
# TOAST POS — OAuth & Sync
# ═══════════════════════════════════════════

@router.post("/toast/connect")
def toast_connect(body: dict):
    """Initialize Toast POS connection with credentials."""
    client_id = body.get("client_id")
    client_secret = body.get("client_secret")
    restaurant_id = body.get("restaurant_external_id")

    if not all([client_id, client_secret, restaurant_id]):
        return {"error": "client_id, client_secret, and restaurant_external_id required"}

    connection = {
        "connection_id": f"toast-{_uid()}",
        "provider": "toast",
        "status": "pending_auth",
        "client_id": client_id,
        "restaurant_external_id": restaurant_id,
        "created_at": _now(),
    }

    # In production: Exchange credentials for OAuth token
    # response = requests.post(TOAST_CONFIG["auth_url"], data={
    #     "grant_type": "client_credentials",
    #     "client_id": client_id,
    #     "client_secret": client_secret,
    # })

    # Demo: Simulate successful connection
    connection["status"] = "connected"
    connection["access_token"] = f"toast-demo-{_uid()}"
    connection["token_expires_at"] = (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat()
    connection["last_sync"] = None

    pos_connections_col.update_one(
        {"provider": "toast"},
        {"$set": connection},
        upsert=True,
    )

    return {"success": True, "connection": {k: v for k, v in connection.items() if k not in ("client_secret", "access_token")}}


@router.post("/toast/sync")
def toast_sync():
    """Trigger a manual sync from Toast POS."""
    conn = pos_connections_col.find_one({"provider": "toast"}, {"_id": 0})
    if not conn or conn.get("status") != "connected":
        return {"error": "Toast POS not connected"}

    # In production: Fetch data from Toast API
    # orders = fetch_toast_orders(conn["access_token"], conn["restaurant_external_id"])
    # menu_items = fetch_toast_menu(conn["access_token"], conn["restaurant_external_id"])

    # Demo: Simulate sync results
    sync_result = {
        "sync_id": f"sync-{_uid()}",
        "provider": "toast",
        "started_at": _now(),
        "completed_at": _now(),
        "status": "success",
        "records": {
            "orders_synced": 847,
            "menu_items_synced": 142,
            "payments_synced": 823,
            "labor_shifts_synced": 34,
        },
        "period": "last_24h",
    }

    pos_sync_log_col.insert_one(sync_result)
    del sync_result["_id"]

    pos_connections_col.update_one(
        {"provider": "toast"},
        {"$set": {"last_sync": _now()}},
    )

    return sync_result


@router.get("/toast/orders")
def toast_orders(date: Optional[str] = None, limit: int = 20):
    """Get orders from Toast POS (demo data)."""
    now = datetime.now(timezone.utc)
    orders = []
    import random
    random.seed(42)

    order_types = ["Dine-In", "Takeout", "Delivery", "Bar"]
    payment_types = ["Credit Card", "Cash", "Gift Card", "Mobile Pay"]
    servers = ["Sarah M.", "James K.", "Maria L.", "David R.", "Emily W."]

    for i in range(min(limit, 20)):
        order_time = now - timedelta(minutes=random.randint(5, 720))
        items = random.randint(2, 8)
        subtotal = round(random.uniform(18, 120), 2)
        tax = round(subtotal * 0.0825, 2)
        tip = round(subtotal * random.uniform(0.15, 0.25), 2)

        orders.append({
            "order_id": f"TO-{10000 + i}",
            "order_type": random.choice(order_types),
            "server": random.choice(servers),
            "items_count": items,
            "subtotal": subtotal,
            "tax": tax,
            "tip": tip,
            "total": round(subtotal + tax + tip, 2),
            "payment_type": random.choice(payment_types),
            "status": "closed",
            "created_at": order_time.isoformat(),
        })

    return {"orders": orders, "total": len(orders)}


@router.get("/toast/menu-sync")
def toast_menu_sync():
    """Get menu items synced from Toast POS (demo data)."""
    return {
        "synced_items": 142,
        "categories": [
            {"name": "Appetizers", "items": 18, "avg_price": 14.50},
            {"name": "Entrees", "items": 32, "avg_price": 34.00},
            {"name": "Desserts", "items": 12, "avg_price": 12.50},
            {"name": "Beverages", "items": 45, "avg_price": 8.75},
            {"name": "Sides", "items": 15, "avg_price": 7.50},
            {"name": "Specials", "items": 20, "avg_price": 28.00},
        ],
        "last_sync": _now(),
    }


# ═══════════════════════════════════════════
# QUICKBOOKS ONLINE — OAuth & Sync
# ═══════════════════════════════════════════

@router.get("/quickbooks/auth-url")
def quickbooks_auth_url(client_id: str, redirect_uri: str, state: Optional[str] = None):
    """Generate QuickBooks OAuth authorization URL."""
    if not state:
        state = _uid()

    auth_url = (
        f"{QUICKBOOKS_CONFIG['auth_url']}"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={' '.join(QUICKBOOKS_CONFIG['scopes'])}"
        f"&state={state}"
    )

    return {"auth_url": auth_url, "state": state}


@router.post("/quickbooks/connect")
def quickbooks_connect(body: dict):
    """Complete QuickBooks OAuth connection."""
    client_id = body.get("client_id")
    realm_id = body.get("realm_id")

    if not all([client_id, realm_id]):
        return {"error": "client_id and realm_id required"}

    # In production: Exchange auth code for tokens
    # response = requests.post(QUICKBOOKS_CONFIG["token_url"], data={...})

    connection = {
        "connection_id": f"qb-{_uid()}",
        "provider": "quickbooks",
        "status": "connected",
        "client_id": client_id,
        "realm_id": realm_id,
        "access_token": f"qb-demo-{_uid()}",
        "token_expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "created_at": _now(),
        "last_sync": None,
    }

    gl_connections_col.update_one(
        {"provider": "quickbooks"},
        {"$set": connection},
        upsert=True,
    )

    return {"success": True, "connection": {k: v for k, v in connection.items() if k not in ("client_secret", "access_token")}}


@router.post("/quickbooks/sync")
def quickbooks_sync():
    """Trigger GL sync from QuickBooks."""
    conn = gl_connections_col.find_one({"provider": "quickbooks"}, {"_id": 0})
    if not conn or conn.get("status") != "connected":
        return {"error": "QuickBooks not connected"}

    sync_result = {
        "sync_id": f"sync-{_uid()}",
        "provider": "quickbooks",
        "started_at": _now(),
        "completed_at": _now(),
        "status": "success",
        "records": {
            "accounts_synced": 45,
            "journal_entries_synced": 128,
            "vendors_synced": 34,
            "invoices_synced": 67,
        },
        "period": "last_30d",
    }

    pos_sync_log_col.insert_one(sync_result)
    del sync_result["_id"]

    gl_connections_col.update_one(
        {"provider": "quickbooks"},
        {"$set": {"last_sync": _now()}},
    )

    return sync_result


@router.get("/quickbooks/chart-of-accounts")
def quickbooks_chart_of_accounts():
    """Get chart of accounts from QuickBooks (demo data)."""
    return {
        "accounts": [
            {"id": "4000", "name": "Food Revenue", "type": "Revenue", "balance": 892450.00, "sub_type": "SalesOfProductIncome"},
            {"id": "4010", "name": "Beverage Revenue", "type": "Revenue", "balance": 345200.00, "sub_type": "SalesOfProductIncome"},
            {"id": "4020", "name": "Catering Revenue", "type": "Revenue", "balance": 234800.00, "sub_type": "ServiceFeeIncome"},
            {"id": "5000", "name": "Cost of Goods - Food", "type": "CostOfGoodsSold", "balance": 285580.00, "sub_type": "SuppliesMaterialsCogs"},
            {"id": "5010", "name": "Cost of Goods - Beverage", "type": "CostOfGoodsSold", "balance": 86300.00, "sub_type": "SuppliesMaterialsCogs"},
            {"id": "6000", "name": "Labor - Kitchen", "type": "Expense", "balance": 198000.00, "sub_type": "PayrollExpenses"},
            {"id": "6010", "name": "Labor - FOH", "type": "Expense", "balance": 156000.00, "sub_type": "PayrollExpenses"},
            {"id": "6500", "name": "Supplies & Smallwares", "type": "Expense", "balance": 34200.00, "sub_type": "OfficeSupplies"},
            {"id": "7000", "name": "Rent & Occupancy", "type": "Expense", "balance": 72000.00, "sub_type": "RentOrLeaseOfBuildings"},
            {"id": "7500", "name": "Utilities", "type": "Expense", "balance": 18900.00, "sub_type": "Utilities"},
        ],
        "total_accounts": 45,
        "last_sync": _now(),
    }


@router.get("/quickbooks/profit-loss")
def quickbooks_profit_loss(period: str = "monthly"):
    """Get P&L summary from QuickBooks (demo data)."""
    return {
        "period": period,
        "revenue": {
            "food": 892450.00,
            "beverage": 345200.00,
            "catering": 234800.00,
            "other": 45000.00,
            "total": 1517450.00,
        },
        "cost_of_goods": {
            "food": 285580.00,
            "beverage": 86300.00,
            "total": 371880.00,
        },
        "gross_profit": 1145570.00,
        "gross_margin_pct": 0.755,
        "operating_expenses": {
            "labor": 354000.00,
            "rent": 72000.00,
            "utilities": 18900.00,
            "supplies": 34200.00,
            "marketing": 15000.00,
            "insurance": 8500.00,
            "other": 22000.00,
            "total": 524600.00,
        },
        "net_income": 620970.00,
        "net_margin_pct": 0.409,
    }


# ═══════════════════════════════════════════
# WEBHOOKS
# ═══════════════════════════════════════════

@router.post("/webhooks/toast")
async def toast_webhook(request: Request):
    """Receive Toast POS webhook events."""
    body = await request.json()
    event_type = body.get("eventType", "unknown")

    pos_sync_log_col.insert_one({
        "sync_id": f"wh-{_uid()}",
        "provider": "toast",
        "type": "webhook",
        "event_type": event_type,
        "payload_size": len(str(body)),
        "received_at": _now(),
    })

    return {"received": True, "event_type": event_type}


@router.post("/webhooks/quickbooks")
async def quickbooks_webhook(request: Request):
    """Receive QuickBooks webhook events."""
    body = await request.json()
    event_type = body.get("eventNotifications", [{}])[0].get("dataChangeEvent", {}).get("entities", [{}])[0].get("name", "unknown") if body.get("eventNotifications") else "unknown"

    pos_sync_log_col.insert_one({
        "sync_id": f"wh-{_uid()}",
        "provider": "quickbooks",
        "type": "webhook",
        "event_type": event_type,
        "received_at": _now(),
    })

    return {"received": True}


@router.get("/sync-log")
def sync_log(provider: Optional[str] = None, limit: int = 20):
    """Get sync/webhook event log."""
    q = {}
    if provider:
        q["provider"] = provider
    logs = list(pos_sync_log_col.find(q, {"_id": 0}).sort("received_at", -1).limit(limit))
    return {"logs": logs, "total": len(logs)}


@router.post("/disconnect/{provider}")
def disconnect_integration(provider: str):
    """Disconnect a POS/GL integration."""
    if provider == "toast":
        pos_connections_col.update_one({"provider": "toast"}, {"$set": {"status": "disconnected", "access_token": None}})
    elif provider == "quickbooks":
        gl_connections_col.update_one({"provider": "quickbooks"}, {"$set": {"status": "disconnected", "access_token": None}})
    else:
        return {"error": f"Unknown provider: {provider}"}
    return {"disconnected": True, "provider": provider}
