/** * Minimal realtime bus using Server-Sent Events (SSE). * Broadcasts"ack" events so clients (KPIHeader, Manager views) can live-refresh. */
import { EventEmitter } from "events";
export const bus = new EventEmitter(); // Keep lightweight history for late joiners (last 20 events)
const lastEvents: Array<{ type: string; payload: any; ts: number }> = [];
function remember(ev: { type: string; payload: any }) {
  lastEvents.push({ ...ev, ts: Date.now() });
  if (lastEvents.length > 20) lastEvents.shift();
}
export function publishAck(payload: {
  org_id: string;
  outlet_id: string;
  dept_id: string;
  week_start: string; // YYYY-MM-DD employee_id: string;
}) {
  const ev = { type: "ack", payload };
  remember(ev);
  bus.emit("ack", payload);
}
export function sseHandler(req: any, res: any) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  }); // Send a ping every 25s to keep connection alive const ping = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 25000); const onAck = (payload: any) => { res.write(`event: ack\ndata: ${JSON.stringify(payload)}\n\n`); }; bus.on("ack", onAck); // Send the last few events immediately (helps fast initial refresh) for (const ev of lastEvents) { res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev.payload)}\n\n`); } req.on("close", () => { clearInterval(ping); bus.off("ack", onAck); });
}
