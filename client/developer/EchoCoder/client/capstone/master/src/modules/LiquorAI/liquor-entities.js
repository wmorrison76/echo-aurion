/**
 * Liquor entities — normalize brands/expressions/SKUs to canonical IDs.
 * Designed for fast lookups and deduping across vendor sources.
 */
export function canonicalKey({ name, size_ml, abv, category }){
  const key = [
    String(name||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$|--+/g,"").slice(0,80),
    size_ml||"-",
    Math.round((abv||0)*10), // deci-ABV
    category||"-"
  ].join(":");
  return key;
}

export function normalizeRecord(rec){
  return {
    name: String(rec?.name||"").trim(),
    size_ml: Math.max(0, Number(rec?.size_ml)||0),
    abv: rec?.abv!=null ? Math.max(0, Math.min(100, Number(rec.abv))) : null,
    category: String(rec?.category||"unknown").toLowerCase(),
    vendor_sku: rec?.vendor_sku||null,
    brand: rec?.brand||null,
    expression: rec?.expression||null,
  };
}
