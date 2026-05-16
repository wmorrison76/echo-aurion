"""
Inter-Company Eliminations Engine
==================================
B.13 from the CFO toolkit. For operators with 2+ properties under
common ownership, auto-eliminates inter-property transactions on
consolidation so revenue + expenses don't double-count.

Architecture (per the human's spec — set up at onboarding, editable later):

  1. **Entities** — a parent (e.g. `aurion_holdings_inc`) declares
     which property_ids it consolidates.
  2. **Elimination rules** — per pair of (selling_property, buying_property)
     and per (gl_account_seller, gl_account_buyer), declare what to net.
  3. **Consolidation run** — for a parent + period, fetch each child's
     trial balance, identify the inter-co transactions, and produce a
     consolidated TB with eliminations applied.
  4. **Audit row** — every eliminated entry persists to
     `intercompany_eliminations_audit` (append-only, doctrine §3.1)
     so the auditor can verify exactly what was netted.

Two elimination granularities supported:
  · `trial_balance` — net the GL-account totals only (faster, less precise)
  · `journal_entry` — match individual JEs by reference; net at the
    entry level (slower, fully traceable)

Onboarding integration: `routes/onboarding_wizard.py` exposes a
companion endpoint that, when the human declares "I have multi-property,"
walks them through entity + rule definition. Both surfaces write to
the same `intercompany_entities` and `intercompany_rules` collections,
so post-onboarding edits use the same endpoints.

Doctrine alignment:
  · §3.1 append-only — audit log is immutable; recomputing a run
    archives the prior to history rather than overwriting
  · §1.1 transparency — every consolidation surfaces both gross
    (pre-elim) and net (post-elim) values so the math is visible
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict
from uuid import uuid4
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import db


router = APIRouter(prefix="/api/intercompany", tags=["cfo-intercompany"])

_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]


def _ensure_indexes():
    db["intercompany_entities"].create_index([("entity_id", 1)], unique=True)
    db["intercompany_rules"].create_index([("entity_id", 1), ("rule_id", 1)], unique=True)
    db["intercompany_consolidation_runs"].create_index([("entity_id", 1), ("period_start", 1), ("period_end", 1)])
    db["intercompany_consolidation_runs"].create_index("run_id", unique=True)
    db["intercompany_eliminations_audit"].create_index([("run_id", 1)])


try:
    _ensure_indexes()
except Exception:
    pass


# ─────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────
class EntityCreate(BaseModel):
    entity_id: str = Field(..., description="e.g. 'aurion_holdings_inc'")
    display_name: str
    consolidates: List[str] = Field(..., description="List of property_ids this entity consolidates")
    fiscal_year_end_month: int = Field(default=12, ge=1, le=12)


class EliminationRule(BaseModel):
    entity_id: str
    description: str
    selling_property: str
    buying_property: str
    gl_account_seller: str
    gl_account_buyer: str
    granularity: str = Field(default="trial_balance", description="trial_balance | journal_entry")
    match_field: Optional[str] = Field(
        default=None,
        description="When granularity=journal_entry, the field used to match entries (e.g. 'reference_id')",
    )
    active: bool = True


class ConsolidationRequest(BaseModel):
    entity_id: str
    period_start: str
    period_end: str


# ─────────────────────────────────────────────────────────────────
# Entity CRUD
# ─────────────────────────────────────────────────────────────────
@router.post("/entities")
async def create_entity(entity: EntityCreate):
    """Register a parent entity that consolidates multiple properties."""
    if len(entity.consolidates) < 2:
        raise HTTPException(400, "An entity must consolidate at least 2 properties to need eliminations")
    record = entity.model_dump()
    record["created_at"] = _now()
    record["updated_at"] = _now()
    db["intercompany_entities"].update_one(
        {"entity_id": entity.entity_id}, {"$set": record}, upsert=True,
    )
    record.pop("_id", None)
    return {"entity": record, "next_step": "POST /rules to define elimination rules between member properties"}


@router.get("/entities")
async def list_entities():
    """List all consolidating entities."""
    entities = list(db["intercompany_entities"].find({}, {"_id": 0}))
    return {"count": len(entities), "entities": entities}


@router.get("/entities/{entity_id}")
async def get_entity(entity_id: str):
    entity = db["intercompany_entities"].find_one({"entity_id": entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(404, f"Entity {entity_id} not found")
    rules = list(db["intercompany_rules"].find({"entity_id": entity_id}, {"_id": 0}))
    return {"entity": entity, "rules": rules, "rule_count": len(rules)}


@router.patch("/entities/{entity_id}")
async def update_entity(entity_id: str, patch: Dict):
    patch["updated_at"] = _now()
    result = db["intercompany_entities"].update_one({"entity_id": entity_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(404, f"Entity {entity_id} not found")
    return {"updated": True}


# ─────────────────────────────────────────────────────────────────
# Rule CRUD
# ─────────────────────────────────────────────────────────────────
@router.post("/rules")
async def create_rule(rule: EliminationRule):
    """Add an elimination rule to a consolidating entity. Rule pairs
    a selling property's revenue account with the buying property's
    expense account so they net to zero on consolidation."""
    entity = db["intercompany_entities"].find_one({"entity_id": rule.entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(404, f"Entity {rule.entity_id} not found. POST /entities first.")
    for prop in (rule.selling_property, rule.buying_property):
        if prop not in entity["consolidates"]:
            raise HTTPException(
                400,
                f"Property {prop} is not consolidated under entity {rule.entity_id}. "
                f"Add it to the entity's consolidates list first.",
            )
    if rule.granularity not in ("trial_balance", "journal_entry"):
        raise HTTPException(400, "granularity must be 'trial_balance' or 'journal_entry'")
    record = rule.model_dump()
    record["rule_id"] = _uid()
    record["created_at"] = _now()
    record["updated_at"] = _now()
    db["intercompany_rules"].insert_one(record.copy())
    record.pop("_id", None)
    return {"rule": record}


@router.get("/rules/{entity_id}")
async def list_rules(entity_id: str):
    rules = list(db["intercompany_rules"].find({"entity_id": entity_id}, {"_id": 0}))
    return {"entity_id": entity_id, "count": len(rules), "rules": rules}


@router.patch("/rules/{rule_id}")
async def update_rule(rule_id: str, patch: Dict):
    patch["updated_at"] = _now()
    result = db["intercompany_rules"].update_one({"rule_id": rule_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(404, f"Rule {rule_id} not found")
    return {"updated": True}


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str):
    """Soft-delete by setting active=false (rules persist in the
    audit chain — never hard-deleted)."""
    result = db["intercompany_rules"].update_one(
        {"rule_id": rule_id}, {"$set": {"active": False, "deactivated_at": _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(404, f"Rule {rule_id} not found")
    return {"deactivated": rule_id}


# ─────────────────────────────────────────────────────────────────
# Consolidation
# ─────────────────────────────────────────────────────────────────
@router.post("/consolidate")
async def consolidate(req: ConsolidationRequest):
    """Run consolidation for an entity over a period. Returns:
      · pre_elimination_trial_balance — sum of child TBs as-is
      · eliminations — the netted entries per active rule
      · consolidated_trial_balance — pre-elim minus eliminations
      · audit log id for traceability"""
    entity = db["intercompany_entities"].find_one({"entity_id": req.entity_id}, {"_id": 0})
    if not entity:
        raise HTTPException(404, f"Entity {req.entity_id} not found")
    rules = list(db["intercompany_rules"].find(
        {"entity_id": req.entity_id, "active": True}, {"_id": 0},
    ))

    run_id = _uid()

    # Step 1 — pre-elimination TB: sum child TBs by GL account
    pre_elim: Dict[str, Dict[str, int]] = {}     # {property_id: {gl_account: cents}}
    for property_id in entity["consolidates"]:
        pre_elim[property_id] = _trial_balance(property_id, req.period_start, req.period_end)

    # Step 2 — apply eliminations per rule
    elimination_entries: List[Dict] = []
    for rule in rules:
        if rule["granularity"] == "journal_entry":
            elims = _journal_entry_eliminations(rule, req.period_start, req.period_end)
        else:
            elims = _trial_balance_eliminations(rule, pre_elim)
        elimination_entries.extend(elims)

    # Step 3 — consolidated TB: aggregate pre-elim across properties
    # then subtract eliminated amounts
    consolidated: Dict[str, int] = {}
    for property_id, accounts in pre_elim.items():
        for acct, cents in accounts.items():
            consolidated[acct] = consolidated.get(acct, 0) + cents
    for elim in elimination_entries:
        consolidated[elim["gl_account_seller"]] = consolidated.get(elim["gl_account_seller"], 0) - elim["eliminated_cents"]
        consolidated[elim["gl_account_buyer"]] = consolidated.get(elim["gl_account_buyer"], 0) - elim["eliminated_cents"]

    # Step 4 — persist run + audit log
    run = {
        "run_id": run_id,
        "entity_id": req.entity_id,
        "period_start": req.period_start,
        "period_end": req.period_end,
        "rules_applied": len(rules),
        "elimination_count": len(elimination_entries),
        "total_eliminated_cents": sum(e["eliminated_cents"] for e in elimination_entries),
        "pre_elim_grand_total_cents": sum(sum(accts.values()) for accts in pre_elim.values()),
        "consolidated_grand_total_cents": sum(consolidated.values()),
        "consolidated_at": _now(),
    }
    db["intercompany_consolidation_runs"].insert_one(run.copy())

    for elim in elimination_entries:
        elim["run_id"] = run_id
        elim["entity_id"] = req.entity_id
        db["intercompany_eliminations_audit"].insert_one(elim.copy())

    run.pop("_id", None)
    return {
        "run": run,
        "pre_elimination_trial_balance": pre_elim,
        "consolidated_trial_balance": consolidated,
        "eliminations": elimination_entries,
    }


@router.get("/runs/{entity_id}")
async def list_runs(entity_id: str, limit: int = 50):
    runs = list(
        db["intercompany_consolidation_runs"].find({"entity_id": entity_id}, {"_id": 0})
        .sort("consolidated_at", -1).limit(limit)
    )
    return {"entity_id": entity_id, "count": len(runs), "runs": runs}


@router.get("/audit/{run_id}")
async def audit_for_run(run_id: str):
    """Every eliminated entry for one consolidation run."""
    run = db["intercompany_consolidation_runs"].find_one({"run_id": run_id}, {"_id": 0})
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")
    audits = list(db["intercompany_eliminations_audit"].find({"run_id": run_id}, {"_id": 0}))
    return {"run": run, "eliminations": audits, "count": len(audits)}


# ─────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────
def _trial_balance(property_id: str, period_start: str, period_end: str) -> Dict[str, int]:
    """GL account totals for a property over a period. Reads from
    `aurum_gl_journal`."""
    pipeline = [
        {"$match": {
            "property_id": property_id,
            "post_date": {"$gte": period_start, "$lte": period_end},
        }},
        {"$group": {
            "_id": "$gl_account",
            "total_cents": {"$sum": "$amount_cents"},
        }},
    ]
    result = list(db["aurum_gl_journal"].aggregate(pipeline))
    return {r["_id"]: int(r["total_cents"]) for r in result if r["_id"]}


def _trial_balance_eliminations(rule: Dict, pre_elim: Dict) -> List[Dict]:
    """Trial-balance-level elimination: take MIN(seller_revenue,
    buyer_expense) on the rule's GL pair. Asymmetric balances mean one
    side has un-matched activity which we surface as a remainder."""
    seller_balance = pre_elim.get(rule["selling_property"], {}).get(rule["gl_account_seller"], 0)
    buyer_balance = pre_elim.get(rule["buying_property"], {}).get(rule["gl_account_buyer"], 0)
    eliminated = min(abs(seller_balance), abs(buyer_balance))
    if eliminated == 0:
        return []
    return [{
        "elim_id": _uid(),
        "rule_id": rule["rule_id"],
        "description": rule["description"],
        "selling_property": rule["selling_property"],
        "gl_account_seller": rule["gl_account_seller"],
        "buying_property": rule["buying_property"],
        "gl_account_buyer": rule["gl_account_buyer"],
        "seller_balance_cents": seller_balance,
        "buyer_balance_cents": buyer_balance,
        "eliminated_cents": eliminated,
        "remainder_seller_cents": seller_balance - eliminated if seller_balance >= 0 else seller_balance + eliminated,
        "remainder_buyer_cents": buyer_balance - eliminated if buyer_balance >= 0 else buyer_balance + eliminated,
        "granularity": "trial_balance",
        "method": "min_of_seller_buyer",
    }]


def _journal_entry_eliminations(rule: Dict, period_start: str, period_end: str) -> List[Dict]:
    """JE-level elimination: walk `aurum_gl_journal` for matching
    inter-co JEs by reference, net them per pair. Slower but precise."""
    match_field = rule.get("match_field") or "reference_id"
    seller_jes = list(db["aurum_gl_journal"].find({
        "property_id": rule["selling_property"],
        "gl_account": rule["gl_account_seller"],
        "post_date": {"$gte": period_start, "$lte": period_end},
    }, {"_id": 0}))
    buyer_jes = list(db["aurum_gl_journal"].find({
        "property_id": rule["buying_property"],
        "gl_account": rule["gl_account_buyer"],
        "post_date": {"$gte": period_start, "$lte": period_end},
    }, {"_id": 0}))
    buyer_by_ref = {j.get(match_field): j for j in buyer_jes if j.get(match_field)}

    elims = []
    for s in seller_jes:
        ref = s.get(match_field)
        if not ref:
            continue
        b = buyer_by_ref.get(ref)
        if not b:
            continue
        elims.append({
            "elim_id": _uid(),
            "rule_id": rule["rule_id"],
            "description": rule["description"],
            "selling_property": rule["selling_property"],
            "gl_account_seller": rule["gl_account_seller"],
            "buying_property": rule["buying_property"],
            "gl_account_buyer": rule["gl_account_buyer"],
            "seller_je_id": s.get("je_id"),
            "buyer_je_id": b.get("je_id"),
            "match_field": match_field,
            "match_value": ref,
            "eliminated_cents": min(abs(s.get("amount_cents", 0)), abs(b.get("amount_cents", 0))),
            "granularity": "journal_entry",
            "method": "matched_on_reference",
        })
    return elims
