# ADR-0002 · FastAPI as the Python backend framework

## Status
Accepted · pre-D series (LUCCCA founding stack)

## Context
LUCCCA needed a Python web framework that:
- Auto-generates OpenAPI specs (so the mobile + web clients can
  generate types without hand-syncing)
- First-class async/await for the I/O-heavy AI calls
- Pydantic-native request/response validation matching the
  doctrine's "no half-validated payloads" stance
- Mature ecosystem (we host enterprise-grade hospitality data;
  fringe frameworks won't pass procurement reviews)

## Decision
**FastAPI** with Pydantic v2 models throughout.

## Consequences
**Pros**
- Auto-generated `/docs` (Swagger UI) for partner engineers
- Pydantic models double as the doctrine "no half-validated"
  enforcement point — request bodies are coerced + checked
  before the route handler sees them
- Async story is first-class for the LLM seam (D17 fuse-box)
- `Depends()` lets us inject `tenant_id` resolution + audit
  emission as dependency-graph concerns

**Cons / risks**
- FastAPI's startup/shutdown hooks are simpler than Django's;
  we built our own router auto-register (D44) and seed cron
  (D25 scheduler) on top
- Documentation generated from docstrings can leak internal
  comments — solved by keeping operator surface separate from
  pass_dev surface (D29 / D36 audience gating)

**Alternatives considered**
- **Django**: heavier, ORM is opinionated against the document/
  event-log model we adopted in ADR-0001
- **Flask**: lighter, but no native async, no Pydantic, no
  OpenAPI. We'd recreate FastAPI's value-add by hand.
- **Starlette directly** (FastAPI's underlayer): too low-level;
  gives up the Pydantic + DI affordances we use everywhere

## Migration trigger
Re-evaluate when:
- Async-heavy routes start blocking each other (means our event
  loop is starved; need queue-based architecture instead)
- OpenAPI spec generation becomes a regression vector (the spec
  drifts from reality without notice)
