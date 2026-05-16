"""
EchoAi³ Stress Test & Concurrent Operations Engine
====================================================
Simulates thousands of hotel operations simultaneously.
Measures throughput, identifies bottlenecks, tests cross-module cascading.
"""
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from fastapi import APIRouter, Query
from database import db
import asyncio
import time
import random
import string

router = APIRouter(prefix="/api/echoai3/stress", tags=["echoai3-stress"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

GUEST_FIRST = ["James","Sarah","Michael","Emma","David","Olivia","Robert","Sophia","William","Ava","John","Isabella","Thomas","Mia","Daniel","Charlotte","Joseph","Amelia","Christopher","Harper"]
GUEST_LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Anderson","Taylor","Wilson","Moore","Jackson","Lee","Harris","Clark","Lewis","Chen"]


def _random_guest():
    return f"{random.choice(GUEST_FIRST)} {random.choice(GUEST_LAST)}"


def _run_scenario_check_in_wave(count: int):
    """Simulate a wave of guest check-ins."""
    batch = []
    results = []
    for i in range(count):
        guest = _random_guest()
        room = f"{random.randint(2,8)}{random.randint(0,9):02d}"
        res = {
            "id": f"res-{_uid()}", "guest_name": guest, "room_number": room,
            "arrival_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "departure_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(1,5))).strftime("%Y-%m-%d"),
            "room_type": random.choice(["standard","deluxe","suite","ocean_view","penthouse"]),
            "rate": random.choice([249,289,349,449,599,899]),
            "source": random.choice(["direct","ota","corporate","group"]),
            "status": "checked_in", "vip": random.random() < 0.15,
            "nights": random.randint(1,5), "rate_code": random.choice(["BAR","AAA","CORP","GOV"]),
            "special_requests": random.choice(["","Extra pillows","Late checkout","Connecting room","Hypoallergenic bedding"]),
        }
        batch.append(res)
        results.append({"guest": guest, "room": room, "rate": res["rate"]})
    if batch:
        db["pms_reservations"].insert_many(batch)
    return results


def _run_scenario_ird_rush(count: int):
    """Simulate breakfast/dinner IRD rush."""
    items_pool = [
        {"name": "Continental Breakfast", "price": 32}, {"name": "Eggs Benedict", "price": 28},
        {"name": "Club Sandwich", "price": 22}, {"name": "Caesar Salad", "price": 18},
        {"name": "Grilled Salmon", "price": 38}, {"name": "Filet Mignon", "price": 52},
        {"name": "Pasta Carbonara", "price": 26}, {"name": "French Onion Soup", "price": 14},
        {"name": "Wagyu Burger", "price": 36}, {"name": "Lobster Mac & Cheese", "price": 42},
    ]
    batch = []
    orders = []
    for i in range(count):
        items = random.sample(items_pool, random.randint(1,3))
        total = sum(it["price"] for it in items)
        order = {
            "id": f"ird-{_uid()}", "room_number": f"{random.randint(2,8)}{random.randint(0,9):02d}",
            "guest_name": _random_guest(), "items": items, "total": total,
            "status": random.choice(["pending","preparing","delivered"]),
            "order_type": random.choice(["breakfast","lunch","dinner","late_night"]),
            "created_at": _now(),
        }
        batch.append(order)
        orders.append({"id": order["id"], "room": order["room_number"], "total": total})
    if batch:
        db["ird_orders"].insert_many(batch)
    return orders


def _run_scenario_concierge_flood(count: int):
    """Simulate a flood of guest service tickets."""
    categories = ["room","maintenance","restaurant","noise","billing","amenity","equipment","spa"]
    batch = []
    tickets = []
    for i in range(count):
        ticket = {
            "id": f"tc-{_uid()}", "title": random.choice([
                "AC not cooling","TV remote missing","Noisy neighbors","Minibar not stocked",
                "Extra towels needed","Hot water issue","WiFi not working","Bathroom drain slow",
                "Room service late","Iron not working","Safe malfunction","Shower head broken",
                "Pillow request","Late checkout request","Restaurant reservation",
            ]),
            "guest_name": _random_guest(),
            "room_number": f"{random.randint(2,8)}{random.randint(0,9):02d}",
            "category": random.choice(categories),
            "priority": random.choice(["critical","high","medium","low"]),
            "status": "open", "created_at": _now(),
            "department": random.choice(["front-desk","housekeeping","engineering","f-and-b"]),
        }
        batch.append(ticket)
        tickets.append({"id": ticket["id"], "title": ticket["title"], "priority": ticket["priority"]})
    if batch:
        db["concierge_tickets"].insert_many(batch)
    return tickets


