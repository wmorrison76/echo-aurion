# Environment variables (Whiteboard & VideoConference)

Use these in `.env` or `.env.local` (with `VITE_` prefix so Vite exposes them to the client).

## Feature flags

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_FEATURE_OPEN_WHITEBOARD_FROM_VIDEO` | Show "Open whiteboard" in Video Conference when room has linked board | enabled (`"false"` to disable) |
| `VITE_FEATURE_JITSI_INTERVIEW` | Enable Jitsi video call in Whiteboard Interview mode | enabled |
| `VITE_FEATURE_VIDEO_RECORDING` | Enable recording in Video Conference | enabled |

## Jitsi (Whiteboard Interview mode)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_JITSI_DOMAIN` | Jitsi Meet server domain (e.g. self-hosted) | `meet.jit.si` |

## Video Conference (Daily.co)

Daily.co room URLs are built as `https://${room.dailyRoomName}.daily.co/`. For custom deployments, ensure the token and room APIs point to your backend; the iframe domain is derived from the room name. API keys and base URLs for the **backend** (token endpoint, etc.) should be configured in server-side env, not `VITE_*`.

## Audit / telemetry

Panel open/close and video room join/leave are emitted as `audit:entry` on the OS Bus. Subscribe to `audit:entry` to forward events to your analytics or compliance pipeline. Include org and user context in the payload when available.
