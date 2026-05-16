# ADR-0001 · MongoDB as the event-log substrate

## Status
Accepted · 2026-04-23 (D28)

## Context
The Echo AI³ doctrine requires an append-only event log (§3.1
"no compression, ever"). Every prediction, every chef edit, every
allergen alert, every payroll run gets a row that survives even
when the surface UI no longer shows it. The event log is the
backbone of D29 retrospective replay, D38 cross-correlation, and
the audit chain that lets the controller prove what happened.

We considered Postgres (with append-only triggers + tablespace
versioning), Kafka (true event-log architecture), and MongoDB.

## Decision
**MongoDB as the canonical store**, with append-only enforcement
in the application layer (every write goes through
`echo.events.append_event` which never mutates prior rows).

## Consequences
**Pros**
- Document model fits the heterogeneous payload shapes (payroll
  paystubs, plating QC findings, BEO digests, allergen alerts —
  all in one chain with `kind` discriminator)
- Fast read by `(tenant_id, kind, created_at)` once D53.2 indexes
  are in place
- No schema migration ceremony when a new auditor adds a new
  finding kind

**Cons / risks**
- Mongo isn't truly transactional out of the box (D53.8 helper
  addresses this; replica-set deployment required)
- Append-only is enforced in code, not the DB. Mongo will let
  you delete a row if you call `delete_one`. Safety net: the
  audit trail in `audit_log` collection captures every D27/D28
  write so unauthorized deletion is detectable.

**Alternatives considered**
- **Kafka**: stronger event-log primitive, but query story for
  arbitrary `(tenant_id, kind, range)` lookups requires a
  derived projection (Kafka Streams / KSQL / materialize). Ops
  overhead too high for solo-operator stage.
- **Postgres + jsonb**: would work but the heterogeneous payloads
  push us toward jsonb everywhere, which loses Postgres' indexing
  advantage. Plus we'd carry Postgres ops burden alongside the
  Mongo deployments LUCCCA already has.

## Migration trigger
Re-evaluate when:
- Total event-log size exceeds 1TB
- Cross-tenant analytics need cube-style queries (Postgres + jsonb
  with materialized views may win then)
- Real-time streaming consumers (D38 correlation as live stream)
  outgrow polling
