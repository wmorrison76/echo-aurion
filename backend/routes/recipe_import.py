"""
Recipe Import from URL
======================
Scrapes a recipe page and extracts structured data using JSON-LD schema.org
markup, Open Graph meta, or basic HTML parsing as fallback.
"""
import ipaddress
import json
import re
import socket
from urllib.parse import urlparse
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bs4 import BeautifulSoup

router = APIRouter(prefix="/api/recipe", tags=["recipe"])


# ─── SSRF Guard (iter174 — addresses Semgrep ssrf-requests findings) ───────
def _ssrf_guard(url: str) -> str:
    """Rejects URLs that resolve to private/internal addresses (SSRF protection).
    Returns the cleaned URL on success, raises HTTPException on failure."""
    if not url or not url.startswith(("http://", "https://")):
        raise HTTPException(400, "URL must start with http(s)://")
    p = urlparse(url)
    host = p.hostname or ""
    if not host:
        raise HTTPException(400, "URL missing hostname")
    # Block obviously dangerous hostnames (covers 'localhost', 'metadata.google.internal', etc.)
    if host.lower() in {"localhost", "metadata.google.internal", "169.254.169.254"}:
        raise HTTPException(400, "host not allowed")
    # Resolve and reject private/loopback/link-local/multicast ranges
    try:
        for fam_addr in socket.getaddrinfo(host, None):
            ip_str = fam_addr[4][0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved:
                raise HTTPException(400, "URL resolves to restricted address range")
    except socket.gaierror:
        raise HTTPException(400, "URL hostname did not resolve")
    return url


class RecipeUrlInput(BaseModel):
    url: str


@router.get("/image")
async def proxy_recipe_image(url: str = ""):
    """Proxy a recipe image to avoid CORS issues."""
    from fastapi.responses import Response as FastAPIResponse
    url = _ssrf_guard(url)
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "image/*",
        }
        resp = requests.get(url, headers=headers, timeout=10, stream=True)  # nosemgrep: ssrf-requests — url validated by _ssrf_guard above
        if resp.status_code != 200:
            raise HTTPException(502, f"Image fetch failed ({resp.status_code})")
        content_type = resp.headers.get("content-type", "image/jpeg")
        return FastAPIResponse(content=resp.content, media_type=content_type)
    except requests.RequestException as e:
        raise HTTPException(502, f"Could not fetch image: {str(e)[:100]}")


def _extract_jsonld_recipe(soup: BeautifulSoup) -> dict | None:
    """Extract Recipe from JSON-LD structured data (schema.org)."""
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            # Could be a single object or an array
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict):
                    if item.get("@type") == "Recipe":
                        return item
                    # Check @graph array
                    if "@graph" in item and isinstance(item["@graph"], list):
                        for node in item["@graph"]:
                            if isinstance(node, dict) and node.get("@type") == "Recipe":
                                return node
        except (json.JSONDecodeError, TypeError):
            continue
    return None


def _parse_ingredients(raw) -> list[str]:
    """Normalize ingredients from various formats."""
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(i).strip() for i in raw if i]
    if isinstance(raw, str):
        return [line.strip() for line in raw.split("\n") if line.strip()]
    return []


def _parse_instructions(raw) -> list[str]:
    """Normalize instructions from HowToStep objects or plain text."""
    if not raw:
        return []
    if isinstance(raw, str):
        return [s.strip() for s in re.split(r'\n+', raw) if s.strip()]
    if isinstance(raw, list):
        steps = []
        for item in raw:
            if isinstance(item, str):
                steps.append(item.strip())
            elif isinstance(item, dict):
                # HowToStep or HowToSection
                if item.get("@type") == "HowToSection":
                    sub = item.get("itemListElement", [])
                    for s in sub:
                        if isinstance(s, dict):
                            steps.append(s.get("text", "").strip())
                        elif isinstance(s, str):
                            steps.append(s.strip())
                else:
                    text = item.get("text", "")
                    if text:
                        steps.append(text.strip())
        return [s for s in steps if s]
    return []


