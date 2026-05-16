"""
AI³ Natural Language Interface
================================
LLM-powered conversational intelligence with RBAC guardrails.
"What's my food cost for the Grand Ballroom this month?" → instant answer.
"""
import os
import uuid
import json
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

import database
db = database.db

router = APIRouter(prefix="/api/ai3", tags=["ai3"])

def _now(): return datetime.now(timezone.utc).isoformat()
def _uid(): return str(uuid.uuid4())[:12]

LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")


class NLPQueryInput(BaseModel):
    query: str
    user_id: str
    session_id: Optional[str] = None


def _gather_context_for_query(query: str) -> str:
    """Gather relevant data from all systems based on query keywords."""
    q = query.lower()
    context_parts = []

    # Hospitality operations (always add a compact ops snapshot — this is what
    # most day-to-day questions are about). Covers Spa / Engineering /
    # Housekeeping / FOH / IRD / Concierge / KDS / Guest 360.
    ops_parts = []
    try:
        # Housekeeping
        rooms = list(db["hskp_rooms"].find({}, {"_id": 0}).limit(500))
        if rooms:
            ready = sum(1 for r in rooms if r.get("status") in ("ready", "inspected"))
            dirty = sum(1 for r in rooms if r.get("status") == "dirty")
            ooo = sum(1 for r in rooms if r.get("status") == "ooo")
            ops_parts.append(f"HOUSEKEEPING: {len(rooms)} rooms — {ready} ready, {dirty} dirty, {ooo} OOO.")
        # Engineering
        eng_open = db["eng_work_orders"].count_documents({"status": {"$in": ["open", "assigned", "in_progress"]}})
        eng_crit = db["eng_work_orders"].count_documents({"severity": "critical", "status": {"$nin": ["resolved", "closed"]}})
        if eng_open or eng_crit:
            ops_parts.append(f"ENGINEERING: {eng_open} open work orders ({eng_crit} critical).")
        # FOH outlets
        outlets = list(db["foh_outlets"].find({}, {"_id": 0}))
        if outlets:
            ops_parts.append(f"FOH OUTLETS ({len(outlets)}): " + ", ".join(o.get("name","") for o in outlets))
        # Concierge queue
        con_open = db["concierge_tickets"].count_documents({"status": {"$in": ["open", "routed", "in_progress"]}})
        if con_open:
            ops_parts.append(f"CONCIERGE: {con_open} open tickets across all domains.")
        # Spa bookings today
        spa_today = db["spa_bookings"].count_documents({})
        if spa_today:
            ops_parts.append(f"SPA: {spa_today} total bookings.")
        # IRD open orders
        ird_open = db["ird_hub_orders"].count_documents({"status": {"$in": ["received","preparing","enroute"]}})
        if ird_open:
            ops_parts.append(f"IRD: {ird_open} open orders.")
        # KDS active tickets
        kds_active = db["kds_tickets"].count_documents({"status": {"$nin": ["fulfilled", "cancelled"]}})
        if kds_active:
            ops_parts.append(f"KDS: {kds_active} active tickets in the kitchen.")
        # Guest 360 in-house
        in_house = db["guest360_profiles"].count_documents({"in_house": True})
        if in_house:
            ops_parts.append(f"GUEST 360: {in_house} guests currently in-house.")
        # GAP FIX (audit iter146): Pattern Intelligence snapshot so the
        # AI³ chat can answer questions like "what's recurring in room
        # 301?" or "which outlets have slowed down this week?".
        try:
            from routes.patterns import _recurring as _recur_helper
            _rec = [b for b in _recur_helper(days=30) if b["count"] >= 2][:5]
            if _rec:
                snap = ", ".join(f"Rm {r['room_no']}/{r['category']} ×{r['count']}" for r in _rec)
                ops_parts.append(f"PATTERN INTELLIGENCE: top recurring — {snap}.")
            open_notifs = db["team_notifications"].count_documents({"acknowledged": False})
            if open_notifs:
                ops_parts.append(f"TEAM NOTIFICATIONS: {open_notifs} open alerts awaiting ack.")
        except Exception:
            pass
    except Exception:
        pass
    if ops_parts:
        context_parts.append("OPS SNAPSHOT: " + " ".join(ops_parts))

    # Specific keyword expansions
    if any(w in q for w in ["room", "housekeeping", "clean", "turnover", "arrival", "ready"]):
        try:
            arr = list(db["hskp_arrivals"].find({}, {"_id": 0}).limit(80))
            rooms = list(db["hskp_rooms"].find({}, {"_id": 0}).limit(500))
            rooms_by_no = {r["room_no"]: r for r in rooms}
            not_ready = [a for a in arr if rooms_by_no.get(a["room_no"], {}).get("status") not in ("ready","inspected")]
            risk = sum(a.get("adr", 0) for a in not_ready)
            context_parts.append(f"ARRIVAL READINESS: {len(arr)} arrivals, {len(not_ready)} rooms not yet ready, ${risk:,.0f} revenue at risk.")
        except Exception: pass

    if any(w in q for w in ["spa", "massage", "treatment", "therapist"]):
        try:
            services = db["spa_services"].count_documents({})
            therapists = db["spa_therapists"].count_documents({"active": True})
            context_parts.append(f"SPA OPS: {services} services, {therapists} active therapists.")
        except Exception: pass

    if any(w in q for w in ["engineering", "work order", "maintenance", "hvac", "plumb", "elevator"]):
        try:
            wos = list(db["eng_work_orders"].find({"status": {"$in":["open","assigned","in_progress"]}}, {"_id": 0}).sort("opened_at", -1).limit(10))
            samples = "; ".join(f"{w.get('ticket_no')} {w.get('severity')} {w.get('title')[:40]}" for w in wos[:5])
            context_parts.append(f"ENG WORK ORDERS: {samples}")
        except Exception: pass

    if any(w in q for w in ["reservation", "booking", "restaurant", "table", "cover", "outlet", "foh"]):
        try:
            total = db["foh_reservations"].count_documents({"status": {"$in":["pending","confirmed","seated"]}})
            vips = db["foh_reservations"].count_documents({"vip": True, "status": {"$in":["pending","confirmed","seated"]}})
            context_parts.append(f"FOH RESERVATIONS: {total} active ({vips} VIP).")
        except Exception: pass

    if any(w in q for w in ["concierge", "ticket", "request", "complaint"]):
        try:
            tickets = list(db["concierge_tickets"].find({}, {"_id": 0}).sort("created_at", -1).limit(8))
            samples = "; ".join(f"{t.get('domain')}:{t.get('title')[:35]}" for t in tickets[:5])
            context_parts.append(f"CONCIERGE RECENT: {samples}")
        except Exception: pass

    if any(w in q for w in ["ird", "minibar", "room service", "dining delivery"]):
        try:
            orders = list(db["ird_hub_orders"].find({}, {"_id": 0}).sort("created_at", -1).limit(10))
            context_parts.append(f"IRD ORDERS: {len(orders)} recent, revenue today ${sum(o.get('subtotal',0) for o in orders):.0f}.")
        except Exception: pass

    if any(w in q for w in ["kds", "kitchen", "expo", "station", "fire", "course", "ticket time"]):
        try:
            tks = list(db["kds_tickets"].find({"status": {"$nin":["fulfilled","cancelled"]}}, {"_id": 0}).limit(30))
            vips = sum(1 for t in tks if t.get("vip"))
            context_parts.append(f"KDS: {len(tks)} active tickets in kitchen, {vips} VIP.")
        except Exception: pass

    if any(w in q for w in ["pattern", "recurring", "repeat", "trend", "drift", "cluster", "stratus", "remediation"]):
        try:
            from routes.patterns import _recurring as _recur_helper
            _rec = [b for b in _recur_helper(days=30) if b["count"] >= 2][:10]
            if _rec:
                rec_txt = "; ".join(
                    f"Rm {r['room_no']}/{r['category']} ×{r['count']} (sources: {','.join(r.get('sources',[])[:3])})"
                    for r in _rec[:5]
                )
                context_parts.append(f"RECURRING PATTERNS: {rec_txt}")
            wos = list(db["eng_work_orders"].find({}, {"_id": 0}).limit(500))
            if wos:
                from collections import Counter
                cats = Counter(w.get("category","other") for w in wos)
                top = cats.most_common(3)
                context_parts.append(f"ASSET FAILURE CLUSTERS (top 3): " + ", ".join(f"{c} ×{n}" for c,n in top))
            notifs = list(db["team_notifications"].find({"acknowledged": False}, {"_id": 0}).sort("created_at",-1).limit(5))
            if notifs:
                context_parts.append(
                    "OPEN TEAM NOTIFICATIONS: " +
                    "; ".join(f"→{n.get('to')} {n.get('reason','')[:80]}" for n in notifs)
                )
        except Exception: pass

    # Calendar / Events
    events = list(db["calendar_events"].find({}, {"_id": 0}).sort("start", 1).limit(15))
    if events:
        context_parts.append(f"RESORT CALENDAR: {len(events)} upcoming events. " +
            "; ".join([f"{e.get('title','')} ({e.get('event_type','')}, {e.get('guest_count',0)} guests, {e.get('start','')[:10]})" for e in events[:8]]))

    # Inventory
    if any(w in q for w in ["inventory", "stock", "supply", "ingredient", "food cost", "par"]):
        items = list(db["ingredients"].find({}, {"_id": 0}).limit(30))
        low = [i for i in items if i.get("current_stock", 0) < i.get("par_level", 10)]
        total_val = sum(i.get("current_stock", 0) * i.get("current_cost", 0) for i in items)
        context_parts.append(f"FOOD INVENTORY: {len(items)} items, total value ${total_val:.0f}, {len(low)} items below par level.")

    # Beverage
    if any(w in q for w in ["beverage", "bar", "wine", "spirit", "cocktail", "pour", "drink", "liquor"]):
        bev = list(db["beverage_inventory"].find({}, {"_id": 0}).limit(20))
        bev_val = sum(b.get("cost_price", 0) * b.get("total_qty", 0) for b in bev)
        low_bev = [b for b in bev if b.get("total_qty", 0) <= b.get("reorder_point", 0)]
        pours = list(db["pour_logs"].find({}, {"_id": 0}).limit(50))
        total_rev = sum(p.get("revenue", 0) for p in pours)
        total_cost = sum(p.get("cost", 0) for p in pours)
        comps = [p for p in pours if p.get("is_comp")]
        context_parts.append(f"BEVERAGE: {len(bev)} spirits/wines, value ${bev_val:.0f}, {len(low_bev)} below reorder. " +
            f"Pours: {len(pours)} logged, revenue ${total_rev:.0f}, cost ${total_cost:.0f}, {len(comps)} comps.")

    # Financial
    if any(w in q for w in ["cost", "revenue", "profit", "margin", "p&l", "financial", "budget", "spend"]):
        orders = list(db["vendor_orders"].find({}, {"_id": 0}).limit(50))
        total_po = sum(o.get("subtotal", 0) for o in orders)
        context_parts.append(f"FINANCIALS: {len(orders)} purchase orders totaling ${total_po:.0f}. " +
            "Food cost target: 28%. Labor cost: 32.1% of revenue. Current period revenue estimate: $170,000.")

    # Vendors
    if any(w in q for w in ["vendor", "supplier", "order", "purchase", "sysco", "delivery"]):
        vendors = list(db["vendors"].find({}, {"_id": 0}))
        context_parts.append(f"VENDORS: {len(vendors)} active — " +
            ", ".join([f"{v.get('name','')} ({v.get('category','')})" for v in vendors]))

    # Compliance
    if any(w in q for w in ["haccp", "compliance", "temperature", "inspection", "safety", "health"]):
        checklists = list(db["compliance_checklists"].find({}, {"_id": 0}).sort("completed_at", -1).limit(10))
        actions = list(db["corrective_actions"].find({"status": "open"}, {"_id": 0}))
        context_parts.append(f"COMPLIANCE: {len(checklists)} checklists completed, {len(actions)} open corrective actions.")

    # Labor
    if any(w in q for w in ["staff", "labor", "schedule", "overtime", "employee", "payroll"]):
        context_parts.append("LABOR: 287 total employees across 9 departments. " +
            "Current overtime risk: 2 employees (Carlos Rivera 42hrs, Mike Chen 44hrs). " +
            "Payroll current period: $485,000. Labor target: 32% of revenue.")

    # Guests / CRM
    if any(w in q for w in ["guest", "vip", "customer", "booking", "loyalty"]):
        guests = list(db["guest_profiles"].find({}, {"_id": 0}).limit(20))
        context_parts.append(f"GUEST CRM: {len(guests)} profiles. VIP levels: standard, silver, gold, platinum, diamond. " +
            "Repeat guest rate: 34.2%. Average spend per visit: $285.")

    # Properties
    if any(w in q for w in ["property", "hotel", "resort", "casino", "multi"]):
        props = list(db["properties"].find({}, {"_id": 0}))
        context_parts.append(f"PROPERTIES: {len(props)} — " +
            ", ".join([f"{p.get('name','')} ({p.get('rooms',0)} rooms)" for p in props]))

    # Food Knowledge Base (8,000 items)
    food_keywords = ["food", "ingredient", "recipe", "culinary", "cook", "chef", "kitchen",
        "oil", "fat", "vinegar", "ferment", "spice", "herb", "sauce", "protein",
        "produce", "grain", "dairy", "pastry", "baking", "nutrition", "allergen",
        "menu", "dish", "preparation", "technique", "flavor", "seasoning", "condiment"]
    if any(w in q for w in food_keywords):
        try:
            fk_results = list(db["food_knowledge"].find(
                {"$text": {"$search": query}},
                {"_id": 0, "score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(10))
            if fk_results:
                entries = []
                for r in fk_results:
                    entry = r.get("term", "Unknown")
                    if r.get("definition"):
                        entry += f": {r['definition'][:200]}"
                    if r.get("category"):
                        entry += f" [{r['category']}]"
                    entries.append(entry)
                context_parts.append(
                    f"FOOD KNOWLEDGE BASE ({db['food_knowledge'].count_documents({})} items indexed): "
                    + "; ".join(entries)
                )
        except Exception:
            pass

    if not context_parts:
        context_parts.append("GENERAL: LUCCCA is an enterprise resort/casino management platform with modules for " +
            "culinary, events, procurement, inventory, beverage, scheduling, finance, compliance, and guest CRM.")

    return "\n\n".join(context_parts)


def _get_role_restrictions(user: dict) -> str:
    """Generate role-specific data restrictions for the system prompt."""
    role = user.get("role", "staff")
    restrictions = {
        "owner": "You have FULL access to all data including owner compensation, investor info, and executive bonuses.",
        "gm": "You can access all operational and financial data EXCEPT owner compensation and investor data. Redact these if asked.",
        "controller": "You can access all financial data including payroll. Do NOT reveal owner compensation or executive bonuses.",
        "exec_chef": "You can access culinary, purchasing, inventory, and recipe cost data. Do NOT reveal payroll, compensation, or executive financial details.",
        "director": f"You can access data for departments: {', '.join(user.get('departments', []))}. Do NOT reveal payroll, compensation, or financial details outside your departments.",
        "manager": "You can access operational data for your department. Do NOT reveal payroll, compensation, vendor pricing, or P&L details.",
        "supervisor": "You can access shift-level operational data. Do NOT reveal any financial, payroll, or vendor pricing data.",
        "staff": "You can ONLY access public information: menu items, your schedule, general event info. Do NOT reveal any financial, cost, payroll, or vendor data.",
        "vendor": "You can ONLY access your own purchase orders, delivery schedule, and invoice status. Do NOT reveal any internal resort data.",
    }
    return restrictions.get(role, restrictions["staff"])


@router.post("/ask")
async def ai3_ask(data: NLPQueryInput):
    """AI³ Natural Language Query — ask anything about resort operations."""
    if not LLM_KEY:
        raise HTTPException(500, "LLM key not configured")

    # Get user and role
    user = db["rbac_users"].find_one({"user_id": data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")

    # Gather context from all systems
    context = _gather_context_for_query(data.query)
    role_restriction = _get_role_restrictions(user)

    system_message = f"""You are AI³ — the LUCCCA Resort Intelligence Engine. You have access to ALL operational data across the resort/casino. You provide concise, data-driven answers.

USER CONTEXT:
- Name: {user.get('name', 'Unknown')}
- Role: {user.get('role', 'staff')}
- Departments: {', '.join(user.get('departments', []))}

ACCESS RESTRICTIONS:
{role_restriction}

LIVE RESORT DATA:
{context}

RULES:
1. Answer with specific numbers and data from the context above.
2. If data is not available in context, say so clearly.
3. NEVER reveal restricted data that the user's role cannot access.
4. If the user asks for restricted data, politely explain they don't have access.
5. Be concise — executives want quick answers, not essays.
6. Use $ for monetary values, % for percentages.
7. Flag urgent issues proactively (low stock, overtime risk, temperature alerts).
"""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        session = data.session_id or f"ai3-{data.user_id}-{_uid()}"
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=session,
            system_message=system_message,
        )
        chat.with_model("openai", "gpt-4.1-mini")

        user_msg = UserMessage(text=data.query)
        response = await chat.send_message(user_msg)

        # Save to chat history (let MongoDB auto-generate _id)
        db["ai3_chat_history"].insert_one({
            "id": f"chat-{_uid()}",
            "session_id": session,
            "user_id": data.user_id,
            "role": user.get("role"),
            "query": data.query,
            "response": response,
            "timestamp": _now(),
        })

        return {
            "response": response,
            "user": {"name": user.get("name"), "role": user.get("role")},
            "session_id": session,
            "timestamp": _now(),
        }

    except Exception as e:
        error_msg = str(e)
        # Fallback: structured response without LLM
        return {
            "response": f"AI³ is processing your query. Here's what I found:\n\n{context}\n\n(Note: Natural language processing temporarily unavailable: {error_msg[:100]})",
            "user": {"name": user.get("name"), "role": user.get("role")},
            "session_id": data.session_id or f"ai3-fallback-{_uid()}",
            "timestamp": _now(),
            "fallback": True,
        }


@router.get("/chat-history")
def get_chat_history(user_id: str, session_id: Optional[str] = None, limit: int = 20):
    q = {"user_id": user_id}
    if session_id:
        q["session_id"] = session_id
    history = list(db["ai3_chat_history"].find(q, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return {"history": history, "total": len(history)}


# ----- Voice-to-Text (Whisper) -----
from fastapi import File, UploadFile

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe uploaded audio using Whisper STT."""
    if not LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    import tempfile
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")

    stt = OpenAISpeechToText(api_key=LLM_KEY)

    suffix = "." + (file.filename.split(".")[-1] if file.filename else "webm")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as audio_file:
            response = stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en",
                prompt="This is a query about restaurant operations, food cost, inventory, scheduling, or hospitality management.",
            )
        return {"text": response.text, "status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        import os as _os
        _os.unlink(tmp_path)
