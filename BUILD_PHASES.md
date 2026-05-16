# Build Phases

> Sequenced build plan. All six phases scaffolded across Packs 1, 2, and 3.

## Pre-build (status)
- [x] Firebase admin key rotated and git history cleaned (May 2026)
- [ ] Privacy policy drafted in plain language
- [ ] Aurion brand voice guidelines and four voice samples
- [ ] Speech-to-speech provider selection (default: OpenAI Realtime API)
- [ ] Pilot property selected with committed GM

## Phase 1 - Resonance MVP (Weeks 1-6) ← Pack 1
**Ship target:** working trajectory dashboard at pilot property; GM uses it during a real shift.

## Phase 2 - Voyage Foundations (Weeks 7-12) ← Pack 2
**Ship target:** real guest receives a Trip Brief, edits their plan, signals captured.

## Phase 3 - Aurion Voice (Weeks 13-20) ← Pack 2 + Pack 3 (trust UI)
**Ship target:** pre-arrival voice + in-room come-alive + privacy spine live.

## Phase 4 - Whisper to Staff (Weeks 21-26) ← Pack 2
**Ship target:** discreet earpiece integration; uncanny attentiveness on real check-ins.

## Phase 5 - Atrium and Corporate Lane (Weeks 27-32) ← Pack 3
**Ship target:** mood-tagged video, add-to-itinerary loop, corporate-event auto-build.

Files in scope (Pack 3 additions):
- server/database/migrations/020_venues.sql, 021_media_assets.sql, 022_service_credits.sql
- server/services/echo-ai3/atrium/* (venue-engine, media-library, hero-selector, narrative-composer, marketing-pipeline)
- server/services/trust/credit-engine.ts (full implementation)
- server/routes/atrium.ts
- client/lib/atrium/*
- client/components/atrium/* (HeroLoop, ActionBand, NarrativeCard, VenuePage, MediaUploadStudio)
- client/components/trust/* (ServiceCreditCard, RedemptionSuggestionCard)
- client/modules/EchoAtrium/*

## Phase 6 - The Network (Weeks 33+) ← Pack 3
**Ship target:** cross-property network effects active.

Files in scope (Pack 3 additions):
- server/database/migrations/024_cross_property_consent.sql, 025_training_corpus.sql
- shared/types/network/*
- server/services/echo-ai3/orchestrator/network/* (consent-manager, aggregator, corpus-builder, onboarding-bootstrap)

## Status legend
- **SCAFFOLD** - file exists, header only
- **STUB** - types and signatures defined, no logic
- **PARTIAL** - some functions implemented, some still TODO
- **IMPLEMENTED** - complete with tests
