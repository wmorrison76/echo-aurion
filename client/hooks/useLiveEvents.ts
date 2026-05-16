/**
 * useLiveEvents — tiny WebSocket subscription hook for command dashboards
 * ---------------------------------------------------------------------
 * Connects once to the server's WS feed, filters on event_type prefixes,
 * and triggers the supplied callback. Auto-reconnects on drops.
 *
 *   const { connected } = useLiveEvents(["concierge.", "eng."], () => reload());
 */
import { useEffect, useRef, useState } from "react";

const API = typeof window !== "undefined" ? window.location.origin : "";
const WS_URL = API.replace(/^http/, "ws") + "/ws";

export function useLiveEvents(prefixes: string[], onEvent: (ev: any) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number>(0);

  useEffect(() => {
    let alive = true;
    function connect() {
      if (!alive) return;
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        ws.onopen = () => { setConnected(true); retryRef.current = 0; };
        ws.onclose = () => {
          setConnected(false);
          if (alive) {
            const delay = Math.min(10000, 500 * Math.pow(2, retryRef.current++));
            setTimeout(connect, delay);
          }
        };
        ws.onerror = () => ws.close();
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data);
            const type = (data?.type || "") as string;
            if (!type) return;
            if (prefixes.length === 0 || prefixes.some(p => type.startsWith(p))) {
              onEvent(data);
            }
          } catch {
            /* ignore */
          }
        };
      } catch {
        setTimeout(connect, 1500);
      }
    }
    connect();
    return () => {
      alive = false;
      try { wsRef.current?.close(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected };
}
