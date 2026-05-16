# WebSocket Error Diagnostics & Troubleshooting

## Overview

The WebSocket error logging has been enhanced to provide detailed diagnostic information instead of vague `[object Object]` messages. This guide explains what the errors mean and how to fix them.

## What Was Fixed

### Client-Side (client/lib/websocket-client.ts)
- **Error Handler**: Now logs meaningful connection state and URL information
- **Close Handler**: Captures WebSocket close code and reason
- **Reconnection**: Tracks attempt numbers and delays for easier debugging
- **Helper Method**: Added `getReadyStateLabel()` to convert numeric states to readable names

### Server-Side (server/lib/websocket.ts)
- **Server Error Handler**: Captures error name, code, errno, and syscall
- **Connection Logging**: Includes client IP address
- **Close Handler**: Logs close codes and number of active channels
- **Server-Level Handler**: Catches WebSocket server initialization errors

## Common WebSocket Error Codes

### Close Codes (RFC 6455)

| Code | Name | Meaning | Action |
|------|------|---------|--------|
| 1000 | NORMAL_CLOSURE | Normal, intentional close | No action needed |
| 1001 | GOING_AWAY | Endpoint going away (browser tab closed) | Expected behavior |
| 1002 | PROTOCOL_ERROR | Protocol error | Check message format |
| 1003 | UNSUPPORTED_DATA | Unsupported message type | Check message structure |
| 1005 | NO_STATUS_RCVD | No close code received | Usually safe, connection issue |
| 1006 | ABNORMAL_CLOSURE | Abnormal closure (no close frame) | Network issue, will retry |
| 1008 | POLICY_VIOLATION | Policy violation | Check authentication/permissions |
| 1009 | MESSAGE_TOO_BIG | Message too large | Reduce message size |
| 1011 | SERVER_ERROR | Server error | Check server logs |

## Diagnosing WebSocket Issues

### 1. Check Browser Console
```javascript
// Look for error logs like:
// [ERROR] WebSocket connection error
// [WARN] WebSocket disconnected, attempting to reconnect
// [ERROR] Max WebSocket reconnection attempts reached
```

### 2. Check Application Logs
```bash
# Client-side logs will show:
[ERROR] WebSocket connection error {
  readyState: 3,
  readyStateLabel: "CLOSED",
  url: "ws://localhost:8080/api/ws"
}

# Server-side logs will show:
[ERROR] WebSocket server error {
  name: "Error",
  message: "...",
  code: "EACCES"
}
```

### 3. Common Issues & Solutions

#### Issue: "readyState: 3 (CLOSED)" without prior connection
**Cause**: WebSocket server not running or URL incorrect
**Solution**:
- Verify WebSocket server is running: `pnpm dev`
- Check URL is correct: `ws://localhost:8080/api/ws` (dev) or `wss://domain.com/api/ws` (production)
- Verify firewall allows WebSocket connections

#### Issue: "Connection timeout" after 3 seconds
**Cause**: Server not responding within timeout window
**Solution**:
- Check if server is overloaded
- Verify network connectivity
- Increase timeout if needed (currently 3000ms)

#### Issue: "Max reconnection attempts reached"
**Cause**: Server unavailable or not responding to WebSocket requests
**Solution**:
- Restart dev server: `pnpm dev`
- Check server logs for errors
- Verify WebSocket endpoint at `/api/ws`

#### Issue: Close code 1006 (ABNORMAL_CLOSURE)
**Cause**: Network disconnection, no close frame received
**Solution**:
- Usually temporary, automatic reconnection is configured
- Check network stability
- Increase reconnection delay if too aggressive

#### Issue: Close code 1011 (SERVER_ERROR)
**Cause**: Server-side exception in WebSocket handler
**Solution**:
- Check server error logs in detail
- Look at websocket.ts error handler output
- Verify message format is valid JSON

### 4. Manual Testing

#### Test WebSocket Connection
```javascript
// In browser console:
const ws = new WebSocket('ws://localhost:8080/api/ws');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.log('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
ws.send(JSON.stringify({ type: 'ping' }));
```

#### Check Server WebSocket Status
```bash
# Look for initialization message in server logs:
# [INFO] WebSocket server initialized on /api/ws
```

## Log Format Reference

### Client Error Logs
```javascript
{
  readyState: number,           // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
  readyStateLabel: string,      // Human-readable state
  message: string,              // Error description
  url: string                   // WebSocket URL
}
```

### Server Error Logs
```javascript
{
  name: string,                 // Error type (e.g., "Error", "EADDRINUSE")
  message: string,              // Error description
  code: string | number,        // System error code
  errno: number,                // System errno
  syscall: string,              // System call that failed
  stack: string                 // Stack trace (dev only)
}
```

## Performance Considerations

### Reconnection Strategy
- Initial delay: 1000ms
- Exponential backoff: delay doubles with each attempt
- Max attempts: 10
- Max wait time: ~17 minutes (1s * 2^10)

### Keep-Alive Ping
- Sent every 30 seconds when connection is open
- Prevents server timeout and detects stale connections
- Automatically resumed after reconnection

## Development vs Production

### Development
- WebSocket URL: `ws://localhost:8080/api/ws`
- Error stack traces logged
- Verbose logging enabled

### Production
- WebSocket URL: `wss://domain.com/api/ws` (HTTPS -> WSS)
- No stack traces in logs
- Only essential error info logged

## Verifying the Fix

After the code changes, you should see improved error messages:

**Before**:
```
[ERROR] WebSocket error [object Object] [object Object]
```

**After**:
```
[ERROR] WebSocket connection error {
  readyState: 3,
  readyStateLabel: "CLOSED",
  message: "WebSocket connection failed",
  url: "ws://localhost:8080/api/ws"
}
```

## Next Steps if Issues Persist

1. Enable debug logging: Set `VITE_LOG_LEVEL=debug` in .env
2. Check server logs for detailed error information
3. Verify WebSocket server is properly initialized
4. Test with simple WebSocket client (see manual testing above)
5. Check network tab in browser DevTools for WebSocket handshake failures

## Resources

- [RFC 6455 - WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws npm package docs](https://github.com/websockets/ws)
