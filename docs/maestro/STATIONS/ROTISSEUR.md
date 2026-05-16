# Rôtisseur

> The roast cook. *Highest-stakes, lowest-tolerance station. Timing is everything.*

## The role

In a classical brigade, the rôtisseur runs the proteins. The steaks. The chops. The roasts. *Sub-300ms is the rôtisseur's threshold.* You do not get to take an extra minute on the steak because the table is "almost ready." It goes out hot or it goes back. *Hot.*

In this kitchen, the rôtisseur is **Voice & Realtime**. Speech-to-speech. Prosody analysis. The voice state machine. The earpiece whisper protocol. Sub-300ms latency engineering.

## Why this is its own station

Most platforms treat voice as a feature. In this kitchen, voice is the *signature dish*. The Inn at Little Washington's prosody capture, Aurion's pre-arrival opt-in conversation, the in-room come-alive, the discreet earpiece whisper to staff — these are the experiences that define the platform's emotional bandwidth. They either land below 300ms or they do not land at all.

The rôtisseur owns this latency budget like the roast cook owns doneness. *No excuses. No "it's almost there." It either ships hot or it goes back.*

## What the rôtisseur owns

**Speech-to-speech bridge.** `server/services/echo-ai3/aurion/speech-to-speech-bridge.ts`. The provider integration (default OpenAI Realtime; secondary providers slot in via the adapter pattern). WebRTC plumbing. Audio streaming both directions.

**Prosody analyzer.** `server/services/echo-ai3/aurion/prosody-analyzer.ts`. Audio-to-affect-coordinate conversion. *The audio chunk is not retained after analysis* — tenet 2 enforced at the rôtisseur's station.

**Voice state machine.** `client/lib/aurion/voice-state-machine.ts`. Pure state transitions. Idle to connecting to listening to thinking to speaking to paused. The state machine is the dance the orb performs.

**The earpiece whisper protocol.** `server/services/echo-ai3/aurion/whisper-engine.ts`. The five-to-ten-second briefs that go to staff during guest interactions. Direction not dialogue. Latency budget: 200ms from triggering event to whisper start.

**Latency monitoring.** Every voice path measured at p50, p95, p99. Regressions caught immediately. The rôtisseur is the only chef who watches a stopwatch every shift.

## What the rôtisseur does NOT own

- The text content of voice prompts (that is brief-composer, owned by a demi or the pass) — the rôtisseur owns *how it sounds*, not *what it says*
- The visual orb (entremetier) — though the rôtisseur and entremetier coordinate closely
- The privacy spine (sous) — though the rôtisseur enforces tenet 2 directly at their station

## The rôtisseur's discipline

A roast cook owns *the meat from the moment it hits the pan to the moment it lands on the pass.* They do not hand it off mid-cook. They do not let someone else turn the steak. *The chef who started it finishes it.*

In code: *the rôtisseur owns the entire latency path end to end.* From browser microphone capture to provider response to UI playback. They do not optimize the middle and let the ends slip. They measure the whole path and they own the whole path.

If any link in the chain regresses, the rôtisseur fixes it — even if "technically" the regression was in another team's code. *The plate is the plate.* The chef who shipped voice owns voice working.

## What "done" looks like for the rôtisseur

A voice path is done when:
1. End-to-end latency is below 300ms p95 on the target hardware (mobile and web)
2. Audio is never written to disk — verified by integration test (tenet 2)
3. Prosody readings persist; raw audio does not — verified
4. The voice state machine handles all transitions cleanly with no orphaned states
5. The provider adapter is genuinely swappable (verified by writing a stub second-provider adapter that compiles)
6. Telemetry exists for p50/p95/p99 latency, surfaced on the GM dashboard for ops visibility

If any of those is false, the plate does not fire.

## Who staffs this station

- Real-time systems experience
- WebRTC familiarity
- Comfort with audio engineering basics
- Obsessive about latency
- Patient with edge cases (network blips, provider hiccups, browser quirks)

For an AI Maestro setup, this station benefits from a model with strong systems-programming reasoning and the discipline to measure, not estimate, performance.

---

> *"The steak goes out hot or it goes back. There is no third option."*
