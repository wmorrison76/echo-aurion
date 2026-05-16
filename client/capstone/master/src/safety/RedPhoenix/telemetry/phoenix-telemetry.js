/**
 * Phoenix Telemetry — listens to `lu:redphoenix:error` and buffers events.
 * Flush to a configured endpoint when online; persists to localStorage as fallback.
 */
const KEY = "lu:redphoenix:telemetry:v1";

function loadBuf(){
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function saveBuf(buf){
  try { localStorage.setItem(KEY, JSON.stringify(buf)); } catch {}
}

export function startTelemetry({ endpoint=null, batch=10, intervalMs=5000 }={}){
  let buffer = loadBuf();
  async function flush(){
    if (!endpoint || buffer.length===0) return;
    const chunk = buffer.splice(0, batch);
    saveBuf(buffer);
    try {
      await fetch(endpoint, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ events: chunk }) });
    } catch (e) {
      // put events back if failed
      buffer.unshift(...chunk);
      saveBuf(buffer);
    }
  }
  const handler = (e)=>{
    const detail = e?.detail || {};
    buffer.push({ at: Date.now(), ...detail });
    if (buffer.length > 1000) buffer = buffer.slice(-1000);
    saveBuf(buffer);
  };
  window.addEventListener("lu:redphoenix:error", handler);
  const timer = setInterval(flush, intervalMs);
  return ()=>{ clearInterval(timer); window.removeEventListener("lu:redphoenix:error", handler); };
}
