/**
 * Label OCR + parsing via an adapter pattern.
 * No network calls here; you can inject a provider (Tesseract, Vision API, etc.).
 * We ship a robust regex fallback for common labels.
 */

/** Create an OCR adapter */
export function createOCRAdapter(provider){
  return async function ocr(imageBlob){
    if (provider) return provider(imageBlob);
    // Fallback: no-op OCR returns empty text. Upstream code still functions using manual input.
    return "";
  };
}

/** Parse raw label text into a structured liquor entity. */
export function parseLabel(text){
  const t = String(text||"").trim();

  // Example patterns: "Tanqueray London Dry Gin 47.3% 750ml"
  const name = (t.match(/^[A-Za-z0-9'&\-\s]+?(?=\s\d{2,3}\.\d%|\s\d{2,3}%|\s\d{3,4}ml|$)/) || [null])[0]?.trim() || "";
  const abv  = (()=>{
    const m = t.match(/(\d{2,3}(?:\.\d)?)\s*%/);
    return m ? Number(m[1]) : null;
  })();
  const size_ml = (()=>{
    const m = t.match(/(\d{3,4})\s*ml/i);
    return m ? Number(m[1]) : null;
  })();
  const proof = abv!=null ? abv*2 : null;

  // Category heuristics
  const lc = t.toLowerCase();
  const category =
    lc.includes("gin") ? "gin" :
    lc.includes("whisky")||lc.includes("whiskey") ? "whisky" :
    lc.includes("rum") ? "rum" :
    lc.includes("vodka") ? "vodka" :
    lc.includes("tequila") ? "tequila" :
    lc.includes("mezcal") ? "mezcal" :
    lc.includes("vermouth") ? "vermouth" :
    lc.includes("liqueur") ? "liqueur" : "unknown";

  return { name, abv, proof, size_ml, category, raw:t };
}

/** Normalize/clean parsed entity with safe defaults and casing. */
export function normalizeParsed(e){
  const n = { ...e };
  if (n.name) n.name = n.name.replace(/\s+/g," ").replace(/\b\w/g, m=>m.toUpperCase());
  if (n.abv==null && n.proof!=null) n.abv = n.proof/2;
  if (n.proof==null && n.abv!=null) n.proof = n.abv*2;
  return n;
}
