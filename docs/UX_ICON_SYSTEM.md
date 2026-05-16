# Module Icon System

> Last updated: 2026-05-08 · D63 (aesthetic corrected in D64)
>
> Honest answer to: "should we make custom icons for all modules
> in the main sidebar — would it bring a better user experience
> than the ones I'm currently using?"
>
> **For the complete inventory of icons (69 across 4 tiers, with
> per-icon status and brief), see `docs/UX_ICON_MASTER_LIST.md`.**
> This doc covers the registry pattern, help mascot spec, and the
> high-level "should we" answer. The master list is the inventory.

---

## The honest answer: yes, custom icons are worth it

**Why generic icons hurt you:** Material Design / Tabler / Heroicons
are excellent libraries but they're the same icons every other SaaS
uses. A user who has tried Toast / 7shifts / Tripleseat will read
those exact glyphs as "another generic SaaS." That's not bad — but
it's ceiling-bound. You won't escape the comparison.

**Why custom icons help:** A bespoke icon set is what makes Notion
feel different from Confluence, Linear feel different from Jira,
Stripe feel different from Square. It's the same UI patterns, but
the icon language is yours. Users develop muscle memory in YOUR
visual vocabulary, which is a soft moat.

**Cost:** ~$3-5k for 30 icons from a competent designer (Figma);
1-2 weeks. ~$8-15k if you want hand-illustrated icons that match
the LUCCCA mascot's style. **Worth it for the brand foundation.**

---

## Recommended design system

### Style direction (corrected 2026-05-08)

**The original D63 brief said "outlined, 2px stroke, flat" — that was
wrong for this product.** The icons the human has already commissioned
(EchoAurum, EchoStratus, Culinary, Mixology Sommelier light + dark)
prove the actual direction is **luxe gold-on-near-black, ornate
circular vignette, symbolic still-life composition with a sparkle
field** — Forbes 5-star hospitality visual language.

