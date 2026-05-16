"""
Admin-only verification endpoint for EchoCoder access gate.
Reuses the existing require_admin dependency — returns 200 if token is valid.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from auth_admin import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin-gate"])


class EchoCoderAuthRequest(BaseModel):
    username: Optional[str] = None


@router.post("/echocoder/verify", dependencies=[Depends(require_admin)])
async def echocoder_verify(_body: EchoCoderAuthRequest):
    """Returns 200 if X-Admin-Token is valid, 401 otherwise (via require_admin dep)."""
    return {"ok": True, "grant": "echocoder"}
