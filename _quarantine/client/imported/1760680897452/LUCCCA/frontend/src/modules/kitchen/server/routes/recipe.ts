import type { Request, Response } from "express";

function decodeHtml(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toAbsoluteUrl(possiblyRelative: string, base: string) {
  try {
    return new URL(possiblyRelative, base).toString();
  } catch {
    return possiblyRelative;
  }
}

function normalizeImageField(img: any): string | null {
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) return normalizeImageField(img[0]);
  if (typeof img === "object") {
    if (typeof img.url === "string") return img.url;
    if (typeof img.contentUrl === "string") return img.contentUrl;
  }
  return null;
}

function parseJsonLdRecipe(html: string) {
  const scripts = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  );
  const safeArray = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);
  for (const m of scripts) {
    try {
      const raw = m[1].trim();
      const data = JSON.parse(raw);
      const list = Array.isArray(data) ? data : [data];
      for (const entry of list) {
        if (!entry) continue;
        const graphArr = safeArray(entry["@graph"]);
        const lookupById: Record<string, any> = {};
        for (const g of graphArr)
          if (g && typeof g === "object" && typeof g["@id"] === "string")
            lookupById[g["@id"]] = g;
        const candidates = graphArr.length ? graphArr : [entry];
        for (const cand of candidates) {
          const type = safeArray(cand["@type"]);
          if (type.includes("Recipe")) {
            const isoToHuman = (iso: string) => {
              if (!iso || typeof iso !== "string") return "";
              const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
              if (!m) return String(iso);
              const h = Number(m[1] || 0),
                min = Number(m[2] || 0);
              return h ? `${h}:${String(min).padStart(2, "0")}` : `${min}m`;
            };
            const normalizeInstructions = (ri: any): string => {
              const arr = safeArray(ri);
              const out: string[] = [];
              for (const step of arr) {
                if (typeof step === "string") out.push(step);
                else if (step && typeof step.text === "string")
                  out.push(step.text);
                else if (step && Array.isArray(step.itemListElement)) {
                  for (const el of step.itemListElement) {
                    if (typeof el === "string") out.push(el);
                    else if (el && typeof el.text === "string")
                      out.push(el.text);
                  }
                }
              }
              return out.join("\n");
            };
            const nutrition = cand.nutrition
              ? {
                  calories: String(cand.nutrition.calories || ""),
                  fat: String(cand.nutrition.fatContent || ""),
                  carbs: String(cand.nutrition.carbohydrateContent || ""),
                  protein: String(cand.nutrition.proteinContent || ""),
                  servingSize: String(cand.nutrition.servingSize || ""),
                }
              : undefined;
            let image = normalizeImageField(cand.image);
            if (
              !image &&
              cand.image &&
              typeof cand.image === "object" &&
              typeof cand.image["@id"] === "string"
            ) {
              const ref = lookupById[cand.image["@id"]];
              image = normalizeImageField(ref);
            }
            return {
              title: decodeHtml(String(cand.name || "")),
              ingredients: safeArray(cand.recipeIngredient || []).map(
                (x: any) => decodeHtml(String(x)),
              ),
              instructions: decodeHtml(
                normalizeInstructions(cand.recipeInstructions).trim(),
              ),
              yield: decodeHtml(String(cand.recipeYield || "")),
              cookTime: isoToHuman(
                String(cand.cookTime || cand.totalTime || ""),
              ),
              prepTime: isoToHuman(String(cand.prepTime || "")),
              image,
              nutrition,
            };
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function scrapeRecipeFallback(html: string) {
  const pick = (re: RegExp) => (html.match(re)?.[1] || "").trim();
  const title =
    decodeHtml(pick(/<title[^>]*>([\s\S]*?)<\/title>/i)) ||
    decodeHtml(pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i));
  const ogImage =
    pick(
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ) ||
    pick(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ) ||
    pick(
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    ) ||
    pick(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i) ||
    pick(/<meta[^>]+name=["']image["'][^>]+content=["']([^"']+)["'][^>]*>/i);

  const section = (label: RegExp) => {
    const h = html.match(
      new RegExp(`<h[1-6][^>]*>\\s*${label.source}[\\s\\S]*?<\\/h[1-6]>`, "i"),
    );
    if (!h) return "";
    const idx = h.index! + h[0].length;
    const tail = html.slice(idx);
    const next = tail.search(/<h[1-6][^>]*>/i);
    return next >= 0 ? tail.slice(0, next) : tail;
  };

  const extractList = (frag: string) => {
    const lis = Array.from(frag.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
      .map((m) => decodeHtml(m[1].replace(/<[^>]+>/g, "").trim()))
      .filter(Boolean);
    if (lis.length) return lis;
    const ps = Array.from(frag.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
      .map((m) => decodeHtml(m[1].replace(/<[^>]+>/g, "").trim()))
      .filter(Boolean);
    return ps;
  };

  const ingFrag = section(/ingredients?/i);
  const insFrag = section(/(instructions|directions|method|steps)/i);
  const ingredients = extractList(ingFrag);
  const instructions = extractList(insFrag);

  const yieldText = pick(/<[^>]*>(?:yield|servings?)\s*:?\s*([^<]{1,40})<\//i);

  if (!title && ingredients.length === 0 && instructions.length === 0)
    return null;
  return {
    title,
    ingredients,
    instructions: instructions.join("\n"),
    yield: yieldText,
    image: ogImage,
  };
}

export async function handleRecipeImport(req: Request, res: Response) {
  try {
    const { url } = req.body as { url: string };
    if (!url || !/^https?:\/\//i.test(url))
      return res.status(400).json({ error: "Invalid url" });

    const r = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 RecipeStudioBot" },
    });
    if (!r.ok)
      return res.status(400).json({ error: `Fetch failed (${r.status})` });
    const html = await r.text();

    const rec = parseJsonLdRecipe(html) || scrapeRecipeFallback(html);
    if (!rec) return res.status(404).json({ error: "No recipe found on page" });

    if ((rec as any).image) {
      (rec as any).image = toAbsoluteUrl(String((rec as any).image), url);
    }

    res.json(rec);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Import failed" });
  }
}