def _run_scenario_spa_bookings(count: int):
    """Simulate spa appointment wave."""
    treatments = ["Deep Tissue Massage","Hot Stone Therapy","Aromatherapy","Facial Treatment","Body Wrap","Couples Massage"]
    batch = []
    apts = []
    for i in range(count):
        apt = {
            "id": f"spa-{_uid()}", "guest_name": _random_guest(),
            "treatment": random.choice(treatments),
            "price": random.choice([150,180,200,250,320,400]),
            "duration": random.choice([60,90,120]),
            "status": random.choice(["booked","in_progress","completed"]),
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "start_time": f"{random.randint(9,18)}:{random.choice(['00','30'])}",
            "room_number": f"{random.randint(2,8)}{random.randint(0,9):02d}",
            "created_at": _now(),
        }
        batch.append(apt)
        apts.append({"id": apt["id"], "treatment": apt["treatment"], "price": apt["price"]})
    if batch:
        db["spa_appointments"].insert_many(batch)
    return apts


def _run_scenario_engineering_tickets(count: int):
    """Simulate engineering work orders."""
    issues = [
        "HVAC Unit Failure","Plumbing Leak","Electrical Short","Elevator Malfunction",
        "Fire Alarm Testing","Pool Pump Issue","Roof Leak","Generator Maintenance",
        "Boiler Inspection","Kitchen Hood Cleaning","Grease Trap Service",
    ]
    batch = []
    tickets = []
    for i in range(count):
        ticket = {
            "id": f"eng-{_uid()}", "title": random.choice(issues),
            "room": f"{random.randint(2,8)}{random.randint(0,9):02d}",
            "category": random.choice(["hvac","plumbing","electrical","mechanical","fire_safety"]),
            "priority": random.choice(["critical","high","medium","low"]),
            "status": "open", "created_at": _now(),
        }
        batch.append(ticket)
        tickets.append(ticket)
    if batch:
        db["eng_tickets"].insert_many(batch)
    return tickets


def _run_scenario_guest_orders(count: int):
    """Simulate QR code guest orders from multiple outlets."""
    outlets = ["main-dining","sky-bar","pool-cafe","out-pier66-rest","out-rooftop-bar"]
    batch = []
    orders = []
    for i in range(count):
        items = [{"name": random.choice(["Burger","Tacos","Pizza","Wings","Salad","Fish & Chips"]), "price": random.randint(14,38), "qty": random.randint(1,3)}]
        total = sum(it["price"] * it["qty"] for it in items)
        order = {
            "id": f"go-{_uid()}", "guest_name": _random_guest(),
            "room_number": f"{random.randint(2,8)}{random.randint(0,9):02d}",
            "outlet_id": random.choice(outlets),
            "items": items, "total": total,
            "order_type": random.choice(["dine-in","takeaway","pool-side"]),
            "status": random.choice(["pending","preparing","ready","delivered"]),
            "created_at": _now(),
        }
        batch.append(order)
        orders.append({"id": order["id"], "outlet": order["outlet_id"], "total": total})
    if batch:
        db["guest_orders"].insert_many(batch)
    return orders


