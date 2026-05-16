# P.9 — Cap Table 101 + Starter Template + Tooling

> **You asked: "cap table might be built but I don't know what
> it is."** This document is the from-scratch explainer.

---

## What a cap table is, in plain English

A **capitalization table** ("cap table") is a single spreadsheet
that answers one question: **"who owns what percentage of the
company?"** Every share of stock, every option grant, every
warrant, every convertible note — all of it on one document.

It's the artifact that 409A reviewers, investors, acquirers, and
auditors look at first because it's the answer to "what are we
buying?" or "what are we valuing?"

A clean cap table makes due diligence painless. A messy or
missing cap table delays funding by weeks and can kill deals.

For Echo / LUCCCA today, your cap table is probably very simple:
**you own 100% of the founder common stock issued at incorporation.**
That's the right starting state. The work is to *write it down
correctly* so it stays clean as the company grows.

---

## The pieces of a cap table

| Term | What it means | Typical numbers |
|---|---|---|
| **Authorized shares** | The total shares the company COULD issue, set in the certificate of incorporation | 10,000,000 typical for a Delaware C-corp |
| **Issued shares** | Shares actually issued to someone | 8,000,000 to founder + 2,000,000 unissued reserved for the option pool |
| **Outstanding shares** | Issued shares that haven't been bought back; the basis for ownership % | Usually = issued shares |
| **Common stock** | What founders + employees + most option holders get | Lower priority in liquidation |
| **Preferred stock** | What investors get | Senior in liquidation; protective rights |
| **Option pool** | Shares reserved for future employee grants | 10-15% pre-seed; 15-20% pre-Series A |
| **Vesting** | The schedule by which someone earns their shares over time | Standard: 4 years with 1-year cliff, monthly thereafter |
| **Cliff** | The minimum time before any vesting kicks in | Standard: 12 months |
| **Strike price** | What an option-holder pays to exercise an option | Typically the 409A FMV at grant date |
| **FMV (fair market value)** | What the common stock is worth per share for tax purposes | Set by the 409A valuation |
| **Fully diluted shares** | All issued + all reserved + all options + all warrants + all convertibles, as if everyone exercised | The denominator for "diluted ownership %" |

---

## Your starter cap table (from where you are today)

Assuming you incorporated as Aurion Holdings, Inc. with the standard
Delaware C-corp setup:

```
AURION HOLDINGS, INC. — CAPITALIZATION TABLE
As of: [DATE OF INCORPORATION]

AUTHORIZED SHARES
  Common Stock:                       10,000,000
  Preferred Stock:                             0  (none authorized yet)
  Total Authorized:                   10,000,000

ISSUED + OUTSTANDING SHARES (at $0.0001 par value)

Holder                   Shares      % Outstanding   % Fully-Diluted   Vesting
─────────────────────────────────────────────────────────────────────────────
William Morrison       8,000,000        100.0%           80.0%        4yr/1yr cliff
                                                                       starting [DATE]

OPTION POOL (reserved, not issued)
Reserved for future
  employee grants     2,000,000          n/a             20.0%        per grant

TOTAL FULLY DILUTED  10,000,000                          100.0%
```

That's the starter state. The percentages move when:
  · You issue stock to a co-founder (rare — you've said you're solo)
  · You issue option grants to first hires (chips out of the option
    pool)
  · You raise a seed round (issues new preferred shares; dilutes
    everyone proportionally)

### The math when you raise a seed round

Suppose you raise $1.5M at a $7.5M post-money valuation on a SAFE
or a priced round. Roughly:

  · Investors get 20% of the post-money company
  · You + the option pool dilute from 100% to ~80% of the post-
    money fully diluted total
  · Your founder shares (8M) stay 8M, but the denominator goes
    from 10M to ~12.5M, so your % drops

A cap table tool calculates this automatically. Doing it by hand
is error-prone and painful.

---

## Founder vesting — the part most solo founders skip and regret

Even though you're solo, **you should put your founder shares
on a 4-year vesting schedule with a 1-year cliff.** Investors will
require this when you raise. Doing it now is cheap; doing it
later means giving up shares you thought you owned.

