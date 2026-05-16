# Feature Toggles — Echo Control Panel

## How it works
- Default flags are defined in `src/feature-flags/flags.json`.
- Overrides are stored in `localStorage` under `echo:feature-flags:v1`.
- Use the `withFeature(Component, "FlagName")` HOC to gate any UI.
- `useFeature("FlagName")` provides `{ on, toggle }` for ad-hoc checks.

## Typical flags
- EchoMixologyAI
- EchoSommelier
- SommelierMixologyBridge
- LiquorAI
- VisualSyncLiveControl
- MobileScheduler
- RedPhoenixRecovery
- Telemetry
- MixologyWheel
- SommelierMergeConsole

## Security note
- Flags are client-side; they hide UI but do not enforce server access. For server auth, gate APIs separately.
