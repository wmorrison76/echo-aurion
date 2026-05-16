"""iter218 · Property CEY settings — consent + feature toggles.

Per v1.4 migration 015: `property_cey_settings` is property-level consent.
Settings live in MongoDB (`property_cey_settings`).
"""
from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db
from lib.time import utcnow_iso
from lib.mongo import strip_id
from lib.waste_log import log_event

router = APIRouter(prefix="/api/waste/cey-settings", tags=["cey-settings"])


_DEFAULTS = {
    "photo_contribution_policy": "full",    # full|local_only|off
    "audit_queue_enabled": True,
    "audit_queue_banner_hour": 8,
    "audit_min_items_threshold": 5,
    "forbes_label_ocr_enabled": True,
    "menu_ocr_enabled": True,
    "atelier_enabled_property_wide": True,
    "audit_queue_expiry_days": 7,
}


class CEYSettingsPatch(BaseModel):
    photo_contribution_policy: Optional[str] = None
    audit_queue_enabled: Optional[bool] = None
    audit_queue_banner_hour: Optional[int] = Field(None, ge=0, le=23)
    audit_min_items_threshold: Optional[int] = Field(None, ge=1, le=50)
    forbes_label_ocr_enabled: Optional[bool] = None
    menu_ocr_enabled: Optional[bool] = None
    atelier_enabled_property_wide: Optional[bool] = None
    audit_queue_expiry_days: Optional[int] = Field(None, ge=1, le=90)


@router.get("")
def get_settings(property_id: str = "outlet-main"):
    doc = db["property_cey_settings"].find_one({"property_id": property_id}, {"_id": 0})
    if not doc:
        doc = {"property_id": property_id, **_DEFAULTS, "updated_at": None}
    return {"ok": True, "settings": doc}


@router.put("")
def update_settings(body: CEYSettingsPatch, property_id: str = "outlet-main"):
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if "photo_contribution_policy" in patch:
        if patch["photo_contribution_policy"] not in ("full", "local_only", "off"):
            raise HTTPException(400, "photo_contribution_policy must be full|local_only|off")
    patch["updated_at"] = utcnow_iso()
    set_on_insert = {k: v for k, v in _DEFAULTS.items() if k not in patch}
    db["property_cey_settings"].update_one(
        {"property_id": property_id},
        {"$set": patch, "$setOnInsert": {"property_id": property_id, **set_on_insert}},
        upsert=True,
    )
    doc = db["property_cey_settings"].find_one({"property_id": property_id}, {"_id": 0})
    strip_id(doc)
    log_event("cey_settings_updated", inputs={"property_id": property_id},
              outputs={"patch_keys": list(patch.keys())})
    return {"ok": True, "settings": doc}