The mechanism: instead of holding 8,000,000 shares outright, you
hold them subject to a vesting schedule:
  · 0% vested at issuance
  · 25% vest at the 1-year anniversary (the "cliff")
  · 1/48 vest each month thereafter
  · 100% vested at the 4-year anniversary

If you leave (or get fired by a future board) before fully vested,
the company can repurchase the unvested shares at par value.

**Why this matters:** if you DON'T have founder vesting and you
later hire a co-founder who quits at month 13, they walk with 50%
of the company. With vesting, they walk with 12.5% (the vested
portion) and the company gets the rest back to redistribute.

Standard founder vesting also includes:
  · **Single-trigger acceleration** on involuntary termination
    (you get bought out, fired without cause)
  · **Double-trigger acceleration** on change-of-control AND
    involuntary termination within 12-24 months of close

Your attorney sets this up via a Restricted Stock Purchase
Agreement (RSPA). Cost: included in the $1,500-2,500 founder
package. Time: ~2 weeks.

**Important: file an 83(b) election within 30 days of buying the
stock.** This locks in the tax treatment so you don't owe income
tax on the spread between strike and fair value at each vesting
date. Skipping this is the single most expensive mistake a
founder can make. Your attorney will remind you; do not miss it.

---

## The 409A valuation — what it is and why you need it

