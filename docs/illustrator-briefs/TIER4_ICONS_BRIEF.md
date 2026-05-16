# Tier 4 System Icons · Illustrator Brief

> **Project:** LUCCCA / Pier Sixty-Six dashboard
> **Iteration:** 265
> **Date:** 2026-05-11
> **Asset family:** Tier 4 — UI / system icons
> **Deliverable:** 14 PNG files matching the existing Tier 1–3 brand-mark aesthetic
> **Drop location:** `public/brand-icons/tier4/`

---

## 1 · The ask in one sentence

We need 14 transparent-background, gold-on-black PNG icons that act as system glyphs in the LUCCCA dashboard chrome — replacing the generic lucide-react fallbacks we render today. They sit alongside the existing **Echo** product marks (`EchoAurum`, `EchoStratus`, `MyEcho`, etc.) and must feel like part of the same family.

---

## 2 · Why this matters

LUCCCA's UI uses three tiers of brand iconography today:

- **Tier 1** — Echo platform products (`EchoAurum.png`, `EchoStratus_badge.png`, `MyEcho.png`, `EchoCanvasStudio.png`, …). These are the marquee marks the operator sees on the sidebar.
- **Tier 2** — Department / outlet marks (`BAKERY.png`, `Steward.png`, `SPA.png`, …). These show on dashboards and category headers.
- **Tier 3** — Operational marks (`Schedule.png`, `Onboarding.png`, `EchoAurionSeal.png`, …). These appear in workflows.
- **Tier 4** — **System glyphs** — Settings, Notifications, Search, etc. These appear on every screen, in every panel header, in the toolbar, in user-avatar menus.

Without Tier 4 brand art, the gold-on-black aesthetic feels broken every time a `<Settings />` or `<Bell />` lucide icon renders next to a Tier-1/2 brand mark. We need to close that gap so the entire UI reads as one consistent brand system.

---

## 3 · Reference materials

### 3.a · Existing Echo marks to study
Open these files first to internalize the gold-on-black tonality, stroke weight, and warmth temperature:

| File | What to notice |
|---|---|
| `public/brand-icons/tier1/EchoAurum.png` | Reference for the **gold** — exact warm-gold hue (~ `#c8a97e` / `#d4af6a`), no pure yellow. Stroke is decisive but never harsh. |
| `public/brand-icons/tier1/MyEcho.png` | Mascot-mark version of the gold. Note how the gold against black has just enough alpha-glow to feel premium, not flat. |
| `public/brand-icons/tier3/Schedule.png` | This is the closest existing Tier 3 example to what Tier 4 should be — single-glyph, system-level. Match this for system-icon weight. |
| `public/brand-icons/tier1/EchoStratus_badge.png` | The badged variant shows the framing logic — circle/badge containment is **optional** for Tier 4; if used, must be subtle. |

### 3.b · Color palette
- **Gold (primary stroke / fill):** `#c8a97e` ± 5% drift acceptable. Reference Tier 1 PNGs for exact alpha gradient.
- **Black (background only):** must be **transparent** in the PNG. Background is provided by the app (varies dark navy `#0e131a` → near-black `#0a0c10` based on tier).
- **Optional secondary tint:** if a glyph needs an emphasis shade (e.g. red for `Delete.png`), use the existing palette: `#c87065` for destructive, `#7fb084` for success, `#6e8fa8` for info. Use sparingly — most should be straight gold.

### 3.c · What we do NOT want
- ❌ Flat-coloured icons (no gradients, no glow → reads cheap)
- ❌ Skeuomorphic or 3D — must be 2D vector-style
- ❌ Square-cap strokes (use round joins, like Tier 1 references)
- ❌ Bright yellow gold (`#ffd700` and friends are wrong — the warmth is the brand signature)
- ❌ Icon-set styles that don't read at 16 px (no excessive ornamentation)

---

## 4 · The 14 icons

Filenames are **case-sensitive** and must match exactly. Anything renamed breaks the resolver.

| # | Filename | Concept | Replaces (lucide) | UX context |
|---|---|---|---|---|
| 1 | `Settings.png` | gear / cog | `<Settings />` | sidebar bottom · user prefs · toolbar |
| 2 | `Notifications.png` | bell | `<Bell />` | toolbar alert badge · inbox |
| 3 | `Search.png` | magnifier | `<Search />` | global search · catalog filters |
| 4 | `Logout.png` | door + arrow OR `→ ⤢` | `<LogOut />` | user avatar menu |
| 5 | `Filter.png` | funnel | `<Filter />` | tables · grids · reports |
| 6 | `Sort.png` | vertical bidirectional arrows | `<ArrowUpDown />` | column headers |
| 7 | `Export.png` | down-arrow into tray OR doc + arrow | `<Download />` | export PDF / CSV / XLSX buttons |
| 8 | `Refresh.png` | circular arrow (one full loop) | `<RefreshCw />` | sync buttons · live tile re-fetch |
| 9 | `Help.png` | `?` in circle OR speech bubble | `<HelpCircle />` | "?" badges · Echo mascot dock |
| 10 | `Add.png` | `+` (clean, centered) | `<Plus />` | "create new" everywhere |
| 11 | `Edit.png` | pencil OR pen-nib | `<Pencil />` | inline edit · row actions |
| 12 | `Delete.png` | trash bin (subtle red tint optional) | `<Trash2 />` | destructive row actions |
| 13 | `Close.png` | `×` (well-balanced, not too thin) | `<X />` | dismiss · modal close · chip remove |
| 14 | `More.png` | three horizontal dots `…` | `<MoreHorizontal />` | overflow menus |

