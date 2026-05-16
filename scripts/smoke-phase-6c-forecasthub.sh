#!/usr/bin/env bash
set -euo pipefail

echo "Smoke Phase 6C - ForecastHub"
echo "1) Run app and open ForecastHub from sidebar."
echo "2) Verify rolling window shows Today -> +21 days."
echo "3) Adjust occupancy/reservations and click Recalculate."
echo "4) Verify TraceLedger logs FORECAST_UPDATED."
echo "5) Finance: edit weights and save override; check override event."
echo "6) Manager: propose adjustment; check proposal event."
echo "7) Confirm outputs show B/L/D covers, banquet guests, confidence, deltas."
