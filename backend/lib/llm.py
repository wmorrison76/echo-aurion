"""Unified LLM helper (iter208 refactor · audit recommendation BE-2).

Before this helper: 5+ routes (echo_whats_new, echo_viewer, echo_ai3,
concierge_hub, …) each re-implemented the same pattern:

  - read EMERGENT_LLM_KEY
  - import emergentintegrations.llm.chat lazily
  - wrap in try/except for missing key + missing SDK + LLM runtime errors
  - build a session_id + LlmChat + UserMessage
  - call .with_model("anthropic", "claude-sonnet-4-5-20250929")

Now: `await ask_echo(system, user)` returns `{text, mode, error?}` where
`mode ∈ {llm | no_key | no_sdk | llm_error}`. Callers can feed a
deterministic fallback when mode != "llm".

iter211 · Added `ask_echo_vision(system, user, image_base64)` for image
analysis via Claude Sonnet 4.5 (vision-enabled).

All arguments are strings. Session id is generated per-call unless supplied.
Model defaults to Claude Sonnet 4.5 via the Emergent LLM Key.
"""
from __future__ import annotations
import os
import uuid
from typing import Optional, Dict, Any, List

__all__ = ["ask_echo", "ask_echo_vision", "transcribe_audio"]

_DEFAULT_PROVIDER = "anthropic"
_DEFAULT_MODEL = "claude-sonnet-4-5-20250929"


async def ask_echo(
    system: str,
    user: str,
    *,
    session_id: Optional[str] = None,
    provider: str = _DEFAULT_PROVIDER,
    model: str = _DEFAULT_MODEL,
    session_prefix: str = "echo",
) -> Dict[str, Any]:
    """Single entry-point for every Emergent-LLM-Key text call across the backend.

    Returns:
        {"text": str, "mode": "llm" | "no_key" | "no_sdk" | "llm_error", "error"?: str}
    """
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return {"text": "", "mode": "no_key"}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        return {"text": "", "mode": "no_sdk", "error": str(e)[:200]}

    sid = session_id or f"{session_prefix}-{uuid.uuid4().hex[:8]}"
    try:
        chat = LlmChat(api_key=key, session_id=sid, system_message=system).with_model(provider, model)
        raw = await chat.send_message(UserMessage(text=user))
        return {"text": (raw or "").strip(), "mode": "llm"}
    except Exception as e:
        return {"text": "", "mode": "llm_error", "error": str(e)[:200]}


async def ask_echo_vision(
    system: str,
    user: str,
    images_base64: List[str],
    *,
    session_id: Optional[str] = None,
    provider: str = _DEFAULT_PROVIDER,
    model: str = _DEFAULT_MODEL,
    session_prefix: str = "echo-vision",
) -> Dict[str, Any]:
    """Vision entry-point — send an image (or list of images) + a prompt to
    a vision-enabled model via the Emergent LLM Key.

    `images_base64` accepts either raw base64 strings or full data-URLs
    (`data:image/png;base64,...`) — the `data:` prefix is stripped for us.

    Returns same shape as `ask_echo`.
    """
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return {"text": "", "mode": "no_key"}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except Exception as e:
        return {"text": "", "mode": "no_sdk", "error": str(e)[:200]}

    # Strip any data: URL prefix. Callers can pass either form.
    cleaned: List[str] = []
    for b64 in images_base64 or []:
        if isinstance(b64, str) and b64.startswith("data:") and "," in b64:
            b64 = b64.split(",", 1)[1]
        if b64:
            cleaned.append(b64)
    if not cleaned:
        return {"text": "", "mode": "llm_error", "error": "no images provided"}

    sid = session_id or f"{session_prefix}-{uuid.uuid4().hex[:8]}"
    try:
        chat = LlmChat(api_key=key, session_id=sid, system_message=system).with_model(provider, model)
        image_contents = [ImageContent(image_base64=b) for b in cleaned]
        raw = await chat.send_message(UserMessage(text=user, file_contents=image_contents))
        return {"text": (raw or "").strip(), "mode": "llm"}
    except Exception as e:
        return {"text": "", "mode": "llm_error", "error": str(e)[:200]}


async def transcribe_audio(
    audio_bytes: bytes,
    *,
    filename: str = "audio.webm",
    language: Optional[str] = None,
    prompt: Optional[str] = None,
) -> Dict[str, Any]:
    """iter212 · Whisper STT via Emergent LLM Key (OpenAI Whisper-1).

    Writes the bytes to a temp file (SDK accepts file-path) and returns
    `{text, mode}` where `mode ∈ llm | no_key | no_sdk | llm_error}`.

    Args:
        audio_bytes: raw audio bytes (webm/mp3/m4a/wav — Whisper handles all)
        filename: used only as a suffix hint for the temp file
        language: optional ISO-639-1 code ('en', 'es', ...) — improves accuracy
        prompt: optional context hint (e.g. recipe names) to bias the transcript
    """
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return {"text": "", "mode": "no_key"}

    try:
        from emergentintegrations.stt.openai_whisper import OpenAIWhisper
    except Exception as e:
        return {"text": "", "mode": "no_sdk", "error": str(e)[:200]}

    import tempfile
    suffix = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".webm"
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tf:
            tf.write(audio_bytes)
            temp_path = tf.name

        client = OpenAIWhisper(api_key=key)
        result = await client.transcribe(
            audio_file_path=temp_path,
            language=language,
            prompt=prompt,
            response_format="json",
            temperature=0.0,
        )
        text = (result.get("text") if isinstance(result, dict) else str(result)) or ""
        return {"text": text.strip(), "mode": "llm"}
    except Exception as e:
        return {"text": "", "mode": "llm_error", "error": str(e)[:200]}
    finally:
        try:
            import os as _os
            _os.unlink(temp_path)  # noqa: F821
        except Exception:
            pass
