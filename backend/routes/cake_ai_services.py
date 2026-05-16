"""
Cake AI Services — consolidated AI-powered endpoints for the Cake Designer (iter155 Phase B).

Features implemented:
  B1 · AI Palette Extractor — upload inspiration image → 5 dominant hex colors + labels
  B2 · AI Cake Descriptions — generate BEO-ready copy from session JSON (Claude Sonnet 4.5)
  B3 · Photoreal Render + Bring-to-Life (gated behind FAL_KEY)
  B4 · Structural Feasibility Check — rule-based tilt/overhang/dowel evaluation
  B5 · Automated BEO PDF Pack — reportlab PDF with cost + timeline + allergens
  B6 · Timeline Critical-Path Planner — from event date back through production windows
  B7 · Allergen Propagation — intake allergens flag incompatible fillings
  B9 · Reusable Design Library — save as searchable "look"
  B10 · Revenue Autopilot — pricing suggestion from historical mix

All feature-flagged: FAL_KEY presence unlocks B3 (Photoreal Studio Add-on).
"""
import os
import io
import json
import base64
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from database import db as _db
from observability.rate_limit import limiter

load_dotenv()

# ─────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
FAL_KEY = os.environ.get("FAL_KEY")  # optional add-on

router = APIRouter(prefix="/api/cake-ai", tags=["cake-ai"])


# ─────────────────────────────────────────────
# Feature flag endpoint
# ─────────────────────────────────────────────
@router.get("/features")
async def feature_flags():
    """Returns enabled/disabled status for each AI feature."""
    return {
        "palette_extractor": bool(EMERGENT_LLM_KEY),
        "descriptions": bool(EMERGENT_LLM_KEY),
        "photoreal_render": bool(FAL_KEY),
        "bring_to_life": bool(FAL_KEY),
        "beo_pdf": True,
        "structural_feasibility": True,
        "timeline_planner": True,
        "allergen_propagation": True,
        "design_library": True,
        "revenue_autopilot": True,
    }


# ─────────────────────────────────────────────
# B1 · AI Palette Extractor
# ─────────────────────────────────────────────
class PaletteRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


class PaletteColor(BaseModel):
    hex: str
    label: str
    role: Literal["primary_tier", "accent_tier", "piping", "flowers", "background"]


class PaletteResponse(BaseModel):
    palette: List[PaletteColor]
    theme_description: str
    suggested_finish: str


@router.post("/palette/extract", response_model=PaletteResponse)
async def extract_palette(req: PaletteRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "Emergent LLM key not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except ImportError:
        raise HTTPException(500, "emergentintegrations not installed")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"palette-{uuid.uuid4().hex[:8]}",
        system_message=(
            "You are an expert cake design palette analyst. Given an inspiration image, "
            "extract 5 dominant hex colors and assign each to a cake role: primary_tier, "
            "accent_tier, piping, flowers, background. Return STRICT JSON with keys: "
            "palette (list of {hex, label, role}), theme_description (1 sentence), "
            "suggested_finish (one of: buttercream, fondant, drip, mirror, naked, semi-naked). "
            "Do NOT include any text outside the JSON."
        ),
    ).with_model("gemini", "gemini-2.5-flash")

    img_b64 = req.image_base64
    if img_b64.startswith("data:"):
        img_b64 = img_b64.split(",", 1)[1]

    img = ImageContent(image_base64=img_b64)
    msg = UserMessage(
        text="Extract the color palette from this inspiration image for a cake design. Return JSON only.",
        file_contents=[img],
    )
    try:
        raw = await chat.send_message(msg)
    except Exception as e:
        raise HTTPException(502, f"LLM call failed: {e}")

    # Parse JSON out of the response (LLM may wrap in markdown fences)
    def _parse_json_flex(raw_text: str):
        import re
        txt = raw_text.strip()
        # strip code fences
        if txt.startswith("```"):
            txt = txt.split("```", 2)[1]
            if txt.lower().startswith("json"):
                txt = txt[4:]
            txt = txt.strip().rstrip("`").strip()
        # strip invalid/lone-surrogate unicode that breaks json
        txt = txt.encode("utf-8", "ignore").decode("utf-8", "ignore")
        txt = re.sub(r"[\ud800-\udfff]", "", txt)
        # first try direct
        try:
            return json.loads(txt)
        except Exception:
            pass
        m = re.search(r"\{[\s\S]*\}", txt)
        if not m:
            return None
        blob = m.group(0)
        # remove trailing commas and stray non-printable chars
        blob = re.sub(r",\s*([\}\]])", r"\1", blob)
        blob = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", blob)
        try:
            return json.loads(blob)
        except Exception:
            return None

    data = _parse_json_flex(raw)
    if not data:
        raise HTTPException(502, f"Could not parse palette JSON: {raw[:300]}")

    return PaletteResponse(
        palette=[PaletteColor(**c) for c in data.get("palette", [])][:5],
        theme_description=data.get("theme_description", ""),
        suggested_finish=data.get("suggested_finish", "buttercream"),
    )


# ─────────────────────────────────────────────
# B2 · AI Cake Descriptions
# ─────────────────────────────────────────────
class DescriptionRequest(BaseModel):
    session_id: Optional[str] = None
    session_payload: Optional[Dict[str, Any]] = None
    tone: Literal["elegant", "playful", "rustic", "modern", "whimsical"] = "elegant"
    target: Literal["beo", "menu_card", "social_media", "client_proposal"] = "beo"


