"""
LUCCCA Enterprise Platform - Main Server
=========================================
FastAPI application with 10 enterprise engines, WebSocket real-time push,
and modular route architecture.
"""
import os
import sys
import json
import uuid
import time
import asyncio
from typing import Optional
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Response, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# ---------------------------------------------------------------------------
# Observability — Sentry (must be imported BEFORE app creation to capture startup errors)
# ---------------------------------------------------------------------------
from observability.sentry_init import init_sentry
init_sentry()

# D53.10 · Structured JSON logging — must initialize early
from lib.structured_logging import configure as _configure_logging
_configure_logging()

# D57.23 · Security headers / CSP — registered as middleware below

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
import database
db = database.db

# ---------------------------------------------------------------------------
# Engine imports
# ---------------------------------------------------------------------------
import operations_core
import ai_forecasting
import pos_integration
import event_lifecycle
import labor_cost
import event_bus
import payroll_engine
import workflow_engine
import notification_service
import security
import tamper_audit
import dashboard_widgets

# ---------------------------------------------------------------------------
# Route imports
# ---------------------------------------------------------------------------
from routes import operations, forecasting, pos, events, enterprise, bus
from routes.ordering import router as ordering_router
from routes.calendar import router as calendar_router, seed_calendar
from routes.rbac import router as rbac_router, seed_rbac
from routes.procurement import router as procurement_router
from routes.compliance import router as compliance_router
from routes.intelligence import router as intelligence_router, seed_properties
from routes.beverage import router as beverage_router, seed_beverage
from routes.ai3_nlp import router as ai3_nlp_router
from routes.echoai3_orchestrator import router as echoai3_router
from routes.echoai3_voice import router as echoai3_voice_router
from routes.echoai3_heartbeat import router as echoai3_heartbeat_router
from routes.echoai3_collective import router as echoai3_collective_router
from routes.echoai3_simulation import router as echoai3_simulation_router
from routes.echoai3_adaptive import router as echoai3_adaptive_router
from routes.echoai3_ripple import router as echoai3_ripple_router
from routes.echoai3_governance import router as echoai3_governance_router
from routes.echoai3_digital_twin import router as echoai3_twin_router
from routes.echoai3_confidence import router as echoai3_confidence_router
from routes.echoai3_chef import router as echoai3_chef_router
from routes.zaro_guardian import router as zaro_guardian_router
from routes.zaro_guardian import sentinel as zaro_sentinel, heimdall as zaro_heimdall
from routes.echoai3_ingestion import router as echoai3_ingestion_router
from routes.echoai3_knowledge_base import router as echoai3_kb_router
from routes.echoai3_masterchef import router as echoai3_masterchef_router
from routes.echoai3_continuous import router as echoai3_continuous_router
from routes.echoai3_pastry import router as echoai3_pastry_router
from routes.echoai3_evolution import router as echoai3_evolution_router
from routes.advanced_ops import router as advanced_ops_router
from routes.calendar_feed import router as calendar_feed_router
from routes.beo_builder import router as beo_builder_router
from routes.dept_slices import router as dept_slices_router
from routes.echo_ai3 import router as echo_ai3_router, _ensure_seed as _seed_wisdom_rules
from routes.crm_lifecycle import router as crm_lifecycle_router
from routes.supplier_catalog import router as supplier_catalog_router
# invoice_ocr.py deleted (D1) — invoice_ingest.py is canonical
from routes.weather_live import router as weather_router
from routes.admin_onboarding import router as admin_router
from routes.recipe_import import router as recipe_import_router
from routes.echo_events import router as echo_events_router
from routes.waste_sheet import router as waste_sheet_router
from routes.menu_engineering import router as menu_engineering_router
from routes.pos_connector import router as pos_connector_router
from routes.gl_sync import router as gl_sync_router
from routes.echolayout import router as echolayout_router
from routes.echolayout_kitchen import router as echolayout_kitchen_router, seed_kitchen_catalog
from routes.culinary_notes import router as culinary_notes_router
from routes.simulation import router as simulation_router
from routes.echoai3_analytics import router as echoai3_analytics_router
# D7: per-module AI^3 insights surface (FOH, Spa, Retail, Security,
# Engineering, Housekeeping). FOH UI was 404-ing on /api/intelligence/ai3/foh.
from routes.intelligence_ai3 import router as intelligence_ai3_router
from routes.manager_dashboard import router as manager_dashboard_router
from routes.vendor_intelligence import router as vendor_intel_router
from routes.budget_engine import router as budget_engine_router
from routes.executive_command import router as executive_command_router
from routes.report_export import router as report_export_router
from routes.commissary_engine import router as commissary_engine_router
from routes.onboarding_wizard import router as onboarding_wizard_router
from routes.admin_approval import router as admin_approval_router
from routes.engineering import router as engineering_router
from routes.engineering_advanced import router as engineering_adv_router
from routes.department_dashboards import router as dept_dash_router
from routes.push_notifications_legacy import router as push_notif_router
from routes.voice_integration import router as voice_router
from routes.analytics_engine import router as analytics_engine_router
from routes.spa_wellness import router as spa_router
from routes.eng_work_tickets import router as eng_work_tickets_router
from routes.dept_analytics import router as dept_analytics_router
from routes.pos_gl_oauth import router as pos_gl_oauth_router
from routes.onboarding_guest import router as onboarding_guest_router, guest_router as guest_booking_router
from routes.echo_concierge import router as concierge_router
from routes.echo_connect import router as connect_router
from routes.foh_operations import router as foh_router
from routes.retail_operations import router as retail_router
from routes.guest360 import router as guest360_router
from routes.housekeeping import router as housekeeping_router
from routes.minibar_ird import router as ird_router
from routes.guest_ordering import router as guest_ordering_router
from routes.kitchen_routing import router as kitchen_routing_router
from routes.kitchen_fire import router as kitchen_fire_router
from routes.weather_rebook import router as weather_rebook_router
from routes.fire_safety import router as fire_safety_router
from routes.receiving import router as receiving_router
from routes.help_agent import router as help_agent_router
from routes.onboarding_wizard_v2 import router as onboarding_wizard_v2_router
from echo.invoice_extractor import router as echo_invoice_extractor_router_d63
from echo.ocr_active_learning import router as ocr_active_learning_router
from routes.tip_share_engine import router as tip_share_router
from routes.reservation_channels import router as reservation_channels_router
from routes.pms_core import router as pms_core_router
from routes.pos_failover import router as pos_failover_router
from routes.qr_library import (
    router as qr_library_router,
    storyboard_router as outlet_storyboard_router,
    mobile_menu_router as mobile_menu_router,
)
from routes.echo_activity_drawer import router as echo_activity_drawer_router
from routes.recipe_scan_mobile import router as recipe_scan_mobile_router
from routes.sous_chef_agent import router as sous_chef_agent_router
from routes.vendor_mobile_ordering import router as vendor_mobile_ordering_router
from routes.payroll_engine_full import (
    router as payroll_engine_full_router,
    self_service_router as payroll_self_service_router,
    job_share_router as payroll_job_share_router,
    schedule_request_router as payroll_schedule_request_router,
)
from routes.schedule_unified import router as schedule_unified_router
from routes.email_notifications import router as email_router
from routes.guest_intelligence import router as guest_intel_router
from routes.daily_reports import router as daily_reports_router
from routes.forecast_21day import router as forecast_21day_router
from routes.outlet_capture import router as outlet_capture_router
from routes.pace_report import router as pace_report_router
from routes.cash_runway import router as cash_runway_router
from routes.loan_covenants import router as loan_covenants_router
from routes.forecast_drift_alarm import router as forecast_drift_router
from routes.yield_per_minute import router as yield_per_minute_router
from routes.cross_property import router as cross_property_router
from routes.outlet_rampup import router as outlet_rampup_router
from routes.exception_review import router as exception_review_router
from routes.why_changed import router as why_changed_router
from routes.tip_audit import router as tip_audit_router
from routes.recipe_variance import router as recipe_variance_router
from routes.vendor_pareto import router as vendor_pareto_router
from routes.labor_productivity import router as labor_productivity_router
from routes.whatif_sandbox import router as whatif_sandbox_router
from routes.intercompany_eliminations import router as intercompany_router
from routes.period_close import router as period_close_router
from routes.lifecycle_engine import router as lifecycle_engine_router
from services.weather import router as weather_router
from services.upgrade_safety import router as upgrade_safety_router
from services.health import router as health_router
from services.admin_audit import router as admin_audit_router
from services.slo import router as slo_router
from services.connection_pool_monitor import router as connection_pool_router
from services.backup_verification import router as backup_verification_router
from services.perf_profiler import router as perf_profiler_router
from services.pii_scanner import router as pii_scanner_router
from routes.demo_seed import router as demo_seed_router
from services.structured_logging import (
    configure_structured_logging,
    RequestLoggingMiddleware,
)
from services.idempotency import IdempotencyMiddleware
from routes.enterprise_bi import router as enterprise_bi_router
from routes.item_mapping import router as item_mapping_router
from routes.echoai3_ops_pulse import router as ops_pulse_router
from routes.echoai3_stress import router as stress_test_router
from routes.echoai3_financial_ops import router as financial_ops_router
from routes.beo_orchestration import router as beo_orchestration_router
from routes.banquet_workforce import router as banquet_workforce_router
from routes.production_engine import router as production_engine_router
from routes.echoai3_roi import router as echoai3_roi_router
from routes.event_layouts import router as event_layouts_router
from routes.beverage_ordering import router as beverage_ordering_router
from routes.beo_batch import router as beo_batch_router
from routes.annual_budget import router as annual_budget_router
from routes.echoai3_performance import router as echoai3_performance_router
from routes.echo_stratus import router as echo_stratus_router
from routes.kitchen_production import router as kitchen_production_router
from routes.operations_hub import router as operations_hub_router
from routes.chef_gio_training import router as chef_gio_router
from routes.beverage_ops import router as beverage_ops_router
from routes.mixology_rd import router as mixology_rd_router
from routes.banquet_menu_catalog import router as banquet_menu_router
from routes.pos_auto_router import router as pos_auto_router
from routes.pos_analytics import router as pos_analytics_router
from routes.ai_image_gen import router as ai_image_gen_router
from routes.cake_consultation import router as cake_consultation_router
from routes.cake_assets import router as cake_assets_router
from routes.production_schedules import router as production_schedules_router
from routes.cake_orders import router as cake_orders_router
from routes.spa_services import router as spa_services_router
from routes.spa_booking import router as spa_booking_router
from routes.pamphlet_designer import router as pamphlet_designer_router
from routes.spa_ops import router as spa_ops_router
from routes.pos_adapter import router as pos_adapter_router
from routes.concierge_liability import router as concierge_liability_router
from routes.spa_schedule_intel import router as spa_schedule_intel_router
from routes.eng_ops import router as eng_ops_router
from routes.hskp_ops import router as hskp_ops_router
from routes.concierge_hub import router as concierge_hub_router
from routes.foh_ops import router as foh_ops_router
from routes.guest360_hub import router as guest360_hub_router
from routes.ird_hub import router as ird_hub_router
from routes.intelligence_adapter import router as intelligence_adapter_router
from routes.kds import router as kds_router
from routes.patterns import router as patterns_router
from routes.cake_viewer import router as cake_viewer_router
from routes.cake_ai_services import router as cake_ai_router
from routes.pastry_stripe import router as pastry_stripe_router, webhook_router as stripe_webhook_router
from routes.pastry_share import router as pastry_share_router
from routes.eng_ops_notifications import router as eng_ops_notifications_router
from routes.beo_standalone import router as beo_standalone_router
from routes.admin_gate import router as admin_gate_router
from routes.golden_seed import router as golden_seed_router
from routes.seed_plant import router as seed_plant_router
from routes.concierge_v2 import router as concierge_v2_router
from routes.echo_concierge_v2 import router as echo_concierge_v2_router
from routes.echo_concierge_v2_phase2 import router as echo_concierge_v2_phase2_router
from routes.daily_standup import router as daily_standup_router
from routes.people import router as people_router, seed_employees
from routes.job_profiles import router as job_profiles_router, seed_job_profiles
from routes.employee_hr import router as employee_hr_router
from routes.auth_emergent import router as auth_emergent_router
from routes.concierge_mobile import router as concierge_mobile_router
from routes.outlook_sync import router as outlook_sync_router
from routes.hiring import router as hiring_router
from routes.dashboard import router as dashboard_router
from routes.guest_concierge import router as guest_concierge_router, seed_guest_concierge
from routes.guest_concierge_ext import router_ext as guest_concierge_ext_router, seed_iter184_all
from routes.concierge_unified import router as concierge_unified_router, seed_concierge_events
from routes.mobile_sync import router as mobile_sync_router
from routes.module_registry import router as module_registry_router
from routes.admin_roles import router as admin_roles_router
from routes.admin_fuse_box import router as admin_fuse_box_router
from routes.commissary import router as commissary_router
from routes.chronos_forecast import router as chronos_forecast_router
from routes.chronos_auto_order import router as chronos_auto_order_router
from routes.chronos_flex_labor import router as chronos_flex_labor_router
from routes.beo_production_generator import router as beo_production_router
from routes.audit_log import router as audit_log_router
from echo.events import router as echo_event_log_router
from echo.retrospective import router as echo_retrospective_router
from echo.forensic import router as echo_forensic_router
from routes.myecho_webauthn import router as myecho_webauthn_router
from echo.chef_pnl_review import router as echo_chef_pnl_router
# Note: echo.invoice_extractor already imported above (line 141) as
# echo_invoice_extractor_router_d63 by the D54 merge — second import dropped.
from echo.waste_intelligence import router as echo_waste_intel_router
from echo.concierge_intelligence import router as echo_concierge_intel_router
from echo.service_auditors import router as echo_service_audit_router
from echo.correlation_engine import router as echo_correlation_router
from echo.stress_harness import router as echo_stress_router
from echo.order_divergence import router as echo_divergence_router
from echo.insights_layer import router as echo_insights_router
from echo.invoice_extractor import router as echo_invoice_extractor_router
from routes.group_events import router as group_events_router
from routes.daily_briefing_mobile import router as daily_briefing_mobile_router
from routes.purchasing_approvals import router as purchasing_approvals_router, seed_approval_config
from routes.invoice_ingest import router as invoice_ingest_router, sku_router as vendor_skus_router, seed_william_invoices
from routes.notif_prefs import router as notif_prefs_router
from routes.service_recovery import router as service_recovery_router, playbook_router
from routes.echo_schedule import router as echo_schedule_router, seed_echo_schedule
from routes.chef_outlet import router as chef_outlet_router
from routes.beverage_network import router as beverage_network_router
from routes.beo_messaging import router as beo_messaging_router
from routes.echo_events_studio import router as echo_events_studio_router
from routes.myecho_enrollment import router as myecho_enrollment_router
from routes.cross_dept_borrow import router as cross_dept_borrow_router
from routes.chronos import router as chronos_router
from routes.chronos_ai import router as chronos_ai_router
from routes.admin_console import router as admin_console_router
from routes.purchrec_sprint1 import router as purchrec_sprint1_router
from routes.vendor_scorecard import router as vendor_scorecard_router
from routes.beo_autoplanner import router as beo_autoplanner_router
from routes.ird_menu_builder import router as ird_menu_builder_router, public_router as ird_public_router
from routes.spa_menu_builder import router as spa_menu_builder_router, public_router as spa_public_router
from routes.ops_daily import router_ops as ops_daily_router, router_sku as sku_resolver_router
from routes.permissions import router as permissions_router
from routes.staff_mobile import router as staff_mobile_router, pto_router, benefits_router, hiring_mobile_router, finance_mobile_router
from routes.feature_flags import router as feature_flags_router
from routes.release_notes import router as release_notes_router
from routes.timeline import router as timeline_router
from routes.recipe_graph import router as recipe_graph_router
from routes.fresh_meal_systems import router as fresh_meal_router
from routes.fda_export import router as fda_export_router
from routes.fm_foundations import channels_router, kitchen_calendar_router, echo_router
from routes.floor_route import floor_router, route_router
from routes.echo_whats_new import router as echo_whats_new_router
from routes.echo_viewer import router as echo_viewer_router
from routes.echo_agentic import router as echo_agentic_router
from routes.push_native import router as push_router, send_push_to_staff
from routes.hours_of_operation import router as hours_router, seed_outlet_hours
from routes.leadership_coverage import router as leadership_router, seed_leadership_coverage
from routes.lifestyle_dashboard import router as lifestyle_router, seed_lifestyle
from routes.relay_tickets import router as relay_router
from routes.milestones import router as milestones_router
from routes.my_schedule import router as my_schedule_router
from routes.standup_delegation import router as standup_delegation_router
from routes.welcome_pack import router as welcome_pack_router
from routes.showrooms import router as showrooms_router
from routes.outlet_menus import router as outlet_menus_router
from routes.ops_forecast_21day import router as ops_forecast_router
from routes.group_resume import router as group_resume_router
from routes.purchasing_engine import router as purchasing_router
from routes.yield_database import router as yield_router
from routes.inventory_receiving import router as inventory_router
from routes.menu_engineering_matrix import router as menu_eng_router

