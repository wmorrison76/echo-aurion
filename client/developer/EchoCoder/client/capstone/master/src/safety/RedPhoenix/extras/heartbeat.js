/**
 * Heartbeat monitor — pings periodically and emits warning if paused.
 */
export function startHeartbeat(interval=5000){
  let last = Date.now();
  const timer = setInterval(()=>{
    const now = Date.now();
    if (now - last > interval*2) console.warn("[RedPhoenix] Heartbeat missed");
    last = now;
  }, interval);
  return ()=> clearInterval(timer);
}
