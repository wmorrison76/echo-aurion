"""
Voice transcription (iter266 · D2 → FastAPI port).

Replaces `server/routes/voice-transcribe.ts` (Express + multer + OpenAI SDK).
Endpoint shape preserved so `useVoiceCapture.ts` keeps working unchanged.

The frontend POSTs `multipart/form-data` with field name `audio`. We pass
the blob to OpenAI Whisper via emergentintegrations (universal LLM key).

Falls back with a 503 + `provisioned: false` JSON when the key is unset,
so the UI can show "type it manually" fallback exactly like before.

Distinct from `/api/voice-commands/process` which also runs NLP routing.
The inventory voice-capture flow only needs the transcript — the
inventory-specific parser runs client-side against the outlet's items.
"""
import os
import tempfile
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/voice", tags=["voice"])

# Lazy-import emergentintegrations so the route works even if the package
# isn't installed yet (returns 503 with a clear message).
def _get_whisper_client():
    try:
        from emergentintegrations.llm.openai_whisper import OpenAIWhisperClient  # type: ignore
        key = os.environ.get("EMERGENT_LLM_KEY") or os.environ.get("OPENAI_API_KEY")
        if not key:
            return None, "EMERGENT_LLM_KEY/OPENAI_API_KEY not set"
        return OpenAIWhisperClient(api_key=key), None
    except Exception as e:
        return None, f"emergentintegrations not available: {e}"


class TranscribeResponse(BaseModel):
    success: bool
    provisioned: bool
    transcript: str = ""
    duration_seconds: Optional[float] = None
    error: Optional[str] = None
    detail: Optional[str] = None
    request_id: Optional[str] = None
    model: str = "whisper-1"


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...)) -> TranscribeResponse:
    """Accept an audio blob, return the transcript. 503 if not provisioned."""
    if not audio:
        raise HTTPException(400, "audio file required (multipart/form-data, field name 'audio')")

    client, init_err = _get_whisper_client()
    if client is None:
        return TranscribeResponse(
            success=False,
            provisioned=False,
            error="Transcription service not provisioned",
            detail=init_err or "OPENAI/EMERGENT key missing. UI should fall back to manual entry.",
        )

    # Spool the upload to a temp file Whisper SDK accepts.
    suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name

        result = client.transcribe(file_path=tmp_path, model="whisper-1", language="en")
        text = (result or {}).get("text", "") if isinstance(result, dict) else str(result or "")
        duration = (result or {}).get("duration") if isinstance(result, dict) else None

        return TranscribeResponse(
            success=True,
            provisioned=True,
            transcript=text,
            duration_seconds=duration,
            model="whisper-1",
            request_id=datetime.now(timezone.utc).strftime("vt-%Y%m%d-%H%M%S-%f"),
        )
    except Exception as e:
        return TranscribeResponse(
            success=False,
            provisioned=True,
            error="transcription_failed",
            detail=str(e),
        )
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@router.get("/health")
async def health():
    client, init_err = _get_whisper_client()
    return {"provisioned": client is not None, "detail": init_err}
