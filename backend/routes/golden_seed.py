"""
Golden Seed SDK — backend service that serves the manifest + generates a fresh platform scaffold.
Gated behind admin-token. Returns a JSON manifest or a tarball download.
"""
import os
import io
import json
import uuid
import tarfile
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from auth_admin import require_admin

router = APIRouter(prefix="/api/seed", tags=["golden-seed"])

SEED_ROOT = Path(os.environ.get("SEED_SDK_ROOT", "/app/seed-sdk"))


@router.get("/manifest")
async def get_manifest():
    """Public read of the Golden Seed manifest (templates, pillars, etc.). No secrets."""
    manifest_path = SEED_ROOT / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(404, "Golden Seed manifest not found")
    return json.loads(manifest_path.read_text())


@router.get("/templates")
async def list_templates():
    """List available seed templates."""
    manifest = json.loads((SEED_ROOT / "manifest.json").read_text())
    return {"templates": manifest.get("templates", []), "count": len(manifest.get("templates", []))}


class SpawnRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    domain: Optional[str] = None
    templates: List[str] = Field(default_factory=lambda: ["stripe-standalone", "admin-dashboard"])
    brand_color: Optional[str] = "#c8a97e"
    owner_email: Optional[str] = None
    notes: Optional[str] = None


@router.post("/spawn", dependencies=[Depends(require_admin)])
async def spawn_platform(req: SpawnRequest):
    """Create a new custom-platform workspace spec record + return the scaffold manifest.
    Actual tarball generation happens via /api/seed/download/{spawn_id}.
    """
    from database import db as _db

    spawn_id = uuid.uuid4().hex[:12]
    now = datetime.now(timezone.utc).isoformat()
    spec = {
        "id": spawn_id,
        "name": req.name,
        "slug": req.name.lower().replace(" ", "-")[:40],
        "domain": req.domain,
        "templates": req.templates,
        "brand_color": req.brand_color,
        "owner_email": req.owner_email,
        "notes": req.notes,
        "status": "provisioned",
        "created_at": now,
    }
    _db.golden_seed_spawns.insert_one(spec.copy())
    return {"ok": True, "spawn_id": spawn_id, "spec": spec, "download_url": f"/api/seed/download/{spawn_id}"}


@router.get("/spawns", dependencies=[Depends(require_admin)])
async def list_spawns(limit: int = 50):
    from database import db as _db
    rows = list(_db.golden_seed_spawns.find({}, {"_id": 0}).sort("created_at", -1).limit(max(1, min(200, limit))))
    return {"spawns": rows, "total": len(rows)}


@router.get("/download/{spawn_id}", dependencies=[Depends(require_admin)])
async def download_spawn(spawn_id: str):
    """Stream a tarball of the Golden Seed customized for this spawn."""
    from database import db as _db
    spec = _db.golden_seed_spawns.find_one({"id": spawn_id}, {"_id": 0})
    if not spec:
        raise HTTPException(404, "spawn not found")

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        # Include the entire seed-sdk directory (base framework kit)
        if SEED_ROOT.exists():
            tar.add(str(SEED_ROOT), arcname=spec["slug"])
        # Inject spec as SPAWN.json at the root of the archive
        spec_bytes = json.dumps(spec, indent=2).encode("utf-8")
        info = tarfile.TarInfo(name=f"{spec['slug']}/SPAWN.json")
        info.size = len(spec_bytes)
        info.mtime = int(datetime.now(timezone.utc).timestamp())
        tar.addfile(info, io.BytesIO(spec_bytes))

        # iter166: If this spawn was grown from a seed-plant session, include the
        # LLM-generated artifacts under /generated/ inside the archive
        for art in (spec.get("artifacts") or []):
            rel = (art.get("path") or "").lstrip("/")
            if not rel or ".." in rel.split("/"):
                continue
            content = (art.get("content") or "")
            if not isinstance(content, str):
                content = json.dumps(content, indent=2)
            body = content.encode("utf-8")
            ti = tarfile.TarInfo(name=f"{spec['slug']}/generated/{rel}")
            ti.size = len(body)
            ti.mtime = int(datetime.now(timezone.utc).timestamp())
            tar.addfile(ti, io.BytesIO(body))

    buf.seek(0)
    filename = f"{spec['slug']}-goldenseed.tar.gz"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="application/gzip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pillars")
async def describe_pillars():
    """Human-readable breakdown of the seven Golden Seed pillars."""
    return {
        "pillars": [
            {"id": "brain", "label": "EchoAi Brain", "desc": "Multi-LLM orchestration via Emergent Universal Key"},
            {"id": "spine", "label": "EchoBus Spine", "desc": "Client-side pub/sub so AI can operate any panel"},
            {"id": "sidebar", "label": "Sidebar + Panel System", "desc": "Group-based nav, role-filtered, lazy panels"},
            {"id": "stripe-standalone", "label": "Stripe Standalone Pattern", "desc": "Productize any module in <500 lines"},
            {"id": "auth", "label": "Admin Auth Gate", "desc": "Constant-time token gate, fail-closed"},
            {"id": "observability", "label": "Observability Stack", "desc": "Sentry + rate limit + email outbox + scheduler"},
            {"id": "cognition", "label": "Cognition + OPA Guardrails", "desc": "AI plans, policy validates, orchestrator executes"},
        ],
    }