The corrected style direction lives in `docs/UX_ICON_MASTER_LIST.md`
under "Aesthetic direction." Summary:

  · **Gold (~#C9A24E to #E5C26E) on near-black (~#0A0A0C)**
  · **Ornate circular vignette** (thin gold ring + subtle inner glow)
  · **Symbolic still-life** — chef's hat + whisk + spoon for kitchen,
    not an abstract pictogram
  · **Fine gold-dust sparkle field** in negative space
  · **Source viewBox 64 × 64**, render at 16 / 20 / 24 / 32 / 40 / 48 / 64
  · **Day/night pair only when the module has a literal duality**
    (e.g. Mixology Sommelier — most modules ship as a single icon)

The LUCCCA mascot keeps its own visual language (cyan helmet glow,
animation states) — it sits OUTSIDE the icon set as a character, not
a glyph. See "Help mascot specifics" below.

### What NOT to do

  ❌ Flat 2px-stroke outlined icons — wrong vocabulary for this brand
  ❌ Photo-realistic 3D icons — they look like stock art
  ❌ Color-only differentiation — needs glyph difference too
    for accessibility
  ❌ Icons that require captions to understand — operator
    home screen has limited width; the icon should mean
    something on its own
  ❌ Mixed style sets across the icon suite — one illustrator,
    one hand, one gold tone, one vignette ring weight
  ❌ Skipping the vignette ring — it's the seam that holds 69
    individual jewels together as ONE set

---

## Icon registry — the canonical mapping

To keep the frontend honest, here's the registry. Each module
gets ONE primary icon. The registry lives in
`client/lib/icon-registry.ts` (frontend); this is the spec.

**The full canonical list of 69 modules + their per-icon status
lives in `docs/UX_ICON_MASTER_LIST.md`.** The registry below is a
representative excerpt showing the wiring pattern.

```typescript
// File: client/lib/icon-registry.ts
export const MODULE_ICON: Record<string, IconSpec> = {
  // ── Operator home tiles
  admin:               { glyph: "shield-key",     accent: "cyan" },
  approvals:           { glyph: "stamp",           accent: "amber" },
  audit:               { glyph: "magnifier-graph", accent: "indigo" },
  finance:             { glyph: "ledger",          accent: "emerald" },
  payroll:             { glyph: "envelope-cash",   accent: "emerald" },
  forensic:            { glyph: "scale-fold",      accent: "indigo" },
  benchmark:           { glyph: "compass-stars",   accent: "indigo" },

  // ── Chef / kitchen
  recipes:             { glyph: "book-leaf",       accent: "cyan" },
  voice_recipe:        { glyph: "mic-spark",       accent: "cyan" },
  scan_recipe:         { glyph: "phone-bracket",   accent: "cyan" },
  beo_digest:          { glyph: "calendar-flag",   accent: "amber" },
  menu_proposal:       { glyph: "feather-leaf",    accent: "cyan" },
  vendor_order:        { glyph: "truck-arrow",     accent: "amber" },
  waste_scan:          { glyph: "leaf-arrow",      accent: "emerald" },
  line_check:          { glyph: "clipboard-check", accent: "emerald" },
  tip_share:           { glyph: "split-circle",    accent: "amber" },

  // ── Server / FOH
  tables_orders:       { glyph: "circles-grid",    accent: "rose" },
  pos_failover:        { glyph: "shield-bolt",     accent: "rose" },
  reservations:        { glyph: "bookmark-stars",  accent: "rose" },
  allergen_alerts:     { glyph: "bell-leaf",       accent: "amber" },

  // ── Employee self-service (MyEcho)
  schedule:            { glyph: "calendar-week",   accent: "cyan" },
  paystubs:            { glyph: "card-list",       accent: "emerald" },
  w2_taxes:            { glyph: "page-stack",      accent: "indigo" },
  shift_swap:          { glyph: "arrows-swap",     accent: "cyan" },
  pto:                 { glyph: "umbrella",        accent: "cyan" },
  training:            { glyph: "graduation-spark",accent: "cyan" },

  // ── Concierge / guest
  concierge:           { glyph: "headset-spark",   accent: "cyan" },
  storyboard:          { glyph: "frame-stack",     accent: "rose" },
  ird:                 { glyph: "tray-leaf",       accent: "amber" },
  spa:                 { glyph: "lotus",           accent: "emerald" },

  // ── Echo AI³ surfaces
  activity_drawer:     { glyph: "drawer-spark",    accent: "cyan" },
  sous_chef_voice:     { glyph: "mic-orbit",       accent: "cyan" },
  service_audit:       { glyph: "scope-grid",      accent: "indigo" },
  correlation:         { glyph: "graph-connect",   accent: "indigo" },
  retrospective:       { glyph: "clock-rewind",    accent: "indigo" },

  // ── Help (the LUCCCA mascot's home)
  help_agent:          { glyph: "luccca-mascot",   accent: "cyan",
                          custom_animation: "float" },
};

export type IconSpec = {
  glyph: string;          // path under client/assets/icons/{glyph}.svg
  accent: AccentColor;    // colorway when icon is active/selected
  custom_animation?: AnimationName;
};

export type AccentColor =
  "cyan" | "amber" | "emerald" | "indigo" | "rose";

export type AnimationName = "float" | "pulse" | "rotate";
```

### Why these accent colors

  - **Cyan** — Echo AI³ + tools (matches the mascot)
  - **Emerald** — money, finance, payroll (cash green, but tasteful)
  - **Amber** — alerts, approvals, attention-needed
  - **Indigo** — analytics, audit, looking-back
  - **Rose** — guest/FOH/service (warm-tone hospitality)

Five accents max. More becomes a rainbow that's harder to scan.

---

## Help mascot specifics

The `luccca-mascot` icon is special — it's the help agent's avatar.

  · **Default state:** static mascot in the bottom-right corner,
    small (32×32 in the corner; expands to 96×96 when invoked)
  · **Invoke animation:** mascot floats from corner toward the
    target element, pauses, points (tiny arm gesture animation)
  · **Speech bubble:** the help copy renders in a chat bubble
    above the mascot
  · **Voice:** when the user speaks, the mascot's helmet rim
    pulses with the audio waveform (very subtle — not distracting)
  · **Idle state:** after 60 seconds of no use, the mascot fades
    to 30% opacity and parks in the corner. Tap to wake.

Asset spec for Emergent's frontend work:
```
client/assets/icons/luccca-mascot/
├── default.svg          (the static pose, like the user's image)
├── pointing.svg         (arm extended)
├── waving.svg           (greeting / goodbye)
├── thinking.svg         (eyes looking up; for "let me find that")
├── celebrating.svg      (thumbs up; for tour-complete)
└── animations.json      (Lottie / Rive frame data)
```

The user's reference image (the floating astronaut robot with the
glowing helmet rim) is the "default.svg" pose. The other poses are
variations the designer/illustrator generates.