def _extract_from_html(soup: BeautifulSoup, url: str) -> dict:
    """Fallback: extract what we can from meta tags and page content."""
    title = ""
    og_title = soup.find("meta", property="og:title")
    if og_title:
        title = og_title.get("content", "")
    if not title:
        t_tag = soup.find("title")
        title = t_tag.get_text(strip=True) if t_tag else "Imported Recipe"

    image = ""
    og_image = soup.find("meta", property="og:image")
    if og_image:
        image = og_image.get("content", "")

    description = ""
    og_desc = soup.find("meta", property="og:description")
    if og_desc:
        description = og_desc.get("content", "")
    if not description:
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc:
            description = meta_desc.get("content", "")

    return {
        "name": title,
        "title": title,
        "description": description,
        "image": image,
        "ingredients": [],
        "instructions": [],
        "source_url": url,
    }


@router.post("/import")
async def import_recipe_from_url(data: RecipeUrlInput):
    """Import a recipe from a URL by scraping structured data."""
    url = _ssrf_guard(data.url.strip())

    resp = None
    # Try multiple User-Agent strategies
    ua_strategies = [
        {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        },
        {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        },
    ]

    for headers in ua_strategies:
        try:
            resp = requests.get(url, headers=headers, timeout=15, allow_redirects=True)  # nosemgrep: ssrf-requests — url validated by _ssrf_guard above
            if resp.status_code < 400:
                break
        except requests.RequestException:
            continue

    if resp is None:
        raise HTTPException(502, f"Could not fetch URL after multiple attempts. The site may block automated access.")

    if resp.status_code >= 500:
        raise HTTPException(502, f"Remote server error ({resp.status_code})")

    # Even for 4xx responses, try to parse whatever we got
    html_content = resp.text
    if resp.status_code in (401, 402, 403) and len(html_content) < 500:
        # Truly blocked — try AI extraction with just the URL context
        ai_result = await _ai_extract_from_url_only(url)
        if ai_result:
            return {"recipe": ai_result, "source": "ai-url-inference"}
        raise HTTPException(502, f"Access denied by recipe site ({resp.status_code}). Try a different recipe URL or paste the recipe text manually.")

    soup = BeautifulSoup(html_content, "lxml")

    # Try JSON-LD first
    jsonld = _extract_jsonld_recipe(soup)
    if jsonld:
        name = jsonld.get("name", "Imported Recipe")
        ingredients = _parse_ingredients(jsonld.get("recipeIngredient"))
        instructions = _parse_instructions(jsonld.get("recipeInstructions"))
        image = ""
        img_field = jsonld.get("image")
        if isinstance(img_field, str):
            image = img_field
        elif isinstance(img_field, list) and img_field:
            image = img_field[0] if isinstance(img_field[0], str) else img_field[0].get("url", "")
        elif isinstance(img_field, dict):
            image = img_field.get("url", "")

        return {
            "recipe": {
                "name": name,
                "title": name,
                "description": jsonld.get("description", ""),
                "image": image,
                "ingredients": ingredients,
                "instructions": instructions,
                "prepTime": jsonld.get("prepTime", ""),
                "cookTime": jsonld.get("cookTime", ""),
                "totalTime": jsonld.get("totalTime", ""),
                "servings": jsonld.get("recipeYield", ""),
                "cuisine": jsonld.get("recipeCuisine", ""),
                "category": jsonld.get("recipeCategory", ""),
                "source_url": url,
            },
            "source": "json-ld",
        }

    # Fallback to meta tags first
    fallback = _extract_from_html(soup, url)

    # If meta-fallback has no ingredients/instructions, try AI extraction
    if not fallback.get("ingredients") and not fallback.get("instructions"):
        ai_result = await _ai_extract_recipe(soup, url)
        if ai_result:
            return {"recipe": ai_result, "source": "ai-extracted"}
        # Last resort: AI inference from URL slug
        ai_url = await _ai_extract_from_url_only(url)
        if ai_url:
            return {"recipe": ai_url, "source": "ai-url-inference"}

    return {
        "recipe": fallback,
        "source": "meta-fallback",
    }


