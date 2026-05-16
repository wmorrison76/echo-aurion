# Integration Map

> How Echo Resonance connects to existing LUCCCA Framework modules.

The platform is **not a parallel system**. It is a layer that hooks into existing LUCCCA modules at well-defined integration points.

## Existing modules this platform hooks into

### client/modules/Guest360/
**Hook:** Profile view extended with Resonance trajectory and affinity graph.
**Files:** client/modules/EchoResonance/integrations/Guest360Extension.tsx
**Notes:** Schema additive only. Existing /api/guest360-hub/profiles endpoint untouched. New endpoint /api/resonance/guest/:id/trajectory fetched in parallel.

### client/modules/GuestIntelligence/
**Hook:** Dashboard KPIs extended with avg-lift-per-visit metric.
**Files:** client/modules/EchoResonance/integrations/GuestIntelligenceExtension.tsx

### client/modules/EchoConcierge/
**Hook:** Existing CelebrationTab becomes the manual-override surface for occasion anticipation. The /api/concierge-v2/celebration/compose cascade is the **fanout pattern Resonance reuses**.
**Files:** server/services/echo-ai3/resonance/cascade-bridge.ts

### client/modules/FOH/FOHCommandDashboard.tsx
**Hook:** New tab - "Resonance Floor View" - added to the existing dashboard.
**Files:** client/modules/EchoResonance/integrations/FOHDashboardTab.tsx
**Notes:** Existing /api/foh-ops/* endpoints untouched.

### server/services/echo-ai3/ (existing AI service quintet)
**Hook:** intelligence-orchestrator, wisdom-engine, reasoning-engine, memory-system, proactive-engine collectively become **Echo-Deep (S2)**.
**New peer:** server/services/echo-ai3/resonance/resonance-fast.ts runs as **Echo-Fast (S1)**.
**Coordination:** server/services/echo-ai3/orchestrator/handshake.ts mediates S1<->S2.

### server/services/predictive-guest-experience-service.ts
### server/services/predictive-guest-arrival-service.ts
**Hook:** These become **input feeds** to the pre-arrival forecast.
**Files:** server/services/echo-ai3/resonance/forecast-engine.ts

### server/services/department-notification-cascader.ts
**Hook:** Reused as-is. Resonance interventions cascade via the existing pattern.
**Files:** server/services/echo-ai3/resonance/cascade-bridge.ts

### client/modules/EchoAi3Canvas/ (the orb)
**Hook:** Becomes the surface for pre-arrival whispers and morning briefings to the GM.
**Files:** client/modules/EchoAurion/integrations/OrbBridge.tsx (Pack 2)

### client/modules/VoiceCommands/ & client/lib/echo-ai3/hooks/useVoiceIntegration.ts
**Hook:** Existing MediaRecorder/SpeechRecognition infrastructure reused.
**Files:** client/lib/aurion/speech-to-speech-client.ts (Pack 2)

### cognition/empathy-engine/ & client/lib/echo-ai3/cognitive/perception.ts
**Hook:** Already named for this work. The skeleton exists. Echo Resonance is the completion of an architectural intention already present in the codebase.

## Integration safety rules

1. **No existing endpoint is modified.** New endpoints only.
2. **No existing schema column is changed.** Additive migrations only.
3. **Existing UI components are extended via wrapper, never edited in place.**
4. **Existing services are imported and called.** Their internals are not modified.

## Pre-merge checklist

Before any code in this scaffolding becomes production:
- [x] Firebase admin key rotated (May 2026)
- [ ] Schema migrations reviewed by team DBA
- [ ] Routes namespaced under /api/echo-resonance/ to avoid collisions
- [ ] Feature flag at server level: ECHO_RESONANCE_ENABLED
- [ ] Pilot property identified
