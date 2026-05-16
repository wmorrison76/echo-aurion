"""
AI Image Generation for Cake & Canvas
======================================
GPT Image 1 integration for generating:
- Cake decoration images (flowers, toppers, patterns)
- Full cake concept renders from text prompts
- Canvas layer images from descriptions
Returns base64 images that can be used as layers or references.
"""
import os
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import db
from datetime import datetime, timezone
from uuid import uuid4

router = APIRouter(prefix="/api/ai-image", tags=["ai-image"])

_uid = lambda: str(uuid4())[:8]
_now = lambda: datetime.now(timezone.utc).isoformat()


class ImageGenRequest(BaseModel):
    prompt: str
    style: Optional[str] = "photorealistic"  # photorealistic, artistic, watercolor, sketch
    size: Optional[str] = "1024x1024"
    context: Optional[str] = "cake"  # cake, decoration, canvas, concept
    provider: Optional[str] = "auto"  # auto, gpt_image, fal_flux


STYLE_ENHANCERS = {
    "photorealistic": "ultra photorealistic, professional food photography, studio lighting, 8k, sharp focus",
    "artistic": "artistic illustration, elegant, hand-painted style, fine detail",
    "watercolor": "watercolor painting, soft edges, pastel colors, artistic",
    "sketch": "pencil sketch, detailed line drawing, architectural precision",
}


@router.get("/providers")
async def list_providers():
    """Enumerate available image-gen providers for the EchoCanvas provider picker."""
    fal_key = os.environ.get("FAL_KEY", "")
    emergent_key = os.environ.get("EMERGENT_LLM_KEY", "")
    return {
        "providers": [
            {
                "id": "gpt_image",
                "label": "GPT Image 1 (Emergent)",
                "enabled": bool(emergent_key),
                "quality": "high",
                "speed_sec": 20,
                "strength": "illustrative, conceptual, text-aware",
            },
            {
                "id": "fal_flux",
                "label": "fal.ai Flux Dev · Photoreal",
                "enabled": bool(fal_key),
                "quality": "photoreal",
                "speed_sec": 12,
                "strength": "magazine-quality photography, photoreal pastry renders",
                "unlock_hint": None if fal_key else "Add FAL_KEY to backend/.env and top up at fal.ai/dashboard/billing",
            },
        ],
        "default": "fal_flux" if fal_key else "gpt_image",
    }


@router.post("/generate")
async def generate_image(req: ImageGenRequest):
    """Generate an image using GPT Image 1."""
    from dotenv import load_dotenv
    load_dotenv()

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise HTTPException(500, "Image generation key not configured")

    # Enhance prompt with style
    style_suffix = STYLE_ENHANCERS.get(req.style, STYLE_ENHANCERS["photorealistic"])
    if req.context == "cake":
        enhanced = f"Professional cake design: {req.prompt}. {style_suffix}, bakery setting, clean background"
    elif req.context == "decoration":
        enhanced = f"Cake decoration element: {req.prompt}. {style_suffix}, transparent background, isolated element"
    elif req.context == "concept":
        enhanced = f"Luxury custom cake concept: {req.prompt}. {style_suffix}, dark studio background, professional cake photography"
    else:
        enhanced = f"{req.prompt}. {style_suffix}"

    # Provider routing: auto picks fal_flux if FAL_KEY is set (photoreal quality), else gpt_image
    fal_key = os.environ.get("FAL_KEY", "")
    chosen = req.provider
    if chosen == "auto":
        chosen = "fal_flux" if fal_key else "gpt_image"

    if chosen == "fal_flux":
        if not fal_key:
            raise HTTPException(402, "fal.ai provider requires FAL_KEY. Top up at fal.ai/dashboard/billing.")
        try:
            import fal_client
            os.environ.setdefault("FAL_KEY", fal_key)
            handler = await fal_client.submit_async(
                "fal-ai/flux/dev",
                arguments={
                    "prompt": enhanced,
                    "image_size": "landscape_4_3",
                    "num_inference_steps": 35,
                    "guidance_scale": 4.0,
                },
            )
            result = await handler.get()
            img_url = result["images"][0]["url"] if result.get("images") else None
            if not img_url:
                raise HTTPException(502, "fal.ai returned no image")

            # Fetch bytes for base64 (EchoCanvas layers expect base64)
            import httpx
            async with httpx.AsyncClient(timeout=30) as hc:
                r = await hc.get(img_url)
                image_bytes = r.content

            image_base64 = base64.b64encode(image_bytes).decode("utf-8")
            record = {
                "id": f"img-{_uid()}",
                "prompt": req.prompt,
                "enhanced_prompt": enhanced,
                "style": req.style,
                "context": req.context,
                "size": req.size,
                "provider": "fal_flux",
                "remote_url": img_url,
                "created_at": _now(),
            }
            db["ai_generated_images"].insert_one({**record, "image_b64_preview": image_base64[:100]})
            record.pop("_id", None)
            return {
                "image_base64": image_base64,
                "image_url": img_url,
                "content_type": "image/png",
                "provider": "fal_flux",
                "metadata": record,
            }
        except HTTPException:
            raise
        except Exception as e:
            msg = str(e).lower()
            if "balance" in msg or "locked" in msg or "exhausted" in msg:
                raise HTTPException(402, "fal.ai balance exhausted — top up at fal.ai/dashboard/billing")
            raise HTTPException(502, f"fal.ai generation failed: {str(e)[:200]}")

    # Default: GPT Image 1 via Emergent Key
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        image_gen = OpenAIImageGeneration(api_key=api_key)
        images = await image_gen.generate_images(
            prompt=enhanced,
            model="gpt-image-1",
            number_of_images=1,
        )

        if not images or len(images) == 0:
            raise HTTPException(500, "No image generated")

        image_base64 = base64.b64encode(images[0]).decode("utf-8")

        # Store generation record
        record = {
            "id": f"img-{_uid()}",
            "prompt": req.prompt,
            "enhanced_prompt": enhanced,
            "style": req.style,
            "context": req.context,
            "size": req.size,
            "provider": "gpt_image",
            "created_at": _now(),
        }
        db["ai_generated_images"].insert_one({**record, "image_b64_preview": image_base64[:100]})
        record.pop("_id", None)

        return {
            "image_base64": image_base64,
            "content_type": "image/png",
            "provider": "gpt_image",
            "metadata": record,
        }

    except ImportError:
        raise HTTPException(500, "Image generation library not available")
    except Exception as e:
        raise HTTPException(500, f"Image generation failed: {str(e)[:200]}")


@router.get("/history")
async def get_generation_history(limit: int = 20):
    """Get history of generated images."""
    records = list(db["ai_generated_images"].find({}, {"_id": 0}).sort("created_at", -1).limit(limit))
    return {"images": records, "total": len(records)}


@router.post("/cake-concept")
async def generate_cake_concept(body: dict = {}):
    """Generate a full cake concept from description — used in Cake Designer Gallery."""
    description = body.get("description", "")
    tiers = body.get("tiers", 3)
    style = body.get("style", "elegant")
    occasion = body.get("occasion", "wedding")
    provider = body.get("provider", "auto")

    prompt = f"{tiers}-tier {style} {occasion} cake, {description}"

    req = ImageGenRequest(prompt=prompt, style="photorealistic", context="concept", provider=provider)
    return await generate_image(req)
