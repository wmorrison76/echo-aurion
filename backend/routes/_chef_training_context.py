"""
D16d · Echo training context — shared helper used by Carissa
(`chef_carissa_training.py`) and Gio (`chef_gio_training.py`) to
build a live snapshot of the commissary catalog + recipe stages
that the chef has been editing in real time.

Why this exists:
  Carissa and Gio have deep static system prompts. But they were
  blind to the LIVE catalog — when the chef asked "can the Cafe
  order croissants tomorrow?" Echo had no idea that the Cafe was
  approved for croissants only, with a 24-unit-per-day cap. After
  D16a (commissary) and D16b (stages) shipped the data, this
  module surfaces it into the prompt at session-create time so
  Echo's answers reflect what the property actually configured.

Plus: a `distill_correction()` helper that turns a chef's free-text
correction into a clean structured knowledge entry the
`carissa_knowledge` / `gio_knowledge` tables can store. This closes
the human-train-Echo loop: chef sees a wrong answer, types a
correction, the system extracts a clean entry the next session can
read back.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional


# ─── Commissary + stages snapshot for the system prompt ──────────────────

def commissary_context_for(db, lane: str, max_products: int = 30) -> str:
    """Return a markdown block summarizing the live commissary catalog
    for one lane, plus the per-product stage timings when present.

    Designed to be cheap (read-only, capped). The result is appended
    to Carissa/Gio's system prompt at session-create time so Echo
    answers about ordering and timing reflect the actual catalog —
    not just the static training prose."""
    if lane not in ("pastry", "banquet"):
        return ""

    products = list(db["commissary_products"].find(
        {"lane": lane, "active": True}, {"_id": 0}).sort("name", 1).limit(max_products))
    if not products:
        return ""

    lines: List[str] = []
    lines.append(f"\n\nLIVE COMMISSARY CATALOG ({lane}):")
    lines.append(
        "These are the products the chef has set up in this property's "
        f"{lane} commissary. Reference them by name when discussing "
        "ordering, internal transfers, or production timing. The "
        "approval list controls which outlets can order what — when "
        "asked 'can Outlet X order Y?' use the approvals in `commissary_"
        "approvals` (deny by default if no approval row exists).\n"
    )
    for p in products:
        # Per-product stage summary if a recipe is linked
        stage_note = _stage_summary(db, p.get("recipe_id"))
        lead = _lead_time_summary(p, stage_note)
        lines.append(
            f"- {p['name']} (slug={p['slug']}, ${p.get('unit_cost',0):.2f}/"
            f"{p.get('unit','each')}, lead={lead})"
            + (f" — {stage_note}" if stage_note else "")
        )

    # Also surface outlet-approval rules (compact form).
    approvals = list(db["commissary_approvals"].find(
        {"is_active": True, "product_id": {"$in": [p["id"] for p in products]}},
        {"_id": 0}).limit(80))
    if approvals:
        by_outlet: Dict[str, List[str]] = {}
        for a in approvals:
            outlet = a.get("outlet_id") or "?"
            pid = a.get("product_id")
            pname = next((p["name"] for p in products if p["id"] == pid), pid)
            by_outlet.setdefault(outlet, []).append(pname)
        lines.append("\nOUTLET APPROVALS (only these outlets may order):")
        for outlet, names in sorted(by_outlet.items()):
            lines.append(f"  {outlet}: {', '.join(sorted(names))}")
    return "\n".join(lines)


def _stage_summary(db, recipe_id: Optional[str]) -> str:
    """Compact one-line summary of the recipe's production stages —
    enough for Echo to reason about timing without dumping every
    field. Returns "" when no stages are recorded."""
    if not recipe_id:
        return ""
    row = db["recipe_stages"].find_one({"recipe_id": recipe_id}, {"_id": 0})
    if not row:
        return ""
    stages = sorted(row.get("stages") or [],
                    key=lambda s: s.get("sequence_order") or 0)
    if not stages:
        return ""
    pieces = []
    for s in stages:
        am = int(s.get("active_minutes") or 0)
        pm = int(s.get("passive_minutes") or 0)
        # Render days for very long passives (90-day cure)
        if pm >= 60 * 24:
            pm_str = f"{pm // (60*24)}d"
        elif pm >= 60:
            pm_str = f"{pm // 60}h"
        else:
            pm_str = f"{pm}m"
        am_str = f"{am}m" if am < 60 else f"{am//60}h{am%60 if am%60 else ''}m"
        pieces.append(f"{s['name']} ({am_str}+{pm_str})")
    return " → ".join(pieces)


def _lead_time_summary(product: Dict[str, Any], stage_note: str) -> str:
    """Pick the right lead-time string. Stages wins when present;
    otherwise the static field."""
    if stage_note:
        return "from stages"  # Echo can read the stages above
    h = product.get("lead_time_hours") or 0
    pf = product.get("preferment_hours") or 0
    if pf:
        return f"{h}h + {pf}h preferment"
    return f"{h}h"


# ─── Distill a chef correction into a structured KB entry ─────────────────

_DISTILL_SYSTEM_PROMPT = (
    "You are an editor for a chef's training knowledge base. The chef "
    "is correcting something Echo (the AI assistant) said incorrectly. "
    "Take the chef's free-text correction and rewrite it as a clean, "
    "future-readable knowledge entry. Output ONLY a JSON object with "
    "these fields: topic (short noun phrase, the subject of the "
    "correction), content (1-3 sentence corrective rule, written as "
    "a directive to a future Echo session), applies_to (one of "
    "'all' | 'beo_review' | 'production' | 'ordering' | 'service'). "
    "No narration, no markdown, just the JSON object."
)


def distill_correction(
    correction_text: str,
    *,
    context_excerpt: Optional[str] = None,
    chef_role: str = "carissa",
) -> Dict[str, Any]:
    """Turn the chef's free-text correction into a structured KB entry.

    Calls Claude via the fuse box (services.clients.get_anthropic_client).
    Falls back to a deterministic rule when no AI is wired so the demo
    still works — the fallback uses the first 8 words as the topic and
    the full correction as the content. Topic and applies_to default
    to safe values.

    chef_role is "carissa" or "gio" — the prompt is the same for both
    but the field is preserved for future per-role tuning."""
    correction_text = (correction_text or "").strip()
    if not correction_text:
        return {"ok": False, "error": "empty correction"}

    user_prompt = correction_text
    if context_excerpt:
        user_prompt = (
            f"What Echo previously said (excerpt):\n{context_excerpt}\n\n"
            f"Chef's correction:\n{correction_text}"
        )

    try:
        from services.clients import get_anthropic_client
        client = get_anthropic_client()
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            system=_DISTILL_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = ""
        for block in getattr(msg, "content", []) or []:
            if getattr(block, "type", "") == "text":
                text += getattr(block, "text", "")
        import json as _json
        t = text.strip()
        if t.startswith("```"):
            t = t.split("```", 2)[1]
            if t.startswith("json"):
                t = t[4:]
            t = t.rsplit("```", 1)[0]
        parsed = _json.loads(t)
        return {
            "ok": True,
            "topic":      str(parsed.get("topic") or _fallback_topic(correction_text)),
            "content":    str(parsed.get("content") or correction_text),
            "applies_to": str(parsed.get("applies_to") or "all"),
            "source": "distilled",
        }
    except Exception as e:
        return {
            "ok": True,
            "topic":   _fallback_topic(correction_text),
            "content": correction_text,
            "applies_to": "all",
            "source": f"fallback ({type(e).__name__})",
        }


def _fallback_topic(text: str) -> str:
    """Extract a topic from the first sentence-ish chunk of the
    correction. Keep it under 80 chars."""
    first = text.split(".")[0].strip()
    words = first.split()
    if len(words) > 12:
        return " ".join(words[:12]) + "…"
    return first[:80] or "correction"
