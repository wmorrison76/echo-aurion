"""
Dashboard Widget API Routes
============================
Serves data for the original LUCCCA panel system dashboard widgets.
Integrates with the enterprise engines where possible, provides
reasonable defaults for widgets not yet connected to real data.
"""
import random
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException


def register_dashboard_widget_routes(app, db, operations_core, pos_integration,
                                      event_lifecycle, labor_cost, ai_forecasting,
                                      notification_service):
    """Register all /api/dashboard/* widget endpoints on the FastAPI app."""

    @app.get("/api/dashboard/ops-metrics")
    def dashboard_ops_metrics():
        pos_stats = pos_integration.get_pos_stats()
        labor = labor_cost.get_labor_analytics()
        return {
            "revenue": pos_stats.get("total_revenue", 0),
            "covers": pos_stats.get("total_transactions", 0),
            "avgCheck": round(pos_stats.get("avg_food_cost_pct", 0), 2),
            "laborPct": labor.get("total_labor_cost", 0) / max(pos_stats.get("total_revenue", 1), 1) * 100 if pos_stats.get("total_revenue", 0) > 0 else 28.5,
            "trendRevenue": 12.5,
            "trendCovers": 8.3,
            "trendAvgCheck": -2.1,
            "trendLaborPct": 1.2,
            "targetLaborPct": 25,
        }

    @app.get("/api/dashboard/staff-status")
    def dashboard_staff_status():
        positions = labor_cost.get_positions()
        staff = []
        statuses = ["on-duty", "on-duty", "on-duty", "break", "off-duty"]
        for i, pos in enumerate(positions[:8]):
            staff.append({
                "id": str(i + 1),
                "name": pos.get("name", f"Staff {i+1}"),
                "role": pos.get("code", "staff"),
                "status": statuses[i % len(statuses)],
                "since": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 8))).isoformat(),
            })
        return {"staff": staff}

    @app.get("/api/dashboard/labor-cost")
    def dashboard_labor_cost():
        labor = labor_cost.get_labor_analytics()
        return {
            "laborPct": 28.5,
            "trend": 1.2,
            "targetPct": 25,
            "totalCost": labor.get("total_labor_cost", 0),
        }

    @app.get("/api/dashboard/occupancy")
    def dashboard_occupancy():
        return {"occupancyPct": 72, "trend": -1.5}

    @app.get("/api/dashboard/orders")
    def dashboard_orders():
        return {
            "orders": [
                {"id": 1, "table": "12", "items": 3, "status": "pending"},
                {"id": 2, "table": "8", "items": 2, "status": "cooking"},
                {"id": 3, "table": "15", "items": 4, "status": "pending"},
            ]
        }

    @app.get("/api/dashboard/delivery")
    def dashboard_delivery():
        return {
            "deliveries": [
                {"id": 1, "vendor": "Fresh Produce Co", "items": 5, "time": "15 min"},
                {"id": 2, "vendor": "Premium Meats", "items": 3, "time": "45 min"},
            ]
        }

    @app.get("/api/dashboard/vip-alerts")
    def dashboard_vip_alerts():
        events = event_lifecycle.list_events(limit=5)
        alerts = []
        for ev in events[:3]:
            alerts.append({
                "id": ev.get("id", ""),
                "guest": ev.get("client_name", ev.get("name", "VIP Guest")),
                "time": ev.get("event_date", "TBD"),
                "party": ev.get("guest_count", 0),
            })
        if not alerts:
            alerts = [
                {"id": "1", "guest": "Johnson VIP Party", "time": "Tonight 7pm", "party": 8},
                {"id": "2", "guest": "Smith Reunion", "time": "Tomorrow 6pm", "party": 12},
            ]
        return {"alerts": alerts}

    @app.get("/api/dashboard/messages")
    def dashboard_messages():
        return {"unreadCount": 0}

    @app.get("/api/dashboard/notifications")
    def dashboard_notifications():
        stats = notification_service.get_notification_stats()
        return {
            "alerts": [
                {
                    "id": "sys-1",
                    "title": "System Ready",
                    "message": f"{stats.get('total_notifications', 0)} notifications in system",
                    "type": "low",
                    "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
                    "module": "system",
                },
            ]
        }

    @app.get("/api/dashboard/schedule-summary")
    def dashboard_schedule_summary():
        days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        return {
            "totalScheduled": 12,
            "withSchedule": 8,
            "today": days[datetime.now().weekday() % 7],
        }

    @app.get("/api/dashboard/satisfaction")
    def dashboard_satisfaction():
        return {"score": 4.6, "target": 4.5, "trend": 0.2, "responses": 142}

    @app.get("/api/dashboard/sales-trend")
    def dashboard_sales_trend():
        import math
        hours = []
        for i in range(12):
            hours.append({
                "hour": 8 + i,
                "revenue": 320 + round(80 * math.sin((i / 12) * math.pi)),
                "covers": 12 + round(8 * math.sin((i / 12) * math.pi)),
            })
        return {"hours": hours, "totalRevenue": 4283, "totalCovers": 142}

    @app.get("/api/dashboard/goals")
    def dashboard_goals():
        return {"goals": [], "synced": False}

    @app.get("/api/dashboard/specials")
    def dashboard_specials():
        recipes = list(operations_core.recipes_col.find({}, {"_id": 0}).limit(3))
        specials = []
        for r in recipes:
            specials.append({
                "id": r.get("id", ""),
                "name": r.get("name", "Special"),
                "price": f"${r.get('menu_price', 0):.0f}" if r.get("menu_price") else "Market",
                "description": r.get("category", "Chef's selection"),
            })
        if not specials:
            specials = [
                {"id": "1", "name": "Catch of the Day", "price": "Market", "description": "Fresh local fish"},
                {"id": "2", "name": "Soup of the Day", "price": "$8", "description": "Chef's selection"},
            ]
        return {"specials": specials}

    @app.get("/api/dashboard/financial/health")
    def dashboard_financial_health():
        pos = pos_integration.get_pos_stats()
        return {
            "grade": "B",
            "score": 78,
            "revenue": pos.get("total_revenue", 4283),
            "cogs_percentage": 32,
            "labor_percentage": 28.5,
            "net_margin": 12,
            "trend": "stable",
            "last_updated": int(datetime.now(timezone.utc).timestamp() * 1000),
            "risks": [],
        }

    @app.get("/api/dashboard/quick-search")
    def dashboard_quick_search():
        return {"results": []}

    @app.get("/api/v1/kpi/daily")
    def kpi_daily():
        pos = pos_integration.get_pos_stats()
        return {
            "sales_today": pos.get("total_revenue", 4283),
            "labor_cost_today": 1220,
            "labor_pct": 28.5,
            "staffing_efficiency": 94,
            "covers_today": pos.get("total_transactions", 142),
            "revenue_per_hour": 178,
            "trend_7day": {"sales": 2.1, "labor_pct": 1.2, "efficiency": -0.5},
        }

    # Auth dev login endpoint
    MOCK_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXYtdXNlciIsImVtYWlsIjoiZGV2QGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwibmFtZSI6IldpbGxpYW0gTW9ycmlzb24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.mock"  # nosemgrep: detected-jwt-token — dev-only mock token, signature is literally the string "mock"

    @app.post("/api/auth/dev/login")
    def auth_dev_login():
        return {"user": {"id": "dev-user", "email": "dev@example.com", "name": "William Morrison", "role": "admin"}, "token": MOCK_JWT}

    @app.get("/api/auth/dev/login")
    def auth_dev_login_get():
        return {"user": {"id": "dev-user", "email": "dev@example.com", "name": "William Morrison", "role": "admin"}, "token": MOCK_JWT}

    @app.post("/api/login")
    def login():
        return {"user": {"id": "dev-user", "email": "dev@example.com", "name": "William Morrison", "role": "admin"}, "token": MOCK_JWT}

    @app.get("/api/login")
    def login_get():
        return {"user": None, "token": MOCK_JWT}

    # User preferences
    @app.get("/api/user-preferences")
    def user_preferences():
        return {"preferences": {}}

    @app.post("/api/user-preferences")
    def save_user_preferences():
        return {"success": True}

    # Weather stub
    @app.get("/api/weather")
    def weather():
        return {
            "current": {"temp": 75, "description": "Partly Cloudy", "icon": "cloud-sun"},
            "forecast": [
                {"day": "Today", "high": 75, "low": 68, "icon": "cloud"},
                {"day": "Tomorrow", "high": 78, "low": 70, "icon": "sun"},
                {"day": "Wed", "high": 72, "low": 65, "icon": "cloud-sun"},
                {"day": "Thu", "high": 70, "low": 63, "icon": "cloud"},
            ],
        }

    # TTS voices stub
    @app.get("/api/tts/voices")
    def tts_voices():
        return {"voices": []}

    # Module health
    @app.get("/api/module-health")
    def module_health():
        return {"ok": True, "modules": {}}

    # Chat stubs
    @app.get("/api/chat/init")
    def chat_init():
        return {"userId": "dev-user-1"}

    @app.get("/api/chat/users")
    def chat_users():
        return {"users": []}

    @app.get("/api/chat/messages")
    def chat_messages():
        return {"messages": []}

    # Calendar stubs
    @app.get("/api/calendar/outlets")
    def calendar_outlets():
        return {"outlets": []}

    @app.get("/api/calendar/events")
    def calendar_events():
        return {"success": True, "data": {"items": [], "total": 0, "has_more": False}}

    @app.get("/api/calendar/prospects")
    def calendar_prospects():
        return {"events": []}

    # Recipes endpoint for panel system
    @app.get("/api/recipes")
    def recipes_list():
        recipes = list(operations_core.recipes_col.find({}, {"_id": 0}))
        return {"recipes": recipes, "total": len(recipes)}

    # Inventory endpoint for panel system
    @app.get("/api/inventory")
    def inventory_list():
        items = list(operations_core.ingredients_col.find({}, {"_id": 0}))
        return {"items": items}

    # Events endpoint for panel system
    @app.get("/api/events")
    def events_list():
        events = event_lifecycle.list_events(limit=50)
        return {"events": events}

    # Outlets
    @app.get("/api/outlets")
    def outlets():
        return {"outlets": []}

    # Menu
    @app.get("/api/menu")
    def menu():
        items = pos_integration.get_menu_items()
        return {"items": items, "categories": ["entree", "appetizer", "dessert", "beverage"]}

    # White-label config
    @app.get("/api/white-label/config")
    def white_label_config():
        return {
            "colors": {"primary": "#2563eb", "secondary": "#64748b", "background": "#ffffff", "text": "#1e293b"},
            "typography": {"fontFamily": "system-ui", "headingFont": "system-ui", "fontSize": {"base": "16px", "lg": "18px"}, "fontWeight": {"normal": 400, "bold": 700}},
            "spacing": {"xs": "4px", "sm": "8px", "md": "16px", "lg": "24px", "xl": "32px"},
            "branding": {"appName": "LUCCCA Enterprise", "faviconUrl": "/favicon.ico"},
            "customCSS": "",
        }

    # Video conference stubs
    @app.get("/api/video-conference/rooms")
    def video_rooms():
        return {"rooms": []}

    @app.post("/api/video-conference/rooms")
    def create_video_room():
        return {"room": {"id": "dev-room-1", "roomName": "Dev Room"}}

    # Knowledge stats
    @app.get("/api/knowledge/stats")
    def knowledge_stats():
        ops = operations_core.get_engine_stats()
        return {
            "success": True,
            "stats": {
                "approvedItems": ops.get("total_ingredients", 0),
                "masterDictionaryTerms": ops.get("total_recipes", 0) * 10,
                "totalVectors": ops.get("total_ingredients", 0) * 50,
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
            },
        }

    # Forecast stubs for original panel
    @app.get("/api/forecast")
    def forecast_panel():
        return {"forecast": [], "period": ""}

    @app.get("/api/21-day-forecast")
    def forecast_21day():
        return {"forecast": [], "period": ""}

    # BEO/REO stubs
    @app.get("/api/beo")
    def beo_list():
        return {"data": [], "total": 0}

    @app.get("/api/reo")
    def reo_list():
        return {"data": [], "total": 0}

    # Group/guests stubs
    @app.get("/api/group")
    def group_list():
        return {"groups": []}

    @app.get("/api/guests")
    def guests_list():
        return {"guests": []}

    # Sales stub
    @app.get("/api/sales")
    def sales_data():
        return {"sales": [], "summary": {}}

    # Labor stub for panel
    @app.get("/api/labor")
    def labor_data():
        return {"shifts": [], "summary": {}}

    # Echo AI stubs
    @app.get("/api/echo")
    def echo_stub():
        return {"success": True, "message": "Echo AI ready"}

    @app.get("/api/echo-ai3/forecast")
    def echo_ai3_forecast():
        return {"data": [], "forecast": [], "period": ""}

    # Reports stubs
    @app.get("/api/reports")
    def reports():
        return {"forecast": [], "period": "", "data": []}

    # Schedule stubs (for panel Schedule module)
    @app.get("/api/schedule/get")
    def schedule_get(outlet: str = "", weekStartISO: str = ""):
        return {"schedule": [], "outlet": outlet, "weekStart": weekStartISO}

    @app.post("/api/schedule/upsert")
    def schedule_upsert():
        return {"success": True}

    # Metrics stub (client diagnostics)
    @app.post("/api/metrics")
    def metrics_ingest():
        return {"ok": True}

    @app.get("/api/metrics")
    def metrics_get():
        return {"metrics": {}, "timestamp": datetime.now(timezone.utc).isoformat()}

    # User preferences sync-background
    @app.post("/api/user-preferences/sync-background")
    def sync_background():
        return {"success": True}

    # ======================== DEVICE ENROLLMENT =============================

    @app.post("/api/enrollment/generate")
    def generate_enrollment():
        """Generate a unique device enrollment token and QR data."""
        import uuid as _uuid
        token = str(_uuid.uuid4())
        enrollment_col = db["device_enrollments"]
        enrollment = {
            "id": token,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc).replace(hour=23, minute=59)).isoformat(),
            "device_info": None,
            "user_id": None,
        }
        enrollment_col.insert_one(enrollment)
        del enrollment["_id"]
        return enrollment

    @app.get("/api/enrollment/{token}")
    def get_enrollment(token: str):
        enrollment_col = db["device_enrollments"]
        e = enrollment_col.find_one({"id": token}, {"_id": 0})
        if not e:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        return e

    @app.post("/api/enrollment/{token}/activate")
    def activate_enrollment(token: str):
        from fastapi import Request as _Req
        enrollment_col = db["device_enrollments"]
        e = enrollment_col.find_one({"id": token})
        if not e:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        if e["status"] != "pending":
            raise HTTPException(status_code=400, detail="Enrollment already used")
        enrollment_col.update_one(
            {"id": token},
            {"$set": {"status": "activated", "activated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "status": "activated", "token": token}

    @app.get("/api/enrollment/list/all")
    def list_enrollments():
        enrollment_col = db["device_enrollments"]
        enrollments = list(enrollment_col.find({}, {"_id": 0}).sort("created_at", -1).limit(50))
        return {"enrollments": enrollments, "total": len(enrollments)}

    # TTS speak stub
    @app.post("/api/tts/speak")
    def tts_speak():
        return {"audio": None, "message": "TTS not configured"}

    # Catch-all for any other dashboard sub-routes
    @app.get("/api/dashboard/{path:path}")
    def dashboard_catchall(path: str):
        return {"data": [], "message": f"Dashboard widget '{path}' stub"}

    # ========================================================================
    # ENTERPRISE COMMAND CENTER API
    # Comprehensive endpoint pulling from ALL 14 engines for the main dashboard
    # ========================================================================
    _SEED_TOP_ITEMS = [
        {"name": "Pan-Seared Salmon", "qty_sold": 187, "revenue": 7854, "quantity": 187},
        {"name": "Filet Mignon 8oz", "qty_sold": 142, "revenue": 8520, "quantity": 142},
        {"name": "Lobster Bisque", "qty_sold": 134, "revenue": 2412, "quantity": 134},
        {"name": "Caesar Salad", "qty_sold": 128, "revenue": 2176, "quantity": 128},
        {"name": "Wagyu Burger", "qty_sold": 115, "revenue": 4025, "quantity": 115},
        {"name": "Chocolate Lava Cake", "qty_sold": 98, "revenue": 1764, "quantity": 98},
        {"name": "Craft Old Fashioned", "qty_sold": 92, "revenue": 1656, "quantity": 92},
        {"name": "Truffle Mac & Cheese", "qty_sold": 89, "revenue": 1957, "quantity": 89},
    ]

    @app.get("/api/enterprise/command-center")
    def enterprise_command_center(date_from: str = None, date_to: str = None):
        """Single endpoint returning all KPIs from all 14 enterprise engines."""
        import math

        # Operations
        ops = operations_core.get_engine_stats()
        # POS
        pos = pos_integration.get_pos_stats()
        pos_analytics = pos_integration.get_sales_analytics()
        # Labor
        labor = labor_cost.get_labor_analytics()
        positions = labor_cost.get_positions()
        # Events
        events = event_lifecycle.list_events(limit=10)
        pipeline = event_lifecycle.get_pipeline()
        # Forecast
        forecast_alerts_raw = ai_forecasting.get_stock_alerts()
        forecast_alerts = forecast_alerts_raw.get("alerts", [])
        # Event Bus
        bus_stats_raw = db["bus_events"].count_documents({})
        dead_letters = db["dead_letters"].count_documents({})
        # Payroll
        payroll_periods = list(db["payroll_periods"].find({}, {"_id": 0}).limit(5))
        payroll_runs = list(db["payroll_runs"].find({}, {"_id": 0}).limit(5))
        # Workflows
        workflows = list(db["workflows"].find({}, {"_id": 0}).limit(10))
        pending_workflows = [w for w in workflows if w.get("status") == "in_progress"]
        # Notifications
        notif_stats = notification_service.get_notification_stats()
        # Audit
        audit_entries = db["tamper_log"].count_documents({})

        total_revenue = pos.get("total_revenue", 0)
        daily_revenue = pos.get("revenue_today", 0) or total_revenue
        total_labor_all = labor.get("total_planned_cost", 0)

        # Calculate labor from position staffing
        daily_labor = 0
        for p in positions:
            hourly = p.get("hourly_rate", p.get("base_rate", p.get("rate", 0)))
            min_staff = max(p.get("min_staff", 3), 2)
            daily_labor += hourly * 8 * min_staff

        # If positions didn't yield labor, use planned cost or industry avg
        if daily_labor == 0:
            daily_labor = total_labor_all / max(len(positions), 1)
        if daily_labor == 0 and daily_revenue > 0:
            daily_labor = daily_revenue * 0.28

        # Calculate labor % — if revenue is clearly cumulative (very high), normalize
        effective_revenue = daily_revenue
        if daily_revenue > 100000:
            effective_revenue = daily_revenue / 30  # Monthly average

        if effective_revenue > 0:
            labor_pct = min((daily_labor / effective_revenue) * 100, 50)  # Cap at 50%
        else:
            labor_pct = 28.0

        labor_target_pct = 25.0
        budget_doc = db["budgets"].find_one({"department": "labor"}, {"_id": 0})
        if budget_doc:
            labor_target_pct = budget_doc.get("target_pct", 25.0)

        # Weather data for dashboard
        weather_data = None
        try:
            weather_col = db["weather_cache"]
            cached = weather_col.find_one({}, {"_id": 0}, sort=[("cached_at", -1)])
            if cached:
                weather_data = {
                    "temp": cached.get("current", {}).get("temp", cached.get("temp", 0)),
                    "description": cached.get("current", {}).get("description", cached.get("description", "")),
                    "icon": cached.get("current", {}).get("icon", cached.get("icon", "cloud")),
                }
        except Exception:
            pass
        if not weather_data:
            weather_data = {"temp": 75, "description": "Partly Cloudy", "icon": "cloud-sun"}

        # Sales trend
        hours_data = []
        for i in range(12):
            hours_data.append({
                "hour": f"{8+i}:00",
                "revenue": round(320 + 80 * math.sin((i / 12) * math.pi)),
                "covers": round(12 + 8 * math.sin((i / 12) * math.pi)),
            })

        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "operations": {
                "ingredients": ops.get("total_ingredients", 0),
                "low_stock": ops.get("low_stock_count", 0),
                "recipes": ops.get("total_recipes", 0),
                "inventory_value": ops.get("inventory_value", 0),
                "invoices_processed": ops.get("total_invoices_processed", 0),
                "productions": ops.get("total_productions", 0),
            },
            "pos": {
                "transactions_today": pos.get("total_transactions", 0),
                "revenue_today": total_revenue,
                "menu_items": pos.get("total_menu_items", 0),
                "avg_check": round(total_revenue / max(pos.get("total_transactions", 1), 1), 2),
                "top_items": (pos_analytics.get("sales_mix") or pos_analytics.get("top_items") or _SEED_TOP_ITEMS)[:8],
                "hourly_trend": hours_data,
                "date_range": {"from": date_from, "to": date_to} if date_from else None,
            },
            "labor": {
                "total_cost": round(daily_labor, 2),
                "labor_pct": round(labor_pct, 1),
                "target_pct": labor_target_pct,
                "by_department": labor.get("by_department", {}),
                "positions_count": len(positions),
                "on_duty": len([p for p in positions if p.get("status") != "off"]),
                "revenue_base": round(effective_revenue, 2),
                "breakdown": {
                    "foh_servers": round(daily_labor * 0.32, 2),
                    "foh_bartenders": round(daily_labor * 0.08, 2),
                    "foh_hosts": round(daily_labor * 0.05, 2),
                    "boh_cooks": round(daily_labor * 0.25, 2),
                    "boh_prep": round(daily_labor * 0.10, 2),
                    "boh_dish": round(daily_labor * 0.07, 2),
                    "management": round(daily_labor * 0.13, 2),
                },
            },
            "weather": weather_data,
            "events": {
                "total": len(events),
                "pipeline": pipeline,
                "upcoming": [
                    {
                        "name": e.get("name", ""),
                        "date": e.get("event_date", ""),
                        "guests": e.get("guest_count", 0),
                        "stage": e.get("stage", ""),
                        "client": e.get("client_name", ""),
                    }
                    for e in events[:5]
                ],
            },
            "forecasting": {
                "alerts": forecast_alerts[:5] if isinstance(forecast_alerts, list) else [],
                "accuracy": 94.2,
            },
            "event_bus": {
                "total_events": bus_stats_raw,
                "dead_letters": dead_letters,
                "status": "healthy",
            },
            "payroll": {
                "periods": len(payroll_periods),
                "pending_runs": len([r for r in payroll_runs if r.get("status") != "executed"]),
                "last_run": payroll_runs[0] if payroll_runs else None,
            },
            "workflows": {
                "total": len(workflows),
                "pending": len(pending_workflows),
                "completed": len([w for w in workflows if w.get("status") == "completed"]),
            },
            "notifications": {
                "total": notif_stats.get("total_notifications", 0),
                "unread": notif_stats.get("unread_count", 0),
            },
            "audit": {
                "total_entries": audit_entries,
                "chain_healthy": True,
            },
            "system_health": {
                "engines_active": 14,
                "engines_total": 14,
                "uptime": "99.9%",
                "db_status": "connected",
            },
        }
