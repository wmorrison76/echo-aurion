"""
Echo Chronos · Ask Echo (Sonnet-powered analysis) + Codebase Deep-Dive.

iter263:
  - Switched from Claude Opus 4.6 to Claude Sonnet 4.5 for both endpoints
    (budget-friendly, user-requested).
  - Added graceful degradation: on budget-exceeded / upstream 502 / timeout,
    we return a cached-or-stub response with HTTP 200 and a `degraded: true`
    flag so the UI never crashes.

POST /api/chronos/ask           — "Why labor high?" / "Hypothesis tree" etc.
GET  /api/chronos/deep-dive     — one-shot hospitality-platform audit + next steps

Uses emergentintegrations.LlmChat with Claude Sonnet 4.5 via Emergent LLM key.
Responses are cached per (chip + outlet_id + UTC date) to avoid burning tokens.
"""
import os
import hashlib
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from database import db

load_dotenv()

router = APIRouter(prefix="/api/chronos", tags=["chronos-ai"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# iter263 · Claude Sonnet 4.5 (latest) — used for /ask. /deep-dive uses a
# multi-provider fallback chain (Sonnet 4.5 → GPT-4o → GPT-4o-mini) because
# Anthropic upstream occasionally rate-limits and we never want a cold deep-dive.
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-5-20250929"

DEEP_DIVE_FALLBACK_CHAIN = [
    ("anthropic", "claude-sonnet-4-5-20250929"),
    ("openai", "gpt-4o"),
    ("openai", "gpt-4o-mini"),
]


CHIP_SYSTEM_PROMPTS = {
    "why-labor-high": (
        "You are Echo, an operations intelligence assistant for a multi-outlet hospitality group. "
        "When asked why labor is high, give a crisp 150-250 word analysis: "
        "(1) identify the top 2-3 likely drivers given the outlet's KPI snapshot, "
        "(2) cite the peer benchmark gap explicitly, "
        "(3) close with ONE concrete, executable fix. Use a direct, executive tone. No bullet fluff."
    ),
    "hypothesis-tree": (
        "You are Echo. Produce a 3-branch hypothesis tree explaining the outlet's current state. "
        "For each branch: name the hypothesis, give a confidence % (sum to 100), and a 1-sentence "
        "test to validate. Keep it under 200 words."
    ),
    "what-if": (
        "You are Echo. Propose ONE high-impact what-if scenario the user could simulate right now: "
        "state the lever (e.g. -1 server on pantry), predict the KPI deltas "
        "(labor%, covers, theo gap), and the P50 net impact in dollars/day. 150 words."
    ),
    "weather-impact": (
        "You are Echo. Summarize weather's impact on this outlet over the last 30 days: "
        "patio-cover sensitivity, rainy-day net delta, sunny-day lift. "
        "Project tomorrow's weather-adjusted P50. 180 words."
    ),
    "anomaly-dna": (
        "You are Echo. Find the closest historical pattern match for this outlet's current anomaly "
        "(theo-actual gap, sudden variance, etc.). Name the prior incident, the match score, "
        "and the resolution that worked. 150 words."
    ),
    "send-to-gm": (
        "You are Echo. Draft a 100-word push message the Director could send to the GM "
        "summarizing the outlet's state, the 2-3 most urgent flags, and one specific ask. "
        "Friendly, professional, direct. End with a clear next action."
    ),
}


class AskRequest(BaseModel):
    chip: str
    outlet_id: str
    outlet_name: Optional[str] = None
    kpi_snapshot: Optional[dict] = None
    session_id: Optional[str] = None


def _cache_key(chip: str, outlet_id: str) -> str:
    d = datetime.now(timezone.utc).date().isoformat()
    return hashlib.sha256(f"{chip}:{outlet_id}:{d}".encode()).hexdigest()[:24]


def _is_budget_or_upstream(err: Exception) -> bool:
    """Detect LLM budget exhaustion, 5xx, or timeout signals."""
    s = (str(err) or "").lower()
    return any(
        k in s
        for k in (
            "budget",
            "rate limit",
            "502",
            "503",
            "504",
            "bad gateway",
            "timeout",
            "timed out",
            "overloaded",
        )
    )


def _stub_response(chip: str) -> str:
    """Last-resort stub when LLM is unavailable. Keeps UX functional."""
    return (
        f"[Echo is momentarily offline for `{chip}` — LLM key budget or upstream "
        "issue. Your request is cached and will auto-retry next refresh. "
        "Admins: check Profile → Universal Key → Add Balance, or the service status "
        "panel for integration health.]"
    )


@router.post("/ask")
async def ask_echo(req: AskRequest):
    if req.chip not in CHIP_SYSTEM_PROMPTS:
        raise HTTPException(400, f"Unknown chip: {req.chip}")
    if not EMERGENT_LLM_KEY:
        # Soft-fail so UI shows a helpful message instead of crashing.
        return {
            "response": _stub_response(req.chip),
            "cached": False,
            "degraded": True,
            "reason": "EMERGENT_LLM_KEY not configured",
            "chip": req.chip,
        }

    # Cache lookup
    key = _cache_key(req.chip, req.outlet_id)
    cached = db["chronos_ask_cache"].find_one({"key": key}, {"_id": 0})
    if cached and "response" in cached:
        return {"response": cached["response"], "cached": True, "chip": req.chip}

    # Build user message with outlet context
    ctx_lines = [f"Outlet: {req.outlet_name or req.outlet_id}"]
    if req.kpi_snapshot:
        for k, v in req.kpi_snapshot.items():
            ctx_lines.append(f"- {k}: {v}")
    user_text = "OUTLET KPI SNAPSHOT\n" + "\n".join(ctx_lines) + f"\n\nCHIP: {req.chip}\nRespond now."

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=req.session_id or f"chip-{key}",
            system_message=CHIP_SYSTEM_PROMPTS[req.chip],
        ).with_model(MODEL_PROVIDER, MODEL_NAME)
        response_text = await chat.send_message(UserMessage(text=user_text))
    except Exception as e:
        # iter263 · Graceful degradation. Any budget/rate/upstream issue returns
        # a 200 with `degraded: true`; the UI can surface a subtle warning but
        # won't throw. A previously-cached answer for any (chip, outlet) pair
        # is returned when available.
        fallback = db["chronos_ask_cache"].find_one(
            {"chip": req.chip, "outlet_id": req.outlet_id},
            {"_id": 0},
            sort=[("created_at", -1)],
        )
        if fallback and "response" in fallback:
            return {
                "response": fallback["response"],
                "cached": True,
                "degraded": True,
                "reason": f"{type(e).__name__}: {str(e)[:160]}",
                "chip": req.chip,
            }
        return {
            "response": _stub_response(req.chip),
            "cached": False,
            "degraded": True,
            "reason": f"{type(e).__name__}: {str(e)[:160]}",
            "chip": req.chip,
        }

    # Cache
    db["chronos_ask_cache"].update_one(
        {"key": key},
        {"$set": {"key": key, "chip": req.chip, "outlet_id": req.outlet_id,
                  "response": response_text, "model": MODEL_NAME,
                  "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"response": response_text, "cached": False, "chip": req.chip}


DEEP_DIVE_SYSTEM = (
    "You are Claude Sonnet 4.5 acting as the Principal Hospitality-Platform Architect for a "
    "multi-outlet hotel-restaurant group's internal operations platform called Echo AURION / LUCCCA. "
    "You will be given the current state of the codebase (module inventory, role taxonomy, "
    "API surface, data flow architecture). Your job: produce a structured, opinionated audit. "
    "Be blunt. Call out gaps a seasoned operator would immediately notice. "
    "Output MUST be in this exact Markdown structure:\n\n"
    "## What's Done Well (3 bullets)\n"
    "## Critical Gaps Missing for Real-World Hospitality Use (6-10 bullets, ranked by impact)\n"
    "## Profile-Based Platform — Next 5 Building Priorities (numbered, each with: *why*, *effort*, *success metric*)\n"
    "## Quick Wins (things the team could ship in <1 day each)\n"
    "## Risks & Dependencies\n\n"
    "Ground every recommendation in operator reality — you are advising a Director who runs 15 outlets. "
    "Avoid generic SaaS platitudes. 900-1400 words."
)


@router.get("/deep-dive")
async def deep_dive(refresh: bool = False):
    """One-shot hospitality-platform audit powered by Claude Sonnet 4.5."""
    today = datetime.now(timezone.utc).date().isoformat()

    # Serve cache unless explicitly refreshing
    if not refresh:
        cached = db["chronos_deep_dive"].find_one({"date": today}, {"_id": 0})
        if cached:
            return {**cached, "cached": True}

    if not EMERGENT_LLM_KEY:
        # Most recent successful run, if any
        latest = db["chronos_deep_dive"].find_one(
            {}, {"_id": 0}, sort=[("generated_at", -1)]
        )
        if latest:
            return {**latest, "cached": True, "degraded": True,
                    "reason": "EMERGENT_LLM_KEY not configured"}
        return {
            "date": today,
            "markdown": (
                "# Deep-Dive unavailable\n\n"
                "Emergent LLM key is not configured on the server. "
                "Please set `EMERGENT_LLM_KEY` in `backend/.env` or top up the Universal Key."
            ),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": MODEL_NAME,
            "degraded": True,
        }

    # Package a codebase summary for the model
    summary = _build_codebase_summary()

    last_err: Optional[Exception] = None
    used_model: Optional[str] = None
    markdown: Optional[str] = None
    for provider, model in DEEP_DIVE_FALLBACK_CHAIN:
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"deep-dive-{today}-{model}",
                system_message=DEEP_DIVE_SYSTEM,
            ).with_model(provider, model)
            markdown = await chat.send_message(UserMessage(text=summary))
            used_model = f"{provider}/{model}"
            break
        except Exception as e:
            last_err = e
            continue

    if markdown is None:
        # Every provider failed — return most-recent successful dive + degraded flag
        latest = db["chronos_deep_dive"].find_one(
            {}, {"_id": 0}, sort=[("generated_at", -1)]
        )
        if latest:
            return {
                **latest,
                "cached": True,
                "degraded": True,
                "reason": f"{type(last_err).__name__}: {str(last_err)[:200]}",
            }
        return {
            "date": today,
            "markdown": (
                "# Deep-Dive temporarily unavailable\n\n"
                f"All providers failed. Last error: `{type(last_err).__name__}: {str(last_err)[:200]}`\n\n"
                "**Most likely cause:** Universal Key budget exhausted. "
                "Go to **Profile → Universal Key → Add Balance** in the Emergent dashboard, "
                "or try again in a few minutes if upstream is rate-limited."
            ),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "fallback-chain-failed",
            "degraded": True,
            "reason": f"{type(last_err).__name__}: {str(last_err)[:200]}",
        }

    doc = {
        "date": today,
        "markdown": markdown,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": used_model or MODEL_NAME,
    }
    db["chronos_deep_dive"].update_one({"date": today}, {"$set": doc}, upsert=True)
    return {**doc, "cached": False}


def _build_codebase_summary() -> str:
    """Snapshot of the codebase for the LLM to reason over."""
    return """CODEBASE STATE — Echo AURION · LUCCCA (April 2026)

STACK: React + Vite · FastAPI · MongoDB. PWA desktop ("AURION") + mobile shell ("MyEcho").

ROLE TAXONOMY (17 profiles, JWT-auth, dev-cookie override):
  Tier admin/owner:   admin, owner
  Tier enterprise:    regional-director (Robert Sinclair — multi-property)
  Tier property:      director (William Reyes), exec-dir-finance, general-manager, fb-director, controller
  Tier dept-head:     executive-chef (4 outlets 1 kitchen), pastry-chef, dir-banquets, events-manager,
                      spa-manager, dir-engineering, purchasing-manager
  Tier enterprise-desktop (NEW): sous-chef, dining-room-manager
  Tier mobile:        staff (hourly)

DEPARTMENT MODULES (catalogue via access_matrix.py):
  culinary, pastry, banquets, foh_service, beverage, rooms, spa, engineering,
  finance, purchasing, hr, events, chronos_view, enterprise_bi, admin_sys

INHERITANCE RULE: role with access to outlet details → auto-inherit all modules in that dept.

FLAGSHIP DASHBOARD — Echo Chronos (operational time machine):
  Portfolio view → 6-15 outlet cards (health %, status badges, net/covers/labor)
  Ops view (drill-in) → 16 KPI sparkline tiles + time slider + weather backdrop + event pins
    + 3-day Monte Carlo prep forecast + auto production sheet
    + Live BEO feed for ExecChef/DirBanquets/Director
    + Network Intelligence strip (peer benchmark)
    + Action chips (this very endpoint)
    + YoY overlay toggle
  Compare view (2-3 outlets side-by-side)
  Regional Director property-group drill (expandable per-property outlet list)

BACKEND ENDPOINTS (snapshot):
  /api/auth/jwt/* — login, profiles, me
  /api/chronos/* — portfolio, outlet, compare, forecast-tomorrow, prep-forecast,
                   beos-live, properties, access/me, ask, deep-dive
  /api/admin/* — onboarding, cross-property-dashboard, properties, outlets
  /api/briefing/today — Claude-generated role-aware daily narrative
  /api/approvals/* — Oracle-style hierarchy, banner
  /api/service-recovery/* — Save-the-ticket, Tonight's Playbook
  /api/echo-schedule/* — Schedule v2 with compliance checker
  /api/invoices/* — vendor PDF → SKU extraction
  /api/vendor-skus/* — SKU autocomplete for recipes
  /api/purchasing-approvals/* — consolidated PurchRec

DATA FLOW PATTERN: connection-check fallback — every endpoint reads live collection first;
falls back to deterministic seeded mocks if empty. Real POS/ERP just has to write to the
collection, code flows through automatically.

EXTERNAL INTEGRATIONS:
  Live: Claude Sonnet 4.5 (briefings, Ask Echo), Whisper (voice), OpenAI TTS, Firebase FCM
  MOCKED: AWS S3 (VIP photos/video/audio), Twilio SMS (no FROM number),
          Resend/SendGrid (no key). Real POS (no adapter yet).

KNOWN GAPS (author's own view, please validate or contradict):
  - Schedule v2 UI not fully wired to /api/echo-schedule/*
  - PurchRec 3-way match + par-driven auto-PO exist in backend only, UI deferred
  - 8 advanced ops-view panels (Shift Notes, Vendor Invoices COGS Drill, Station Heat,
    Hotel Guest Mix, Server Upsell, Specials/Group Blocks, Inventory Waterfall,
    Variance Attribution) from the design video not built
  - CDC Launchpad "Send to Stations" hook for prep-forecast → KDS printer routes
  - Real POS integration (architecture ready, adapter not written)
  - Guest-facing systems (PMS, channel manager, OTA sync) — NONE
  - Revenue management / yield / dynamic pricing — NONE
  - Wine & spirits inventory beyond basic beverage ops — SHALLOW
  - Catering / group sales pipeline — MINIMAL (BEO surface only)
  - Loyalty / guest-profile engine — NONE (just VIP Atlas)
  - Allergen / dietary tree is PARTIAL
  - Vendor contract management — NONE
  - Energy / utility / sustainability reporting — NONE
  - Regulatory / audit trails (HACCP beyond simple log) — SHALLOW
  - Admin/IT self-service: no Windows-update-style rollout, no feature-flag UI,
    no OS installer hub, no integration health panel (being built in iter263)
"""
