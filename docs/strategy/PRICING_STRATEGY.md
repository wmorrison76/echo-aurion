# Echo / LUCCCA Pricing Strategy

> Defensible pricing model for the platform. Built around the
> hospitality unit economics, sized against comparable SaaS pricing
> in the market, defensible to investors and customers.

---

## The pricing thesis in one paragraph

Echo / LUCCCA prices on **value delivered, not seats consumed.** A
luxury hospitality operator pays roughly **0.4–0.8% of property
revenue** for the platform — well within the standard "platform
cost" line that already exists in their P&L for fragmented point
solutions (Toast, Avero, Tripleseat, Hotelligence360, ADP, etc.) —
and consolidates ~$40–80k of fragmented annual SaaS spend into one
platform that does more, integrates better, and learns over time.

The pricing is **per property + per outlet**, with a tiered base.
Per-user seat pricing is rejected because it creates perverse
incentives (operators ration logins to lower the bill, which
reduces engagement and value capture).

---

## 1. Customer unit economics — the math we price against

A typical luxury independent property (the Echo wedge):

| Metric | Range |
|---|---|
| Annual revenue | $25M – $80M |
| Outlets | 5–12 (restaurant + bar + IRD + banquet + spa + retail + cafe + housekeeping) |
| Operating margin | 22–32% |
| Annual SaaS / tech budget | $250k – $700k (1–1.5% of revenue) |
| Current point solutions per property | 8–14 vendors |

Their existing fragmented stack typically includes:
- POS: Toast / Aloha / Micros (~$20-50k/yr)
- PMS: Opera / Mews / Cloudbeds (~$25-60k/yr)
- Reservations / banquet: Tripleseat / Delphi (~$15-30k/yr)
- F&B inventory + recipe: BevSpot / xtraCHEF (~$10-25k/yr)
- Forecasting / BI: Avero / Hotelligence360 (~$25-50k/yr)
- Payroll: ADP / Gusto (~$10-30k/yr)
- Concierge: Knowcross / ALICE (~$15-40k/yr)
- Other: 5–7 smaller tools at $5-15k each

**Total point-solution stack: ~$130-300k/yr per property,
fragmented, with 80% of the operator-grade intelligence buried
inside per-vendor dashboards that don't talk to each other.**

Echo / LUCCCA replaces ~60–75% of this with one integrated
platform.

---

## 2. The pricing model

### Tier structure

| Tier | Property revenue | Outlet count | Annual contract value |
|---|---|---:|---:|
| **Boutique** | <$15M | 1–4 outlets | $36,000–$72,000 |
| **Independent** | $15–40M | 5–8 outlets | $96,000–$180,000 |
| **Estate** | $40–100M | 9–14 outlets | $216,000–$420,000 |
| **Resort** | $100M+ | 15+ outlets | $480,000–$840,000+ |
| **Multi-property (chain)** | n/a | per-property + consolidation fee | volume discount applies |

### Mathematical structure

```
Annual fee = base_fee + (outlet_count × outlet_fee) + add_on_modules
```

Where:
- **base_fee** = $24,000 (Boutique) / $48,000 (Independent) /
  $96,000 (Estate) / $180,000 (Resort)
- **outlet_fee** = $6,000–$12,000/outlet/yr (sliding by tier)
- **add-on modules** = optional premium features:
  - Echo Resonance (voice + tone analysis): +$24k/yr/property
  - Echo Concierge (guest journey orchestration): +$36k/yr/property
  - Echo AI³ premium (Claude-powered Q&A, board pack drafting): +$24k/yr/property
  - Multi-property consolidation: +$48k/yr/parent entity

### Real example — a 7-outlet Independent property

```
Base (Independent tier):       $ 48,000
7 outlets × $9,000:            $ 63,000
Echo Resonance add-on:         $ 24,000
                               ─────────
Annual contract value:         $135,000
                               ─────────
% of $30M revenue:                0.45%
```

That $135k replaces ~$140-180k in fragmented point solutions plus
adds the doctrine-based intelligence layer no point solution
delivers.

---

## 3. Why per-property + per-outlet (not per-user-seat)

**Per-user pricing fails for hospitality:**

  · Operators ration logins → low engagement → low value capture →
    low renewal probability
  · Mobile-first MyEcho means every employee touches the platform;
    seat pricing makes it economically irrational to give them
    access
  · The platform's value is the **operating system**, not the
    individual logins; pricing should reflect that

**Per-outlet pricing aligns to value:**

  · Each new outlet = more capture-ratio data, more forecast
    leverage, more cross-outlet benchmarking value
  · Operators add outlets as the property grows (cabana bar, pop-up
    restaurant, expanded spa); pricing scales with their growth
  · Easy to forecast for the customer: "we're adding a sushi
    counter; that's +$9k/yr" is straightforward

**Per-property base captures fixed value:**

  · The base fee covers the modules that are property-wide
    regardless of outlet count (financial close, forecasting,
    payroll, P&L, doctrine framework, audit log)
  · Tiered base reflects the operational complexity of larger
    properties — a $100M property has more transactions,
    more reporting overhead, more compliance surface

---

## 4. Pricing comparables

How the model lines up with hospitality SaaS competitors:

