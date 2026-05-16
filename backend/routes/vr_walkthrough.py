"""
VR/360 Room Walkthrough — panoramic viewer and 3D room preview.
Manages 360 photos, virtual tour hotspots, and room configurations.
"""
from fastapi import APIRouter
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import os

router = APIRouter(prefix="/api/vr-walkthrough", tags=["vr-walkthrough"])

from database import db as _db
tours_col = _db["vr_tours"]
scenes_col = _db["vr_scenes"]
hotspots_col = _db["vr_hotspots"]


def _now():
    return datetime.now(timezone.utc).isoformat()

def _uid():
    return str(uuid4())[:12]


# ═══════════════════════════════════════════
# TOURS — Virtual tour management
# ═══════════════════════════════════════════

@router.post("/tours")
def create_tour(body: dict):
    """Create a new virtual tour for a venue/room."""
    tour = {
        "tour_id": f"tour-{_uid()}",
        "name": body.get("name", "Untitled Tour"),
        "venue": body.get("venue", ""),
        "description": body.get("description", ""),
        "room_type": body.get("room_type", "ballroom"),
        "capacity": body.get("capacity", 0),
        "scene_count": 0,
        "status": "draft",
        "created_at": _now(),
        "updated_at": _now(),
    }
    tours_col.insert_one(tour)
    del tour["_id"]
    return tour


@router.get("/tours")
def list_tours(status: Optional[str] = None):
    """List all virtual tours."""
    q = {}
    if status:
        q["status"] = status

    tours = list(tours_col.find(q, {"_id": 0}).sort("created_at", -1).limit(50))

    # Seed demo tours if none exist
    if not tours:
        demos = [
            {"tour_id": f"tour-{_uid()}", "name": "Grand Ballroom — Gala Setup", "venue": "Grand Resort Main Campus", "room_type": "ballroom", "capacity": 500, "scene_count": 4, "status": "published", "description": "Full 360 walkthrough of Grand Ballroom configured for 500-pax seated gala dinner", "created_at": _now()},
            {"tour_id": f"tour-{_uid()}", "name": "Oceanview Terrace — Cocktail Reception", "venue": "Oceanview Beach Club", "room_type": "terrace", "capacity": 200, "scene_count": 3, "status": "published", "description": "Outdoor terrace with ocean panorama, cocktail stations and lounge seating", "created_at": _now()},
            {"tour_id": f"tour-{_uid()}", "name": "Executive Boardroom — Conference", "venue": "Metro Tower Downtown", "room_type": "boardroom", "capacity": 30, "scene_count": 2, "status": "draft", "description": "High-tech boardroom with AV setup for corporate meetings", "created_at": _now()},
            {"tour_id": f"tour-{_uid()}", "name": "Garden Pavilion — Wedding", "venue": "Island Retreat & Spa", "room_type": "pavilion", "capacity": 150, "scene_count": 5, "status": "published", "description": "Tropical garden setting for ceremonies and receptions", "created_at": _now()},
        ]
        for d in demos:
            d["updated_at"] = d["created_at"]
            tours_col.insert_one(d)
        tours = list(tours_col.find(q, {"_id": 0}).sort("created_at", -1))

    return {"tours": tours, "total": len(tours)}


@router.get("/tours/{tour_id}")
def get_tour(tour_id: str):
    """Get tour details with all scenes and hotspots."""
    tour = tours_col.find_one({"tour_id": tour_id}, {"_id": 0})
    if not tour:
        return {"error": "Tour not found"}
    tour["scenes"] = list(scenes_col.find({"tour_id": tour_id}, {"_id": 0}))
    for scene in tour["scenes"]:
        scene["hotspots"] = list(hotspots_col.find({"scene_id": scene["scene_id"]}, {"_id": 0}))
    return tour


@router.put("/tours/{tour_id}")
def update_tour(tour_id: str, body: dict):
    """Update tour metadata."""
    updates = {k: v for k, v in body.items() if k in ("name", "venue", "description", "room_type", "capacity", "status")}
    updates["updated_at"] = _now()
    tours_col.update_one({"tour_id": tour_id}, {"$set": updates})
    return tours_col.find_one({"tour_id": tour_id}, {"_id": 0}) or {"error": "Not found"}


@router.delete("/tours/{tour_id}")
def delete_tour(tour_id: str):
    """Delete a tour and all its scenes/hotspots."""
    scenes = list(scenes_col.find({"tour_id": tour_id}, {"scene_id": 1, "_id": 0}))
    for scene in scenes:
        hotspots_col.delete_many({"scene_id": scene["scene_id"]})
    scenes_col.delete_many({"tour_id": tour_id})
    tours_col.delete_one({"tour_id": tour_id})
    return {"deleted": True}


# ═══════════════════════════════════════════
# SCENES — 360 panoramic views within a tour
# ═══════════════════════════════════════════

