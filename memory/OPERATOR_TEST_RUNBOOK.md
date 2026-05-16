# EchoWaste Operator-Test Runbook · v1.2 Phase 1 + iter215 Hardening

**Purpose:** William is running an 8-hour preliminary operator test of EchoWaste.
This document gives Claude (or any reviewer) everything needed to analyse the
run and surface issues fast.

---

## 1 · System at a glance

| Layer | Status |
|---|---|
| **Video capture** | ✅ Real client-side frame extraction + Claude Sonnet 4.5 vision MOT (multi-object tracking). Photos removed as the default. |
| **Silent stubs** | ❌ **Removed** on vision path when `feature.vision_llm=true`. Any vision failure returns HTTP 502 + writes `vision_failed_no_stub` log. |
| **Claude vision** | ✅ Real — `claude-sonnet-4-5` via Emergent LLM Key. Cap 8 frames per capture (up from 5 in iter212). |
| **Whisper STT** | ✅ Real — `whisper-1` via Emergent LLM Key. |
| **Structured logging** | ✅ `waste_analysis_log` collection captures every LLM/vision/whisper call with timings, prompts, parsed output, errors. |
| **Twilio SMS** | ⚠ **Queued** — auth token set, but `TWILIO_ACCOUNT_SID` + `TWILIO_FROM_NUMBER` missing → every digest is persisted in `outbound_sms_queue`. Call `POST /api/waste/admin/sms/flush` after keys land. |

---

## 2 · How to send Claude the operator-test digest

1. Open **Desktop → EchoWaste panel → Analysis Logs tab**
2. Click **🤖 Copy for Claude**
3. Paste into Claude with this prompt:

> You are EchoAi³ ops reviewer. Here is the waste-analysis-log summary from our
> 8-hour operator test. Rank the top 3 issues by impact, identify any silent
> failures (mode != 'llm' but no error), note the slowest calls and whether
> they correlate with any specific capture modes, and give 5 concrete follow-ups.
> Quote `log_id`s for every claim.
>
> <paste JSON>

The summary JSON shape is:

```json
{
  "total_events": 0,
  "since": null,
  "by_event_type": {
    "<event>": {
      "count": 0,
      "errors": 0,
      "avg_ms": 0,
      "mode_mix": {"llm": N, "no_key": N, "llm_error": N}
    }
  },
  "errors": [{"log_id", "timestamp", "event_type", "type", "message", "capture_id"}],
  "slow_calls": [{"log_id", "event_type", "duration_ms", "capture_id"}],
  "captures": {"total": 0, "vision_ok": 0, "vision_failed": 0},
  "timing_percentiles_ms": {"p50": 0, "p90": 0, "p99": 0, "max": 0}
}
```

---

## 3 · Event types Claude will see

| event_type | Triggered when… | Look for |
|---|---|---|
| `vision_llm` | Every Claude vision call | `llm.mode` should be `"llm"`. Anything else = failure. |
| `vision_llm_no_result` | Claude returned but couldn't parse items | `llm.response_raw_preview` — maybe Claude added prose instead of JSON |
| `vision_failed_no_stub` | Capture refused to stub-fallback | Check surrounding `vision_llm` log for the actual cause |
| `capture_video_mot_start` | Video MOT capture began | `inputs.frames_to_analyse` + `inputs.duration_ms` |
| `capture_video_mot_done` | Video MOT finished | `outputs.per_frame_counts[]` — if all frames are 0, camera might be dark |
| `capture_video_mot_no_items` | All frames came back empty | Same as `vision_failed_no_stub` |
| `whisper_stt` | Voice → text | `llm.mode == 'llm'` + non-empty response |
| `whisper_error` | Whisper blew up | `error.message` |
| `menu_extract_vision` / `menu_extract_text` | F5 menu ingestion | Check `llm.response_parsed` for extracted items |
| `draft_recipe_extract` | F6 new dish dictation | `llm.response_raw_preview` should be JSON matching the recipe schema |

---

## 4 · API endpoints Claude may need

### Structured logs
```bash
# All logs in last N events
GET /api/waste/logs?limit=200

# Filter by event type
GET /api/waste/logs?event_type=vision_llm&limit=50

# Filter by capture_id (trace one capture end-to-end)
GET /api/waste/logs?capture_id=cap-xxxxxxxxxxx

# Summary stats
GET /api/waste/logs/summary
```