| Vendor | Pricing model | Typical ACV | What you get |
|---|---|---|---|
| **Toast Hospitality** (POS only) | Per-location + per-terminal + percent of payments | $30-80k/property/yr | POS, reporting, basic loyalty |
| **Avero** (BI for hospitality) | Per-property tiered | $30-100k/property/yr | F&B BI, sales analysis, labor |
| **Hotelligence360** | Per-property + add-ons | $40-120k/property/yr | Channel mgmt + revenue mgmt |
| **Tripleseat** | Per-venue + per-event | $15-50k/property/yr | Banquet event mgmt |
| **Mews / Cloudbeds / Opera** (PMS) | Per-room + add-ons | $25-80k/property/yr | PMS, guest journey, integrations |
| **Knowcross / ALICE** (concierge) | Per-room + add-ons | $15-50k/property/yr | Service operations |
| **Echo / LUCCCA** | Per-property + per-outlet + add-ons | **$96-420k/property/yr (Independent + Estate)** | All of the above, integrated, with the doctrine layer + active learning |

Echo's pricing is **higher than any individual competitor** but
**lower than the sum of competitors it replaces.** That's the
defensible pricing thesis: consolidating the stack saves the
operator real money while delivering more value.

---

## 5. Discount + concession framework

### Standard discounts (publishable)

| Discount | Trigger | Magnitude |
|---|---|---|
| Multi-year prepay | 2-yr commit prepaid | -10% |
| 3-yr commit prepaid | 3-yr commit prepaid | -15% |
| Multi-property | 2nd property at same parent entity | -10% on additional properties |
| 3+ properties | 3rd+ property at same parent entity | -15% on additional properties |
| Design partner | First 3 customers; co-development LOI | -25% for 24 months, then list |
| Education / nonprofit hospitality | 501(c)(3) operator | -20% |

### Non-standard concessions (require approval)

  · Custom integration work — billed at $300/hr, $5k minimum
  · White-label or rebrand — only at the Resort+ tier; +50% list
  · Trial periods longer than 30 days — only with a written LOI
  · "Just the financial modules" carve-out — minimum $48k/yr
    (we don't atomize the platform below that floor)

---

## 6. Implementation + onboarding fee

A one-time fee for the white-glove onboarding:

| Tier | Implementation fee | Includes |
|---|---|---|
| Boutique | $7,500 | Self-serve onboarding wizard + 4 hrs Customer Success |
| Independent | $25,000 | Guided onboarding + 12 hrs CS + integration mapping |
| Estate | $60,000 | Dedicated CS engineer + custom integration work + 30 hrs |
| Resort | $120,000+ | Full white-glove + executive sponsor + on-site option |

Implementation fees can be waived for design partners + the first
5 customers.

---

## 7. The Echo Resonance pricing carve-out (privacy doctrine)

Echo Resonance — voice analysis, tone signals, behavioral
inference — is a **separate add-on module** with its own pricing
structure. It's not bundled into the base fee because:

  1. Some customers (luxury independents in EU/UK markets) won't
     buy voice analysis at all due to GDPR posture even with our
     Privacy Tenets
  2. The Resonance value is real but discrete; bundling it into
     the base obscures both the cost and the value
  3. Carve-out makes the customer's procurement / privacy office
     more comfortable

**Resonance pricing:** +$24k/yr per property, plus a
"$0.02-per-guest-interaction" usage tier above 100k interactions/mo.

---

## 8. Annual price increases

Standard pricing escalator: **CPI + 3%** annually, capped at 7%.
This is the standard SaaS pricing language; investors and
customers both expect it.

For multi-year prepay deals, the rate is **locked at signing** —
that's the carrot for prepaying.

---

## 9. The economic story that closes deals

When pitching to a property GM or CFO, the closing math is:

> *"You're spending $140-180k per year today on 8-10 fragmented
> vendors that don't talk to each other. Echo replaces 6 of them
> + adds the doctrine intelligence layer for $135k. Within 90 days
> of go-live, our typical customer captures 5-15% labor cost
> reduction and 8-12% margin improvement on F&B. The platform
> pays for itself by month 4."*

The key is the math has to be true. The CFO toolkit modules (B.6
recipe variance, B.7 vendor Pareto, B.8 labor productivity) are
specifically designed so the customer can verify the savings
themselves in real time.

---

## 10. Open pricing questions to test in market

The pricing above is the **default starting position**. The
following are intentionally open and will be calibrated based on
the first 3-5 customer conversations:

  1. **Outlet vs cover-volume pricing** — should outlets that do
     <50 covers/day pay less than outlets that do 200+? (Currently
     no; same fee per outlet.) Test it.
  2. **Implementation fee waiver depth** — design partners get free
     implementation; should it scale to first 10 customers? First
     20?
  3. **Module unbundling** — could we sell "just EchoAurum" for
     $36k/yr to operators who don't want the full platform yet?
     (Risk: cannibalizes full-platform sales. Reward: faster
     adoption, lower-risk entry.)
  4. **Per-room vs per-outlet** — for properties where rooms-
     revenue dominates (resorts), does per-room pricing make more
     sense? Test against resort tier.

These are explicitly *to be answered in the field*, not from a
spreadsheet.

---

## Honest closing

The pricing above is structured for the operator to say yes. It's
high enough that we can run the company on a small number of
customers (10 Independent-tier customers = $1.35M ARR; 30 = $4M
ARR; 100 = $13.5M ARR) and low enough that no procurement office
gags on the math.

**Test variable 1: implementation fee.** If 3+ customers refuse
because of the upfront fee, restructure as 12-month amortization.
**Test variable 2: outlet fee.** If customers feel "but Outlet X
barely does any volume," consider a 50% rate for outlets <$500k
revenue.

Don't discount the base fee below the listed tier. The base fee
is what funds the platform's continued investment; eroding it
erodes the entire model.
