"""
Knowledge Engine — Shared Core
================================
DB connections, helpers, models, domain loading, initialization.
"""
import os
import json
import math
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel

import database

_db = database.db

domains_col = _db["banquet_knowledge"]
overrides_col = _db["knowledge_overrides"]

_SCHEMA_VERSION = "1.0.0"
KB_DIR = "/tmp/luccca_kb"

_DOMAIN_FILES = {
    "ontology": "luccca_banquet_master_ontology.json",
    "event_lifecycle": "banquet_event_lifecycle_knowledge.json",
    "beo_reo": "beo_reo_operational_intelligence.json",
    "buffet_layout": "banquet_buffet_flow_and_layout_knowledge.json",
    "staffing_service": "banquet_staffing_and_service_rules.json",
    "culinary_execution": "banquet_culinary_execution_knowledge.json",
    "purchasing_yield": "banquet_purchasing_yield_and_par_knowledge.json",
    "risk_safety": "banquet_risk_safety_and_compliance_knowledge.json",
    "post_event_learning": "banquet_post_event_learning_knowledge.json",
    "package_pricing": "luccca_banquet_package_pricing_master.json",
    "room_setup_capacity": "luccca_room_setup_capacity_buffet_footprint_master.json",
    "av_decor_vendor": "luccca_banquet_av_decor_vendor_dependency_master.json",
    "timeline_throughput": "luccca_banquet_timeline_staffing_throughput.json",
    "cafeteria_dining": "luccca_cafeteria_employee_dining.json",
    "fresh_meal_systems": "luccca_fresh_meal_systems_master.json",
}


def _now():
    return datetime.now(timezone.utc).isoformat()


def _uid():
    return str(uuid4())


def _load_domain_file(domain_id: str, filename: str) -> dict:
    path = os.path.join(KB_DIR, filename)
    if not os.path.exists(path):
        return {}
    with open(path, "r") as f:
        return json.load(f)


def init_knowledge_engine():
    """Load all knowledge domains into MongoDB. Idempotent via domain_id upsert."""
    seeded = 0
    for domain_id, filename in _DOMAIN_FILES.items():
        data = _load_domain_file(domain_id, filename)
        if not data:
            continue
        existing = domains_col.find_one({"domain_id": domain_id})
        if existing:
            domains_col.update_one(
                {"domain_id": domain_id},
                {"$set": {"data": data, "updated_at": _now(), "schema_version": _SCHEMA_VERSION}}
            )
        else:
            domains_col.insert_one({
                "domain_id": domain_id,
                "filename": filename,
                "data": data,
                "schema_version": _SCHEMA_VERSION,
                "created_at": _now(),
                "updated_at": _now(),
            })
            seeded += 1
    domains_col.create_index("domain_id", unique=True)
    overrides_col.create_index("override_id", unique=True)
    overrides_col.create_index("domain_id")
    return seeded


def _get_domain(domain_id: str) -> dict:
    doc = domains_col.find_one({"domain_id": domain_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, f"Domain '{domain_id}' not found")
    return doc


# ─── Pydantic Models ───────────────────────────────────────────────

class StaffingRequest(BaseModel):
    guest_count: int
    service_style: str = "standard_buffet"
    event_type: str = "corporate"
    luxury_tier: str = "classic"
    station_count: int = 0
    action_station_count: int = 0
    cold_station_count: int = 0
    bar_count: int = 0
    is_outdoor: bool = False
    has_room_flip: bool = False
    event_duration_hours: float = 3.0
    high_dietary_complexity: bool = False


class LayoutRequest(BaseModel):
    guest_count: int
    service_style: str = "buffet"
    room_sqft: float = 0
    station_types: list = []
    is_outdoor: bool = False
    has_bar: bool = False
    luxury_tier: str = "classic"


class RiskRequest(BaseModel):
    event_type: str = "corporate"
    service_style: str = "buffet"
    guest_count: int = 100
    is_outdoor: bool = False
    has_weather_plan: bool = True
    custom_menu_within_72h: bool = False
    guest_count_growth_pct: float = 0
    action_station_count: int = 0
    has_power_plan: bool = True
    luxury_tier: str = "classic"
    guarantee_provided: bool = True
    late_guarantee: bool = False


class PurchasingRequest(BaseModel):
    guest_count: int = 100
    event_type: str = "corporate"
    service_style: str = "buffet"
    luxury_tier: str = "classic"
    is_outdoor: bool = False
    high_alcohol: bool = False
    family_heavy: bool = False
    child_count: int = 0
    vendor_meals: int = 0
    staff_meals: int = 0


class PricingRequest(BaseModel):
    event_type: str = "corporate"
    service_style: str = "buffet"
    meal_period: str = "lunch"
    guest_count: int = 100
    tier: str = "classic"
    upgrades: list = []
    bar_model: str = ""
    bar_tier: str = "house"
    bar_hours: float = 0
    bar_demand_level: str = "moderate"
    addons: list = []
    concession_percent: float = 0
    concession_reason: str = ""


class OverrideCreate(BaseModel):
    domain_id: str
    path: str
    value: dict
    scope: dict = {}
    reason: str = ""


class KnowledgeQuery(BaseModel):
    domain_id: str
    path: str = ""
    filters: dict = {}