A **409A valuation** is an independent appraisal of your common
stock's fair market value (FMV). It's required because:

  · IRS Section 409A penalizes employees if you grant options at
    a strike price *below* FMV. The penalty is 20% additional tax
    on top of regular income tax, plus interest.
  · So you need a defensible FMV to set option strike prices.
  · The valuation must be done by an "independent" appraiser (you
    can't do it yourself).

A 409A is required when:
  · You're about to grant your first stock options (to first hire)
  · You're about to raise a priced round (preferred stock changes
    the common's value)
  · You haven't had one in the last 12 months

For a pre-seed company with no revenue and no funding, a 409A
typically values the common stock at **$0.001 to $0.05 per share.**
Once you raise seed, it jumps to $0.10-0.50/share. Once Series A,
$0.50-2.00.

### Cost + timing

  · **DIY tools (Carta, Pulley, etc.):** included in the $200-
    600/month subscription. Turnaround: 5-15 business days.
  · **Independent firms (Aranca, Scalar, Andersen, Murphy McCann):**
    $5,000-15,000 standalone. Turnaround: 3-4 weeks.

**For your stage, use Carta or Pulley's built-in 409A.** The bundled
tools have made this cheap. Don't pay BigLaw rates here.

---

## Cap table tooling — the comparison

| Tool | Best for | Pricing (approx) | 409A included? |
|---|---|---|---|
| **Carta** | Most common; everyone in venture knows it | $200-1,500/mo depending on number of stakeholders + features | Yes (Carta 409A) |
| **Pulley** | Cheaper, modern, founder-friendly | $200-800/mo | Yes |
| **AngelList Stack** | Free option tier; good for early stage | Free → paid tiers | Through partner |
| **Eqvista** | Cheap option | $150-500/mo | Yes |
| **Excel / Google Sheets** | Fine for the literal first 6 months | Free | Not by itself |

**Recommendation for your stage:** **Pulley** or **Carta Launch
(free tier).**
  · Pulley's pre-seed pricing is the lowest and the UX is the
    cleanest.
  · Carta's brand recognition is the strongest with investors.
  · Either is fine. **Don't keep your cap table in a spreadsheet
    once you have more than 2 stakeholders.**

---

## Your starter cap table CSV (drop this into Pulley or Carta)

Save the following as `cap_table_starter.csv` and import it into
your chosen tool. The tool will normalize and audit-trail it.

```csv
holder_name,holder_email,security_type,share_class,shares,issue_date,vesting_start_date,vesting_term_months,cliff_months,certificate_number
William Morrison,[your email],founder_common,Common,8000000,[INCORPORATION_DATE],[VESTING_START_DATE],48,12,CS-1
[Future Pool],,option_pool_reserved,Common,2000000,[INCORPORATION_DATE],,,,
```

Replace the bracketed fields. The vesting_start_date is typically
the same as the incorporation date, but you can set it to your
"first day of working on the company" if that was earlier and your
attorney advises (some founders backdate vesting to capture pre-
incorporation work; this needs care).

---

## What you do this week

1. **Find your incorporation paperwork.** You should have:
   · Certificate of Incorporation (Delaware, filed by your
     attorney or via Stripe Atlas / Clerky / OpenForms)
   · Bylaws
   · Stock purchase agreement (the founder common shares)
   · 83(b) election filing receipt (if filed)
   · EIN (employer identification number from the IRS)

   If you don't have these, that's the first homework. Use
   **Stripe Atlas ($500), Clerky ($349-799), or a Delaware C-
   corp attorney ($1,500-3,000).** All of them produce the same
   output paperwork.

2. **Verify your 83(b) election was filed within 30 days of
   stock issuance.** If you missed it, talk to a tax attorney
   immediately — there are sometimes ways to mitigate.

3. **Confirm your founder vesting schedule.** If you didn't put
   your founder shares on a vesting schedule, retroactively
   doing it requires consideration to be paid; an attorney can
   structure this. Cost: $500-1,500.

4. **Pick a cap table tool.** Pulley, Carta, or AngelList Stack.
   Sign up; import the starter CSV.

5. **Get your 409A valuation done.** Through Pulley or Carta is
   simplest at this stage. Cost: bundled with the subscription
   at the entry tier.

6. **File the cap table in the company records folder** alongside
   your incorporation docs.

---

## Estimated cost + time

| Item | Cost | Time |
|---|---|---|
| Verify incorporation paperwork is in order | $0 (or $500 to redo via Stripe Atlas) | 1 hour |
| Founder vesting set up via RSPA + 83(b) | $500-1,500 | 1-2 weeks |
| Cap table tool (Pulley or Carta) | $0-300/mo | 30 min to set up |
| 409A valuation (bundled with tool) | $0 (free tier) - $1,500 | 5-15 business days |
| **Total** | **$500-3,000 + $0-300/mo** | **~3 weeks** |

Cap table cleanup is one of the cheapest items on the institutional
checklist. The cost is mostly one-time legal time to structure the
founder vesting; after that, the tool maintains itself for ~$200/mo.

---

## What "first thing a 409A reviewer reads" looks like in practice

When a 409A appraiser, an investor, or an acquirer gets your cap
table, they check:

  1. **Total fully diluted shares** — does it tie to the
     authorized share count + the option pool? (Catch: companies
     that grant options exceeding the authorized pool.)
  2. **Founder shares vested vs unvested** — is the founder
     committed (vested portion small relative to total)?
  3. **Option grants** — strike price = 409A FMV at grant date?
     Vesting schedule conventional (4yr/1yr cliff)?
  4. **Convertible notes / SAFEs** — terms reasonable? Maximum
     valuation cap? Discount rate?
  5. **Preferred stock terms** — liquidation preference 1x non-
     participating (founder-friendly) vs 2x participating
     (investor-friendly)?
  6. **Anti-dilution** — broad-based weighted-average (founder-
     friendly) vs full ratchet (rare and harsh)?
  7. **Drag-along rights** — present and balanced?
  8. **Information rights** — present and reasonable?

For a clean pre-seed cap table (just founder shares + option
pool reserve), most of these are blank. **Blank is good at this
stage.** It means you haven't taken bad terms from someone yet.

---

## Honest closing

You're solo. Your cap table is going to be the simplest one a
reviewer ever sees: 100% founder common, with a 20% option pool
reserved. **Get it written down correctly in a real tool, get
your founder vesting on paper, and get the 409A done.** That's
the entire P.9 lift, and it costs ~$500-3,000 plus ~$200/mo
tooling for the rest of the company's life.

Once it's clean, every subsequent grant, every fundraise, every
diligence pass, just adds rows to the table. The tool maintains
the integrity. Your job is to keep the inputs clean.
