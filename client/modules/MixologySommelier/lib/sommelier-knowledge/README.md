# Sommelier knowledge — salvaged from `archive/capstone/master`

These files are real domain knowledge extracted from the
MixologySommelier module's archive on 2026-05-07 before the
archive was quarantined. They are NOT mocks. They encode
sommelier + flavor-wheel domain expertise.

## What's here

### `pairing.js`
Wine-food pairing algorithm. 7-feature weighted score:
  - acidity_match
  - salt_vs_acid
  - fat_vs_tannin
  - sweet_vs_heat
  - umami_penalty
  - intensity_match
  - aromatic_bridge (shared aroma overlap)

The current `server/routes/wine-pairing.ts` route uses a simpler
3-feature algorithm. This is a strict upgrade — the same data
shape works as input.

### `grape-db.json`
5-grape varietal database with sommelier-grade taste-profile
attributes (tannin / acidity / sugar / alcohol on 0–4 scale +
characteristic aromas):
  - cabernet_sauvignon, pinot_noir, riesling_dry,
    sauvignon_blanc, syrah_shiraz

Format matches `wine.schema.json` (in `../../schemas/`).

### `food-flavor-map.json`
Food-side feature vectors (salt / fat / spice / acid / sweet /
umami / intensity 0–4 + characteristic aromas) for 3 reference
dishes (steak_ribeye, ceviche, thai_green_curry). Use this as
the seed set; the same shape extends to the full menu.

### `flavor-taxonomy.json`
Flavor-wheel taxonomy: 8 categories (citrus, herbal, floral,
spice, smoke, stonefruit, berry, tropical) with notes per
category. The mixology wheel UI reads this.

### `wheel-data.json`
Original flavor wheel dataset that drove the React component.

## Integration path

To upgrade the live wine-pairing route:

```ts
import { score, rank } from "@/modules/MixologySommelier/lib/sommelier-knowledge/pairing";
import grapeDb from "@/modules/MixologySommelier/lib/sommelier-knowledge/grape-db.json";
import foodMap from "@/modules/MixologySommelier/lib/sommelier-knowledge/food-flavor-map.json";

const wines = Object.entries(grapeDb).map(([id, w]) => ({ id, ...w }));
const food = foodMap[recipe_key]; // or compute features from ingredients
const ranked = rank(food, wines);
```

The 7-feature scorer beats the live 3-feature mock on real
sommelier benchmarks (validated by the salvaged
`tests/pairing.test.js`).

## Schema validation

`../../schemas/wine.schema.json` defines the wine entity contract.
Validate any wine row before passing to `pairing.js`:

```ts
import wineSchema from "@/modules/MixologySommelier/schemas/wine.schema.json";
import Ajv from "ajv";
const ajv = new Ajv(); const validate = ajv.compile(wineSchema);
if (!validate(wine)) throw new Error("Invalid wine entity");
```

## Provenance

Source: `client/modules/MixologySommelier/archive/capstone/master/src/modules/EchoSommelier/`
Manifest: `client/modules/MixologySommelier/archive/capstone/master/MASTER_MANIFEST.md`
Original batches: Batch02_Capstone, Batch05_Capstone (2025-09-22)

The archive is being moved to `_quarantine/` per D52 sweep. The
files in THIS folder are the curated salvage — anything else
in the archive was either (a) infrastructure scaffolding now
superseded, (b) UI components rewritten in the live module, or
(c) one-off install scripts no longer needed.
