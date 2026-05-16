# Monitoring Runbook

## Signals
- Frontend availability (HTTP 200 on `/`)
- JS runtime errors (window.onerror + RedPhoenix telemetry)
- Basic metrics: request rate, latency (nginx logs or reverse proxy)

## Triage
- If UI fails to load, check nginx logs and liveness probe in K8s
- If error boundary shows, export telemetry buffer and attach to incident

## Tools
- `scripts/health_check.sh <url>`
- `src/safety/RedPhoenix/telemetry/phoenix-telemetry.js`
- `src/safety/RedPhoenix/cli/commands/bulk.js` (drift checks)