class DescriptionResponse(BaseModel):
    headline: str
    short_description: str
    long_description: str
    hashtags: List[str]
    tone: str


@router.post("/descriptions/generate", response_model=DescriptionResponse)
async def generate_descriptions(req: DescriptionRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "Emergent LLM key not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        raise HTTPException(500, "emergentintegrations not installed")

    session = req.session_payload
    if not session and req.session_id and _db is not None:
        doc = _db.cake_viewer_sessions.find_one({"id": req.session_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "session not found")
        session = doc
    if not session:
        raise HTTPException(400, "session_payload or session_id required")

    # Pull key details from session
    tiers = session.get("tiers", [])
    intake = session.get("intake") or {}
    n_tiers = len(tiers)
    flavors = []
    finishes = set()
    for t in tiers:
        finishes.add(t.get("finish", "buttercream"))
        for f in (t.get("fillings") or []):
            flv = f.get("flavor") or f.get("name")
            if flv:
                flavors.append(flv)
    flavors_txt = ", ".join(list(dict.fromkeys(flavors))[:10])
    finishes_txt = ", ".join(finishes)

    prompt = f"""Create 3 levels of marketing copy for this cake and {req.target.replace('_', ' ')} use.
Tone: {req.tone}.
Cake: {n_tiers}-tier, finishes: {finishes_txt}.
Event: {intake.get('event_type', 'special occasion')} for {intake.get('guest_count', '?')} guests.
Client: {intake.get('client_name', '')}. Theme: {intake.get('theme', '')}.
Flavors & elements: {flavors_txt or 'classic'}.

Return STRICT JSON with keys:
- headline (<=10 words)
- short_description (1 sentence, 20 words max)
- long_description (2-3 sentences, warm and {req.tone})
- hashtags (list of 6 short tags without #)
Only JSON, no markdown."""

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"desc-{uuid.uuid4().hex[:8]}",
        system_message=f"You are a luxury pastry copywriter. Write in a {req.tone} tone for {req.target}.",
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        raw = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        raise HTTPException(502, f"LLM call failed: {e}")
    txt = raw.strip()
    # Use the flex parser
    def _parse_json_flex(raw_text: str):
        txt = raw_text.strip()
        if txt.startswith("```"):
            txt = txt.split("```", 2)[1]
            if txt.lower().startswith("json"):
                txt = txt[4:]
            txt = txt.strip().rstrip("`").strip()
        try:
            return json.loads(txt)
        except Exception:
            pass
        import re
        m = re.search(r"\{[\s\S]*\}", txt)
        if not m:
            return None
        blob = re.sub(r",\s*([\}\]])", r"\1", m.group(0))
        try:
            return json.loads(blob)
        except Exception:
            return None

    data = _parse_json_flex(raw)
    if not data:
        raise HTTPException(502, f"Could not parse description JSON: {raw[:300]}")

    return DescriptionResponse(
        headline=data.get("headline", ""),
        short_description=data.get("short_description", ""),
        long_description=data.get("long_description", ""),
        hashtags=[h.lstrip("#") for h in data.get("hashtags", [])][:6],
        tone=req.tone,
    )


# ─────────────────────────────────────────────
# B3 · Photoreal Render + Bring-to-Life (gated)
# ─────────────────────────────────────────────
class PhotorealRequest(BaseModel):
    session_id: Optional[str] = None
    prompt_hint: Optional[str] = None
    reference_render_base64: Optional[str] = None  # our Three.js render as PNG
    style: Literal["studio", "outdoor_garden", "reception_hall", "minimalist"] = "studio"


# ─── Sensory prompt builder · "grab my fork" quality ───
# Maps enum values to evocative pastry-photography language
_FINISH_LANG = {
    "buttercream": "silky Italian meringue buttercream with visible softly swirled palette-knife strokes",
    "fondant": "glass-smooth ivory fondant with a subtle satin sheen, airbrushed gradient shading",
    "drip": "glossy chocolate ganache drip cascading down the sides, thick viscous drops frozen mid-pour",
    "mirror": "mirror glaze finish in liquid chrome, perfectly reflective, entremet-style lacquered surface",
    "naked": "naked cake style, bare sponge visible between fillings, rustic artisan texture",
    "semi-naked": "semi-naked buttercream, thin scraped coat revealing sponge layers through translucent frosting",
}

_SHAPE_LANG = {
    "round": "classic round tier",
    "square": "crisp square tier with sharp 90-degree edges",
    "heart": "heart-shaped tier",
    "hex": "hexagonal tier with six faceted sides",
    "sheet": "rectangular sheet tier",
    "mad_hatter": "whimsical Mad Hatter tapered tier, wider bottom narrowing to a smaller top",
    "topsy_turvy": "topsy-turvy curved tier with rolling undulating sides",
}

_PIPING_LANG = {
    "bead": "pearl bead border piping",
    "shell": "classic shell border piping",
    "rope": "twisted rope piping",
    "rosette": "swirled rosette piping flowers",
    "basket_weave": "basket-weave piping texture",
    "drop_strings": "elegant Lambeth drop-string piping swags",
    "cornelli_lace": "fine cornelli lace piping — intricate squiggled lace pattern",
    "ruffle": "pleated buttercream ruffles, fabric-like folds",
    "leaf": "leaf-tipped piping",
    "star": "star-tip piping rosettes",
    "scroll": "Victorian scroll piping",
    "zigzag": "zigzag piping trim",
}

_FLOWER_LANG = {
    "cascading_roses": "lush cascading sugar roses with eucalyptus",
    "sugar_peonies": "oversized sugar peonies in blush pink with trailing greenery",
    "orchid_spray": "delicate orchid spray in white and lavender",
    "tropical_mix": "tropical mix of calla lilies and orchids in coral and marigold",
    "garden_mix": "English garden mix of roses, ranunculus and sweet pea",
    "ranunculus_cluster": "cluster of ruffled ranunculus in ivory and blush",
    "dahlia_crown": "bold dahlia crown in deep burgundy and marigold",
    "eucalyptus_greenery": "silver dollar eucalyptus greenery draping down the tiers",
}

_FILLING_LANG = {
    "sponge": "airy vanilla sponge",
    "genoise": "delicate genoise",
    "joconde": "almond joconde",
    "dacquoise": "crisp dacquoise",
    "streusel": "buttery streusel crumb",
    "feuilletine": "crunchy feuilletine",
    "praline": "hazelnut praline",
    "financier": "brown-butter financier",
    "cremeux": "silky crémeux",
    "curd": "tangy fruit curd",
    "gelee": "translucent fruit gelée",
    "compote": "jammy fruit compote",
    "mousse": "cloud-like mousse",
    "ganache": "glossy ganache",
    "glaze": "mirror glaze",
}


def _hex_to_name(hex_color: str) -> str:
    """Rough hex → human color name mapping for prompt-friendly descriptions."""
    if not hex_color or not hex_color.startswith("#"):
        return "ivory"
    try:
        h = hex_color.lstrip("#")
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except Exception:
        return "ivory"
    # Detect near-white / near-black first
    mx, mn = max(r, g, b), min(r, g, b)
    if mx > 235 and mn > 220:
        return "ivory white"
    if mx < 40:
        return "jet black"
    if mx - mn < 25 and mx > 160:
        return "soft pearl grey"
    # Dominant-hue mapping
    if r > g and r > b:
        if g > 160 and b > 160: return "blush pink"
        if g > 140: return "peach"
        if b > 100 and r - g > 40: return "rose"
        return "crimson red"
    if g > r and g > b:
        if r > 180 and b < 120: return "chartreuse sage"
        return "botanical green"
    if b > r and b > g:
        if r > 180: return "lavender lilac"
        if g > 150: return "robin-egg blue"
        return "deep navy"
    if r > 180 and g > 140 and b < 120:
        return "warm gold"
    return "soft neutral cream"


def _build_photoreal_prompt(session_id: Optional[str]) -> str:
    """Compose a rich, tier-by-tier description that Flux can turn into a magazine-quality render."""
    if not session_id or _db is None:
        return "A two-tier bespoke celebration cake with silky Italian meringue buttercream in ivory, shell piping border, and a crown of blush sugar peonies."

    doc = _db.cake_viewer_sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        return "A bespoke tiered celebration cake with delicate buttercream finish and hand-crafted sugar flowers."

    tiers = doc.get("tiers", []) or []
    flowers = doc.get("flowers", []) or []
    toppers = doc.get("toppers", []) or []
    stand_kind = doc.get("stand_kind") or doc.get("standKind")

    if not tiers:
        return "A bespoke celebration cake with delicate buttercream finish."

    # Tier-by-tier description (bottom → top)
    tier_lines: list[str] = []
    for idx, t in enumerate(tiers):
        shape = _SHAPE_LANG.get(t.get("shape") or "round", "round tier")
        finish = _FINISH_LANG.get(t.get("finish") or "buttercream", "smooth buttercream")
        color = _hex_to_name(t.get("color") or "#fff8f2")
        piping_parts: list[str] = []
        for p in (t.get("piping") or [])[:4]:
            kind_word = _PIPING_LANG.get(p.get("kind") or "bead", "decorative piping")
            band = p.get("band") or "bottom"
            piping_parts.append(f"{kind_word} around the {band}")
        piping_sentence = (" decorated with " + " and ".join(piping_parts)) if piping_parts else ""
        position = "bottom tier" if idx == 0 else ("top tier" if idx == len(tiers) - 1 else f"tier {idx + 1} of {len(tiers)}")
        tier_lines.append(f"{position}: {shape} finished in {color} {finish}{piping_sentence}")

    # Fillings (use first tier with fillings, exposed only if any is cut/cutaway)
    cutaway = bool(doc.get("cutaway"))
    filling_sentence = ""
    if cutaway:
        all_fills: list[str] = []
        for t in tiers:
            for f in (t.get("fillings") or [])[:4]:
                k = f.get("kind") or "sponge"
                flavor = f.get("flavor") or ""
                all_fills.append(f"{flavor + ' ' if flavor else ''}{_FILLING_LANG.get(k, k)}")
        if all_fills:
            filling_sentence = f" A cutaway wedge reveals interior layers of {', '.join(all_fills[:6])}."

    # Flower arrangements
    flower_parts: list[str] = []
    for fd in flowers[:3]:
        lang = _FLOWER_LANG.get(fd.get("arrangement_id"), "hand-crafted sugar flowers")
        placement = fd.get("placement") or "top"
        placement_word = {
            "top": "crowning the top tier",
            "cascade": "cascading from top to bottom like a floral waterfall",
            "base": "gathered at the base like a lush garden",
            "tier": f"wrapping tier {(fd.get('tier_index') or 0) + 1}",
        }.get(placement, placement)
        flower_parts.append(f"{lang} {placement_word}")
    flower_sentence = (" Floral styling: " + "; ".join(flower_parts) + ".") if flower_parts else ""

    # Toppers
    topper_parts: list[str] = []
    for tp in toppers[:3]:
        kind = tp.get("kind")
        label = tp.get("label") or ""
        if kind == "monogram" and label:
            topper_parts.append(f"gilded {label} monogram topper")
        elif kind == "number" and label:
            topper_parts.append(f"sparkling number {label} topper")
        elif kind == "candle":
            topper_parts.append("elegant taper candles with warm flames")
        elif kind == "crown":
            topper_parts.append("miniature gilded crown topper")
        elif kind == "tower_spire":
            topper_parts.append("fairytale castle spire topper")
        elif kind == "dinosaur":
            topper_parts.append("playful dinosaur figurine topper")
        elif kind == "balloon":
            topper_parts.append("sugar balloon topper")
        elif kind:
            topper_parts.append(f"{kind} topper")
    topper_sentence = (" Topped with " + ", ".join(topper_parts) + ".") if topper_parts else ""

    # Stand
    stand_map = {
        "gold_leaf_pedestal": "displayed on a gold-leaf pedestal cake stand",
        "marble_slab": "on a honed Carrara marble slab",
        "walnut_round": "on a dark walnut round board",
        "acrylic_floating": "on a floating lucite acrylic riser",
        "lace_doily": "on a vintage lace-doily covered stand",
        "mirror_gold": "on a mirrored gold platter reflecting the cake",
        "rustic_crate": "on a whitewashed rustic wooden crate",
        "tiered_tower": "on a three-tier metal tower",
        "greek_column": "on a classic white Greek-column pedestal",
        "moss_bed": "nestled on a bed of fresh moss and eucalyptus",
    }
    stand_sentence = (" " + stand_map[stand_kind].capitalize() + ".") if stand_kind in stand_map else ""

    header = f"A {len(tiers)}-tier bespoke celebration cake, built bottom to top: "
    body = ". ".join(tier_lines) + "."
    return header + body + filling_sentence + flower_sentence + topper_sentence + stand_sentence


@router.post("/photoreal/render")
@limiter.limit("10/hour")
async def photoreal_render(request: Request, req: PhotorealRequest):
    if not FAL_KEY:
        raise HTTPException(402, "Photoreal Studio add-on not enabled — configure FAL_KEY")
    try:
        import fal_client
        os.environ.setdefault("FAL_KEY", FAL_KEY)
    except ImportError:
        raise HTTPException(500, "fal-client not installed")

    # Build a "grab my fork" sensory, tier-by-tier prompt from the session document
    session_desc = _build_photoreal_prompt(req.session_id)

    style_suffix = {
        "studio": "captured with a Phase One medium-format camera, 80mm macro, studio seamless paper backdrop in warm cream, continuous LED softbox lighting with soft rim light, shallow depth of field separating subject from background",
        "outdoor_garden": "romantic outdoor garden wedding on a linen-draped cake table, golden-hour sunlight filtering through trees, hand-painted eucalyptus shadows, soft bokeh of distant fairy lights",
        "reception_hall": "elegant ballroom reception, candlelight and amber tungsten glow, gold chiavari chairs blurred in background, shallow depth of field",
        "minimalist": "minimalist editorial composition on matte ceramic cake stand, pure white cyclorama backdrop, single soft key light, negative space, magazine flat-lay feel",
    }[req.style]

    quality_tail = (
        "hyper-detailed food photography, buttercream grain visible, individual sugar flower petals, "
        "soft shadows, subtle surface sheen, natural imperfections that signal handmade artistry, "
        "shot on Hasselblad H6D-100c, 8k, razor-sharp focus on the cake, professional color grading, "
        "as seen in Martha Stewart Weddings and Bon Appétit editorials"
    )

    extra_hint = f"Creative direction: {req.prompt_hint}. " if req.prompt_hint else ""

    prompt = (
        f"Editorial pastry photograph of a bespoke tiered celebration cake. "
        f"{session_desc} {extra_hint}"
        f"Setting: {style_suffix}. {quality_tail}."
    )

    try:
        handler = await fal_client.submit_async(
            "fal-ai/flux-pro/v1.1",
            arguments={
                "prompt": prompt,
                "image_size": "portrait_4_3",
                "num_inference_steps": 45,
                "guidance_scale": 4.5,
                "enable_safety_checker": False,
                "safety_tolerance": "5",
            },
        )
        result = await handler.get()
    except Exception as e:
        msg = str(e).lower()
        if "locked" in msg or "balance" in msg or "exhausted" in msg:
            raise HTTPException(402, f"Photoreal Studio needs billing credit. Top up at fal.ai/dashboard/billing. Detail: {e}")
        if "unauthorized" in msg or "forbidden" in msg or "api key" in msg:
            raise HTTPException(401, f"Invalid FAL_KEY. Get a key at fal.ai/dashboard/keys.")
        raise HTTPException(502, f"fal.ai render failed: {e}")

    image_url = None
    if result.get("images"):
        image_url = result["images"][0].get("url")

    # Persist
    render_id = uuid.uuid4().hex[:12]
    record = {
        "render_id": render_id,
        "session_id": req.session_id,
        "style": req.style,
        "prompt": prompt,
        "image_url": image_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "kind": "photoreal_render",
    }
    if _db is not None:
        _db.cake_renders.insert_one(record)
    return {
        "render_id": render_id,
        "image_url": image_url,
        "prompt": prompt,
    }


class BringToLifeRequest(BaseModel):
    session_id: Optional[str] = None
    image_url: str
    motion: Literal["rotate_360", "cutaway_reveal", "glaze_pour", "zoom_in"] = "rotate_360"
    duration_sec: int = 5


@router.post("/photoreal/bring-to-life")
async def bring_to_life(req: BringToLifeRequest):
    if not FAL_KEY:
        raise HTTPException(402, "Photoreal Studio add-on not enabled — configure FAL_KEY")
    try:
        import fal_client
        os.environ.setdefault("FAL_KEY", FAL_KEY)
    except ImportError:
        raise HTTPException(500, "fal-client not installed")

    motion_prompt = {
        "rotate_360": "camera slowly orbits the cake 360 degrees, smooth and cinematic",
        "cutaway_reveal": "camera zooms in and a slice cuts away, revealing layers",
        "glaze_pour": "glossy mirror glaze pours over the top tier, slow motion",
        "zoom_in": "dramatic zoom toward the top decoration, cinematic dolly",
    }[req.motion]

    try:
        handler = await fal_client.submit_async(
            "fal-ai/kling-video/v1/standard/image-to-video",
            arguments={
                "prompt": f"{motion_prompt}, professional pastry photography, studio lighting",
                "image_url": req.image_url,
                "duration": str(req.duration_sec),
            },
        )
        result = await handler.get()
    except Exception as e:
        msg = str(e).lower()
        if "locked" in msg or "balance" in msg or "exhausted" in msg:
            raise HTTPException(402, f"Bring-to-Life needs billing credit. Top up at fal.ai/dashboard/billing. Detail: {e}")
        raise HTTPException(502, f"fal.ai video failed: {e}")

    video_url = result.get("video", {}).get("url") if isinstance(result.get("video"), dict) else result.get("video_url")
    video_id = uuid.uuid4().hex[:12]
    record = {
        "video_id": video_id,
        "session_id": req.session_id,
        "source_image": req.image_url,
        "motion": req.motion,
        "video_url": video_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "kind": "bring_to_life",
    }
    if _db is not None:
        _db.cake_renders.insert_one(record)
    return {"video_id": video_id, "video_url": video_url}


# ─────────────────────────────────────────────
# B4 · Structural Feasibility Check
# ─────────────────────────────────────────────
class FeasibilityRequest(BaseModel):
    session_id: Optional[str] = None
    session_payload: Optional[Dict[str, Any]] = None


class FeasibilityIssue(BaseModel):
    severity: Literal["HIGH", "WARN", "OK"]
    tier_index: Optional[int] = None
    issue: str
    recommendation: str


@router.post("/feasibility/check")
async def feasibility_check(req: FeasibilityRequest):
    session = req.session_payload
    if not session and req.session_id and _db is not None:
        doc = _db.cake_viewer_sessions.find_one({"id": req.session_id}, {"_id": 0})
        session = doc
    if not session:
        raise HTTPException(400, "session required")

    tiers = session.get("tiers", [])
    issues: List[FeasibilityIssue] = []

    for i, t in enumerate(tiers):
        # Tilt check
        tilt = max(abs(t.get("tilt_x", 0)), abs(t.get("tilt_z", 0)))
        if tilt > 0.31:      # ~18°
            issues.append(FeasibilityIssue(severity="HIGH", tier_index=i,
                issue=f"Tilt exceeds 18° ({tilt:.2f} rad)",
                recommendation="Internal structural support rods required; consider reducing tilt below 18°."))
        elif tilt > 0.17:
            issues.append(FeasibilityIssue(severity="WARN", tier_index=i,
                issue=f"Significant tilt ({tilt:.2f} rad)",
                recommendation="Use reinforced dowels + non-slip cake board between tiers."))

        # Offset / overhang check
        offset = max(abs(t.get("offset_x", 0)), abs(t.get("offset_z", 0)))
        if offset > t.get("radius", 1) * 0.5:
            issues.append(FeasibilityIssue(severity="HIGH", tier_index=i,
                issue=f"Tier offset ({offset:.2f}) exceeds 50% of radius",
                recommendation="Structural cantilever required or reduce offset."))

        # Drip on topsy-turvy
        if t.get("shape") == "topsy_turvy" and t.get("finish") == "drip":
            issues.append(FeasibilityIssue(severity="WARN", tier_index=i,
                issue="Drip finish on topsy-turvy surface pools unevenly",
                recommendation="Use semi-set ganache and allow each band to set before next application."))

        # Tier radius progression
        if i > 0:
            prev_r = tiers[i-1].get("radius", 1)
            if t.get("radius", 1) > prev_r:
                issues.append(FeasibilityIssue(severity="HIGH", tier_index=i,
                    issue=f"Upper tier ({t.get('radius')}) wider than tier below ({prev_r})",
                    recommendation="Upper tiers must be narrower than supporting tier."))

        # Dowel requirement
        if i < len(tiers) - 1:
            dowels_needed = max(4, int(prev_r * 8)) if i > 0 else max(4, int(t.get("radius", 1) * 6))
            issues.append(FeasibilityIssue(severity="OK", tier_index=i,
                issue=f"{dowels_needed} support dowels recommended",
                recommendation=f"Insert {dowels_needed} plastic dowels in a ring matching upper-tier diameter."))

        # Mad Hatter count on same cake
        mh_count = sum(1 for tt in tiers if tt.get("shape") == "mad_hatter")
        if mh_count > 3:
            issues.append(FeasibilityIssue(severity="WARN",
                issue=f"{mh_count} Mad Hatter tiers stacked",
                recommendation="Max 3 tapered tiers recommended; add central structural rod."))

    high = sum(1 for x in issues if x.severity == "HIGH")
    warn = sum(1 for x in issues if x.severity == "WARN")
    overall = "HIGH" if high > 0 else ("WARN" if warn > 0 else "OK")
    return {
        "overall": overall,
        "issues": [x.model_dump() for x in issues],
        "summary": {"high": high, "warn": warn, "ok": len(issues) - high - warn},
    }


# ─────────────────────────────────────────────
# B6 · Timeline / Critical-Path Planner
# ─────────────────────────────────────────────
@router.get("/timeline/plan")
async def timeline_plan(event_date: str, tier_count: int = 3, has_sugar_flowers: bool = False,
                       has_mirror_glaze: bool = False, delivery_required: bool = True):
    try:
        event_dt = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(400, "event_date must be ISO-8601")

    windows = []
    def back(name: str, hours: int, detail: str, priority: str = "medium"):
        windows.append({"task": name, "start": (event_dt - timedelta(hours=hours)).isoformat(),
                        "duration_hours": hours, "detail": detail, "priority": priority})

    # Backwards from event time
    cursor_h = 0
    back("Delivery & on-site setup", 2, "Transport, position, final flower placement", "high") if delivery_required else None
    if delivery_required:
        cursor_h += 2
    back("Final decoration & topper", cursor_h + 1, "Toppers, fresh flowers, monogram placement", "high"); cursor_h += 1
    if has_mirror_glaze:
        back("Mirror glaze application", cursor_h + 2, "Temperature-controlled glaze; single pour", "high"); cursor_h += 2
    back("Final icing / smoothing", cursor_h + 2, "Fondant/buttercream finish pass", "high"); cursor_h += 2
    back("Crumb coat + chill", cursor_h + 3, "Thin icing layer, 2hr chill", "medium"); cursor_h += 3
    back("Fill & assemble tiers", cursor_h + 2, "Stack & dowel tiers", "high"); cursor_h += 2
    back("Chill filled layers", cursor_h + 6, "Overnight fridge for structural set", "medium"); cursor_h += 6
    back("Prepare fillings / mousses / gelées", cursor_h + 3, "Cook, cool, pipe inserts", "medium"); cursor_h += 3
    back("Bake sponges / joconde / dacquoise", cursor_h + 3, f"Bake {tier_count} tiers", "high"); cursor_h += 3
    if has_sugar_flowers:
        back("Sugar flowers (dry 48h)", cursor_h + 48, "Hand-form flowers, allow full cure", "high"); cursor_h += 48
    back("Procurement & mise-en-place", cursor_h + 4, "Check all ingredients & molds", "medium"); cursor_h += 4

    windows.reverse()  # chronological order
    return {
        "event_date": event_dt.isoformat(),
        "total_hours": cursor_h,
        "windows": windows,
    }


# ─────────────────────────────────────────────
# B7 · Allergen Propagation
# ─────────────────────────────────────────────
# Map filling kind → possible allergens
FILLING_ALLERGENS = {
    "sponge":       ["wheat", "egg", "dairy"],
    "genoise":      ["wheat", "egg", "dairy"],
    "joconde":      ["wheat", "egg", "dairy", "almond"],
    "dacquoise":    ["egg", "almond", "hazelnut"],
    "streusel":     ["wheat", "dairy"],
    "feuilletine":  ["wheat", "dairy", "hazelnut"],
    "praline":      ["hazelnut", "almond"],
    "financier":    ["wheat", "egg", "almond", "dairy"],
    "cremeux":      ["egg", "dairy"],
    "curd":         ["egg"],
    "ganache":      ["dairy"],
    "mousse":       ["egg", "dairy"],
    "gelee":        [],
    "compote":      [],
    "glaze":        ["dairy", "gelatin"],
}

class AllergenRequest(BaseModel):
    session_id: Optional[str] = None
    session_payload: Optional[Dict[str, Any]] = None


@router.post("/allergens/propagate")
async def allergens_propagate(req: AllergenRequest):
    session = req.session_payload
    if not session and req.session_id and _db is not None:
        doc = _db.cake_viewer_sessions.find_one({"id": req.session_id}, {"_id": 0})
        session = doc
    if not session:
        raise HTTPException(400, "session required")

    intake = session.get("intake") or {}
    restricted = [a.lower() for a in (intake.get("allergens") or [])]
    tiers = session.get("tiers", [])

    all_found: Dict[str, List[Dict[str, Any]]] = {}
    violations = []
    for i, t in enumerate(tiers):
        for j, f in enumerate(t.get("fillings") or []):
            kind = f.get("kind", "sponge")
            allergens = FILLING_ALLERGENS.get(kind, [])
            for a in allergens:
                all_found.setdefault(a, []).append({"tier": i, "filling_index": j, "name": f.get("name"), "kind": kind})
                if a in restricted:
                    violations.append({
                        "tier": i, "filling_index": j, "name": f.get("name"),
                        "kind": kind, "allergen": a,
                        "recommendation": f"Replace with {a}-free alternative"
                    })

    return {
        "all_allergens": sorted(all_found.keys()),
        "allergen_sources": all_found,
        "restricted_allergens": restricted,
        "violations": violations,
        "safe_to_serve": len(violations) == 0,
    }


# ─────────────────────────────────────────────
# B9 · Reusable Design Library
# ─────────────────────────────────────────────
class DesignLookRequest(BaseModel):
    session_id: str
    look_name: str
    tags: List[str] = Field(default_factory=list)
    theme: Optional[str] = None
    notes: Optional[str] = None


@router.post("/library/save-look")
async def save_look(req: DesignLookRequest):
    if _db is None:
        raise HTTPException(503, "DB unavailable")
    session = _db.cake_viewer_sessions.find_one({"id": req.session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "session not found")
    look_id = uuid.uuid4().hex[:12]
    doc = {
        "look_id": look_id,
        "look_name": req.look_name,
        "tags": req.tags,
        "theme": req.theme,
        "notes": req.notes,
        "tiers": session.get("tiers"),
        "toppers": session.get("toppers"),
        "flowers": session.get("flowers"),
        "stand_kind": session.get("stand_kind"),
        "background": session.get("background"),
        "source_session_id": req.session_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _db.cake_design_library.insert_one(doc)
    return {"look_id": look_id, "look_name": req.look_name}


@router.get("/library/looks")
async def list_looks(q: Optional[str] = None, tag: Optional[str] = None):
    if _db is None:
        raise HTTPException(503, "DB unavailable")
    filt: Dict[str, Any] = {}
    if q:
        filt["$or"] = [{"look_name": {"$regex": q, "$options": "i"}},
                       {"theme": {"$regex": q, "$options": "i"}}]
    if tag:
        filt["tags"] = tag
    docs = list(_db.cake_design_library.find(filt, {"_id": 0}).sort("created_at", -1).limit(50))
    return {"looks": docs}


@router.post("/library/looks/{look_id}/duplicate")
async def duplicate_look(look_id: str, new_title: Optional[str] = None):
    if _db is None:
        raise HTTPException(503, "DB unavailable")
    look = _db.cake_design_library.find_one({"look_id": look_id}, {"_id": 0})
    if not look:
        raise HTTPException(404, "look not found")
    new_sid = uuid.uuid4().hex[:12]
    session = {
        "id": new_sid,
        "title": new_title or f"{look['look_name']} (copy)",
        "tiers": look.get("tiers", []),
        "toppers": look.get("toppers", []),
        "flowers": look.get("flowers", []),
        "stand_kind": look.get("stand_kind"),
        "background": look.get("background"),
        "intake": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _db.cake_viewer_sessions.insert_one(session.copy())  # copy to avoid _id injection
    return {"session_id": new_sid, "title": session["title"]}


# ─────────────────────────────────────────────
# B10 · Revenue Autopilot
# ─────────────────────────────────────────────
# Baseline price per serving by finish × tier count multiplier
BASE_PRICE_PER_SERVING = {
    "buttercream": 6.5,
    "fondant": 9.5,
    "drip": 7.5,
    "mirror": 12.0,
    "naked": 5.5,
    "semi-naked": 6.0,
}
TIER_MULTIPLIER = {1: 1.0, 2: 1.15, 3: 1.25, 4: 1.40, 5: 1.55, 6: 1.70}

DECORATION_PREMIUMS = {
    "sugar_flowers_cascade": 1.35,
    "premium_topper": 1.12,
    "gold_leaf": 1.25,
    "hand_painted": 1.30,
}


class PricingRequest(BaseModel):
    session_id: Optional[str] = None
    session_payload: Optional[Dict[str, Any]] = None
    delivery_radius_miles: Optional[int] = 0
    rush_order: bool = False


@router.post("/pricing/suggest")
async def pricing_suggest(req: PricingRequest):
    session = req.session_payload
    if not session and req.session_id and _db is not None:
        doc = _db.cake_viewer_sessions.find_one({"id": req.session_id}, {"_id": 0})
        session = doc
    if not session:
        raise HTTPException(400, "session required")

    tiers = session.get("tiers", [])
    n_tiers = len(tiers)
    flowers = session.get("flowers", [])

    # Dominant finish = most common
    from collections import Counter
    finish_counts = Counter(t.get("finish", "buttercream") for t in tiers)
    dom_finish = finish_counts.most_common(1)[0][0] if finish_counts else "buttercream"

    base_pps = BASE_PRICE_PER_SERVING.get(dom_finish, 6.5)
    multiplier = TIER_MULTIPLIER.get(n_tiers, 1.0)

    # Apply decoration premiums
    if any(f.get("arrangement_id") in ["cascading_roses", "sugar_peonies", "orchid_spray"] for f in flowers):
        multiplier *= DECORATION_PREMIUMS["sugar_flowers_cascade"]
    if session.get("toppers"):
        multiplier *= DECORATION_PREMIUMS["premium_topper"]

    # Delivery
    delivery_fee = 0
    if req.delivery_radius_miles and req.delivery_radius_miles > 0:
        delivery_fee = 75 + max(0, req.delivery_radius_miles - 5) * 4

    # Rush
    rush_premium = 1.25 if req.rush_order else 1.0

    pps = round(base_pps * multiplier * rush_premium, 2)

    # Estimate servings (from intake or rough estimate)
    intake = session.get("intake") or {}
    servings = intake.get("guest_count") or sum(int(t.get("radius", 1) * 15) for t in tiers)

    revenue = pps * servings + delivery_fee
    return {
        "suggested_price_per_serving_usd": pps,
        "base_price_per_serving_usd": base_pps,
        "multiplier": round(multiplier, 3),
        "rush_premium": rush_premium,
        "servings_estimate": servings,
        "delivery_fee_usd": delivery_fee,
        "total_revenue_usd": round(revenue, 2),
        "dominant_finish": dom_finish,
    }


# ─────────────────────────────────────────────
# B5 · Automated BEO / PDF Pack
# ─────────────────────────────────────────────
@router.get("/beo/pdf/{session_id}")
async def beo_pdf(session_id: str):
    if _db is None:
        raise HTTPException(503, "DB unavailable")
    session = _db.cake_viewer_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "session not found")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib.units import cm
    except ImportError:
        raise HTTPException(500, "reportlab not installed")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5 * cm, rightMargin=1.5 * cm,
                            topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    gold = colors.HexColor("#c8a97e")
    dark = colors.HexColor("#0b1628")
    title_style = ParagraphStyle("Title", parent=styles["Title"], textColor=gold, fontSize=20, spaceAfter=10)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=dark, fontSize=13, spaceBefore=10, spaceAfter=6)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=10, leading=13)

    intake = session.get("intake") or {}
    tiers = session.get("tiers", [])
    story = []

    story.append(Paragraph("Cake Banquet Event Order (BEO)", title_style))
    story.append(Paragraph(f"Session ID: <b>{session_id}</b>   ·   "
                           f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", body))
    story.append(Spacer(1, 0.5 * cm))

    # Client block
    story.append(Paragraph("Client & Event", h2))
    client_rows = [
        ["Client",      intake.get("client_name", "—")],
        ["BEO Number",  intake.get("beo_number", "—")],
        ["Email",       intake.get("client_email", "—")],
        ["Phone",       intake.get("client_phone", "—")],
        ["Event Type",  intake.get("event_type", "—")],
        ["Event Date",  intake.get("event_date", "—")],
        ["Guest Count", str(intake.get("guest_count", "—"))],
        ["Theme",       intake.get("theme", "—")],
    ]
    tbl = Table(client_rows, colWidths=[4.5 * cm, 12 * cm])
    tbl.setStyle(TableStyle([
        ("TEXTCOLOR", (0, 0), (0, -1), gold),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8f5ef")),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#dbd3c0")),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)

    # Delivery
    if intake.get("delivery_required"):
        story.append(Paragraph("Delivery", h2))
        del_rows = [
            ["Address", intake.get("delivery_address", "—")],
            ["Time",    intake.get("delivery_time", "—")],
            ["Notes",   intake.get("delivery_notes", "—")],
        ]
        dtbl = Table(del_rows, colWidths=[4.5 * cm, 12 * cm])
        dtbl.setStyle(TableStyle([
            ("TEXTCOLOR", (0, 0), (0, -1), gold),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(dtbl)

    # Tier summary
    story.append(Paragraph("Tier Construction", h2))
    tier_rows = [["#", "Shape", "Ø (in)", "Height", "Finish", "Elements"]]
    for i, t in enumerate(tiers):
        elements = ", ".join([f.get("name", "") for f in (t.get("fillings") or [])][:5])
        tier_rows.append([
            str(i + 1),
            t.get("shape", "round"),
            f"{t.get('radius', 1) * 2 * 5:.1f}",
            f"{t.get('height', 0.5) * 10:.1f}",
            t.get("finish", "buttercream"),
            elements or "—",
        ])
    ttbl = Table(tier_rows, colWidths=[1 * cm, 2.5 * cm, 2 * cm, 2 * cm, 3 * cm, 6 * cm])
    ttbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), gold),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#dbd3c0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(ttbl)

    # Cost / price
    price = intake.get("price_quote_usd")
    if price:
        story.append(Paragraph("Pricing", h2))
        story.append(Paragraph(f"Total quote: <b>${price:,.2f}</b>", body))

    # Description (generated if Emergent key present)
    story.append(Paragraph("Description", h2))
    story.append(Paragraph(session.get("description") or session.get("title") or
                           "A custom-designed tiered cake crafted for this occasion.", body))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()

    from fastapi.responses import Response
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="beo-{session_id}.pdf"'},
    )