### SMS status
```bash
GET /api/waste/admin/sms/status       # credentials + queued count
POST /api/waste/admin/sms/flush       # re-dispatch queued messages
```

### Chef notification prefs (read current subscribers)
```bash
GET /api/chef-prefs/prefs -H "X-User-Id: chef-william"
GET /api/chef-prefs/chefs-to-notify?outlet_id=outlet-main&alert=buffet_close
```

### Buffet sessions
```bash
GET /api/waste/buffet/sessions?outlet_id=outlet-main&status=closed
GET /api/waste/buffet/{session_id}/cost-breakdown
GET /api/waste/par-sheet?outlet_id=outlet-main&lookback_days=14
```

### Recipe queue (pending chef approval)
```bash
GET /api/waste/recipes/suggested?status=pending_chef_review
GET /api/waste/draft-recipes?status=pending_chef_review
```

### Ground-truth samples (operator-test training data)
```bash
GET /api/waste/training/labelled
```

---

## 5 · Known limitations for this operator test

1. **Twilio SMS queued, not sent.** Every buffet-close digest is computed
   correctly and written to `outbound_sms_queue` with
   `reason=no_credentials`. Add ACCOUNT_SID + FROM_NUMBER to
   `/app/backend/.env`, then `POST /api/waste/admin/sms/flush` to dispatch.
2. **Video frame extraction happens client-side.** Requires a modern mobile
   browser (iOS Safari 14+, Android Chrome). If a chef reports "stuck at 0%"
   it's almost always a codec issue — they may have chosen a
   device-specific video format the browser can't decode. Ask them to
   switch to the default camera app.
3. **Max 8 frames per video.** Longer videos still get sampled, just at wider
   intervals. Reasoning: Claude vision cost/time. If we need more angles,
   increase `max_frames` in `/app/backend/routes/echowaste.py:capture_video_mot`.
4. **Single-outlet prefs.** Notification preferences are scoped by
   `outlet_id` so we don't spam chefs at other venues. Make sure each chef's
   prefs have the right `outlet_id` in `user_notification_prefs`.
5. **1x1 test images will fail.** Claude correctly refuses to analyse pixel
   thumbnails — this is not a bug, it's a valid `vision_llm_no_result`
   event with `llm.mode == 'llm_error'`.

---

## 6 · Recovery commands (if anything goes sideways)

```bash
# Backend restart
sudo supervisorctl restart backend

# Tail live errors
tail -f /var/log/supervisor/backend.err.log

# Count queued SMS
mongosh $MONGO_URL --quiet --eval 'db.outbound_sms_queue.countDocuments({status:"queued"})'

# Dump last 50 vision_llm_error logs
mongosh $MONGO_URL --quiet --eval '
  db.waste_analysis_log
    .find({"llm.mode":"llm_error"}, {_id:0, log_id:1, timestamp:1, "llm.duration_ms":1, error:1})
    .sort({timestamp:-1}).limit(50).toArray()
'
```

---

## 7 · Expected volume for an 8-hour test

If William runs 3 buffet services (breakfast, lunch, dinner) + ad-hoc still
captures:

- ~15 video MOT captures (3 services × 5 scans each)
- ~120 vision_llm events (15 captures × 8 frames avg)
- ~3 buffet_set + 3 buffet_close + 6 refills = 12 buffet events
- ~3 digest emissions (all queued)
- ~5 ground-truth samples
- **≈ 150 `waste_analysis_log` rows**

If you see >500, something is looping. If you see <50, people aren't using
the video capture — check the frontend loads cleanly at `/m/waste`.

---

## 8 · The 3 questions to ask Claude at the end of the test

1. *"Bucket the vision_failed events by root cause. Is it lighting, framing,
   or Claude returning prose instead of JSON?"*
2. *"What's the average end-to-end latency from capture_video_mot_start to
   capture_video_mot_done? Anything over 15 seconds?"*
3. *"Did any buffet_close digest have wildly different cost_per_cover from
   the historical_comparison? Those are the stories William cares about."*