# ---------------------------------------------------------------------------
# WebSocket Manager
# ---------------------------------------------------------------------------
class WSManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        for ws in list(self.active):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(ws)

ws_manager = WSManager()
_main_loop: Optional[asyncio.AbstractEventLoop] = None

# Sync broadcast helper — schedule on the main event loop
def _broadcast_sync(event_type: str, payload: dict):
    global _main_loop
    if _main_loop is None:
        return
    msg = {
        "type": event_type, "data": payload,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    _main_loop.call_soon_threadsafe(asyncio.ensure_future, ws_manager.broadcast(msg))

# Patch event_bus to broadcast WS events
_original_publish = event_bus.publish
def _patched_publish(event_type, payload, source=None, correlation_id=None, idempotency_key=None):
    result = _original_publish(event_type, payload, source, correlation_id, idempotency_key)
    _broadcast_sync(event_type, {"source": source, **payload})
    return result
event_bus.publish = _patched_publish


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(title="LUCCCA Enterprise Platform", version="3.1")

# D57.23 · Security headers / CSP middleware (D53 followup)
try:
    from middleware.security_headers import SecurityHeadersMiddleware
    app.add_middleware(SecurityHeadersMiddleware)
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Rate limiting (slowapi)
# ---------------------------------------------------------------------------
from observability.rate_limit import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# ---------------------------------------------------------------------------
# Production Hardening — Global Exception Handler
# ---------------------------------------------------------------------------
import logging
logger = logging.getLogger("luccca.server")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return a clean JSON error."""
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return Response(
        content=json.dumps({"detail": "Internal server error", "path": str(request.url.path)}),
        status_code=500,
        media_type="application/json",
    )

_allowed_origins = [
    o.strip()
    for o in os.environ.get("CORS_ORIGINS", "*").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-Outlet-ID", "X-Admin-Token"],
)

# ---------------------------------------------------------------------------
# Startup: seed data
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    global _main_loop
    _main_loop = asyncio.get_running_loop()

    # Production hardening — validate critical environment
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url:
        logger.error("FATAL: MONGO_URL not set in environment")
    if not db_name:
        logger.error("FATAL: DB_NAME not set in environment")
    logger.info(f"Starting LUCCCA Enterprise Platform v3.1 — DB: {db_name}")

    import seed_data
    seed_data.seed_all()
    # iter250 · Seed admin + sample staff for auth
    try:
        from routes.auth import seed_admin_and_staff
        seed_admin_and_staff()
    except Exception as e:
        logger.error(f"auth seed failed: {e}")
    # iter252 · Seed default purchasing limits & approval hierarchy
    try:
        seed_approval_config()
    except Exception as e:
        logger.error(f"approval-config seed failed: {e}")
    # iter253 · Ingest William's 3 uploaded invoices + create approval requests
    try:
        seed_william_invoices()
    except Exception as e:
        logger.error(f"william-invoices seed failed: {e}")
    # iter254 · Seed echo-schedule employees + shifts + tiers
    try:
        seed_echo_schedule()
    except Exception as e:
        logger.error(f"echo-schedule seed failed: {e}")
    # Seed vendors for ordering module
    from routes.ordering import seed_vendors
    seed_vendors()
    # Seed resort calendar outlets and sample events
    seed_calendar()
    # Seed RBAC users and properties
    seed_rbac()
    seed_properties()
    seed_beverage()
    # D5 EchoLayout kitchen catalog (30 commercial-kitchen units)
    try:
        n_kit = seed_kitchen_catalog()
        if n_kit:
            print(f"[seed] kitchen_equipment_catalog: +{n_kit} rows")
    except Exception as _e:
        print(f"[seed] kitchen catalog skipped: {_e}")
    # iter266 · Demo data — commissary catalog, outdoor BEO functions, employee badges
    try:
        from demo_data_seed import seed_all_demo_data
        seed_all_demo_data()
    except Exception as _e:
        print(f"[seed] demo data skipped: {_e}")
    # iter266.7 · Sample invoices from scanner output → menus/recipes/costing
    try:
        from seed_sample_invoices import seed_sample_invoices
        seed_sample_invoices()
    except Exception as _e:
        print(f"[seed] sample invoices skipped: {_e}")
    # iter173 · Phase 1 foundation: employees, outlet hours, leadership coverage
    try:
        n_emp = seed_employees()
        n_hrs = seed_outlet_hours()
        n_lead = seed_leadership_coverage()
        n_life = seed_lifestyle()
        n_jp = seed_job_profiles()
        n_gc = seed_guest_concierge()
        n_184 = seed_iter184_all()
        n_evt = seed_concierge_events()
        if n_emp or n_hrs or n_lead or n_life or n_jp or n_gc or n_184 or n_evt:
            print(f"[iter173 seed] employees={n_emp} outlet_hours={n_hrs} leadership_coverage={n_lead} lifestyle={n_life} job_profiles={n_jp} guest_concierge={n_gc} iter184={n_184} concierge_events={n_evt}")
    except Exception as e:
        print(f"[iter173 seed error] {e}")
    # Seed POS router (revenue centers, printers, auto-route menu items)
    from routes.banquet_menu_catalog import router as _bm_router
    from routes.pos_auto_router import router as _pos_router
    try:
        # Ensure banquet menu is seeded first
        if db["banquet_menu_catalog"].count_documents({"active": True}) == 0:
            from routes.banquet_menu_catalog import _get_pier66_menu_data, _get_pier66_guidelines
            db["banquet_menu_catalog"].insert_one({
                "_id": "bm-pier66-v1", "menu_id": "bm-pier66-v1",
                "name": "Pier Sixty-Six Banquet Menu", "property": "Pier Sixty-Six Resort",
                "version": "01/10/2025", "season": "winter_2025", "year": 2025,
                "type": "full_banquet", "sections": _get_pier66_menu_data(),
                "guidelines": _get_pier66_guidelines(),
                "service_charge_pct": 26.0, "tax_pct": 7.0, "active": True,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info("Seeded Luccca Resort banquet menu")
        # Seed POS routing
        if db["pos_menu_items"].count_documents({}) == 0:
            from routes.pos_auto_router import _auto_route_banquet_catalog, _auto_route_global_beverages
            for rc in [
                {"id": "rc-bnq", "code": "BNQ", "name": "Banquet", "type": "banquet", "active": True},
                {"id": "rc-rest", "code": "REST", "name": "Restaurant", "type": "outlet", "active": True},
                {"id": "rc-pool", "code": "POOL", "name": "Pool Bar", "type": "outlet", "active": True},
                {"id": "rc-lng", "code": "LNG", "name": "Lounge", "type": "outlet", "active": True},
                {"id": "rc-irs", "code": "IRS", "name": "In-Room Dining", "type": "outlet", "active": True},
            ]:
                db["pos_revenue_centers"].update_one({"id": rc["id"]}, {"$set": rc}, upsert=True)
            from routes.pos_auto_router import CHIT_PRINTERS_DEFAULT
            for p in CHIT_PRINTERS_DEFAULT:
                db["pos_chit_printers"].update_one({"id": p["id"]}, {"$set": {**p, "active": True}}, upsert=True)
            bnq = await _auto_route_banquet_catalog()
            bev = await _auto_route_global_beverages()
            logger.info(f"POS auto-routed: {bnq} banquet items, {bev} global beverages")
    except Exception as e:
        logger.warning(f"POS auto-routing on startup skipped: {e}")
    # Start the monthly review scheduler
    from scheduler import start_scheduler
    start_scheduler()


@app.on_event("shutdown")
async def shutdown():
    from scheduler import stop_scheduler
    stop_scheduler()

# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
            else:
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "subscribe":
                        await websocket.send_json({"type": "subscribed", "channel": msg.get("channel", "all")})
                except json.JSONDecodeError:
                    pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "platform": "LUCCCA Enterprise",
        "version": "3.1",
        "engines": {
            "operations_core": "active",
            "ai_forecasting": "active",
            "pos_integration": "active",
            "event_lifecycle": "active",
            "labor_cost": "active",
            "event_bus": "active",
            "payroll": "active",
            "workflow": "active",
            "notifications": "active",
            "tamper_audit": "active",
        },
        "websocket": "wss:// via ingress (ws:// internal only on 0.0.0.0:8001)",  # nosemgrep: detect-insecure-websocket — documentation string; actual WS is behind TLS-terminating ingress
        "websocket_clients": len(ws_manager.active),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Seed endpoint
# ---------------------------------------------------------------------------
@app.post("/api/seed")
def seed():
    import seed_data
    seed_data.seed_all()
    return {"status": "seeded"}


# ---------------------------------------------------------------------------
# Unified Dashboard
# ---------------------------------------------------------------------------
@app.get("/api/dashboard")
def dashboard():
    ops = operations_core.get_engine_stats()
    pos_stats = pos_integration.get_pos_stats()
    ev_stats = event_lifecycle.get_lifecycle_stats()
    lb = labor_cost.get_labor_analytics()
    alerts = ai_forecasting.get_stock_alerts()
    bus_s = event_bus.get_bus_stats()
    wf = workflow_engine.get_workflow_stats()
    notif = notification_service.get_notification_stats()
    audit = tamper_audit.get_audit_stats()
    pr = payroll_engine.get_payroll_stats()

    return {
        "operations": ops, "pos": pos_stats, "events": ev_stats,
        "labor": lb,
        "alerts": {
            "critical": len(alerts.get("critical", [])),
            "warning": len(alerts.get("warning", [])),
            "total": alerts.get("total_alerts", 0),
        },
        "event_bus": bus_s, "workflow": wf, "notifications": notif,
        "audit": audit, "payroll": pr,
        "websocket_clients": len(ws_manager.active),
        "platform": "LUCCCA Enterprise", "version": "3.1",
    }


# ---------------------------------------------------------------------------
# Register modular routes
# ---------------------------------------------------------------------------
operations.register(app)
forecasting.register(app)
pos.register(app)
events.register(app)
enterprise.register(app, ws_manager, _broadcast_sync)
bus.register(app)
app.include_router(ordering_router)
app.include_router(calendar_router)
app.include_router(rbac_router)
app.include_router(procurement_router)
app.include_router(compliance_router)
app.include_router(advanced_ops_router)
app.include_router(calendar_feed_router)
app.include_router(beo_builder_router)
app.include_router(dept_slices_router)
app.include_router(echo_ai3_router)
app.include_router(crm_lifecycle_router)
# Idempotent on boot — seeds 17 wisdom rules (iter204)
try:
    _seed_wisdom_rules()
except Exception as _e:
    import logging; logging.getLogger("server").warning("wisdom seed failed: %s", _e)
app.include_router(intelligence_router)
app.include_router(beverage_router)
app.include_router(ai3_nlp_router)
app.include_router(echoai3_router)
app.include_router(chronos_router)
app.include_router(chronos_ai_router)
app.include_router(admin_console_router)
app.include_router(purchrec_sprint1_router)
app.include_router(vendor_scorecard_router)
app.include_router(beo_autoplanner_router)
app.include_router(ird_menu_builder_router)
app.include_router(ird_public_router)
app.include_router(spa_menu_builder_router)
app.include_router(spa_public_router)
app.include_router(permissions_router)
app.include_router(ops_daily_router)
app.include_router(sku_resolver_router)
app.include_router(echoai3_voice_router)
app.include_router(echoai3_heartbeat_router)
app.include_router(echoai3_collective_router)
app.include_router(echoai3_simulation_router)
app.include_router(echoai3_adaptive_router)
app.include_router(echoai3_ripple_router)
app.include_router(echoai3_governance_router)
app.include_router(echoai3_twin_router)
app.include_router(echoai3_confidence_router)
app.include_router(echoai3_chef_router)
app.include_router(zaro_guardian_router)
app.include_router(echoai3_ingestion_router)
app.include_router(echoai3_kb_router)
app.include_router(echoai3_masterchef_router)
app.include_router(echoai3_continuous_router)
app.include_router(echoai3_pastry_router)
app.include_router(echoai3_evolution_router)

# Echo Help Mascot — guided tours, sessions, free-form Q&A (D63/D64)
from routes.help_agent import router as help_agent_router
app.include_router(help_agent_router)

# MyEcho · PIN re-auth gate (paystubs, tax docs, etc.)
from routes.myecho_pin import router as myecho_pin_router
app.include_router(myecho_pin_router)

# MyEcho · comprehensive payroll (ADP-style breakdown — real IRS math, demo inputs)
from routes.myecho_payroll import router as myecho_payroll_router
app.include_router(myecho_payroll_router)

# Panel compatibility shims — replace 404s from legacy panel endpoints with
# well-shaped empty responses so panels render their §1.1 empty-state
# instead of hanging on Loading. (Iter 5 · Pass B triage.)
from routes.panel_compat_shims import router as panel_compat_shims_router
app.include_router(panel_compat_shims_router)
app.include_router(supplier_catalog_router)
# invoice_ocr_router unwired (D1) — invoice_ingest_router is canonical
app.include_router(weather_router)
app.include_router(admin_router)
app.include_router(recipe_import_router)
app.include_router(echo_events_router)
app.include_router(waste_sheet_router)
app.include_router(menu_engineering_router)
app.include_router(pos_connector_router)
app.include_router(gl_sync_router)
app.include_router(echolayout_router)
app.include_router(echolayout_kitchen_router)
app.include_router(culinary_notes_router)
app.include_router(simulation_router)
app.include_router(echoai3_analytics_router)
app.include_router(intelligence_ai3_router)
app.include_router(manager_dashboard_router)
app.include_router(vendor_intel_router)
app.include_router(budget_engine_router)
app.include_router(executive_command_router)
app.include_router(report_export_router)
app.include_router(commissary_engine_router)
app.include_router(onboarding_wizard_router)
app.include_router(onboarding_guest_router)

# D44: forbes_audit exposes forbes_router + audit_router + router; the
# unnamed 'router' gets auto-registered, but the two named routers
# (Forbes labels + chef audit queue) need explicit mount.
from routes.forbes_audit import (
    forbes_router as _forbes_labels_router,
    audit_router as _waste_audit_queue_router,
)
app.include_router(_forbes_labels_router)
app.include_router(_waste_audit_queue_router)
app.include_router(guest_booking_router)
app.include_router(concierge_router)
app.include_router(connect_router)
app.include_router(foh_router)
app.include_router(retail_router)
app.include_router(guest360_router)
app.include_router(housekeeping_router)
app.include_router(ird_router)
app.include_router(guest_ordering_router)
app.include_router(kitchen_routing_router)
app.include_router(kitchen_fire_router)
app.include_router(weather_rebook_router)
app.include_router(fire_safety_router)
app.include_router(receiving_router)
app.include_router(help_agent_router)
app.include_router(onboarding_wizard_v2_router)
app.include_router(ocr_active_learning_router)
app.include_router(pos_failover_router)
app.include_router(qr_library_router)
app.include_router(outlet_storyboard_router)
app.include_router(mobile_menu_router)
app.include_router(echo_activity_drawer_router)
app.include_router(recipe_scan_mobile_router)
app.include_router(sous_chef_agent_router)
app.include_router(vendor_mobile_ordering_router)
app.include_router(payroll_engine_full_router)
app.include_router(payroll_self_service_router)
app.include_router(payroll_job_share_router)
app.include_router(payroll_schedule_request_router)
app.include_router(pms_core_router)
app.include_router(schedule_unified_router)
app.include_router(tip_share_router)
app.include_router(reservation_channels_router)

# D53.3 · Health checks — register early so they serve even if
# downstream init fails
from routes.health import router as health_router, mark_ready
app.include_router(health_router)
app.include_router(email_router)
app.include_router(guest_intel_router)
app.include_router(daily_reports_router)
app.include_router(forecast_21day_router)
app.include_router(outlet_capture_router)
app.include_router(pace_report_router)
app.include_router(cash_runway_router)
app.include_router(loan_covenants_router)
app.include_router(forecast_drift_router)
app.include_router(yield_per_minute_router)
app.include_router(cross_property_router)
app.include_router(outlet_rampup_router)
app.include_router(exception_review_router)
app.include_router(why_changed_router)
app.include_router(tip_audit_router)
app.include_router(recipe_variance_router)
app.include_router(vendor_pareto_router)
app.include_router(labor_productivity_router)
app.include_router(whatif_sandbox_router)
app.include_router(intercompany_router)
app.include_router(period_close_router)
app.include_router(lifecycle_engine_router)
app.include_router(upgrade_safety_router)
app.include_router(admin_audit_router)
app.include_router(slo_router)
app.include_router(connection_pool_router)
app.include_router(backup_verification_router)
app.include_router(perf_profiler_router)
app.include_router(pii_scanner_router)
app.include_router(demo_seed_router)


# Launch-readiness observability stack — initialize structured
# logging at process start; install request ID + idempotency
# middleware so every endpoint is correlatable + retry-safe.
configure_structured_logging()
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(IdempotencyMiddleware)


# OpenAPI doc surface — FastAPI auto-generates the schema; the
# /docs and /redoc routes are enabled by default. Expose the raw
# schema at /api/openapi-schema for tooling consumption.
@app.get("/api/openapi-schema", tags=["openapi"], include_in_schema=False)
async def openapi_schema():
    """Return the OpenAPI 3.x schema for the entire API. Used by
    SDK generators, Postman, Insomnia, or for hosting external
    documentation surfaces (Stoplight, Redoc, etc.)."""
    return app.openapi()
app.include_router(enterprise_bi_router)
app.include_router(item_mapping_router)
app.include_router(ops_pulse_router)
app.include_router(stress_test_router)
app.include_router(financial_ops_router)
app.include_router(beo_orchestration_router)
app.include_router(banquet_workforce_router)
app.include_router(production_engine_router)
app.include_router(echoai3_roi_router)
app.include_router(event_layouts_router)
app.include_router(beverage_ordering_router)
app.include_router(beo_batch_router)
app.include_router(annual_budget_router)
app.include_router(echoai3_performance_router)
app.include_router(echo_stratus_router)
app.include_router(kitchen_production_router)
app.include_router(operations_hub_router)
app.include_router(chef_gio_router)
app.include_router(beverage_ops_router)
app.include_router(mixology_rd_router)
app.include_router(banquet_menu_router)
app.include_router(pos_auto_router)
app.include_router(pos_analytics_router)
app.include_router(ai_image_gen_router)
app.include_router(cake_consultation_router)
app.include_router(cake_assets_router)
app.include_router(production_schedules_router)
app.include_router(cake_orders_router)
app.include_router(spa_services_router)
app.include_router(spa_booking_router)
app.include_router(pamphlet_designer_router)
app.include_router(spa_ops_router)
app.include_router(pos_adapter_router)
app.include_router(concierge_liability_router)
app.include_router(spa_schedule_intel_router)
# D7: eng_ops carries /api/eng-ops/{kpis,today,assets,pm-schedule,utilities,...}.
# Previously shadowed by eng_work_tickets and eng_ops_notifications imports
# which both used the name `eng_ops_router`. Three distinct names now mount
# all three at lines 665, 678, 751.
app.include_router(eng_ops_router)
app.include_router(hskp_ops_router)
app.include_router(concierge_hub_router)
app.include_router(foh_ops_router)
app.include_router(guest360_hub_router)
app.include_router(ird_hub_router)
app.include_router(intelligence_adapter_router)
app.include_router(kds_router)
app.include_router(patterns_router)
app.include_router(cake_viewer_router)
app.include_router(cake_ai_router)
app.include_router(pastry_stripe_router)
app.include_router(pastry_share_router)
# D7: eng_work_tickets carries /api/engineering-ops/{...} (different prefix
# from eng_ops). Previously shadowed by name collision.
app.include_router(eng_work_tickets_router)
app.include_router(beo_standalone_router)
app.include_router(admin_gate_router)
app.include_router(golden_seed_router)
app.include_router(seed_plant_router)
app.include_router(concierge_v2_router)
app.include_router(echo_concierge_v2_router)
app.include_router(echo_concierge_v2_phase2_router)
app.include_router(daily_standup_router)
app.include_router(people_router)
app.include_router(job_profiles_router)
app.include_router(employee_hr_router)
app.include_router(auth_emergent_router)
app.include_router(concierge_mobile_router)
app.include_router(outlook_sync_router)
app.include_router(hiring_router)
app.include_router(dashboard_router)
app.include_router(guest_concierge_router)
app.include_router(guest_concierge_ext_router)
app.include_router(concierge_unified_router)
app.include_router(mobile_sync_router)
app.include_router(module_registry_router)
app.include_router(admin_roles_router)
app.include_router(admin_fuse_box_router)
app.include_router(commissary_router)
app.include_router(chronos_forecast_router)
app.include_router(chronos_auto_order_router)
app.include_router(chronos_flex_labor_router)
app.include_router(beo_production_router)
app.include_router(audit_log_router)
app.include_router(echo_event_log_router)
app.include_router(echo_retrospective_router)
app.include_router(echo_forensic_router)
app.include_router(myecho_webauthn_router)
app.include_router(echo_chef_pnl_router)
# echo_invoice_extractor_router_d63 is registered earlier in the D63 block.
app.include_router(echo_waste_intel_router)
app.include_router(echo_concierge_intel_router)
app.include_router(echo_service_audit_router)
app.include_router(echo_correlation_router)
app.include_router(echo_stress_router)
app.include_router(echo_divergence_router)
app.include_router(echo_insights_router)
app.include_router(echo_invoice_extractor_router)
app.include_router(group_events_router)
app.include_router(daily_briefing_mobile_router)
app.include_router(purchasing_approvals_router)
app.include_router(invoice_ingest_router)
app.include_router(vendor_skus_router)
app.include_router(notif_prefs_router)
app.include_router(service_recovery_router)
app.include_router(playbook_router)
app.include_router(echo_schedule_router)
app.include_router(chef_outlet_router)
app.include_router(beverage_network_router)
app.include_router(beo_messaging_router)
app.include_router(myecho_enrollment_router)
app.include_router(cross_dept_borrow_router)
app.include_router(staff_mobile_router)
app.include_router(pto_router)
app.include_router(benefits_router)
app.include_router(hiring_mobile_router)
app.include_router(finance_mobile_router)
app.include_router(feature_flags_router)
app.include_router(release_notes_router)
app.include_router(timeline_router)
app.include_router(recipe_graph_router)
app.include_router(fresh_meal_router)
app.include_router(fda_export_router)
app.include_router(channels_router)
app.include_router(kitchen_calendar_router)
app.include_router(echo_router)
app.include_router(floor_router)
app.include_router(route_router)
app.include_router(echo_whats_new_router)
app.include_router(echo_viewer_router)
app.include_router(echo_agentic_router)
app.include_router(push_router)
app.include_router(hours_router)
app.include_router(leadership_router)
app.include_router(lifestyle_router)
app.include_router(relay_router)
app.include_router(milestones_router)
app.include_router(my_schedule_router)
app.include_router(standup_delegation_router)
app.include_router(welcome_pack_router)
app.include_router(showrooms_router)
app.include_router(stripe_webhook_router)
app.include_router(outlet_menus_router)
app.include_router(ops_forecast_router)
app.include_router(group_resume_router)
app.include_router(purchasing_router)
app.include_router(yield_router)
app.include_router(inventory_router)
app.include_router(menu_eng_router)
app.include_router(admin_approval_router)
app.include_router(engineering_router)
app.include_router(engineering_adv_router)
app.include_router(dept_dash_router)
app.include_router(push_notif_router)
app.include_router(voice_router)
app.include_router(analytics_engine_router)
app.include_router(spa_router)
# D7: eng_ops_notifications shares /api/eng-ops prefix with eng_ops but
# implements distinct paths (notification subscriptions, ack endpoints).
# Previously shadowed by the same import-name collision.
app.include_router(eng_ops_notifications_router)
app.include_router(dept_analytics_router)
app.include_router(pos_gl_oauth_router)

from routes.portion_engine import router as portion_engine_router, init_portion_engine
app.include_router(portion_engine_router)
# Seed portion library on startup
init_portion_engine()

from routes.buffet_planner import router as buffet_planner_router, init_buffet_engine
app.include_router(buffet_planner_router)
init_buffet_engine()

from routes.scenario_planner import router as scenario_planner_router
app.include_router(scenario_planner_router)

from routes.menu_ingest import router as menu_ingest_router
app.include_router(menu_ingest_router)

from routes.client_portal import router as client_portal_router
app.include_router(client_portal_router)

from routes.cafeteria import router as cafeteria_router
from routes.fix_menu import router as fix_menu_router
from routes.micro_market import router as micro_market_router
from routes.mobile_order import router as mobile_order_router
from routes.revenue_intelligence import router as revenue_intel_router
app.include_router(cafeteria_router)
app.include_router(fix_menu_router)
app.include_router(micro_market_router)
app.include_router(mobile_order_router)
app.include_router(revenue_intel_router)
from routes.communications_hub import router as comms_hub_router
app.include_router(comms_hub_router)
from routes.yield_alerts import router as yield_alerts_router
app.include_router(yield_alerts_router)
from routes.district_benchmarking import router as district_bench_router
app.include_router(district_bench_router)
from routes.pos_gl_hub import router as pos_gl_hub_router
app.include_router(pos_gl_hub_router)
from routes.collaboration import router as collaboration_router
app.include_router(collaboration_router)
from routes.vr_walkthrough import router as vr_walkthrough_router
app.include_router(vr_walkthrough_router)
from routes.purchasing_hub import router as purchasing_hub_router
app.include_router(purchasing_hub_router)
from routes.event_brief import router as event_brief_router
app.include_router(event_brief_router)
from routes.event_cost_tracker import router as event_cost_tracker_router
app.include_router(event_cost_tracker_router)

# ──────────────────────────────────────────────────────────────────────────
# iter209 · Auto-discover any future router in /app/backend/routes/
# Drops the need to edit server.py for every new route file. Skips any
# router whose first path is already mounted above.
# ──────────────────────────────────────────────────────────────────────────
try:
    from routers import auto_register
    _auto_reg_summary = auto_register(app)
    print(f"[router.auto_register] registered={_auto_reg_summary['registered']} "
          f"skipped={_auto_reg_summary['skipped_existing']} "
          f"errors={len(_auto_reg_summary['import_errors'])}")
except Exception as _auto_reg_err:
    print(f"[router.auto_register] startup skipped: {_auto_reg_err}")

# D53.2 · Database indexes — idempotent, safe to call on every boot.
# Wrapped in try so a Mongo hiccup doesn't kill startup; readyz
# will surface the failure.
try:
    from db_indexes import ensure_indexes as _ensure_indexes
    _idx_summary = _ensure_indexes(db)
    print(f"[db_indexes] {_idx_summary['indexes_created_or_verified']} ensured · "
          f"{len(_idx_summary['errors'])} errors")
except Exception as _idx_err:
    print(f"[db_indexes] startup skipped: {_idx_err}")

# D53.3 · Mark ready for /readyz once all init is complete
try:
    mark_ready()
    print("[health] readyz=ok")
except Exception:
    pass

# Dashboard widget routes (for original panel system)
dashboard_widgets.register_dashboard_widget_routes(
    app, db, operations_core, pos_integration,
    event_lifecycle, labor_cost, ai_forecasting,
    notification_service
)


# ---------------------------------------------------------------------------
# Security Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    path = request.url.path

    if path in ("/api/health", "/ws") or not path.startswith("/api/"):
        return await call_next(request)

    # ─── ZARO SENTINEL: Intrusion Detection ───
    method = request.method
    headers_dict = dict(request.headers)
    sentinel_result = zaro_sentinel.analyze_request(client_ip, path, method, "", headers_dict)
    if not sentinel_result["allowed"]:
        return Response(content='{"detail":"Request blocked by ZARO Guardian"}',
                       status_code=403, media_type="application/json")

    # Rate limiting — stricter for write operations (mega-resort concurrency protection)
    if method in ("POST", "PUT", "DELETE", "PATCH"):
        if not security.rate_limiter.check(f"{client_ip}:write:{path}", max_requests=60, window_seconds=60):
            return Response(content='{"detail":"Write rate limit exceeded"}',
                           status_code=429, media_type="application/json")
    else:
        if not security.rate_limiter.check(f"{client_ip}:{path}", max_requests=200, window_seconds=60):
            return Response(content='{"detail":"Rate limit exceeded"}',
                           status_code=429, media_type="application/json")

    # Stricter rate limits on sensitive GDPR endpoints
    if "/gdpr/" in path:
        if not security.rate_limiter.check(f"{client_ip}:gdpr", max_requests=10, window_seconds=60):
            return Response(content='{"detail":"Rate limit exceeded for sensitive endpoint"}',
                           status_code=429, media_type="application/json")

    # Request body size limit (5MB)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 5 * 1024 * 1024:
        return Response(content='{"detail":"Request body too large"}',
                       status_code=413, media_type="application/json")

    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000

    # ─── ZARO HEIMDALL: Observability Tracking ───
    zaro_heimdall.track_request(method, path, response.status_code, duration_ms, client_ip)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Request-ID"] = str(uuid.uuid4())
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response
