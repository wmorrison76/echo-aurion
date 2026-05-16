"""iter210 · Mongo response sanitiser (audit recommendation BE-3).

`_id` is a BSON ObjectId which is not JSON-serialisable. 1,500+ places in the
codebase have been manually stripping it; this helper centralises the pattern.

Usage
─────
    from lib.mongo import strip_id, strip_ids

    doc = db.contacts.find_one({"id": cid})      # may contain _id
    return strip_id(doc)                         # safe JSON

    rows = list(db.events.find({}))
    return {"events": strip_ids(rows)}
"""
from __future__ import annotations
from typing import Any, Dict, Iterable, List, Optional

__all__ = ["strip_id", "strip_ids"]


def strip_id(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Pop `_id` in place and return the dict. Safe for None."""
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


def strip_ids(rows: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Strip `_id` from every row. Returns a new list."""
    out: List[Dict[str, Any]] = []
    for r in rows or []:
        if r is None:
            continue
        r.pop("_id", None)
        out.append(r)
    return out
