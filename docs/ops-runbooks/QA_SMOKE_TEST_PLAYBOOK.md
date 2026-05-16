# QA Smoke Test Playbook — Echo Capstone

## Scope
Validates critical flows across Mixology, Sommelier, Scheduler, and Safety layers.

## Environments
- **Local:** http://localhost:${APP_PORT:-8080}
- **K8s:** Using ingress host (e.g., http://echo-capstone.local)

## Sessions
1. **Mixology Core**
   - Open EchoMixologyPanel
   - Enter recipe: Gin 45 ml (40% ABV), Vermouth 15 ml (16% ABV)
   - Expect: ABV between 30–40%, volume ≈ 60 ml
   - Change angle 60°, seconds 3 → Expected pour 60–120 ml; variance band computed
   - Bottle scanner: load sample image → fill ratio displayed (non-zero)

2. **Sommelier Pairing**
   - Open SommelierPanel
   - Adjust sliders: spice 3, fat 2, acid 1
   - Expect: Top results include Riesling or Sauvignon Blanc (score ≥ 60)

3. **Bridge Console**
   - Open SommelierMixologyConsole
   - Verify "Suggested Cocktails" renders and shows ABV + cost values
   - Click items on Mixology Wheel → console logs wheel selection

4. **Scheduler Mobile**
   - Seed store with 2 employees, 1 shift
   - Drag shift across time grid → end time updates; overlaps not required for smoke

5. **Safety / Recovery**
   - Wrap a panel with RecoveryGuard; simulate throw → fallback renders, event fired
   - Start telemetry; throw error; ensure event buffered to localStorage

## Acceptance
- No unhandled exceptions in console
- All panels render within 2s locally
- Unit tests and E2E pass
