# Health Checks — Echo Capstone

## Kubernetes probes
- **Liveness**: GET `/` every 30s after initial 10s
- **Readiness**: GET `/` every 10s after initial 5s

## Manual script
- `bash scripts/health_check.sh http://localhost:8080`
  - Exit 0 if HTTP 200
  - Exit 1 otherwise

## Observability tie-in
- Integrate with RedPhoenix telemetry to capture `lu:redphoenix:error` events
- Consider Prometheus scraping nginx access logs for request metrics
