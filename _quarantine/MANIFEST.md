# Quarantine Manifest

Generated: 2026-05-07 · D52 sweep

This folder is the **soft-delete staging area**. Nothing is actually
deleted; items are moved here so the working tree shrinks and the
team can review before final removal. Restore any item by `git mv`
back into its original path.

---

## Moved this sweep

### Zip / packaged artifact

| From | To | Reason |
|---|---|---|
| `client/developer/EchoCoder/core-pack.zip` | `_quarantine/zips/core-pack.zip` | Build artifact in source tree; should be a CI build product, not a checked-in zip. |

### Iteration scratch routes (auto_register would have picked these up at boot)

These were one-off iteration sandboxes that got committed during
development. Nothing else in the codebase imports them (verified
via grep — only one inline COMMENT reference). The auto_register
loader at `server.py:849` was including them at boot, which is
why D44's "orphan audit" flagged them.

| From | To | Refs |
|---|---|---|
| `backend/routes/iter243_extras.py` | `_quarantine/routes/iter243_extras.py` | 0 imports (1 comment in iter245_backlog) |
| `backend/routes/iter245_backlog.py` | `_quarantine/routes/iter245_backlog.py` | 0 imports |
| `backend/routes/ecw_ops_iter235.py` | `_quarantine/routes/ecw_ops_iter235.py` | 0 imports |
| `backend/routes/ecw_ops_iter238.py` | `_quarantine/routes/ecw_ops_iter238.py` | 0 imports |
| `backend/routes/ecw_ops_iter239.py` | `_quarantine/routes/ecw_ops_iter239.py` | 0 imports |
| `backend/routes/ecw_ops_iter240.py` | `_quarantine/routes/ecw_ops_iter240.py` | 0 imports |
| `backend/routes/ecw_ops_iter242_misc.py` | `_quarantine/routes/ecw_ops_iter242_misc.py` | 0 imports |
| `backend/routes/ecw_ops_phase3.py` | `_quarantine/routes/ecw_ops_phase3.py` | 0 imports |
| `backend/routes/ecw_ops_phase4.py` | `_quarantine/routes/ecw_ops_phase4.py` | 0 imports |

### Archive directories

| From | To | Size |
|---|---|---|
| `docs/archive/` | `_quarantine/docs/archive/` | 96K |
| `client/modules/EchoCanvasStudio/archived-cake-builder/` | `_quarantine/client/EchoCanvasStudio-archived-cake-builder/` | 444K |

---

## Moved in D52-followup (knowledge-salvage pass)

Both flagged-for-review items below were investigated, salvaged
where appropriate, and quarantined.

### `client/imported/` (59M) → `_quarantine/client/imported/`

  · Connection check: 0 imports across the codebase
    (verified by recursive grep of `from.*imported`,
    `import.*imported`, `require.*imported`)
  · Identified as a 2025-10-17 historical dump
    (`1760680897452/LUCCCA/...`) of an older LUCCCA framework
    pre-rewrite. Contains 2,272 .ts/.tsx/.jsx/.js/.json files.
  · Path collision with active service: `client/modules/
    MixologySommelier/server/routes/import.ts` writes to
    `client/imported/` at runtime via `fs.mkdirSync(...,
    {recursive: true})`. The active service is UNRELATED to the
    quarantined dump — it'll recreate a fresh empty directory
    on next import run.
  · No files salvaged: this was an entire-framework historical
    snapshot superseded by the current `backend/` and
    `client/modules/`.

### `client/modules/MixologySommelier/archive/` (44M) → `_quarantine/client/MixologySommelier-archive/`

  · Connection check: 0 references from outside the archive
  · Deep-dive comparison vs live MixologySommelier (1,428
    archive files vs 281 live)
  · **Salvaged real domain knowledge** before quarantine to:

    `client/modules/MixologySommelier/lib/sommelier-knowledge/`
       pairing.js              7-feature wine-food scorer
       grape-db.json           5-grape varietal taste profiles
       food-flavor-map.json    food-side feature vectors
       flavor-taxonomy.json    8-category flavor wheel
       wheel-data.json         flavor wheel UI dataset
       README.md               integration guide

    `client/modules/MixologySommelier/lib/liquor-knowledge/`
       liquor-db.json          5-spirit reference DB
       liquor-rules.js         substitution + ABV legality
       price-intel.js          per-liter / proof-per-dollar /
                               9-category price bands
       label-ocr.js            label OCR adapter + parser
       liquor-entities.js      entity definitions
       README.md               integration guide

    `client/modules/MixologySommelier/schemas/`
       wine.schema.json
       liquor-entity.schema.json

    `docs/ops-runbooks/`
       SECURITY_BASELINE.md
       MONITORING_RUNBOOK.md
       PERFORMANCE_BUDGETS.json
       QA_SMOKE_TEST_PLAYBOOK.md
       DEPLOY_CHECKLIST.md
       PROD_DEPLOY_CHECKLIST.md
       HEALTH_CHECKS.md
       ACCESSIBILITY_CHECKLIST.md

  · Why salvaged: `pairing.js` upgrades the live wine-pairing
    route from a 3-feature mock to a 7-feature sommelier-grade
    algorithm. `price-intel.js` provides pre-tuned price bands
    that the D30 forensic auditor can use to flag unreasonable
    vendor invoices. `label-ocr.js` slots into the D40 mobile
    recipe scan pipeline as a liquor-specific parser.
  · Everything else in the archive (1,400+ files) was either
    (a) infrastructure scaffolding now superseded by the live
    cognition/ + automation/ + orchestrator/ structure,
    (b) UI components rewritten in the live module, or
    (c) one-off install scripts no longer needed.

---

## How to restore

```bash
git mv _quarantine/routes/iter243_extras.py backend/routes/
```

## How to delete (after review)

```bash
git rm -r _quarantine/<item>
git commit -m "Final removal of <item> after quarantine review"
```

## Why this pattern

Per CLAUDE.md `NO_PLACEHOLDER_POLICY` + Tom Hill standard: we
don't ship code we don't trust, but we also don't delete code on
a hunch. Quarantine is the third option — visible, reversible,
and forces a deliberate decision rather than a silent loss.
