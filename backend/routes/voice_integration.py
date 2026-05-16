"""
ElevenLabs Voice Integration for EchoAi³
==========================================
- Text-to-Speech: AI responses read aloud (morning briefing, alerts)
- Speech-to-Text: Voice commands for hands-free kitchen/engineering use
- Voice work order creation
"""
import os
import io
import base64
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from database import db

router = APIRouter(prefix="/api/voice", tags=["voice"])
_now = lambda: datetime.now(timezone.utc).isoformat()
_uid = lambda: str(uuid4())[:12]

ELEVENLABS_KEY = os.environ.get("ELEVENLABS_API_KEY", "")


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel - default
    model_id: str = "eleven_multilingual_v2"
    stability: float = 0.5
    similarity_boost: float = 0.75


# ── Text-to-Speech ──

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech audio using ElevenLabs."""
    if not ELEVENLABS_KEY:
        return {"error": "ElevenLabs API key not configured"}

    try:
        from elevenlabs import ElevenLabs
        from elevenlabs import VoiceSettings

        client = ElevenLabs(api_key=ELEVENLABS_KEY)

        audio_generator = client.text_to_speech.convert(
            text=req.text,
            voice_id=req.voice_id,
            model_id=req.model_id,
            voice_settings=VoiceSettings(
                stability=req.stability,
                similarity_boost=req.similarity_boost,
            ),
        )

        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk

        audio_b64 = base64.b64encode(audio_data).decode()

        db["voice_generations"].insert_one({
            "id": _uid(), "type": "tts", "text_length": len(req.text),
            "voice_id": req.voice_id, "audio_size": len(audio_data), "created_at": _now(),
        })

        return {
            "audio_url": f"data:audio/mpeg;base64,{audio_b64}",
            "text": req.text[:100],
            "voice_id": req.voice_id,
            "audio_size_bytes": len(audio_data),
        }

    except Exception as e:
        error_msg = str(e)
        if "unusual_activity" in error_msg or "401" in error_msg:
            return {"error": "ElevenLabs requires a paid plan for this environment. TTS is ready — upgrade key to activate.", "status": "key_upgrade_needed"}
        return {"error": f"TTS generation failed: {error_msg[:200]}"}


# ── Speech-to-Text ──

@router.post("/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    """Transcribe audio to text using ElevenLabs Scribe."""
    if not ELEVENLABS_KEY:
        return {"error": "ElevenLabs API key not configured"}

    try:
        from elevenlabs import ElevenLabs

        client = ElevenLabs(api_key=ELEVENLABS_KEY)
        audio_content = await audio_file.read()

        transcription = client.speech_to_text.convert(
            file=io.BytesIO(audio_content),
            model_id="scribe_v1",
        )

        text = transcription.text if hasattr(transcription, "text") else str(transcription)

        db["voice_generations"].insert_one({
            "id": _uid(),
            "type": "stt",
            "filename": audio_file.filename,
            "audio_size": len(audio_content),
            "transcribed_text": text[:500],
            "created_at": _now(),
        })

        return {
            "transcribed_text": text,
            "filename": audio_file.filename,
            "audio_size_bytes": len(audio_content),
        }

    except Exception as e:
        return {"error": f"STT transcription failed: {str(e)}"}


# ── Available Voices ──

@router.get("/voices")
async def list_voices():
    """List available ElevenLabs voices."""
    if not ELEVENLABS_KEY:
        return {"error": "ElevenLabs API key not configured", "voices": []}

    try:
        from elevenlabs import ElevenLabs

        client = ElevenLabs(api_key=ELEVENLABS_KEY)
        voices_response = client.voices.get_all()

        voices = []
        for v in voices_response.voices[:20]:
            voices.append({
                "voice_id": v.voice_id,
                "name": v.name,
                "category": v.category if hasattr(v, "category") else "premade",
                "labels": v.labels if hasattr(v, "labels") else {},
            })

        return {"voices": voices, "total": len(voices)}

    except Exception as e:
        return {"error": f"Failed to fetch voices: {str(e)}", "voices": []}


# ── Voice Command Processor ──

@router.post("/command")
async def process_voice_command(audio_file: UploadFile = File(...)):
    """Process a voice command — transcribe and route to EchoAi³."""
    if not ELEVENLABS_KEY:
        return {"error": "ElevenLabs API key not configured"}

    try:
        from elevenlabs import ElevenLabs

        client = ElevenLabs(api_key=ELEVENLABS_KEY)
        audio_content = await audio_file.read()

        # 1. Transcribe
        transcription = client.speech_to_text.convert(
            file=io.BytesIO(audio_content),
            model_id="scribe_v1",
        )
        text = transcription.text if hasattr(transcription, "text") else str(transcription)

        # 2. Check for work order creation intent
        wo_keywords = ["work order", "maintenance", "broken", "repair", "fix", "not working", "alarm"]
        is_wo = any(kw in text.lower() for kw in wo_keywords)

        result = {
            "transcribed_text": text,
            "intent": "work_order" if is_wo else "query",
            "processed": True,
        }

        if is_wo:
            # Auto-create work order from voice
            wo_doc = {
                "wo_id": f"WO-{_uid()}",
                "title": text[:80],
                "description": text,
                "wo_type": "emergency" if any(w in text.lower() for w in ["alarm", "emergency", "urgent"]) else "corrective",
                "priority": "critical" if any(w in text.lower() for w in ["alarm", "emergency", "critical"]) else "high",
                "location": "",
                "assigned_to": "eng-team",
                "requested_by": "voice_command",
                "estimated_hours": 1.0,
                "actual_hours": None,
                "status": "open",
                "parts_used": [],
                "notes": [{"text": f"Created via voice command: {text}", "timestamp": _now()}],
                "created_at": _now(),
                "updated_at": _now(),
                "completed_at": None,
            }
            db["work_orders"].insert_one(wo_doc)
            wo_doc.pop("_id", None)
            result["work_order"] = wo_doc

        return result

    except Exception as e:
        return {"error": f"Voice command failed: {str(e)}"}
