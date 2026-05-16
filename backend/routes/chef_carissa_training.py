"""
Chef Carissa Training Module — EchoAi³ Culinary Intelligence Training System
=========================================================================
An industry-first AI culinary training platform powered by Executive Chef Carissa's
knowledge base. Upload a BEO → EchoAi³ reads line by line → plays out full scenarios
(recipes, ordering, buying logic, production timelines, firing times) in a
conversational dialog like a seasoned Chef training a Sous Chef.

Architecture:
- BEO on one side, EchoLogic conversation on the other
- Multi-turn conversation with session persistence
- Core training knowledge (Carissa defaults) + per-chef customization
- Echo learns, adapts, never forgets

This module uses the Emergent LLM Key for AI conversation.
"""
from datetime import datetime, timezone
from fastapi import UploadFile, File
import tempfile
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import db
from dotenv import load_dotenv
import os
import json

load_dotenv()

router = APIRouter(prefix="/api/chef-carissa", tags=["chef-carissa"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:8]

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# ══════════════════════════════════════
#  CARISSA KNOWLEDGE BASE (Core Training)
# ══════════════════════════════════════

CARISSA_SYSTEM_PROMPT = """You are Chef Carissa, Executive Pastry Chef and pastry training instructor for EchoAi³.
You are training pastry staff (Pastry Sous Chefs, Cake Decorators, Bakery Cooks, Banquet Pastry Cooks, Plated-Dessert Cooks) on how to execute luxury-resort pastry — wedding cakes, plated desserts, viennoiserie, bakery production, and banquet dessert service.

YOUR PERSONALITY & APPROACH:
- You are a seasoned pastry professional with 20+ years in luxury pastry — Le Cordon Bleu trained, two James Beard semifinalist nods, lead pastry chef on three sub-property openings, awarded for wedding cake design.
- You explain WHY, not just WHAT — every gel, glaze, mousse choice is a deliberate decision based on humidity, hold time, allergens, and cost.
- You think 3 steps ahead: "If we laminate today and proof tomorrow morning, fermentation crests at 6 AM and the kouign-amann is on the line by 7."
- You are precise, almost surgical — pastry punishes sloppy chemistry. You measure to the gram. You temper to the half-degree.
- You are direct but encouraging — pastry burns out cooks who can't handle the rigor. You build them up while holding the standard.
- You speak from experience: "In my kitchen, we..." or "I've seen this go wrong when the mousse was poured at 32°C instead of 28..."

YOUR PASTRY KNOWLEDGE AREAS:

1. WEDDING CAKE CONSTRUCTION
   - Tier strategy: 6"/8"/10"/12" base. 100 covers ≈ 8/10/12 three-tier; 200 covers ≈ 6/8/10/12 four-tier with kitchen sheet backup
   - Internal supports: bubble-tea straws (cleaner than dowels), board between every tier, central dowel through all tiers for stability
   - Travel/transport: assemble on-site for >2 tiers; gum-paste flowers placed last; emergency kit (royal icing, palette knife, piping bag with matching buttercream)
   - Buttercream choice: Swiss meringue (most stable in heat), Italian (silkiest), American (sweetest, holds detail). Outdoor June Florida event = Italian + 5% extra cocoa butter for heat resistance.
   - Fondant vs ganache: ganache under fondant gives sharp edges. Fondant first only on round tiers; sharp-edged squares need ganache or modeling chocolate.

2. PLATED DESSERT TIMING (à la carte)
   - Pre-portioned (cremeux, panna cotta, mousse rounds) live in 38°F lowboy ready to plate. Garnish à la minute (tuile, micro herbs, dehydrated fruit).
   - Hot components (soufflé, financier, sticky toffee) fire on order — 8-12 min lead time. Pre-bake bases, finish to order.
   - Chocolate temper: dark 31-32°C, milk 29-30°C, white 27-28°C. Marble slab, seeding method. Bloom = re-temper.
   - Sugar work: pulled 165°C, blown 155°C, isomalt for showpieces (no humidity issue), 45-min window before hardening past workable.

3. BAKERY / VIENNOISERIE PRODUCTION
   - Croissant lamination: 3 single turns + rest, OR 2 single + 1 double. 27 layers ideal. Detrempe 24°C, butter 14°C — temperature delta is everything.
   - Bread program: poolish overnight for baguette / pain de mie. Sourdough levain refresh 1:5:5 every 12hr. Autolyse 20-30 min before salt.
   - Yields per linear foot: 18 croissants per 16x12" sheet, 24 mini croissants, 12 pain au chocolat per same.
   - Proof control: bulk 75°F-78°F, final proof 80°F-85°F with humidity. Underproofed = dense; overproofed = collapse + alcohol smell.

4. EQUIPMENT MASTERY (Pastry-Specific)
   - Convotherm vs Rational: Rational iCombi Pro for big-batch sheet bakes (steam/heat combo), Convotherm 4 deck for hearth bread, Bongard rotating deck for laminated.
   - Sheeter: 700mm Rondo for laminated; calibrate roller gap to 4mm for first turn, 6mm final.
   - Tabletop: Vitamix for smooth coulis, Robot Coupe for crémeux, Pacojet for sorbet (-22°C minimum), Cocoa Press for chocolate decor.
   - Holding: thermal-stable display 65°F; chocolate showpiece 60°F + 50% RH; bread room 75°F.

5. ORDERING & PAR LEVELS
   - Butter: 1 lb yields ≈ 7-8 lamination turns or 60 madeleines or 45 financier or 1 wedding-cake buttercream batch (12-cup yield).
   - Flour split: T55/AP for laminated, bread flour for bread, cake flour for sponges, almond flour for macaron + financier (always have 2 backup bags).
   - Chocolate by % use: 70% dark for ganache/decor (Valrhona Guanaja or Manjari), 41% milk for bonbons, 35% white for moldings.
   - Eggs: case = 30 dz = 360 ct. Wedding cake (220 covers) ≈ 8 dozen yolks for crémeux, 4 dozen whites for meringue. Always order 10% over.
   - Cream: 36% heavy for ganache, 40% manufacturers' for whipped + chantilly. 1 quart = 4 cups whipped = 8 stars/cup.

6. ALLERGEN PROTOCOL (Pastry is highest-risk station)
   - Gluten-free: dedicated sheet, dedicated piping tip, dedicated speed rack — ALWAYS. Top shelf only (no cross-contamination from flour fall).
   - Nut allergen: separate work surface, separate Robot Coupe, separate stand mixer attachment. Almond flour locked in red bin.
   - Vegan: separate butter/cream chain, vegan dark chocolate (no milk solids), vegan margarine for laminated (Earth Balance professional grade), aquafaba for whites.
   - Egg: pasteurized whites are non-negotiable for buttercream when serving immune-compromised. Coconut cream replaces egg whites in some mousses.

7. WEDDING CAKE TIMELINE (3-day execution)
   - Day -2: bake all sponges, cool, freeze tightly wrapped (improves moisture distribution).
   - Day -1: thaw, level, ganache exterior, fondant base layer, refrigerate.
   - Day-of (morning): final fondant, gum-paste flowers, transport. Setup 60 min before guest arrival.
   - Hidden buffer: pre-bake one extra 6" tier, kept in walk-in for emergency repair.

8. BANQUET PASTRY OPERATIONS
   - 200 plated desserts: 4 cooks × 50 plates each. Pre-portion components 2hr ahead, plate à la minute when called by captain.
   - Buffet desserts: 2.5 portions per guest target (over-order grandmother math), refresh trays every 20 min.
   - Petit-four service: 4 pieces per guest, all fit on a 12-piece platter. Arrange by color, never by type — visual rhythm.

9. COST CONTROL
   - Plate cost target: <22% on plated desserts (luxury resort can flex to 28% on signature). Wedding cake $14-22 per cover with $4-6 in labor.
   - Yield engineering: scrap-utilization (cake offcuts → trifle parfait, croissant offcuts → almond croissant, brioche offcuts → French toast for staff meal).
   - Waste log MANDATORY — pastry has 3-4x the waste of hot kitchen if uncontrolled.

10. MISE EN PLACE & SERVICE STANDARDS
    - Lowboy organization: 3 zones — to-plate (front), in-progress (middle), reserve (back). Labeled. FIFO ruthless.
    - Plate temperature: cold desserts on chilled plate (38°F), hot desserts on warmed plate (140°F) — tempers chocolate decor differently.
    - Garnish discipline: max 4 elements per plate (anchor, accent, texture, color). Anything more reads as desperate.

WHEN ANALYZING A BEO OR PRODUCTION QUESTION, GO THROUGH THIS CHECKLIST:
1. Event overview (covers, room, timing, special dietary requirements)
2. Dessert menu analysis (each item — components, hold time, plating complexity)
3. Mise en place plan (T-2 days, T-1 day, T-0 morning, T-0 service)
4. Equipment allocation (decks/sheeters/lowboy space)
5. Order list with yield factors (10% overage default, 15% for outdoor)
6. Allergen separation plan (which station, which set of tools)
7. Service flow (pre-portioned vs à la minute, who plates, who runs)
8. Wedding cake transport / setup plan (if applicable)
9. Backup plan (what if humidity spikes? what if a tier collapses?)
10. Quality checkpoints — taste test 10 hr before service, visual inspection 30 min before.

ASK QUESTIONS like a real pastry chef training someone:
- "Sodium bicarb or baking powder for this sponge — and why?"
- "It's 95°F outside, the wedding is at 4 PM in the garden — what are you adjusting in the buttercream?"
- "200 plated chocolate soufflés on a 30-minute fire window — how do you stage it?"
- "The kitchen ran out of butter at 6 AM — your croissants are mid-second-turn. What do you do?"
- "Why would I temper white chocolate at 27°C and not 31°C like dark?"

ALWAYS reference real techniques, real temperatures, real timings. Use industry terminology (lamination, bloom, tempering, autolyse, levain, cremeux, gianduja, ganache montée, pâte à bombe).
When the trainee answers, evaluate carefully — praise correct chemistry/timing, correct mistakes with the WHY behind it.
You are training pastry chefs — accuracy is non-negotiable. A wedding cake collapse cannot be "iterated on" tomorrow."""


# ══════════════════════════════════════
#  SESSION MANAGEMENT
# ══════════════════════════════════════

@router.get("/sessions")
async def list_sessions(chef_id: Optional[str] = None):
    """List all training sessions, optionally filtered by chef."""
    query = {"chef_id": chef_id} if chef_id else {}
    sessions = list(db["carissa_training_sessions"].find(
        query, {"_id": 0}
    ).sort("updated_at", -1).limit(50))
    return {"sessions": sessions}


@router.post("/sessions/create")
async def create_session(body: dict = {}):
    """Create a new training session."""
    session_id = f"gio-{_uid()}"
    beo_number = body.get("beo_number")
    chef_id = body.get("chef_id", "default")
    chef_name = body.get("chef_name", "Trainee")
    mode = body.get("mode", "full_walkthrough")  # full_walkthrough, quiz, scenario, freeform

    # Load BEO if provided
    beo_data = None
    beo_context = ""
    if beo_number:
        beo = db["beo_documents"].find_one({"beo_number": beo_number}, {"_id": 0})
        if beo:
            beo_data = {
                "beo_number": beo.get("beo_number"),
                "event_name": beo.get("event_name", ""),
                "event_date": beo.get("event_date", ""),
                "room": beo.get("room", ""),
                "covers": beo.get("guaranteed_count", 0),
                "set_count": beo.get("set_count", 0),
                "event_classification": beo.get("event_classification", ""),
                "menu": beo.get("menu", {}),
                "setup_details": beo.get("setup_details", {}),
                "dietary_restrictions": beo.get("dietary_restrictions", []),
                "staffing": beo.get("staffing", []),
                "financial": beo.get("financial", {}),
                "notes": beo.get("notes", ""),
                "beverage_menu": beo.get("beverage_menu", {}),
                "omelet_station": beo.get("omelet_station", {}),
            }
            beo_context = _build_beo_context(beo_data)

    session = {
        "session_id": session_id,
        "chef_id": chef_id,
        "chef_name": chef_name,
        "mode": mode,
        "beo_number": beo_number,
        "beo_data": beo_data,
        "message_count": 0,
        "status": "active",
        "created_at": _now(),
        "updated_at": _now(),
    }
    db["carissa_training_sessions"].insert_one({**session, "_id": session_id})

    # Generate opening message from Chef Carissa
    opening = await _get_carissa_response(session_id, chef_name, mode, beo_context, beo_data, is_opening=True)

    # Store opening message
    db["carissa_training_messages"].insert_one({
        "_id": f"msg-{_uid()}", "session_id": session_id,
        "role": "assistant", "content": opening,
        "created_at": _now(),
    })
    db["carissa_training_sessions"].update_one(
        {"session_id": session_id},
        {"$set": {"message_count": 1, "updated_at": _now()}}
    )

    return {
        "session_id": session_id,
        "beo_data": beo_data,
        "opening_message": opening,
        "mode": mode,
    }


@router.post("/sessions/{session_id}/message")
async def send_message(session_id: str, body: dict = {}):
    """Send a message in a training session — Chef Carissa responds."""
    message = body.get("message", "")
    if not message.strip():
        raise HTTPException(400, "Message cannot be empty")

    session = db["carissa_training_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")

    # Store user message
    db["carissa_training_messages"].insert_one({
        "_id": f"msg-{_uid()}", "session_id": session_id,
        "role": "user", "content": message,
        "created_at": _now(),
    })

    # Build conversation context
    beo_data = session.get("beo_data")
    beo_context = _build_beo_context(beo_data) if beo_data else ""

    # Get conversation history
    history = list(db["carissa_training_messages"].find(
        {"session_id": session_id}, {"_id": 0, "role": 1, "content": 1}
    ).sort("created_at", 1).limit(30))

    # Get Chef Carissa response
    response = await _get_carissa_response(
        session_id, session.get("chef_name", "Trainee"),
        session.get("mode", "full_walkthrough"),
        beo_context, beo_data, user_message=message, history=history
    )

    # Store response
    db["carissa_training_messages"].insert_one({
        "_id": f"msg-{_uid()}", "session_id": session_id,
        "role": "assistant", "content": response,
        "created_at": _now(),
    })

    msg_count = session.get("message_count", 0) + 2
    db["carissa_training_sessions"].update_one(
        {"session_id": session_id},
        {"$set": {"message_count": msg_count, "updated_at": _now()}}
    )

    return {"response": response, "message_count": msg_count}


@router.get("/sessions/{session_id}/history")
async def get_session_history(session_id: str):
    """Get full conversation history for a session."""
    session = db["carissa_training_sessions"].find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")

    messages = list(db["carissa_training_messages"].find(
        {"session_id": session_id}, {"_id": 0, "role": 1, "content": 1, "created_at": 1}
    ).sort("created_at", 1))

    return {"session": session, "messages": messages}


# ══════════════════════════════════════
#  KNOWLEDGE BASE MANAGEMENT
# ══════════════════════════════════════

@router.get("/knowledge-base")
async def get_knowledge_base():
    """Get the current training knowledge base — core + chef customizations."""
    custom = list(db["carissa_knowledge"].find({}, {"_id": 0}).sort("created_at", -1))
    return {
        "core_topics": [
            "Recipe Execution & Techniques", "Ordering & Buying Logic",
            "Production Timelines", "Ready-Made vs Scratch Decisions",
            "Equipment Mastery (Rational, CVAP, Hot Box)", "Oven Space Logic",
            "Firing Sequences", "Scheduling & Labor", "Sanitation & Food Safety",
            "Guest Satisfaction & Recovery",
        ],
        "custom_entries": custom,
        "total_custom": len(custom),
    }


@router.post("/knowledge-base/add")
async def add_knowledge(body: dict = {}):
    """Chef adds custom training knowledge that Echo remembers."""
    entry = {
        "id": f"kb-{_uid()}",
        "chef_id": body.get("chef_id", "default"),
        "chef_name": body.get("chef_name", ""),
        "topic": body.get("topic", ""),
        "content": body.get("content", ""),
        "applies_to": body.get("applies_to", "all"),  # all, specific_event_type, specific_menu
        "created_at": _now(),
    }
    db["carissa_knowledge"].insert_one({**entry, "_id": entry["id"]})
    return entry


@router.post("/knowledge-base/distill")
async def distill_knowledge(body: dict = {}):
    """D16d · close the human-train-Echo loop. Chef pastes a free-text
    correction (or the message Echo got wrong + their corrected version);
    Claude rewrites it into a structured KB entry that future sessions
    will read from `carissa_knowledge`. Falls back to a deterministic
    rule when no AI is wired so the demo path keeps working."""
    from routes._chef_training_context import distill_correction
    correction = body.get("correction") or body.get("text") or ""
    excerpt = body.get("context_excerpt")
    chef_id = body.get("chef_id", "default")
    chef_name = body.get("chef_name", "")
    distilled = distill_correction(correction, context_excerpt=excerpt,
                                    chef_role="carissa")
    if not distilled.get("ok"):
        return distilled
    if body.get("persist", True):
        entry = {
            "id": f"kb-{_uid()}",
            "chef_id": chef_id, "chef_name": chef_name,
            "topic": distilled["topic"],
            "content": distilled["content"],
            "applies_to": distilled["applies_to"],
            "source": distilled.get("source", "distilled"),
            "created_at": _now(),
        }
        db["carissa_knowledge"].insert_one({**entry, "_id": entry["id"]})
        return {"ok": True, "entry": entry,
                "model": distilled.get("source")}
    return {"ok": True, "preview": distilled}


@router.get("/training-modes")
async def training_modes():
    """Available training modes."""
    return {"modes": [
        {"id": "full_walkthrough", "name": "Full BEO Walkthrough",
         "description": "Chef Carissa walks through entire BEO line by line — recipes, ordering, production, firing, everything."},
        {"id": "quiz", "name": "Kitchen Quiz",
         "description": "Chef Carissa asks questions about the BEO. Tests your knowledge on quantities, timing, equipment, problem-solving."},
        {"id": "scenario", "name": "Crisis Scenario",
         "description": "Things go wrong — equipment breaks, supplier shorts, staff callouts. How do you handle it?"},
        {"id": "freeform", "name": "Open Kitchen Talk",
         "description": "Ask Chef Carissa anything about culinary operations, techniques, or career development."},
    ]}


# ══════════════════════════════════════
#  LLM INTEGRATION
# ══════════════════════════════════════

async def _get_carissa_response(session_id, chef_name, mode, beo_context, beo_data, user_message=None, history=None, is_opening=False):
    """Generate Chef Carissa's response using LLM."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        # Build system message with mode-specific instructions
        mode_instructions = {
            "full_walkthrough": f"\nYou are doing a FULL WALKTHROUGH of a BEO with {chef_name}. Go through each section systematically — menu items, cooking methods, ordering quantities, prep timeline, equipment needs, firing sequence. After explaining each section, ask the trainee a question to check understanding before moving on.",
            "quiz": f"\nYou are QUIZZING {chef_name} on this BEO. Ask one question at a time. Wait for their answer. Evaluate it — praise correct answers, gently correct wrong ones with explanation. Cover: quantities, temperatures, timing, equipment, food safety, problem-solving.",
            "scenario": f"\nYou are running a CRISIS SCENARIO with {chef_name}. Present a realistic problem (equipment failure, supplier shortage, staff callout, guest allergy, simultaneous events). Ask how they would handle it. Evaluate their response. Then escalate the scenario with additional complications.",
            "freeform": f"\nYou are having an open conversation with {chef_name}. Answer any culinary question with depth and practical wisdom. Share real techniques, industry knowledge, and career advice.",
        }

        system = CARISSA_SYSTEM_PROMPT + mode_instructions.get(mode, mode_instructions["freeform"])

        if beo_context:
            system += f"\n\nCURRENT BEO DATA:\n{beo_context}"

        # Add custom knowledge
        custom_kb = list(db["carissa_knowledge"].find({}, {"_id": 0, "topic": 1, "content": 1}).limit(20))
        if custom_kb:
            kb_text = "\n".join([f"- {k['topic']}: {k['content']}" for k in custom_kb])
            system += f"\n\nCUSTOM KNOWLEDGE (from previous training sessions):\n{kb_text}"

        # D16d · live commissary catalog + recipe stages for the pastry lane
        try:
            from routes._chef_training_context import commissary_context_for
            commissary_block = commissary_context_for(db, lane="pastry")
            if commissary_block:
                system += commissary_block
        except Exception:
            pass

        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=session_id,
            system_message=system,
        ).with_model("openai", "gpt-4.1")

        if is_opening:
            if beo_data:
                prompt = f"Start the training session. You're looking at BEO #{beo_data['beo_number']} — {beo_data.get('event_name', '')} for {beo_data.get('covers', 0)} covers in {beo_data.get('room', '')} on {beo_data.get('event_date', '')}. Begin your walkthrough by giving an overview of this event and what the trainee needs to know first."
            else:
                prompt = f"Start a new training session with {chef_name}. No specific BEO loaded yet — introduce yourself and ask what they'd like to work on today."
        else:
            prompt = user_message

        # Replay history for context
        if history and len(history) > 1:
            for msg in history[:-1]:
                if msg["role"] == "user":
                    await chat.send_message(UserMessage(text=msg["content"]))
                # Assistant messages are auto-tracked by the chat library

        response = await chat.send_message(UserMessage(text=prompt))
        return response

    except Exception as e:
        # Fallback response if LLM fails
        if is_opening and beo_data:
            return (
                f"Chef Carissa here. Let's break down BEO #{beo_data['beo_number']} — "
                f"{beo_data.get('event_name', 'this event')} for {beo_data.get('covers', 0)} covers "
                f"in {beo_data.get('room', 'the room')}.\n\n"
                f"This is a {beo_data.get('event_classification', 'banquet event')} — "
                f"let me walk you through the menu, ordering, and production timeline.\n\n"
                f"First question: Looking at the menu, what's the most labor-intensive item "
                f"and why? Think about prep time, cooking method, and plating complexity."
            )
        elif is_opening:
            return (
                f"Chef Carissa here, {chef_name}. Welcome to the kitchen.\n\n"
                f"What are we working on today? You can load a BEO and I'll walk you through "
                f"it line by line — recipes, ordering, production timelines, firing sequences, "
                f"everything. Or ask me anything about culinary operations.\n\n"
                f"What's on your mind?"
            )
        else:
            return f"(System note: AI response unavailable — {str(e)[:100]}. Please try again.)"


def _build_beo_context(beo_data):
    """Build a detailed text context from BEO data for the LLM."""
    if not beo_data:
        return ""

    lines = [
        f"BEO #{beo_data.get('beo_number', 'N/A')}",
        f"Event: {beo_data.get('event_name', '')}",
        f"Date: {beo_data.get('event_date', '')}",
        f"Room: {beo_data.get('room', '')}",
        f"Covers: {beo_data.get('covers', 0)} guaranteed, {beo_data.get('set_count', 0)} set",
        f"Classification: {beo_data.get('event_classification', '')}",
    ]

    menu = beo_data.get("menu", {})
    if menu.get("sections"):
        lines.append(f"\nMENU — {menu.get('type', '')}:")
        lines.append(f"Serve Time: {menu.get('serve_time', 'TBD')}")
        if menu.get("note"):
            lines.append(f"Note: {menu['note']}")
        for sec in menu["sections"]:
            lines.append(f"\n  {sec['name']}:")
            for item in sec.get("items", []):
                lines.append(f"    - {item}")

    omelet = beo_data.get("omelet_station", {})
    if omelet:
        lines.append(f"\nOMELET STATION (${omelet.get('price_per_person', 0)}/pp):")
        lines.append(f"  Base: {', '.join(omelet.get('base', []))}")
        lines.append(f"  Proteins: {', '.join(omelet.get('proteins', []))}")
        lines.append(f"  Cheeses: {', '.join(omelet.get('cheeses', []))}")
        lines.append(f"  Vegetables: {', '.join(omelet.get('vegetables', []))}")

    bev = beo_data.get("beverage_menu", {})
    if bev and bev.get("spirits"):
        lines.append(f"\nBEVERAGE: {bev.get('type', 'Bar')}")
        for spirit in bev.get("spirits", [])[:5]:
            lines.append(f"  - {spirit['name']} ${spirit['price']}")

    restrictions = beo_data.get("dietary_restrictions", [])
    if restrictions:
        lines.append("\nDIETARY RESTRICTIONS:")
        for r in restrictions:
            lines.append(f"  ({r['count']}x) {r['restriction']}")

    fin = beo_data.get("financial", {})
    if fin:
        lines.append(f"\nFINANCIAL:")
        lines.append(f"  Price/person: ${fin.get('price_per_person', 0)}")
        lines.append(f"  Food Revenue: ${fin.get('food_revenue', 0):,.2f}")
        lines.append(f"  Total: ${fin.get('total', 0):,.2f}")
        lines.append(f"  Food Cost Target: {fin.get('food_cost_pct', 0)}%")

    setup = beo_data.get("setup_details", {})
    if setup:
        lines.append(f"\nSETUP:")
        for k, v in setup.items():
            if isinstance(v, list):
                for item in v:
                    lines.append(f"  - {item}")
            else:
                lines.append(f"  {k}: {v}")

    if beo_data.get("notes"):
        lines.append(f"\nNOTES: {beo_data['notes']}")

    return "\n".join(lines)



# ══════════════════════════════════════
#  SPEECH-TO-TEXT (Whisper Integration)
# ══════════════════════════════════════

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """Transcribe audio to text using OpenAI Whisper — for voice-to-Chef-Gio."""
    if not EMERGENT_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY not configured")

    allowed = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/mp4",
               "audio/m4a", "audio/ogg", "video/webm", "application/octet-stream"}
    content_type = audio.content_type or "application/octet-stream"

    # Read audio data
    audio_data = await audio.read()
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(400, "Audio file too large (max 25MB)")
    if len(audio_data) < 100:
        raise HTTPException(400, "Audio file too small or empty")

    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText

        stt = OpenAISpeechToText(api_key=EMERGENT_KEY)

        # Write to temp file for the API
        suffix = ".webm"
        if audio.filename:
            if audio.filename.endswith(".mp3"):
                suffix = ".mp3"
            elif audio.filename.endswith(".wav"):
                suffix = ".wav"
            elif audio.filename.endswith(".m4a"):
                suffix = ".m4a"
            elif audio.filename.endswith(".mp4"):
                suffix = ".mp4"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
            tmp.write(audio_data)
            tmp.flush()
            tmp.seek(0)

            response = await stt.transcribe(
                file=tmp,
                model="whisper-1",
                response_format="json",
                language="en",
                prompt="This is a conversation with Chef Carissa about culinary operations, BEO execution, kitchen production, and banquet event orders.",
            )

        text = response.text if hasattr(response, "text") else str(response)
        return {"text": text, "language": "en"}

    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {str(e)[:200]}")



# ══════════════════════════════════════
#  RLHF BEO REVIEW MODULE
#  Chef reviews EchoAi decisions, corrects/approves → trains the AI
# ══════════════════════════════════════

@router.get("/beo-review/queue")
async def get_review_queue():
    """Get BEOs pending chef review — sorted by event date urgency."""
    beos = list(db["beo_documents"].find(
        {"status": {"$in": ["draft", "revised", "client_approved", "beo_issued"]}},
        {"_id": 0}
    ).sort("event_date", 1).limit(20))

    queue = []
    for beo in beos:
        # Check if already reviewed
        review = db["carissa_beo_reviews"].find_one(
            {"beo_id": beo["id"], "revision": beo.get("revision", 1)},
            {"_id": 0, "status": 1}
        )
        review_status = review.get("status", "pending") if review else "pending"

        queue.append({
            "beo_id": beo["id"],
            "beo_number": beo.get("beo_number"),
            "event_name": beo.get("event_name", ""),
            "event_date": beo.get("event_date", ""),
            "room": beo.get("room", ""),
            "guaranteed_count": beo.get("guaranteed_count", 0),
            "classification": beo.get("event_classification", ""),
            "revision": beo.get("revision", 1),
            "status": beo.get("status", ""),
            "review_status": review_status,
            "menu_section_count": len(beo.get("menu_sections", [])),
            "has_financial": beo.get("financial", {}).get("total", 0) > 0,
        })

    return {
        "queue": queue,
        "total": len(queue),
        "pending_review": sum(1 for q in queue if q["review_status"] == "pending"),
        "approved": sum(1 for q in queue if q["review_status"] == "approved"),
        "corrected": sum(1 for q in queue if q["review_status"] == "corrected"),
    }


@router.get("/beo-review/{beo_id}")
async def get_beo_for_review(beo_id: str):
    """Get full BEO with EchoAi analysis for chef review.
    EchoAi generates its reasoning for each decision — chef then reviews."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    # Build EchoAi's decision analysis
    decisions = _generate_echoai_decisions(beo)

    # Get any existing review for this BEO revision
    existing_review = db["carissa_beo_reviews"].find_one(
        {"beo_id": beo_id, "revision": beo.get("revision", 1)},
        {"_id": 0}
    )

    # Get audit data
    audit = beo.get("last_audit")

    return {
        "beo": beo,
        "echoai_decisions": decisions,
        "existing_review": existing_review,
        "audit": audit,
    }


def _generate_echoai_decisions(beo: dict) -> list:
    """Generate EchoAi's decision analysis for each aspect of the BEO."""
    decisions = []
    gc = beo.get("guaranteed_count", 0)
    room = beo.get("room", "")
    classification = beo.get("event_classification", "")

    # 1. Guest Count & Setup
    decisions.append({
        "id": f"dec-{_uid()}",
        "category": "guest_count",
        "title": "Guest Count & Set Count",
        "echoai_reasoning": f"Guaranteed: {gc} guests. Set count recommendation: {gc} (match guaranteed). "
                           f"Overage planning: +{max(5, round(gc * 0.05))} extra settings ({round(gc * 0.05 / max(gc, 1) * 100)}%) for walk-ins and dietary accommodations.",
        "echoai_recommendation": gc,
        "current_value": beo.get("set_count", gc),
        "field": "set_count",
        "confidence": 0.95,
        "status": "pending",
    })

    # 2. Room Suitability
    room_capacity = {"Coastal Room": 200, "Oceanview": 150, "Grand Ballroom": 500, "Pier Room": 100, "Marina Terrace": 120}
    cap = room_capacity.get(room, 200)
    utilization = round(gc / max(cap, 1) * 100, 1)
    decisions.append({
        "id": f"dec-{_uid()}",
        "category": "room_assignment",
        "title": "Room Assignment",
        "echoai_reasoning": f"{room} capacity: {cap}. For {gc} guests = {utilization}% utilization. "
                           + ("Optimal range (60-80%)." if 55 <= utilization <= 85 else
                              "Room may be too large — consider downsizing." if utilization < 50 else
                              "Near capacity — ensure adequate circulation space."),
        "echoai_recommendation": room,
        "current_value": room,
        "field": "room",
        "confidence": 0.85 if 55 <= utilization <= 85 else 0.6,
        "status": "pending",
    })

    # 3. Menu Sections Analysis
    sections = beo.get("menu_sections", [])
    total_items = sum(len(s.get("items", [])) for s in sections)
    decisions.append({
        "id": f"dec-{_uid()}",
        "category": "menu_composition",
        "title": "Menu Composition",
        "echoai_reasoning": f"{len(sections)} menu sections with {total_items} total items for a {classification}. "
                           + (f"Good variety for {gc} guests." if total_items >= 3 else
                              "Consider adding more variety — guests expect 4-6 items minimum for buffet."),
        "echoai_recommendation": f"{len(sections)} sections, {total_items} items",
        "current_value": f"{len(sections)} sections, {total_items} items",
        "field": "menu_sections",
        "confidence": 0.8 if total_items >= 3 else 0.5,
        "status": "pending",
    })

    # 4. Timing Analysis
    start = beo.get("start_time", "07:00")
    end = beo.get("end_time", "09:00")
    try:
        sh, sm = map(int, start.split(":"))
        eh, em = map(int, end.split(":"))
        duration = (eh * 60 + em) - (sh * 60 + sm)
    except:
        duration = 120
    decisions.append({
        "id": f"dec-{_uid()}",
        "category": "timing",
        "title": "Event Timing & Duration",
        "echoai_reasoning": f"Event: {start} - {end} ({duration} minutes). "
                           + (f"Kitchen fire time: {sh - 2}:{sm:02d} (2 hours before service). "
                              f"Hot box staging: {sh - 1}:{sm:02d}. "
                              f"Buffet ready: {sh}:{sm:02d} - 15 min before doors. " if "Buffet" in classification else
                              f"Plating team call: {sh - 1}:{sm:02d}. "
                              f"First course fire: {sh}:{sm:02d}. ")
                           + ("Duration adequate." if duration >= 90 else "Tight window — streamline menu."),
        "echoai_recommendation": f"{start} - {end}",
        "current_value": f"{start} - {end}",
        "field": "timing",
        "confidence": 0.9,
        "status": "pending",
    })

    # 5. Staffing Recommendation
    staff_ratio = 20 if "Buffet" in classification else 12
    recommended_staff = max(2, round(gc / staff_ratio))
    decisions.append({
        "id": f"dec-{_uid()}",
        "category": "staffing",
        "title": "BOH Staffing",
        "echoai_reasoning": f"{'Buffet' if 'Buffet' in classification else 'Plated'} service for {gc} covers. "
                           f"Recommended BOH: {recommended_staff} staff ({staff_ratio}:1 ratio). "
                           f"Stations: prep ({max(1, recommended_staff // 3)}), hot line ({max(1, recommended_staff // 3)}), "
                           f"plating/buffet ({max(1, recommended_staff // 3)}).",
        "echoai_recommendation": recommended_staff,
        "current_value": 0,
        "field": "staffing",
        "confidence": 0.85,
        "status": "pending",
    })

    # 6. Financial Analysis
    fin = beo.get("financial", {})
    food_cost_pct = fin.get("food_cost_pct", 0)
    total = fin.get("total", 0)
    if total > 0:
        decisions.append({
            "id": f"dec-{_uid()}",
            "category": "financial",
            "title": "Revenue & Cost Analysis",
            "echoai_reasoning": f"Total event revenue: ${total:,.0f}. Food cost: {food_cost_pct}%. "
                               + ("Within target (under 30%)." if food_cost_pct < 30 else
                                  "Above target — review menu pricing or substitute lower-cost proteins." if food_cost_pct < 40 else
                                  f"ALERT: Food cost {food_cost_pct}% significantly exceeds 30% target. Immediate menu review required."),
            "echoai_recommendation": f"${total:,.0f} at {food_cost_pct}% FC",
            "current_value": f"${total:,.0f} at {food_cost_pct}% FC",
            "field": "financial",
            "confidence": 0.9 if food_cost_pct < 30 else 0.7,
            "status": "pending",
        })

    # 7. Equipment Allocation
    oven_pans = max(2, round(gc / 25))
    decisions.append({
        "id": f"dec-{_uid()}",
        "category": "equipment",
        "title": "Equipment Allocation",
        "echoai_reasoning": f"For {gc} covers: ~{oven_pans} sheet pans per protein item. "
                           f"Rational oven slots needed: {min(oven_pans, 15)}. Available: 15 (3 ovens x 5 pans). "
                           + (f"Sufficient oven capacity." if oven_pans <= 12 else
                              f"Tight — need oven jockey strategy. Stage in waves."),
        "echoai_recommendation": f"{oven_pans} pans, {min(3, max(1, oven_pans // 5))} ovens",
        "current_value": "Not specified",
        "field": "equipment",
        "confidence": 0.8,
        "status": "pending",
    })

    return decisions


@router.post("/beo-review/{beo_id}/submit")
async def submit_beo_review(beo_id: str, body: dict = {}):
    """Chef submits review of EchoAi decisions — approve, correct, or flag each one.
    This is the RLHF training loop: corrections become training data for EchoAi."""
    beo = db["beo_documents"].find_one({"id": beo_id}, {"_id": 0})
    if not beo:
        raise HTTPException(404, "BEO not found")

    decisions = body.get("decisions", [])
    chef_name = body.get("chef_name", "Chef")
    overall_notes = body.get("overall_notes", "")

    approved_count = 0
    corrected_count = 0
    flagged_count = 0
    training_data = []

    for dec in decisions:
        status = dec.get("status", "approved")  # approved, corrected, flagged
        if status == "approved":
            approved_count += 1
        elif status == "corrected":
            corrected_count += 1
            # Store correction as training data
            training_data.append({
                "id": f"train-{_uid()}",
                "category": dec.get("category", ""),
                "original_recommendation": dec.get("echoai_recommendation"),
                "correction": dec.get("correction", ""),
                "correction_reasoning": dec.get("correction_reasoning", ""),
                "chef_name": chef_name,
                "beo_id": beo_id,
                "beo_number": beo.get("beo_number"),
                "created_at": _now(),
            })
        elif status == "flagged":
            flagged_count += 1

    overall_status = "approved" if corrected_count == 0 and flagged_count == 0 else "corrected"

    review = {
        "id": f"review-{_uid()}",
        "beo_id": beo_id,
        "beo_number": beo.get("beo_number"),
        "revision": beo.get("revision", 1),
        "chef_name": chef_name,
        "decisions": decisions,
        "overall_notes": overall_notes,
        "status": overall_status,
        "approved_count": approved_count,
        "corrected_count": corrected_count,
        "flagged_count": flagged_count,
        "created_at": _now(),
    }

    # Upsert review for this BEO revision
    db["carissa_beo_reviews"].update_one(
        {"beo_id": beo_id, "revision": beo.get("revision", 1)},
        {"$set": review},
        upsert=True
    )

    # Store training corrections for RLHF
    if training_data:
        db["carissa_training_data"].insert_many(training_data)

        # Also add to knowledge base for immediate use
        for td in training_data:
            db["carissa_knowledge"].update_one(
                {"topic": f"BEO Correction: {td['category']}"},
                {"$set": {
                    "id": f"kb-{_uid()}", "chef_name": chef_name,
                    "topic": f"BEO Correction: {td['category']}",
                    "content": f"When reviewing {td['category']}: {td['correction_reasoning']}. "
                              f"Original AI recommendation was: {td['original_recommendation']}. "
                              f"Chef corrected to: {td['correction']}.",
                    "applies_to": td["category"],
                    "source": "rlhf_review",
                    "created_at": _now(),
                }},
                upsert=True,
            )

    # Update BEO with review status
    db["beo_documents"].update_one(
        {"id": beo_id},
        {"$set": {"chef_review": {"status": overall_status, "chef": chef_name, "reviewed_at": _now(),
                                   "approved": approved_count, "corrected": corrected_count, "flagged": flagged_count}},
         "$push": {"changelog": {"action": f"Chef review: {overall_status} ({approved_count} approved, {corrected_count} corrected)",
                                  "timestamp": _now(), "by": chef_name, "revision": beo.get("revision", 1)}}}
    )

    return {
        "review_id": review["id"],
        "status": overall_status,
        "approved": approved_count,
        "corrected": corrected_count,
        "flagged": flagged_count,
        "training_data_created": len(training_data),
    }


@router.get("/review-training-data")
async def get_training_data(limit: int = 50):
    """Get all RLHF training data from chef corrections — used to improve EchoAi."""
    data = list(db["carissa_training_data"].find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    categories = {}
    for d in data:
        cat = d.get("category", "unknown")
        categories[cat] = categories.get(cat, 0) + 1

    return {
        "training_data": data,
        "total": len(data),
        "by_category": categories,
        "model_improvement": {
            "total_corrections": len(data),
            "categories_improved": len(categories),
            "last_training": data[0].get("created_at") if data else None,
        },
    }


@router.get("/review-accuracy")
async def get_review_accuracy():
    """EchoAi accuracy metrics based on chef reviews — tracks improvement over time."""
    reviews = list(db["carissa_beo_reviews"].find({}, {"_id": 0}))
    if not reviews:
        return {"accuracy": 0, "total_reviews": 0, "trend": "no_data"}

    total_decisions = 0
    total_approved = 0
    for r in reviews:
        total_decisions += r.get("approved_count", 0) + r.get("corrected_count", 0) + r.get("flagged_count", 0)
        total_approved += r.get("approved_count", 0)

    accuracy = round(total_approved / max(total_decisions, 1) * 100, 1)

    return {
        "accuracy": accuracy,
        "total_reviews": len(reviews),
        "total_decisions": total_decisions,
        "total_approved": total_approved,
        "total_corrected": total_decisions - total_approved,
        "trend": "improving" if accuracy > 80 else "needs_training",
    }
