# {Module Name}

> **Module path:** `client/modules/{ModuleSlug}/` + `backend/routes/{...}.py`
> **Audience:** {Manager / Chef / Server / Employee / Admin / Guest}
> **Status:** {Stable / Beta / Experimental}
> **Last updated:** YYYY-MM-DD by {author}

---

## In one sentence

{What this module does, in one sentence a non-technical operator would understand.}

## Who uses it

{Specific roles and what their day-to-day reason for using this module is.}

## Top tasks (3-click flows)

For each common task, list the click path from home:

| Task | Path | Click count | Voice intent |
|---|---|---|---|
| {Task name} | Home → tile → ... | N | "{voice phrase}" |
| ... | ... | ... | ... |

## Key concepts

{Bullet list of nouns / verbs the operator needs to know to use this module fluently. 5-10 items max.}

  - **{Concept}** — definition + how it relates to the operator's mental model
  - ...

## Backend endpoints

| Method | Path | Purpose | Audience |
|---|---|---|---|
| GET | `/api/.../foo` | ... | operator / pass_dev |
| POST | `/api/.../bar` | ... | ... |

## Doctrine alignment

  - **§1.4 voice register**: {how this module enforces audience boundaries}
  - **§2.5 framing**: {how this module avoids accusatory language}
  - **§2.6 never throw the pan**: {how this module hides per-individual data
    on operator surfaces}
  - **§3.1 append-only**: {how this module preserves historical records}
  - **D27 tenant isolation**: {how `tenant_id` is enforced}

## Data this module reads / writes

| Collection | Read | Write | Notes |
|---|---|---|---|
| `{collection_name}` | yes | yes | ... |

## Integration points (D17 fuse-box seams)

{If this module talks to a third-party vendor, list the seam location and what real adapter would plug in.}

  - `services/clients.py:get_xxx_client()` — adapter slot for {Vendor}

## Common operator questions

  · **"Why didn't I see X?"** — {answer}
  · **"How do I undo Y?"** — {answer}
  · **"Where does this data go?"** — {answer}

## Known limitations

{Honest list of what this module doesn't do, and links to the deferred follow-up.}

## Doctrine cross-references

  · ADR-0001 (Mongo as event store) — relevant because {...}
  · ADR-0003 (D17 fuse-box) — relevant because {...}
  · ADR-0005 (doctrine-as-contract) — relevant because {...}

## Changelog (this module)

  - YYYY-MM-DD · D{N} · {brief summary of change}

---

*This file is the single source of truth. Public docs site, in-app
help, and the help agent all render from this same file.*