async def _ai_extract_recipe(soup: BeautifulSoup, url: str) -> dict | None:
    """Use Gemini to extract recipe data from raw HTML when structured data is missing."""
    import os
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        return None

    # Get visible text content (trim to avoid token limits)
    body = soup.find("body")
    if not body:
        return None
    text_content = body.get_text(separator="\n", strip=True)[:6000]

    prompt = f"""Extract the recipe from this webpage text. Return ONLY valid JSON with these fields:
{{
  "name": "recipe title",
  "description": "brief description",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "prepTime": "e.g. PT15M or empty",
  "cookTime": "e.g. PT30M or empty",
  "servings": "e.g. 4 servings or empty",
  "cuisine": "e.g. Italian or empty",
  "category": "e.g. Dessert or empty"
}}

If this is not a recipe page, return {{"error": "not_a_recipe"}}.

Webpage text:
{text_content}"""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"recipe-import-{url[:40]}",
            system_message="You extract structured recipe data from raw text. Always return valid JSON only.",
        )
        chat.with_model("openai", "gpt-4.1-mini")
        response = await chat.send_message(UserMessage(text=prompt))

        # Parse the JSON response
        response_text = response.strip() if isinstance(response, str) else str(response).strip()
        # Clean markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1] if "\n" in response_text else response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()

        data = json.loads(response_text)
        if data.get("error"):
            return None

        return {
            "name": data.get("name", "AI-Extracted Recipe"),
            "title": data.get("name", "AI-Extracted Recipe"),
            "description": data.get("description", ""),
            "image": "",
            "ingredients": data.get("ingredients", []),
            "instructions": data.get("instructions", []),
            "prepTime": data.get("prepTime", ""),
            "cookTime": data.get("cookTime", ""),
            "totalTime": data.get("totalTime", ""),
            "servings": data.get("servings", ""),
            "cuisine": data.get("cuisine", ""),
            "category": data.get("category", ""),
            "source_url": url,
        }
    except Exception:
        return None


async def _ai_extract_from_url_only(url: str) -> dict | None:
    """Last resort: ask AI to infer recipe from the URL slug when scraping is blocked."""
    import os
    llm_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not llm_key:
        return None

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"recipe-url-{url[:30]}",
            system_message="You are a culinary expert. Given a recipe URL, infer the recipe from the URL path/slug. Return ONLY valid JSON.",
        )
        chat.with_model("openai", "gpt-4.1-mini")
        prompt = f"""The recipe website blocked our access, but based on the URL we can infer the recipe.
URL: {url}

Based on the recipe name in the URL, generate a reasonable recipe with:
{{"name": "...", "description": "...", "ingredients": ["..."], "instructions": ["..."], "servings": "...", "category": "...", "cuisine": "..."}}

Return ONLY valid JSON. Make the recipe realistic and professional."""

        response = await chat.send_message(UserMessage(text=prompt))
        response_text = response.strip() if isinstance(response, str) else str(response).strip()
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1] if "\n" in response_text else response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()

        data = json.loads(response_text)
        return {
            "name": data.get("name", "AI-Inferred Recipe"),
            "title": data.get("name", "AI-Inferred Recipe"),
            "description": data.get("description", "") + " (AI-inferred from URL — verify before use)",
            "image": "",
            "ingredients": data.get("ingredients", []),
            "instructions": data.get("instructions", []),
            "prepTime": data.get("prepTime", ""),
            "cookTime": data.get("cookTime", ""),
            "servings": data.get("servings", ""),
            "cuisine": data.get("cuisine", ""),
            "category": data.get("category", ""),
            "source_url": url,
        }
    except Exception:
        return None