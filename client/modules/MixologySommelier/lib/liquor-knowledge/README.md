# Liquor knowledge — salvaged from `archive/capstone/master`

Liquor inventory + intelligence primitives extracted from the
MixologySommelier archive on 2026-05-07 before the archive was
quarantined.

## What's here

### `liquor-db.json`
5-spirit base reference (gin, vodka, rum, whiskey, tequila) with
ABV, origin material, and spirit family classification.

### `liquor-rules.js`
Two heuristic functions:
  - `suggestSubstitute(base)` — same-family alternatives
    when a SKU is unavailable
  - `checkLegality(sku, country)` — region-specific ABV ceiling
    enforcement (US default rejects > 75% ABV)

Pluggable via `import { suggestSubstitute, checkLegality } from
"@/modules/MixologySommelier/lib/liquor-knowledge/liquor-rules"`.

### `price-intel.js`
Price intelligence:
  - `pricePerLiter(priceUSD, size_ml)`
  - `proofPerDollar(priceUSD, abv)` — quality-per-cost proxy
  - `priceBand(category, priceUSD)` → low | fair | premium | luxury
  - `inferPrice({category, abv, size_ml}, referenceUSD)` →
    normalized metrics

Includes pre-tuned price BANDS for 9 categories:
gin, vodka, whisky, rum, tequila, mezcal, vermouth, liqueur,
unknown.

These bands are the calibration any vendor invoice + D30
forensic auditor needs to flag "is this Sysco price reasonable
for the category" without hand-rolled rules.

### `label-ocr.js`
OCR adapter pattern for liquor label scanning:
  - `createOCRAdapter(provider)` — pluggable provider
    (Tesseract / Google Vision / Apple Vision)
  - `parseLabel(text)` — regex parser for:
    `"Tanqueray London Dry Gin 47.3% 750ml"` →
    `{name, abv, proof, size_ml, category}`
  - `normalizeParsed(entity)` — title-case + ABV/proof
    consistency

D17 fuse-box ready: the provider is dependency-injected.

### `liquor-entities.js`
Entity definitions (canonical names) for the liquor catalog.

## Integration path

This pairs with D40 (`recipe_scan_mobile.py`) — you already have
on-device OCR text upload; route the label text through these
parsers to populate the liquor inventory:

```ts
import { parseLabel, normalizeParsed } from
  "@/modules/MixologySommelier/lib/liquor-knowledge/label-ocr";
import { priceBand, pricePerLiter } from
  "@/modules/MixologySommelier/lib/liquor-knowledge/price-intel";

const parsed = parseLabel(ocrText);
const entity = normalizeParsed(parsed);
const band = priceBand(entity.category, vendorPrice);
const ppl = pricePerLiter(vendorPrice, entity.size_ml);
```

## Schema validation

`../../schemas/liquor-entity.schema.json` is the canonical contract:
9 categories enum, ABV 0–100, sizes ≥ 0, name required.

## Provenance

Source: `client/modules/MixologySommelier/archive/capstone/master/src/modules/{LiquorAI,MixologyLiquorAI}/`
Original batches: Batch03_Capstone, Batch05_Capstone, Batch06_Capstone

Schemas + tests salvaged: `tests/abv.test.js`, `tests/liquor-inventory.test.js`
(both reference `EchoMixologyAI/lib/abv.js` which was NOT in the
batches we have — flagged for rebuild if ABV blending is needed).