@router.post("/tours/{tour_id}/scenes")
def create_scene(tour_id: str, body: dict):
    """Add a 360 scene to a tour."""
    scene = {
        "scene_id": f"scene-{_uid()}",
        "tour_id": tour_id,
        "name": body.get("name", "Scene"),
        "description": body.get("description", ""),
        "panorama_url": body.get("panorama_url", ""),
        "thumbnail_url": body.get("thumbnail_url", ""),
        "initial_view": body.get("initial_view", {"yaw": 0, "pitch": 0, "fov": 90}),
        "order": body.get("order", 0),
        "room_config": body.get("room_config", {}),
        "created_at": _now(),
    }
    scenes_col.insert_one(scene)
    del scene["_id"]

    tours_col.update_one({"tour_id": tour_id}, {"$inc": {"scene_count": 1}, "$set": {"updated_at": _now()}})
    return scene


@router.get("/tours/{tour_id}/scenes")
def list_scenes(tour_id: str):
    """List all scenes in a tour."""
    scenes = list(scenes_col.find({"tour_id": tour_id}, {"_id": 0}).sort("order", 1))
    return {"scenes": scenes, "total": len(scenes)}


# ═══════════════════════════════════════════
# HOTSPOTS — interactive points within scenes
# ═══════════════════════════════════════════

@router.post("/scenes/{scene_id}/hotspots")
def create_hotspot(scene_id: str, body: dict):
    """Add a hotspot to a 360 scene."""
    hotspot = {
        "hotspot_id": f"hs-{_uid()}",
        "scene_id": scene_id,
        "type": body.get("type", "info"),
        "yaw": body.get("yaw", 0),
        "pitch": body.get("pitch", 0),
        "label": body.get("label", ""),
        "description": body.get("description", ""),
        "target_scene_id": body.get("target_scene_id"),
        "metadata": body.get("metadata", {}),
        "created_at": _now(),
    }
    hotspots_col.insert_one(hotspot)
    del hotspot["_id"]
    return hotspot


@router.get("/scenes/{scene_id}/hotspots")
def list_hotspots(scene_id: str):
    """List hotspots in a scene."""
    hotspots = list(hotspots_col.find({"scene_id": scene_id}, {"_id": 0}))
    return {"hotspots": hotspots, "total": len(hotspots)}


# ═══════════════════════════════════════════
# 3D ROOM CONFIG — room layout data for viewer
# ═══════════════════════════════════════════

@router.get("/room-configs")
def list_room_configs():
    """Get predefined room configurations for 3D viewer."""
    configs = [
        {
            "config_id": "rc-banquet",
            "name": "Banquet Rounds",
            "layout": "rounds",
            "tables": 40,
            "seats_per_table": 10,
            "total_capacity": 400,
            "dimensions": {"width": 80, "depth": 120, "height": 20},
            "elements": [
                {"type": "stage", "x": 40, "y": 0, "z": 5, "width": 30, "depth": 15},
                {"type": "dance_floor", "x": 40, "y": 0, "z": 35, "width": 20, "depth": 20},
                {"type": "bar", "x": 5, "y": 0, "z": 60, "width": 10, "depth": 5},
            ],
        },
        {
            "config_id": "rc-theater",
            "name": "Theater Style",
            "layout": "theater",
            "rows": 25,
            "seats_per_row": 20,
            "total_capacity": 500,
            "dimensions": {"width": 60, "depth": 100, "height": 20},
            "elements": [
                {"type": "stage", "x": 30, "y": 0, "z": 5, "width": 40, "depth": 20},
                {"type": "podium", "x": 30, "y": 1, "z": 8, "width": 2, "depth": 2},
            ],
        },
        {
            "config_id": "rc-cocktail",
            "name": "Cocktail Reception",
            "layout": "cocktail",
            "highboy_tables": 15,
            "lounge_groups": 6,
            "total_capacity": 200,
            "dimensions": {"width": 50, "depth": 70, "height": 15},
            "elements": [
                {"type": "bar", "x": 25, "y": 0, "z": 5, "width": 15, "depth": 5},
                {"type": "bar", "x": 10, "y": 0, "z": 60, "width": 12, "depth": 5},
                {"type": "lounge", "x": 40, "y": 0, "z": 40, "width": 10, "depth": 10},
            ],
        },
        {
            "config_id": "rc-classroom",
            "name": "Classroom Style",
            "layout": "classroom",
            "tables": 30,
            "seats_per_table": 3,
            "total_capacity": 90,
            "dimensions": {"width": 40, "depth": 60, "height": 12},
            "elements": [
                {"type": "screen", "x": 20, "y": 3, "z": 2, "width": 10, "depth": 0.5},
                {"type": "podium", "x": 20, "y": 0, "z": 5, "width": 2, "depth": 2},
            ],
        },
    ]
    return {"configs": configs, "total": len(configs)}
