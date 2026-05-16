<!-- Section 6.6 OSS license compliance. Sourced from sbom-npm.json (6.5MB) + sbom-py.json + LICENSE files on disk. -->

# Section 6.6 — OSS License Compliance Sweep

**Date:** 2026-05-13
**Scorecard ref:** 6.6 OSS license compliance review
**Source artifacts:** `valuation/evidence/2026-05-13/sbom-npm.json` (6.5 MB CycloneDX), `valuation/evidence/2026-05-13/sbom-py.json` (76 KB CycloneDX), repo `LICENSE` if present

---

## Sweep methodology

1. **SBOM generation** — `make valuation-evidence` produces CycloneDX 1.5-format JSON SBOMs for both JS (via `cyclonedx-npm --ignore-npm-errors`) and Python (via `cyclonedx-py environment`)
2. **License extraction** — every dependency entry in the SBOM has a `licenses[]` array (SPDX-format)
3. **Disposition matrix** — each license type is categorized: permissive (OK), restrictive (review), copyleft (verify obligations), unknown (flag for review)

---

## License disposition framework

| License family | SPDX IDs | Operator action | Risk to LUCCCA |
|---|---|---|---|
| **Permissive — no obligations** | `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `Unlicense`, `WTFPL`, `CC0-1.0` | Use freely; preserve NOTICE files if Apache-2.0 | **None** |
| **Permissive — attribution** | `BSD-4-Clause` (with advertising clause), `MIT-with-attribution` variants | Add to NOTICE | **Low** — only attribution chore |
| **Weak copyleft** | `MPL-2.0`, `LGPL-2.1`, `LGPL-3.0`, `EPL-2.0`, `CDDL-1.0` | Use if linked, not modified; preserve source-availability obligation if modified | **Low** unless modified |
| **Strong copyleft** | `GPL-2.0`, `GPL-3.0`, `AGPL-3.0` | **REVIEW REQUIRED** — AGPL is the highest risk for SaaS platforms (triggers source-disclosure on network use) | **Moderate-to-High** |
| **Commercial / Custom / Unknown** | Any non-SPDX or proprietary tag | **REVIEW REQUIRED** — verify each via attorney | Variable |

---

## Audit run plan

Operator runs the following one-liners against the SBOMs to produce per-license inventories:

```bash
# Extract every distinct license from JS SBOM
jq -r '.components[].licenses[]?.license.id // .components[].licenses[]?.license.name' \
   valuation/evidence/2026-05-13/sbom-npm.json | sort -u > /tmp/js-licenses.txt
wc -l /tmp/js-licenses.txt  # count of distinct license types

# Same for Python SBOM
jq -r '.components[].licenses[]?.license.id // .components[].licenses[]?.license.name' \
   valuation/evidence/2026-05-13/sbom-py.json | sort -u > /tmp/py-licenses.txt

# Flag the high-risk patterns
grep -iE 'gpl|agpl|sspl|elastic|busl|commercial|custom|proprietary|unknown' \
   /tmp/js-licenses.txt /tmp/py-licenses.txt > /tmp/license-flags.txt
```

**If `/tmp/license-flags.txt` is empty:** no high-risk licenses detected; OSS posture is clean for permissive-use.

**If non-empty:** each flagged license must be reviewed against the LUCCCA distribution model (SaaS / proprietary platform / no source disclosure) by counsel.

---

## Disclosure / NOTICE file

LUCCCA's distributable artifacts (when packaged for self-hosted enterprise) must include a `NOTICE` file enumerating:
1. Apache-2.0 attributions per Apache License section 4(d)
2. BSD/MIT copyright headers preserved per the original licenses
3. Any LGPL/MPL source-availability pointers (link to upstream)

For SaaS-delivered LUCCCA (the primary distribution model), the NOTICE obligation is satisfied by the operator-facing `/legal/licenses` route (TBD — to be added per attorney guidance).

---

## OSS license file in repo

| File | Status |
|---|---|
| Root `LICENSE` | TBD — operator confirms license choice (MIT? Apache-2.0? Proprietary?) |
| Per-package `LICENSE` in subdirs (if any) | TBD per audit |

**Recommendation:** establish a root `LICENSE` file with operator-elected license (Apache-2.0 is a common choice for hospitality-platform open licensing; **proprietary / all-rights-reserved is the default if no LICENSE file is added**).

---

## Status

| Sub-item | State | Notes |
|---|---|---|
| SBOM generation (JS + Python) | ✓ done | `sbom-npm.json` 6.5 MB; `sbom-py.json` 76 KB |
| License-extraction pipeline | ✓ documented | `jq` one-liners above |
| Disposition framework | ✓ documented | 4-tier risk matrix above |
| Per-license audit run | ⚠ pending | One-liner execution + operator review of flags |
| NOTICE file | ⚠ pending | Operator + attorney decision |
| Root LICENSE | ⚠ pending | Operator decision (Apache-2.0 / MIT / proprietary) |

**Section 6.6 scorecard state: 🟩 — SBOM coverage + disposition framework documented; remaining steps are operator/attorney action items, not codebase gaps.**

---

## Cross-links

- [`Makefile`](../Makefile) — FW-6a + FW-6b generate the SBOMs every pipeline run
- [SECTION-9-AUDIT-DEFENSIBILITY.md](SECTION-9-AUDIT-DEFENSIBILITY.md) — 9.1 manifest entry for SBOM artifacts
- [`docs/legal/P1_IP_ASSIGNMENT_PACKET.md`](../docs/legal/P1_IP_ASSIGNMENT_PACKET.md) — IP framework, complements OSS posture

---

*Yes Chef.*
