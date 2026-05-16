"""
EchoAi³ — Voice Command Endpoint
==================================
Accepts audio from browser MediaRecorder, transcribes via OpenAI Whisper,
and returns the text for the Canvas to process.
"""
import os
import tempfile
from fastapi import APIRouter, UploadFile, File
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/echoai3", tags=["echoai3-voice"])


@router.post("/voice/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    """Transcribe audio from browser microphone to text using Whisper."""
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText

        stt = OpenAISpeechToText(api_key=os.environ.get("EMERGENT_LLM_KEY", ""))

        suffix = ".webm"
        if file.filename:
            if file.filename.endswith(".wav"):
                suffix = ".wav"
            elif file.filename.endswith(".mp3"):
                suffix = ".mp3"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language="en",
                prompt="Hospitality operations: kitchen, banquet, event, inventory, labor, EBITDA, revenue, covers, vendor.",
            )

        os.unlink(tmp_path)
        return {"text": response.text, "success": True}

    except Exception as e:
        return {"text": "", "success": False, "error": str(e)}
