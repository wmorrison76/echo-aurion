# Echo Resonance Tests

Tests are organized to mirror the source tree:

- `tests/echo_resonance/shared/types/` - type narrowing, type guards
- `tests/echo_resonance/server/services/` - service unit tests
- `tests/echo_resonance/client/` - component tests
- `tests/echo_resonance/privacy/` - **Tenet enforcement** - non-negotiable

## Tenet enforcement tests

These tests must pass before any deploy:

- `forbidden-uses.test.ts` - verifies tone signals cannot reach pricing/marketing
- `trust-score-invisible.test.ts` - verifies trust score never serializes to guest clients
- `audio-decay.test.ts` - verifies 24-hour audio purge runs and works
- `sensitive-decay.test.ts` - verifies 30-day sensitive-flag decay works
- `guest-controls.test.ts` - verifies the four privacy controls work end-to-end

## Status

Phase 1 tests scaffolded. Implementation tracks code implementation.
