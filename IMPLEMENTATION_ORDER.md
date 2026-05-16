# Implementation Order

> The canonical sequence in which to implement files. Optimized for shipping the smallest correct vertical first.

## The principle

Build the **smallest end-to-end vertical** first. A staff member captures a faint signal → the system updates a trajectory → the GM sees it on a dashboard → an intervention is suggested. Even without voice, without Voyage, without Atrium, this loop closes and is **demonstrably useful at a real shift**.

Then expand outward. Never build a layer in isolation; always build in vertical slices that can ship independently.

---

## Phase 1 — The First Slice (Weeks 1-2 of effort)

**Ship target**: A GM at the pilot property uses the trajectory dashboard during a real shift. Staff capture observations via the whisper widget. The system suggests interventions when trajectories enter the red zone.

### 1.1 Foundation (Days 1-3)

In this exact order:

1. `shared/types/base.ts` — already IMPLEMENTED, no work
2. `shared/types/signals/sensitivity.ts`
3. `shared/types/signals/tag.ts`
4. `shared/types/signals/signal.ts`
5. `shared/types/resonance/reading.ts`
6. `shared/types/resonance/score.ts`
7. `shared/types/resonance/trajectory.ts`
8. `shared/types/resonance/intervention.ts`

**Verification**: `tsc --noEmit` passes on the whole repo.

### 1.2 Schema (Day 3)

9. Translate `server/database/migrations/008_resonance_readings.sql` to your migration framework
10. Same for `009_resonance_trajectories.sql`
11. Same for `010_interventions_library.sql`
12. Same for `011_interventions_executed.sql`
13. Same for `012_signals.sql`

**Verification**: Migrations apply cleanly to a dev database. Rollback works.

### 1.3 Backend core (Days 4-7)

14. `server/services/signals/signal-recorder.ts` — single write path
15. `server/services/signals/signal-query.ts` — read path
16. `server/services/signals/signal-decay.ts` — cron, hourly
17. `client/lib/resonance/score.ts` — pure score math (testable in isolation)
18. `server/services/echo-ai3/resonance/resonance-engine.ts` — `scoreFromAffect` first, then `createReading`
19. `server/services/echo-ai3/resonance/trajectory-engine.ts` — `updateTrajectory` then `getFloorView`
20. `server/services/echo-ai3/resonance/intervention-library.ts` — start with `findCandidates` and `recordProposal`

**Verification**: Each service has unit tests passing. Submit a fake reading via integration test, watch the trajectory update, see an intervention proposed.

### 1.4 Routes (Day 8)

21. `server/routes/resonance.ts` — wire to your router
22. `server/routes/signals.ts` — wire to your router

**Verification**: `POST /api/echo-resonance/readings` accepts a reading and returns a stored ResonanceReading. `GET /api/echo-resonance/floor` returns active trajectory tiles.

### 1.5 Frontend (Days 9-12)

23. `client/lib/resonance/api.ts` — typed fetch wrappers
24. `client/lib/resonance/use-resonance.ts` — hooks (match your data-fetching library)
25. `client/lib/resonance/trajectory.ts` — sparkline data prep
26. `client/components/resonance/SparklineTile.tsx` — single tile
27. `client/components/resonance/TrajectoryDashboard.tsx` — grid of tiles
28. `client/components/resonance/WhisperWidget.tsx` — voice + tap input. **This is the screen staff will use 40 times per shift. Iterate carefully.**
29. `client/components/resonance/InterventionCard.tsx` — proposed action with one-tap approve

### 1.6 Integration (Days 13-14)

30. `client/modules/EchoResonance/index.tsx` — module entry
31. `client/modules/EchoResonance/ResonanceFloorView.tsx` — wraps TrajectoryDashboard
32. `client/modules/EchoResonance/integrations/FOHDashboardTab.tsx` — adds a tab to existing FOHCommandDashboard

### 1.7 Seed and Demo

33. Seed the intervention library with 10 templates from the founder's operating wisdom (the human will provide these)
34. Demo the full loop: staff member captures observation → trajectory updates → GM sees red tile → tap to view → approve intervention → cascade fires through existing department-notification-cascader

**Phase 1 ship target met.** GM can use this during shift.

---

## Phase 2 — Voyage Foundations (Weeks 3-4 of effort)

**Ship target**: A real guest receives a Trip Brief, edits their plan, signals captured.

In order:

1. Voyage types: `shared/types/voyage/{trip,brief,plan,map,corporate}.ts`
2. Migrations: `server/database/migrations/016_trips.sql`, `017_trip_briefs.sql`, `018_trip_blocks.sql`
3. `server/services/echo-ai3/voyage/trip-engine.ts` — booking → trip
4. `server/services/echo-ai3/voyage/plan-engine.ts` — Living Plan CRUD
5. `server/services/echo-ai3/voyage/affinity-engine.ts` — signal aggregation
6. `server/services/echo-ai3/voyage/gap-finder.ts` — empty time detection
7. `server/services/echo-ai3/voyage/suggestion-ranker.ts` — seven-criteria ranker
8. `server/services/echo-ai3/voyage/map-engine.ts`
9. `server/services/echo-ai3/voyage/unconverted-ask-tracker.ts`
10. `server/services/echo-ai3/aurion/brief-composer.ts` — used by Voyage even before voice ships
11. `server/services/echo-ai3/voyage/brief-engine.ts`
12. `server/routes/voyage.ts`
13. Client lib: `client/lib/voyage/{api,signal-recorder,plan-editor,use-voyage}.ts`
14. Client components: `TripBriefCard`, `LivingPlanTimeline`, `BlockCard`, `SuggestedFiller`, `MapPin`, `MapView`, `AddToItineraryButton`
15. Module: `client/modules/EchoVoyage/{index,TripDashboard}.tsx`

