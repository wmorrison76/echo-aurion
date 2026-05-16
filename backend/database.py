"""
LUCCCA Enterprise Database Layer
MongoDB connection and collection management
Configured for mega-resort scale: 40-50+ outlets, concurrent multi-user access

D17b: This module is the legacy import surface. The actual client now
lives in `services.clients.get_mongo_client()` (the fuse-box factory).
We delegate so there is exactly ONE MongoClient + connection pool per
process — importing either `from database import db` or
`from services.clients import get_db` returns the same handle.
"""
from pymongo import ASCENDING, DESCENDING

from services.clients import get_db, get_mongo_client
from config import get_settings

# Backwards-compatible aliases. Old code that did `from database import
# client, db, MONGO_URL, DB_NAME` keeps working unchanged.
_settings = get_settings()
MONGO_URL = _settings.MONGO_URL
DB_NAME = _settings.DB_NAME
client = get_mongo_client()
db = get_db()

# Collections
ingredients_col = db["ingredients"]
inventory_col = db["inventory_transactions"]
recipes_col = db["recipes"]
invoices_col = db["invoices"]
po_suggestions_col = db["po_suggestions"]
production_col = db["production_schedules"]
forecasts_col = db["forecasts"]
forecast_events_col = db["forecast_events"]
consumption_history_col = db["consumption_history"]
pos_transactions_col = db["pos_transactions"]
menu_items_col = db["menu_items"]
pos_sales_col = db["pos_sales_analytics"]
events_col = db["events"]
event_audit_col = db["event_audit_log"]
gl_entries_col = db["gl_journal_entries"]
labor_plans_col = db["labor_plans"]
labor_actuals_col = db["labor_actuals"]
positions_col = db["positions"]
schedule_col = db["schedules"]
audit_log_col = db["audit_log"]


def ensure_indexes():
    """Create all required indexes on startup"""
    ingredients_col.create_index("sku", unique=True, sparse=True)
    ingredients_col.create_index("name")
    ingredients_col.create_index("category")
    ingredients_col.create_index([("current_stock", ASCENDING)])

    inventory_col.create_index([("ingredient_id", ASCENDING), ("timestamp", DESCENDING)])
    inventory_col.create_index("transaction_type")

    recipes_col.create_index("name")
    recipes_col.create_index("category")

    invoices_col.create_index([("processed_at", DESCENDING)])
    invoices_col.create_index("vendor_name")

    pos_transactions_col.create_index([("closed_at", DESCENDING)])
    pos_transactions_col.create_index("provider")
    pos_transactions_col.create_index("outlet_id")

    events_col.create_index("stage")
    events_col.create_index([("event_date", ASCENDING)])
    events_col.create_index("org_id")

    gl_entries_col.create_index([("posted_at", DESCENDING)])
    gl_entries_col.create_index("account_code")
    gl_entries_col.create_index("event_id")

    labor_plans_col.create_index("event_id")
    labor_actuals_col.create_index([("event_id", ASCENDING), ("date", ASCENDING)])

    audit_log_col.create_index([("timestamp", DESCENDING)])
    audit_log_col.create_index("engine")

    consumption_history_col.create_index([("ingredient_id", ASCENDING), ("date", DESCENDING)])

    # ── Multi-outlet scoping indexes (mega-resort: 40-50+ outlets) ──
    for col_name in ["pos_transactions", "menu_items", "events", "labor_plans", "temperature_logs"]:
        db[col_name].create_index("outlet_id")

    # ── Fresh Meal Systems indexes ──
    db["fms_products"].create_index("product_id", unique=True)
    db["fms_products"].create_index("active")
    db["fms_products"].create_index("channels")
    db["fms_products"].create_index([("created_at", DESCENDING)])

    db["fms_production_runs"].create_index("run_id", unique=True)
    db["fms_production_runs"].create_index("status")
    db["fms_production_runs"].create_index("lane_id")
    db["fms_production_runs"].create_index([("priority", DESCENDING), ("created_at", DESCENDING)])

    db["fms_assembly_lanes"].create_index("lane_id", unique=True)
    db["fms_assembly_lanes"].create_index("active")

    db["fms_subscriptions"].create_index("subscription_id", unique=True)
    db["fms_subscriptions"].create_index("active")
    db["fms_subscriptions"].create_index("plan_type")

    db["fms_routes"].create_index("route_id", unique=True)
    db["fms_routes"].create_index([("created_at", DESCENDING)])

    db["fms_safety_records"].create_index("record_id", unique=True)
    db["fms_safety_records"].create_index([("created_at", DESCENDING)])
    db["fms_safety_records"].create_index("overall_pass")

    # ── Calendar / event compound indexes for high-traffic queries ──
    db["calendar_events"].create_index([("outlet_id", ASCENDING), ("date", ASCENDING)])
    db["calendar_events"].create_index([("event_type", ASCENDING), ("date", ASCENDING)])

    # ── Portal share links ──
    db["portal_share_links"].create_index("lead_id")
    db["portal_share_links"].create_index("token", unique=True, sparse=True)
    db["portal_leads"].create_index([("created_at", DESCENDING)])