def _run_scenario_inventory_depletion(count: int):
    """Deplete random inventory items across outlets."""
    depleted = []
    collections = [
        ("beverage_inventory", "name"),
        ("micro_market_inventory", "name"),
        ("retail_inventory", "item_name"),
    ]
    for coll, name_field in collections:
        items = list(db[coll].find({}, {"_id": 1, name_field: 1, "quantity": 1}).limit(count // 3 + 1))
        for item in items:
            new_qty = max(0, random.randint(0, 2))
            db[coll].update_one({"_id": item["_id"]}, {"$set": {"quantity": new_qty}})
            depleted.append({"collection": coll, "item": item.get(name_field, "?"), "new_qty": new_qty})
    return depleted


def _run_scenario_po_generation(count: int):
    """Generate purchase orders that need approval."""
    vendors = list(db["pr_vendors"].find({"status": "active"}, {"_id": 0, "vendor_id": 1, "name": 1}).limit(5))
    pos = []
    for i in range(count):
        vendor = random.choice(vendors) if vendors else {"vendor_id": "v-1", "name": "Default Vendor"}
        po = {
            "id": f"po-{_uid()}", "vendor_id": vendor["vendor_id"], "vendor_name": vendor["name"],
            "items": [
                {"name": random.choice(["Salmon","Shrimp","Butter","Flour","Olive Oil"]), "qty": random.randint(5,50), "unit_price": round(random.uniform(5,50),2)},
            ],
            "total": round(random.uniform(200, 5000), 2),
            "status": "pending_approval",
            "source": "auto", "created_at": _now(),
            "outlet_id": random.choice(["out-main-kitchen","out-pastry-shop","out-rooftop-bar"]),
            "requested_by": "EchoAi3",
        }
        db["purchase_orders"].insert_one(po)
        del po["_id"]
        pos.append({"id": po["id"], "vendor": vendor["name"], "total": po["total"]})
    return pos


# ══════════════════════════════════════
#  STRESS TEST ENDPOINTS
# ══════════════════════════════════════

@router.post("/run")
async def run_stress_test(
    check_ins: int = Query(50, ge=0, le=500),
    ird_orders: int = Query(100, ge=0, le=1000),
    concierge_tickets: int = Query(75, ge=0, le=500),
    spa_bookings: int = Query(30, ge=0, le=200),
    eng_tickets: int = Query(20, ge=0, le=200),
    guest_orders: int = Query(80, ge=0, le=1000),
    inventory_depletions: int = Query(15, ge=0, le=100),
    purchase_orders: int = Query(10, ge=0, le=100),
):
    """Run a full hotel stress test — simulate a very busy day."""
    start = time.time()
    total_ops = check_ins + ird_orders + concierge_tickets + spa_bookings + eng_tickets + guest_orders + inventory_depletions + purchase_orders

    results = {}
    timings = {}

    # Run all scenarios
    t = time.time()
    results["check_ins"] = _run_scenario_check_in_wave(check_ins)
    timings["check_ins"] = round(time.time() - t, 3)

    t = time.time()
    results["ird_orders"] = _run_scenario_ird_rush(ird_orders)
    timings["ird_orders"] = round(time.time() - t, 3)

    t = time.time()
    results["concierge_tickets"] = _run_scenario_concierge_flood(concierge_tickets)
    timings["concierge_tickets"] = round(time.time() - t, 3)

    t = time.time()
    results["spa_bookings"] = _run_scenario_spa_bookings(spa_bookings)
    timings["spa_bookings"] = round(time.time() - t, 3)

    t = time.time()
    results["eng_tickets"] = _run_scenario_engineering_tickets(eng_tickets)
    timings["eng_tickets"] = round(time.time() - t, 3)

    t = time.time()
    results["guest_orders"] = _run_scenario_guest_orders(guest_orders)
    timings["guest_orders"] = round(time.time() - t, 3)

    t = time.time()
    results["inventory_depletions"] = _run_scenario_inventory_depletion(inventory_depletions)
    timings["inventory_depletions"] = round(time.time() - t, 3)

    t = time.time()
    results["purchase_orders"] = _run_scenario_po_generation(purchase_orders)
    timings["purchase_orders"] = round(time.time() - t, 3)

    # Now run EchoAi³ analysis on the loaded system
    t = time.time()
    from routes.echoai3_ops_pulse import _analyze_operations
    analysis = _analyze_operations()
    timings["echoai3_analysis"] = round(time.time() - t, 3)

    total_time = round(time.time() - start, 3)
    ops_per_sec = round(total_ops / max(total_time, 0.001))

    summary = {
        "total_operations": total_ops,
        "total_time_seconds": total_time,
        "operations_per_second": ops_per_sec,
        "scenario_counts": {
            "check_ins": check_ins, "ird_orders": ird_orders,
            "concierge_tickets": concierge_tickets, "spa_bookings": spa_bookings,
            "eng_tickets": eng_tickets, "guest_orders": guest_orders,
            "inventory_depletions": inventory_depletions, "purchase_orders": purchase_orders,
        },
        "timings": timings,
        "bottleneck": max(timings, key=timings.get),
        "echoai3_response_time_ms": round(timings["echoai3_analysis"] * 1000),
    }

    # Store stress test result
    test_record = {
        "id": f"stress-{_uid()}", "timestamp": _now(),
        "summary": summary,
        "echoai3_hotel_score": analysis["hotel_score"],
        "echoai3_alerts": len(analysis["alerts"]),
        "echoai3_recommendations": len(analysis["recommendations"]),
        "echoai3_auto_actions": len(analysis.get("auto_actions", [])),
        "echoai3_health": analysis["overall_health"],
    }
    db["stress_test_history"].insert_one(test_record)
    del test_record["_id"]

    return {
        "summary": summary,
        "echoai3_analysis": {
            "hotel_score": analysis["hotel_score"],
            "overall_health": analysis["overall_health"],
            "departments": {k: v.get("health", "?") for k, v in analysis["departments"].items()},
            "alerts_count": len(analysis["alerts"]),
            "top_alerts": analysis["alerts"][:5],
            "recommendations_count": len(analysis["recommendations"]),
            "top_recommendations": analysis["recommendations"][:5],
            "auto_actions": analysis.get("auto_actions", []),
        },
        "test_record": test_record,
    }


@router.post("/mega-stress")
async def mega_stress_test(multiplier: int = Query(10, ge=1, le=50)):
    """Run a MEGA stress test — 100x to 5000x operations. Tests EchoAi³ at scale."""
    base = {
        "check_ins": 5 * multiplier,
        "ird_orders": 10 * multiplier,
        "concierge_tickets": 8 * multiplier,
        "spa_bookings": 3 * multiplier,
        "eng_tickets": 2 * multiplier,
        "guest_orders": 8 * multiplier,
        "inventory_depletions": 2 * multiplier,
        "purchase_orders": 1 * multiplier,
    }
    total = sum(base.values())

    start = time.time()

    # Run all scenarios
    timings = {}
    t = time.time(); _run_scenario_check_in_wave(base["check_ins"]); timings["check_ins"] = round(time.time()-t,3)
    t = time.time(); _run_scenario_ird_rush(base["ird_orders"]); timings["ird_orders"] = round(time.time()-t,3)
    t = time.time(); _run_scenario_concierge_flood(base["concierge_tickets"]); timings["concierge_tickets"] = round(time.time()-t,3)
    t = time.time(); _run_scenario_spa_bookings(base["spa_bookings"]); timings["spa_bookings"] = round(time.time()-t,3)
    t = time.time(); _run_scenario_engineering_tickets(base["eng_tickets"]); timings["eng_tickets"] = round(time.time()-t,3)
    t = time.time(); _run_scenario_guest_orders(base["guest_orders"]); timings["guest_orders"] = round(time.time()-t,3)
    t = time.time(); _run_scenario_inventory_depletion(min(base["inventory_depletions"], 30)); timings["depletions"] = round(time.time()-t,3)
    t = time.time(); _run_scenario_po_generation(base["purchase_orders"]); timings["pos"] = round(time.time()-t,3)

    # EchoAi³ analysis under load
    t = time.time()
    from routes.echoai3_ops_pulse import _analyze_operations
    analysis = _analyze_operations()
    analysis_time = round(time.time() - t, 3)

    total_time = round(time.time() - start, 3)

    # Collection sizes after test
    collection_sizes = {}
    for coll in ["pms_reservations","ird_orders","guest_orders","concierge_tickets","eng_tickets","spa_appointments","purchase_orders"]:
        collection_sizes[coll] = db[coll].count_documents({})

    return {
        "multiplier": multiplier,
        "total_operations": total,
        "total_time_seconds": total_time,
        "ops_per_second": round(total / max(total_time, 0.001)),
        "echoai3_analysis_time_ms": round(analysis_time * 1000),
        "echoai3_can_handle": analysis_time < 5.0,
        "timings": timings,
        "bottleneck": max(timings, key=timings.get),
        "collection_sizes": collection_sizes,
        "echoai3": {
            "score": analysis["hotel_score"]["overall"],
            "grade": analysis["hotel_score"]["grade"],
            "health": analysis["overall_health"],
            "alerts": len(analysis["alerts"]),
            "recommendations": len(analysis["recommendations"]),
            "auto_actions": len(analysis.get("auto_actions", [])),
        },
        "limits": {
            "mongo_write_throughput": f"{round(total / max(total_time,0.001))} ops/sec",
            "echoai3_analysis_overhead": f"{round(analysis_time * 1000)}ms per full-hotel scan",
            "theoretical_max_daily": f"{round(total / max(total_time,0.001) * 86400):,} operations/day",
            "verdict": "PASS — System stable" if total_time < 30 else "WARN — Slow under load",
        },
    }


@router.get("/history")
async def stress_test_history(limit: int = 10):
    """View past stress test results."""
    history = list(db["stress_test_history"].find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return {"tests": history, "total": db["stress_test_history"].count_documents({})}
