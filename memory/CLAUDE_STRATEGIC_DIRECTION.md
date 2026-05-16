# EchoWaste Strategic Direction — Authoritative

_Source: Claude Opus review of E1's 34-question brief, Feb 2026._

## Core architecture shift
1. **Fingerprint-first, Sonnet-fallback** — not Sonnet every time
2. **Progressive analysis**: ≤2s preliminary (fingerprint match) → ≤10s final (Sonnet 4.6) → background enrichment
3. **Kill 3D for MVP** — count × portion math wins. Revisit Phase 3.
4. **Shadow-mode self-teaching from day 1** — log everything, confirm-twice to promote
5. **EchoYield Collective Intelligence Network** — fingerprints shared across properties (Phase 2)
6. **Visual anchors + IMU** for buffet retrace precision

## Targets (gates)
| Metric | Target |
|---|---|
| Capture duration | 10–15s per section |
| Preliminary latency | ≤2s |
| Final latency | ≤10s |
| Item ID accuracy | ≥85% |
| Count accuracy | ≥90% |
| Cost accuracy | ±10% |

## Key decisions
- Model: `claude-sonnet-4-5` (our key's best, we lack Sonnet 4.6/Opus on Emergent key)
- Device: iOS Safari 16+ primary, Android graceful-degrade
- Storage: MongoDB Atlas Vector Search for embeddings (we're on MongoDB)
- Chef correction: verify-every-capture for 4 weeks, then graduate on 500-captures + <15% error + >60% library hit
- Browser-only for MVP (revisit native post-validation)

## Cost ladder
- Week 1: ~5% fingerprint hit (cold start)
- Week 4: ~40% hit
- Month 3: ~75%+75% local + 15% collective + 10% Sonnet
- Month 12: >90% local+collective, Sonnet for novelty only

## Privacy walls (Collective Network)
- Fingerprints only, no pixels / no property / no chef / no menus / no faces
- Confirm by ≥3 independent properties before "validated"
- Property opt-out toggle, annual audit, GDPR/CCPA documented