---

## Phase 3 — Aurion Voice (Weeks 5-7 of effort)

**Ship target**: Pre-arrival voice + in-room come-alive + privacy spine live.

Critical path within phase:

1. **Privacy spine first** (Tenet 5 says these are first):
   - `server/services/trust/controls-handler.ts`
   - `server/routes/trust.ts`
   - `client/components/trust/{MemoryReview,PauseAurionToggle,DeleteEverything,DataExport}.tsx`
2. Then Aurion infrastructure:
   - Aurion types
   - Migrations `server/database/migrations/013_voice_sessions.sql`, `014_prosody_readings.sql`, `023_trust_scores.sql`
   - `server/services/echo-ai3/aurion/session-manager.ts`
   - `server/services/echo-ai3/aurion/speech-to-speech-bridge.ts` (provider integration)
   - `server/services/echo-ai3/aurion/prosody-analyzer.ts`
   - `server/services/echo-ai3/aurion/conversation-memory.ts`
   - `server/services/echo-ai3/aurion/pre-arrival-orchestrator.ts`
   - `server/services/echo-ai3/aurion/in-room-orchestrator.ts`
   - `server/routes/aurion.ts`
   - Client lib: `client/lib/aurion/{speech-to-speech-client,voice-state-machine,api,use-aurion}.ts`
   - Components: `AurionVoiceButton`, `MicState`, `TranscriptView`, `PreArrivalInvitation`, `InRoomGreeting`

---

## Phase 4 — Whisper to Staff (Weeks 8-9 of effort)

**Ship target**: Discreet earpiece integration; uncanny attentiveness on real check-ins.

1. `server/database/migrations/015_staff_whispers.sql`
2. `server/services/echo-ai3/aurion/whisper-engine.ts`
3. `client/components/aurion/StaffWhisperLog.tsx`
4. `client/modules/EchoAurion/integrations/OrbBridge.tsx` — the orb pulses when whisper available
5. Earpiece hardware integration — out of code scope, but coordinate with operations

---

## Phase 5 — Atrium and Corporate (Weeks 10-12 of effort)

**Ship target**: Mood-tagged video, add-to-itinerary loop, corporate-event auto-build.

1. Atrium types
2. Migrations `server/database/migrations/020_venues.sql`, `021_media_assets.sql`, `022_service_credits.sql`
3. `server/services/echo-ai3/atrium/{venue-engine,media-library,hero-selector,narrative-composer,marketing-pipeline}.ts`
4. `server/services/trust/credit-engine.ts` — service credits + dormant-balance redemption
5. `server/routes/atrium.ts`
6. `server/services/echo-ai3/voyage/corporate-orchestrator.ts`
7. Client lib: `client/lib/atrium/{api,video-player,use-atrium}.ts`
8. Components: `HeroLoop`, `ActionBand`, `NarrativeCard`, `VenuePage`, `MediaUploadStudio`
9. Trust components: `ServiceCreditCard`, `RedemptionSuggestionCard`
10. `client/modules/EchoAtrium/index.tsx`
11. `client/modules/EchoVoyage/CorporateView.tsx`

---

## Phase 6 — The Network (Weeks 13+ of effort)

**Ship target**: Cross-property network effects active.

1. Network types
2. Migrations `server/database/migrations/024_cross_property_consent.sql`, `025_training_corpus.sql`
3. `server/services/echo-ai3/orchestrator/network/{consent-manager,aggregator,corpus-builder,onboarding-bootstrap}.ts`

---

## What to skip if you only have a week

If the human says "I have one week, build the most useful slice possible":

1. Implement only **Phase 1** (Resonance MVP). Skip everything else.
2. Within Phase 1, skip the intervention library entirely. Just build:
   - Reading capture (whisper widget)
   - Trajectory dashboard (grid of tiles)
3. The cascade can be deferred. The dashboard alone is useful — a GM walking the floor with this is already getting value.

This produces the smallest possible Echo Resonance — basically the Inn at Little Washington's mental ledger, made digital, scaled to the size of your pilot property's floor.

---

## What to ship in twelve weeks

Phase 1 + Phase 2 + the privacy spine of Phase 3. That's about twelve weeks of focused effort. The result:

- Trajectory dashboard live on the floor
- Trip Briefs going to guests pre-arrival
- Living Plan editable by guests
- Privacy spine operational (memory review, pause, delete, export)

That's a defensible, demoable, investor-talking-point-worthy product — without needing voice yet.
