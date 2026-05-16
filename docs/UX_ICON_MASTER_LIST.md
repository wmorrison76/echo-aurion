# Module Icon Master List

> Last updated: 2026-05-08 · D64
>
> Companion to `docs/UX_ICON_SYSTEM.md` (D63).
> The D63 doc covers *style and registry pattern*.
> This doc enumerates every icon needed and tracks per-icon status.

---

## Aesthetic direction (the corrected brief)

The D63 doc originally recommended flat 2px-stroke icons. That was wrong
for your brand. The icons you've already commissioned (EchoAurum,
EchoStratus, Culinary, Mixology Sommelier light + dark) make the actual
direction obvious:

  · **Gold on near-black** — the EchoAurum / Culinary palette.
    Warm gold (~#C9A24E to #E5C26E) on deep matte black (~#0A0A0C).
  · **Ornate circular vignette** — every icon sits inside a thin
    gold ring, with subtle inner glow. Not a hard frame — a halo.
  · **Symbolic still-life composition** — not abstract glyphs.
    A cocktail shaker + grapes + glass. A chef's hat + whisk + spoon.
    A cloud + sparkles. The icon TELLS YOU what the module does
    through hospitality iconography, not abstract semiotics.
  · **Sparkle field** — fine gold dust / starfield in the negative
    space. Forbes 5-star visual language. Quiet luxury.
  · **No 2px stroke flat outline** — that's the wrong vocabulary.
    These are illustrated jewels, not Material Design pictograms.
  · **Two-mode pair when the module has a day/night character** —
    Mixology Sommelier ships in LIGHT and DARK variants because
    mixology has a day-bar / night-bar dual identity. Most modules
    do not need a pair.

**Doctrine alignment:**
  · **§1.2 silent service** — gold-on-black is restrained even when
    ornate. No neon, no flashing, no rainbow. The mascot is the only
    animated element by default.
  · **3-click rule** — the symbolic still-life reads at a glance.
    A chef tapping in the rush sees "chef hat + whisk = my kitchen"
    faster than a generic outlined chef's-hat glyph.

---

## Size system

Design at one source size; render at the others.

  · **Source viewBox: 64 × 64** — gives illustrators room for the
    ornate vignette without losing legibility at small sizes
  · **Render targets: 16, 20, 24, 32, 40, 48, 64**
  · **Touch target minimum: 44 × 44** (Apple HIG) — even when the
    icon renders smaller, the tap area is padded to 44 × 44

### Where each size is used

| Surface              | Render size | Notes                            |
|----------------------|------------:|----------------------------------|
| Header chrome        |    16 / 20  | top bar, breadcrumbs             |
| Inline (in body)     |    20 / 24  | next to a label in text          |
| Sidebar (collapsed)  |    24 / 32  | rail of icons, no labels         |
| Sidebar (expanded)   |         24  | next to module label             |
| Dock / launcher tile |    40 / 48  | home screen, app launcher        |
| Operator home tile   |         64  | the main module grid             |
| Help mascot (idle)   |         32  | corner-parked LUCCCA             |
| Help mascot (active) |         96  | invoked / pointing / explaining  |
| Notification badge   |         16  | overlay on a tile                |

You guessed 40px as the default. That's a strong choice for the
dock. **40 is right for the dock; 64 is right for the home grid;
24 is right for the sidebar.** Same source SVG, three render sizes.

### Asset packaging

Each icon ships as a single SVG at 64 × 64 viewBox. The frontend
(or the build step) downscales. **Do NOT ship multiple raster
sizes** — the gold-on-black ornament looks great at all sizes
when rendered from vector.

For the LUCCCA mascot specifically, ship Lottie/Rive animation
data alongside the static SVG (D63 already specifies this).

---

## The master list

**Status legend:**
  · **Shipped** — illustrator delivered, in the asset folder
  · **Approved** — design exists, awaiting drop into the repo
  · **Redo** — design exists but doesn't read; needs another pass
  · **Brief ready** — described below; not yet commissioned
  · **TBD** — name decided but visual brief not written

### Tier 1 — Echo platform modules (the branded products)

These are the "Echo*" suite. Each carries the master brand.
Gold-on-black + ornate vignette is non-negotiable for this tier.

| Module               | Status        | Brief / notes                                                                                                                                           |
|----------------------|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| EchoAurum            | **Approved**  | Gold dollar sign in laurel/crown vignette. Ships as canonical financial mark.                                                                           |
| EchoStratus          | **Approved**  | Cloud + lightning + barometer + monitors + coin stacks in command-room composition. Cloud-intelligence layer. (Note: a second small "brain + $" icon was delivered for EchoStratus but conflicts with this composition; flagged in `docs/brand/icons/raw/flagged/` pending the human's call on which represents the product.) |
| EchoCronos           | **Approved**  | Gilded pocket watch with Roman numerals, hands at 11:55, laurel surround, chain dangling. Almost-midnight detail is intentional — the moment before service.                                      |
| EchoConnect          | **Approved**  | Three interlocking gold rings + chain detail at base + sparkle field + laurel. Integrations / partner mesh.                                              |
| EchoConcierge        | **Approved**  | Top hat (porter / doorman cap) with crossed gold keys + laurel + vignette ring. Classic concierge symbol, luxe.                                          |
| EchoLayout           | **Approved**  | Compass rose at center + floor-plan grid behind + sparkle + laurel + banner. Event-room layout.                                                          |
| EchoWaste            | **Approved**  | Single elegant gold leaf at center + sparkle + laurel + banner. Avoids trash imagery exactly per brief. Sustainability / waste tracking.                  |
| EchoEventStudio      | **Approved**  | Comedy/tragedy theater masks in gold + sparkle + laurel + banner. Event production.                                                                      |
| EchoCanvasStudio     | **Approved**  | Painter's palette with gold brush + chromatic paint dabs (red/green/blue/yellow) + sparkle + laurel + banner. The colored dabs are the only break from pure gold in the entire suite — tasteful accent.       |
| EchoCoder            | Brief ready   | Curly braces `{ }` in gold filigree inside vignette. Developer tools.                                                                                    |
| EchoAI³              | **Approved**  | Three nested gold triangles + eye of providence at center + sparkle field + laurel + banner. The all-seeing-eye carries weight for the doctrine layer.   |

**Count: 11 icons. 10 approved, 1 to commission (EchoCoder).**

*Note: the EchoCustomCakes icon delivered in the 2026-05-08 batch is
not a Tier 1 platform module — it is a sub-brand asset within the
Pastry department module (per the human's confirmation 2026-05-08).
See "Sub-brand assets within department modules" section below.*

### Product badges (distinct from navigation icons)

A **product badge** is a detailed, text-banner, large-format
illustration of an Echo platform product. Different purpose from
a navigation icon: badges render at 128px+ and live on splash
screens, launcher tiles, marketing pages, and module home headers.
They have text banners, ornate framing, and dense composition
that would smudge into a black blob at 24px.

**Rule:** every Echo platform product (Tier 1) gets BOTH a
navigation icon (simple glyph, 64px source) AND a product badge
(detailed, 1024px source). The navigation icon is for the sidebar
and 3-click home. The product badge is for marketing surfaces
and the module's own home header.

**Where badges render:**
  · macOS / iPad dock (128–512px)
  · Login splash screen
  · Marketing site product pages
  · The module's home screen header (rendered at 256–512px)
  · Onboarding / "welcome to EchoAurum" screens
  · App Store / Mac App Store listing

**Where they do NOT render:**
  · Sidebar (use the simple glyph — 24px)
  · Header chrome (use the simple glyph — 16/20px)
  · Anywhere below 128px (text banner becomes illegible)

| Product badge                | Status        | Brief / notes                                                                                                                                                                |
|------------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| EchoAurum (badge)            | **Approved**  | Curved multi-monitor command room with gold trending chart + bar chart, circular dais with glowing centerpiece, gold coin stacks, smaller side panels. "ECHOAURUM" banner across the bottom. Hybrid circular-vignette + shield-trophy plinth framing. |
| EchoConcierge (badge)        | **Approved**  | Gold hand holding a smartphone with light burst on the screen; floating service tiles arranged in an arc (dining, lodging, spa, location pins, drinks); coin stacks beside the phone; circular dais base. "ECHO CONCIERGE" banner across the bottom. Same hybrid framing as EchoAurum badge. |
| EchoStratus (badge)          | **Approved**  | Cloud + lightning + monitors + barometer + coin stacks + dais + "ECHOSTRATUS" banner. Same command-room composition as Aurum/Concierge. |
| EchoCronos (badge)           | Brief ready   | Time-themed command room — pocket-watch motif on the dais, "ECHOCRONOS" banner. To commission. (Sticker version delivered; badge to follow.) |
| EchoConnect (badge)          | **Approved**  | Three interlocking gold rings + chain + sparkle + laurel + banner. Delivered as a single icon doing double duty (badge + sidebar) — works at both scales. |
| EchoLayout (badge)           | **Approved**  | Compass rose + floor-plan grid + sparkle + laurel + "ECHOLAYOUT" banner. |
| EchoWaste (badge)            | **Approved**  | Single gold leaf + sparkle + laurel + "ECHOWASTE" banner. |
| EchoEventStudio (badge)      | **Approved**  | Theater masks + sparkle + laurel + "ECHOEVENTSTUDIO" banner. |
| EchoCanvasStudio (badge)     | **Approved**  | Painter's palette + brush + chromatic paint dabs + sparkle + laurel + "ECHOCANVASSTUDIO" banner. |
| EchoCoder (badge)            | Brief ready   | Floating curly braces with code-stream sparkle around the dais, "ECHOCODER" banner. To commission. |
| EchoAI³ (badge)              | **Approved**  | Three nested triangles + eye of providence + sparkle + laurel + "ECHOAI³" banner. |

**Count: 11 product badges. 9 approved, 2 to commission (EchoCronos badge, EchoCoder badge).**

The simple-glyph navigation icons in the table above remain canonical
for sidebar / chrome / 3-click home. The badges are the **other half**
of every Echo platform product's identity.

---

### Tier 2 — Department / outlet modules

These are the operational departments. Same aesthetic, same vignette.
Each TELLS what the department does through still-life iconography.

| Module                       | Status        | Brief / notes                                                                                                                                              |
|------------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Culinary                     | **Approved**  | Chef's hat (toque) + whisk + spoon in gold vignette. Ships as canonical.                                                                                    |
| Pastry                       | **Approved**  | Cupcake with gold frosting swirl + crossed whisks + rolling pin + sugar cubes + wheat sheaf at base, sparkle field. Redo delivered 2026-05-08.              |
| Mixology Sommelier (light)   | **Approved**  | Cocktail shaker + wine + grapes + glowing teal cocktail in stemless glass with cocktail pick + bow-tie garnish.                                              |
| Mixology Sommelier (dark)    | **Approved**  | Crescent moon + cocktail spoon + cloche + wine glass + leaves on full matte black. Day/night pair with light variant.                                       |
| MaestroBQT (Banquets)        | **Approved**  | **Matched pair delivered.** Sticker: crescent moon + conductor's baton + cloche + wine glass on full black, atmospheric (canonical sidebar). Badge: laurel + crossed baton-and-fork + "MAESTRO BQT" banner (canonical launcher/splash). Both ship.                                              |
| Purchasing / Receiving       | **Redo**      | Delivered icon shares the same cloud-with-lightning background as EchoStratus — visual collision will read as "they're related" when they shouldn't be. Redo brief: open ledger + gold quill + ink pot + produce crate corner WITHOUT the cloud/lightning sky. Replace background with simple sparkle field on dark.  |
| Housekeeping                 | **Approved**  | Folded white towels with gold lotus accent on top + gold ribbon + sparkle. Reads as luxury hotel turn-down service.                                          |
| Spa                          | **Approved**  | Gold lotus in still water + sparkle. *Visual-collision note: Housekeeping also features a gold lotus accent. Acceptable since Housekeeping's lotus is a small flourish on towels and SPA's lotus is the focal subject. Re-check at small render sizes; if confusable, swap SPA flower to orchid or cherry blossom.* |
| IRD (In-Room Dining)         | **Approved**  | Domed gold cloche on tray with rolled napkin + sparkle. Distinct from Beverage and from Culinary.                                                            |
| Retail                       | **Approved**  | Gold shopping bag with bow handle + small price tag + sparkle.                                                                                               |
| Engineering / Maintenance    | **Approved**  | Crossed wrench + screwdriver + sparkle + laurel + "ENGINEERING & MAINTENANCE" banner. Banner-text redo delivered 2026-05-09.                               |
| Reservations                 | **Approved**  | Reservation podium with open book + reservation pen + small bell + "RESERVATIONS" banner. (A second variant — open book with blue ribbon — was delivered but flagged for redo: blue accent breaks the gold-on-black palette. Stick with the podium version unless a gold-ribbon redo is requested.) |
| Front of House (FOH)         | **Approved**  | FOH2 (selected over FOH v1): maître d' standing at host podium with golden touch-screen reservation interface. Reads as front-desk operations clearly. *FOH v1 (silhouette from behind) was rejected — figure-from-behind doesn't legible at small sizes.*                              |
| Beverage                     | **Approved**  | Wine bottle + glass + grape cluster + small bell + sparkle. Distinct from Mixology Sommelier (which centers on cocktail shaker + craft).                    |
| Bakery                       | **Approved**  | Golden bread loaf + crossed wheat sheaves + grape cluster + sparkle. Distinct from Pastry (bread vs. dessert).                                              |
| Garde Manger                 | **Approved**  | Large cheese wedge + purple grape cluster + gold leaf + small knife + sparkle. Stunning. May lose detail at <32px; recommend 40px minimum render.            |
| Butcher                      | Brief ready   | Cleaver crossed with bone + sparkle. Meat fabrication.                                                                                                        |
| Steward                      | **Approved**  | Stack of gold-rimmed ivory plates with gold-edged napkin + sparkle field. Stewarding / dish program.                                                                         |

**Count: 18 icons. 16 approved, 1 redo (Purchasing/Receiving), 1 to commission (Butcher).**

### Sub-brand assets within department modules

Some department modules ship with **sub-brand assets** — additional
icons that represent specific features or programs *within* the
parent department module. These are not separate modules in the
sidebar; they appear inside the parent module's UI as feature tiles,
launcher cards, or marketing material.

| Sub-brand asset       | Parent module | Status        | Brief / notes                                                                                                                                                |
|-----------------------|---------------|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| EchoCustomCakes       | Pastry        | **Approved**  | Mad Hatter top hat + teapot + tea cup + roses + cake + sparkle + laurel + banner. Confirmed 2026-05-08 as a Pastry sub-brand (bespoke / custom cake program), not a separate module. Renders inside the Pastry module's home as the custom-cake program tile / marketing badge. |

**Pattern:** sub-brand assets follow Class A (badge) styling because
they always render at large size on a feature-tile or marketing
surface, never in 24px sidebar chrome. The parent module's primary
icon (e.g., Pastry's cupcake) covers the sidebar/chrome use cases.

---

### Tier 3 — Functional / cross-cutting modules

These cut across departments. Same aesthetic. The symbolic still-life
shifts toward the action / object the module manipulates.

| Module                | Status      | Brief / notes                                                                                                       |
|-----------------------|-------------|---------------------------------------------------------------------------------------------------------------------|
| Dashboard             | **Approved**| Curved analytics monitor with gold trending chart + bar chart on screen, keyboard, gold coin stacks on a desk, framed in an angular gold shield vignette with starfield. Note: uses **shield framing** instead of the standard circular vignette — reserved for executive command-deck icons (see "framing variations" below). |
| Schedule              | **Approved** | Gold calendar page with weekday header + multiple checkmarks + small ornate clock overlay + sparkle. Beautifully clear at all sizes.                                                            |
| Payroll               | **Approved** | Cream envelope with gold "M" wax seal + gold coin stack peeking from the flap + filigree corners. Reads as a sealed pay envelope instantly.                                                                                  |
| MyEcho                | **Approved** | LUCCCA astronaut mascot variant: cute robot/astronaut with cyan-glow helmet rim and big friendly eyes + "MyEcho" wordmark. Different stylistic family from the gold/black ornate suite — deliberately, because MyEcho is the friendly employee mobile app. Pairs with the LUCCCA help mascot.    |
| Admin                 | Brief ready | Gold key crossed with small shield + sparkle.                                                                         |
| Approvals             | **Approved (badge only)** | Cream envelope with bronze-handled wax stamp pressed into "ECHO/AURION" gold wax seal. Stunning splash/launcher badge for the Approvals module. *Sidebar/sticker version still needed — recommend a clean wax-seal stamp without the "ECHO AURION" wordmark for navigation chrome.*                                                                                |
| Audit                 | **Approved (badge only)** | Magnifying glass over a ledger of dollar amounts + fountain pen + "ECHO" gold wax seal. Splash/launcher badge for the Audit module. *Sidebar/sticker version still needed — magnifier-over-ledger without the corporate wax wordmark.*                                                |
| Forensic              | **Approved** | Silver scale of justice + magnifier. Deliberate silver palette (not gold) — investigative tone, doctrine §2.5 (observation not accusation). One of two icons in the suite that ships in silver/gray instead of gold; the other is POS Failover.                          |
| Reservations          | **Approved** | Open reservation book + gold ribbon bookmark + sparkle. Replaces the previously-rejected blue-ribbon variant — gold ribbon delivered.                                                              |
| POS Failover          | **Approved** | Silver/gray shield with gold lightning bolt + sparkle. Critical-infrastructure tone (silver palette). Pairs with Forensic as the suite's two intentional non-gold icons.                                                          |
| Vendor Order          | **Approved** | Gray delivery truck with gold arrow + small produce crate.                                                           |
| Tip Share             | **Approved** | Three gold coins (1, 5, 10) on a balance/seesaw — fair-distribution metaphor. Reads instantly.                                                |
| Allergen Alerts       | **Approved** | Gold bell with green leaf accents + warning flourish. Gold-not-red — alert without panic per the brief.                                 |
| Service Recovery      | **Approved** | Open hand cupping a small flame + sparkle. The "make it right" module — warmth recovered.                             |
| QR Library            | **Approved** | Stylized QR pattern in gold corner-frame + sparkle. *Note: contact-sheet label said "OR Library" — typo; correct module name is QR Library. Image is correct.*                                                                   |
| Recipes               | **Approved** | Open book with leaf bookmark + small ladle + sparkle.                                                                         |
| Voice Recipe          | **Approved** | Gold microphone with sound-wave halo + sparkle. *Note: contact-sheet label said "Voice Reripe" — typo; image is correct.*                                                                            |
| Scan Recipe           | **Approved** | Phone in gold scanning bracket over a recipe card with utensils icon + sparkle. *Note: contact-sheet label said "Stan Recipe" — typo; image is correct.*                                                                |
| BEO Digest            | **Approved** | Calendar page with gold flag + sparkle. (BEO = Banquet Event Order)                                      |
| Menu Proposal         | **Approved** | Quill with feather + small ink pot + leaf garnish + sparkle. Creative menu writing.                                                                    |
| Line Check            | **Approved** | Gold clipboard with checkmarks + thermometer + sparkle. *Note: contact-sheet labeled this image as "Menu Proposal" and again as "Calendar" — both labels were illustrator confusion; clipboard+thermometer is the canonical Line Check icon (pre-service kitchen station inspection). The duplicate "Calendar" entry was skipped — the Schedule icon already covers calendar UX.*  |
| Training              | **Approved** | Black graduation cap with gold tassel + sparkle.                                                                      |
| Storyboard            | **Approved** | Stack of framed photo cards + sparkle. Concierge story planning.                                    |
| W-2 / Taxes           | **Approved** | Tax form folder with "TAXES" label + gold seal + small page-stack.                                                                    |
| Shift Swap            | Brief ready | Two arrows curving past each other (swap symbol) + small clock.                                                       |
| PTO                   | **Approved** | Gold + white striped beach umbrella + gold sparkle. Reads instantly as PTO/vacation. Distinctive silhouette.                                                                            |
| Onboarding            | **Approved** | Bronze-framed plaque with "Welcome" script + small gold key in corner + gold filigree border. Refined; reads at all sizes. (A larger, more ornate variant was also delivered but flagged as too elaborate for sidebar use.)                                   |

**Count: 27 icons. 24 approved (Dashboard, Schedule, Payroll, MyEcho,
Approvals badge, Audit badge, PTO, Onboarding, Forensic, Reservations,
POS Failover, Vendor Order, Tip Share, Allergen Alerts, Service
Recovery, QR Library, Recipes, Voice Recipe, Scan Recipe, BEO Digest,
Menu Proposal, Line Check, Training, Storyboard, W-2/Taxes), 3 still
to commission (Admin sticker, Approvals sidebar sticker, Audit sidebar
sticker, Shift Swap).**

*Note: 2026-05-09 contact-sheet review approved 15 of the remaining
Tier 3 icons in one batch. Three label fixes were noted (QR Library was
"OR Library", Voice Recipe was "Voice Reripe", Scan Recipe was "Stan
Recipe"). The clipboard+thermometer image was re-assigned from "Menu
Proposal" to **Line Check** (where it actually fits — pre-service kitchen
station inspection with temps + checks). The duplicate "Calendar" label
was skipped — the Schedule icon already covers calendar UX. Individual
PNG files for ingestion are pending from the illustrator.*

### Framing variations within the suite

After the 2026-05-08 batch delivery, three distinct framings exist
in the set, each with a clear purpose:

  1. **Circular vignette + laurel + banner ("Class A — Badges")** —
     the standard for Tier 1 Echo platform products and Tier 2
     departments when used at large size (launcher, splash,
     marketing, module home header). Includes text banner.
     Examples: EchoAurum, EchoAI³, EchoCanvasStudio, EchoEventStudio,
     EchoConnect, EchoLayout, EchoWaste, EchoCustomCakes,
     EchoConcierge, Culinary, Pastry.
  2. **Shield vignette + laurel + banner** — reserved for *executive
     command-deck* icons (Dashboard; optionally Admin). Used sparingly.
     Two icons max in the entire suite.
  3. **Sticker (no vignette, no banner — pure subject on transparent)
     — "Class B"** — for navigation chrome, sidebar at small sizes,
     and any context where the banner would be illegible. Examples:
     EchoCronos pocket-watch, BAKERY bread, BEVERAGE wine,
     Garde Manger cheese, Housekeeping towels, IRD cloche, RETAIL
     bag, SPA lotus, Mixology Sommelier light/dark.

**The matched-pair rule:** every module ideally ships in BOTH
Class A (badge) and Class B (sticker) so the same module can render
correctly at every surface from 16px chrome to 1024px splash. The
illustrator's 2026-05-08 batch follows this pattern — Class A for
Echo platform, Class B for departments. Continue this pattern for
remaining commissions: every Echo platform product gets both;
every department gets at least the Class B sticker.

---

### Tier 4 — UI / system icons

The UI chrome. These can be more pictographic and less ornate (smaller
sizes, more frequent use) — but still gold-on-dark, still in vignette
rings at sidebar size and above.

| Icon                  | Status      | Brief / notes                                                                                          |
|-----------------------|-------------|--------------------------------------------------------------------------------------------------------|
| Activity Drawer       | Brief ready | Drawer pull-out with sparkle inside. Echo AI³'s home.                                                    |
| Sous Chef Voice       | Brief ready | Microphone with orbit ring (mascot's helmet-glow vocabulary). Voice agent invocation.                    |
| Help (LUCCCA mascot)  | **In hand** | The astronaut robot you already commissioned. Spec in D63.                                               |
| Settings              | Brief ready | Gear with gold center jewel + sparkle.                                                                  |
| Notifications         | Brief ready | Bell with leaf detail + small dot indicator.                                                            |
| Profile               | Brief ready | Silhouette in gold ring + sparkle. Avatar fallback when no photo.                                        |
| Search                | Brief ready | Magnifying glass with gold handle + sparkle.                                                            |
| Logout                | Brief ready | Door slightly ajar with key in lock + sparkle.                                                          |
| Back / Forward        | Brief ready | Single arrow head in gold filigree (mirror for forward).                                                 |
| Filter                | Brief ready | Funnel with sparkle field falling through.                                                              |
| Sort                  | Brief ready | Three horizontal lines with arrow + small gold dot.                                                      |
| More / Overflow       | Brief ready | Three dots in gold beads + small connecting filigree.                                                    |
| Close                 | Brief ready | Crossed lines in gold filigree (don't make this aggressive).                                            |
| Add / New             | Brief ready | Plus sign in gold center jewel.                                                                         |
| Confirm / Done        | Brief ready | Checkmark with small sparkle trail.                                                                     |

**Count: 15 icons. 1 in hand, 14 to commission.**

---

## Summary count

| Tier                              | Count | Approved/Shipped | Redo | To commission |
|-----------------------------------|------:|-----------------:|-----:|--------------:|
| Tier 1 — Echo platform (icons)     |    11 |               10 |    0 |             1 |
| Tier 1b — Product badges           |    11 |                9 |    0 |             2 |
| Tier 1c — Sub-brand assets         |     1 |                1 |    0 |             0 |
| Tier 2 — Departments               |    18 |               16 |    1 |             1 |
| Tier 3 — Functional                |    27 |               24 |    0 |             3 |
| Tier 4 — UI / system               |    15 |                1 |    0 |            14 |
| **Total**                          | **83**|           **61** |**1** |        **21** |

**Delivery batch 2026-05-09 (15 new icons across the Maestro pair, FOH
selection, Engineering banner-fix, Steward, and the first 7 Tier 3
functional icons — Schedule, Payroll, MyEcho, Approvals badge, Audit
badge, PTO, Onboarding):**

  · 15 of 15 reviewed
  · 13 approved (Maestro pair counts as both sticker + badge; the
    Approvals + Audit "Echo Aurion" wax-seal pieces are approved
    only as product badges — sidebar versions still needed)
  · 1 redo (Reservations book-with-blue-ribbon: blue accent breaks
    the gold-on-black palette — switch to gold ribbon, or stick with
    the previously-approved gilded podium version)
  · 1 explicitly skipped per the human ("the mobile is just a
    frame don't import")

**Resolved 2026-05-09:**
  · Engineering / Maintenance redo delivered with banner text filled.
  · FOH icon picked: FOH2 (touch-screen podium) over FOH v1
    (figure-from-behind).
  · MaestroBQT matched-pair shipped: sticker for sidebar, badge
    for launcher.

**Open after the 2026-05-09 contact-sheet batch:**
  · Reservations blue-ribbon — **resolved**: gold-ribbon redo
    delivered in this batch
  · Purchasing / Receiving — drop the cloud/lightning sky
  · EchoStratus identity decision (cloud weather vs brain + $)
  · Approvals + Audit — clean sidebar stickers (without the
    "ECHO AURION" wordmark)
  · Admin sticker (Tier 3)
  · Shift Swap sticker (Tier 3)
  · Butcher (Tier 2)
  · Individual PNG files for the 15 newly-approved Tier 3 icons —
    contact sheets are visual review only; ingestion pending
  · 14 Tier 4 UI/system icons

**Delivery batch 2026-05-08:** large drop from the illustrator. Tier 1
icons + badges now 86% complete. Tier 2 now 72% complete. Approval
rate on the batch: 18 of 21 on first review (86%). After the human's
2026-05-08 clarifications, the open items reduced to:
  · **Redo:** Purchasing/Receiving (background collision), Engineering
    / Maintenance (empty banner text)
  · **Pick one:** EchoStratus has two delivered icons (cloud-weather
    badge vs. brain+$ small icon); human will decide which represents
    the product
  · **To commission:** EchoCoder (icon + badge), EchoCronos (badge),
    Butcher, Steward, MaestroBQT, FOH (own icon now that Reservations
    is confirmed as a separate module)

**Resolved 2026-05-08:**
  · EchoCustomCakes is a Pastry sub-brand (not a separate module) —
    moved to Tier 1c.
  · FOH and Reservations are different modules — the delivered icon
    is Reservations (approved); FOH still needs its own.

---

## Commissioning recommendation

You've already proved the visual direction works (EchoAurum, EchoStratus,
Culinary, Mixology pair). Don't change illustrators mid-stream — the
visual coherence across 69 icons is more valuable than any individual
icon. Same hand, same gold tone, same vignette ring weight, same
sparkle density.

**Recommended commission cadence:**

  1. **Wave 1 (close out Tier 1)** — 9 remaining Echo* platform icons.
     Highest brand visibility, gets you to a complete branded suite first.
  2. **Wave 2 (Tier 2 redo + remaining 12 departments)** — Pastry redo
     + 12 department icons. These appear on the operator home grid every
     day; they shape muscle memory.
  3. **Wave 3 (Tier 3 functional)** — 26 cross-cutting icons. Ship in
     batches by domain (finance batch, kitchen batch, FOH batch).
  4. **Wave 4 (Tier 4 UI)** — 14 chrome icons. Last because they're the
     most replaceable with a temporary library if needed.

**Rough budget at the rate the existing icons suggest** (these look
custom-illustrated, not Midjourney): $150-300/icon retail =
**$9k-18k for the remaining 61.** Negotiate a bulk rate at this
volume; should land $7-12k total. Wave 1 alone is $1.4k-2.7k.

---

## Where the registry lives

The registry pattern is documented in `docs/UX_ICON_SYSTEM.md` (D63).
This master list is the **inventory**; the registry in
`client/lib/icon-registry.ts` is the **wiring**. Adding a new module:

  1. Add a row to this master list with status `Brief ready`
  2. Commission the icon when status moves to `Approved`
  3. Drop the SVG into `client/assets/icons/{glyph}.svg`
  4. Add the registry entry in `client/lib/icon-registry.ts`
  5. Update this master list status to `Shipped`

The registry IS the single source of truth for icon-to-module mapping.
This master list IS the single source of truth for what icons exist
and what state they're in.

---

## Honest notes for the human

  · **Pastry redo delivered 2026-05-08 — approved.** Cupcake + whisks
    + rolling pin + sugar cubes + wheat sheaf reads instantly. Same
    illustrator hand as the rest of the set.

  · **2026-05-08 batch (21 icons) — 18 approved on first review.**
    Suite is now 86% commissioned at the Tier 1 / Tier 2 level. The
    illustrator is consistent — same gold tone, same vignette
    weight, same sparkle density across the set. Lock them in;
    do NOT switch illustrators.

  · **Three things to send back to the illustrator:**
    (a) Purchasing/Receiving — redo background (drop the cloud/
        lightning sky, replace with simple sparkle field on dark);
    (b) Engineering / Maintenance — fill in the empty banner with
        "ENGINEERING & MAINTENANCE" (or the human's preferred wording);
    (c) Pending the human's confirmation: which EchoStratus icon
        represents the product (cloud-weather command room vs.
        brain + dollar)?

  · **Resolved 2026-05-08:**
    (a) FOH and Reservations are different modules. The delivered
        icon is Reservations (approved). FOH still needs its own.
    (b) EchoCustomCakes is a Pastry sub-brand (not a separate
        module). Moved to Tier 1c — sub-brand assets.

  · **40px is right for the dock — but it isn't right everywhere.**
    Use the size table above. One source SVG, multiple render sizes.

  · **Don't skip the vignette ring.** It's the visual seam that holds
    69 icons together as ONE set instead of 69 individual jewels. The
    EchoAurum / Culinary / Mixology icons all have it. Every new icon
    must have it.

  · **Product badges are the other half.** Every Echo platform
    product needs BOTH a simple navigation glyph (24-64px) AND a
    detailed product badge (128-1024px). EchoAurum and EchoConcierge
    badges are approved. Don't try to use a badge as a sidebar icon —
    the text banner won't render below ~48px.

  · **The dark variant pattern is rare.** Mixology Sommelier earned
    a day/night pair because mixology has a literal day-bar / night-bar
    duality. Don't pair every icon — most modules don't have that
    duality and dual-icons would dilute the set.

  · **The D63 doc said "flat 2px stroke." That was wrong.** The icons
    you've already commissioned prove the actual direction is luxe
    gold-on-black ornate. D63 has been updated to point at this doc
    for the corrected aesthetic brief.