---

## 5 · Technical spec

### 5.a · Per-file
- **Canvas:** 24 × 24 px
- **Format:** PNG-32 (RGBA, 8-bit per channel, alpha mandatory)
- **Background:** transparent (no inset rectangles, no padding strips)
- **Bleed / safe area:** 2 px margin inside the 24×24 canvas — the icon glyph itself should not touch the edge
- **File size:** target ≤ 4 KB. Use `pngquant --strip --quality=85-95` if needed.
- **Optical alignment:** the glyph must read centered at 16 px AND at 24 px. The app renders inline-block with `vertical-align: middle`, so the center of mass matters more than geometric center.

### 5.b · Optional 2× retina set
If you have time, also deliver `@2x` variants at 48 × 48 px (same names, suffixed `@2x.png`) — we'll wire them in later for high-DPI displays. **Not required for v1.**

### 5.c · Source files
Deliver Figma / Illustrator source files alongside the PNGs so we can iterate (`tier4-icons-source.fig` or `.ai`).

---

## 6 · Delivery

### 6.a · How to test before sending
Drop your draft PNGs into `public/brand-icons/tier4/` on the dev workspace, then in your browser DevTools console:

```js
await window.__LUCCCA_NATIVE__?.openFile("/path/to/test-page");
// or simply open https://<preview>.preview.emergentagent.com/
```

Look at any panel header (e.g., the Operations Command Center). The system glyphs in the toolbar should now show your art. Compare side-by-side with the existing Tier 1 brand marks — does it read as one family? If yes, ship it.

### 6.b · Verification snippet
After dropping any new PNG:
```bash
curl -I https://<preview-host>/brand-icons/tier4/Settings.png
# expect: HTTP/2 200
# expect: content-type: image/png
```

The resolver does HEAD-request existence checks on first render and caches the result, so a single page reload picks up new assets across the entire app.

### 6.c · Naming the source
Source files: `lucca-tier4-icons-vYYYYMMDD.fig` (or `.ai`).
Final PNGs: filename column from § 4, exact case.
Optional 2× retina: same name + `@2x.png` suffix.

---

## 7 · Acceptance criteria (designer's self-check before submission)

- [ ] All 14 filenames match § 4 exactly (case-sensitive)
- [ ] Each PNG is 24 × 24, transparent, RGBA-8
- [ ] Each PNG ≤ 4 KB
- [ ] Glyph reads cleanly at **both** 16 px and 24 px display sizes
- [ ] Gold tone matches Tier 1 references (`EchoAurum.png` is the canonical sample)
- [ ] No pure-yellow gold, no harsh edges, no square-cap strokes
- [ ] Mounted on a dark navy / black background in the working file, the icon looks at home next to `EchoAurum`, `MyEcho`, and `Schedule.png`
- [ ] Stripped of metadata (`pngquant --strip`)
- [ ] Source files included
- [ ] (Optional) `@2x.png` variants delivered

---

## 8 · Engineering integration (handled by Emergent, FYI to designer)

Code-side wiring is already complete. The resolver at `client/lib/tier4-icons.tsx`:

```tsx
<Tier4Icon name="settings" fallback={Settings} className="w-4 h-4" />
```

- If `/brand-icons/tier4/Settings.png` exists → renders `<img>`
- If not → renders the lucide fallback

No code changes are needed when new art arrives. Just drop the file into the directory and the next page load picks it up.

When all 14 are delivered, we'll do a sweep through the toolbar / chrome components and replace lucide imports with `<Tier4Icon>` so the new art is actually rendered (it's not enough to just have the file — the consumers need to opt-in by switching to `Tier4Icon`).

---

## 9 · Contact

- Project repo: `wmorrison76/Echo_Aurion-LUCCCA_Framework`
- Brief author: Emergent (iter265)
- Approval / questions: William Morrison
- Engineering wiring: `client/lib/tier4-icons.tsx`, `public/brand-icons/tier4/README.md`

When questions arise, the live preview at the deployed URL is the best reality-check. Open any panel and look at the current state — every gear / bell / `+` / `×` you see is what your art will replace.

---

*Brief produced iter265 · 2026-05-11.*