---

## How the registry hooks up

Frontend reads the registry to render the sidebar:

```tsx
// File: client/components/Sidebar.tsx (frontend; for Emergent)
import { MODULE_ICON } from "@/lib/icon-registry";

const sidebarTiles = [
  { module: "admin",       label: "Admin",         path: "/admin" },
  { module: "finance",     label: "Finance",       path: "/finance" },
  { module: "schedule",    label: "Schedule",      path: "/schedule" },
  { module: "concierge",   label: "Concierge",     path: "/concierge" },
  { module: "help_agent",  label: "Help",          path: "#help",
    onClick: openHelpAgent },
];

return (
  <nav>
    {sidebarTiles.map(({ module, label, path, onClick }) => {
      const spec = MODULE_ICON[module];
      return (
        <Tile
          key={module}
          icon={`/assets/icons/${spec.glyph}.svg`}
          label={label}
          accent={spec.accent}
          onClick={onClick ?? (() => navigate(path))}
        />
      );
    })}
  </nav>
);
```

The registry IS the source of truth. Adding a new module = adding
a registry row + commissioning an icon. The Sidebar renders without
any hardcoded paths.

---

## What I recommend doing right now

The illustrator who produced the existing icons (EchoAurum,
EchoStratus, Culinary, Mixology pair) has nailed the visual
direction. **Do not change illustrators mid-stream** — visual
coherence across 69 icons is more valuable than any individual
icon. Same hand, same gold tone, same vignette ring weight.

1. **Confirm bulk rate** with the existing illustrator for the
   remaining 61 icons (see `docs/UX_ICON_MASTER_LIST.md` for the
   full list and per-tier brief).
2. **Wave 1 — Tier 1 (9 remaining Echo platform icons)** — closes
   out the branded suite first. Highest visibility.
3. **Wave 2 — Pastry redo + Tier 2 (12 department icons)** — these
   appear on the operator home grid every day.
4. **Wave 3 — Tier 3 (26 functional icons)**, in domain batches.
5. **Wave 4 — Tier 4 (14 UI/system icons)**, last because they're
   the most replaceable with a temporary library if needed.

Total budget at the rate the existing icons suggest: **$7k-12k
total at bulk rate** for the remaining 61. See master list for
detail.

---

## Cheaper alternative if budget is tight

This applies if you choose NOT to commit to the full luxe suite.
Given you've already commissioned 7 icons in the gold-on-black
direction, walking back is unlikely — but if budget freezes:

  1. **Stop after Wave 1 + Wave 2** — that's the Echo platform tier
     plus the department tier (28 icons total). Those are the icons
     a user sees every login. Defer Tier 3 + Tier 4.
  2. **Use Tabler Icons** (free, MIT-licensed) styled in gold for
     the deferred Tier 3 + Tier 4 slots. Visually weaker but
     functional.
  3. **Never compromise on the LUCCCA mascot or the Tier 1 Echo
     platform icons** — those are the brand.

---

## Doctrine alignment

  · **§1.2 silent service:** icons recede when not the focus;
    no flashing or attention-grabbing. The mascot is the only
    animated element on screen by default.
  · **§2.5 framing:** icons depict the OBJECT of the action
    (a stamp for approve, not a checkmark; a ledger for finance,
    not a money bag stuffed with dollars). Avoids accusatory
    or anxious imagery.
  · **3-click rule:** icons must read at a glance — operators
    can't waste a tap interpreting an unclear icon. Every icon
    in the registry has a single clear meaning.

---

## Closing line

The icons aren't decoration — they're how a chef in the rush
finds the action they need without reading. That's worth
investing in.
