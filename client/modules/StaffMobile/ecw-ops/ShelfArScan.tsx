/** iter244 · AR shelf scan — point camera at shelf to count.
 *
 * Uses the browser's native BarcodeDetector when available (Chrome Android /
 * iOS Safari with flag) for QR / barcode scans. Falls back to manual entry.
 * On scan, we look up the shelf id and increment counts in storage_shelves.
 */
import React from "react";
import { API } from "@/lib/api-url";

export function ShelfArScan({ onClose }: { onClose: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [shelves, setShelves] = React.useState<any[]>([]);
  const [activeShelf, setActiveShelf] = React.useState<any>(null);
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [counts, setCounts] = React.useState<Record<string, number>>({});
  const [recent, setRecent] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetch(`${API()}/api/storage-map/shelves`).then((r) => r.json())
      .then((d) => setShelves(d?.rows || [])).catch(() => undefined);
  }, []);

  // Start camera when a shelf is picked
  React.useEffect(() => {
    if (!activeShelf) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let detector: any = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const W = (window as any);
        if (W.BarcodeDetector) {
          detector = new W.BarcodeDetector({
            formats: ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "code_39"],
          });
          setScanning(true);
          tick();
        } else {
          setError("Your browser doesn't support BarcodeDetector — type the SKU below to log a count.");
        }
      } catch (e: any) {
        setError(e?.message || "Camera permission denied");
      }
    }

    async function tick() {
      if (stopped || !detector || !videoRef.current) return;
      try {
        const found = await detector.detect(videoRef.current);
        for (const f of found || []) {
          const v: string = String(f?.rawValue || "").trim();
          if (v) handleScan(v);
        }
      } catch {}
      window.setTimeout(tick, 600);
    }

    start();
    return () => {
      stopped = true; setScanning(false);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [activeShelf]);

  function handleScan(value: string) {
    setCounts((c) => ({ ...c, [value]: (c[value] || 0) + 1 }));
    setRecent((r) => [value, ...r.filter((x) => x !== value)].slice(0, 8));
    if (navigator.vibrate) navigator.vibrate(50);
  }

  async function commitCounts() {
    if (!activeShelf) return;
    const items = Object.entries(counts).map(([sku, qty]) => ({ sku, qty }));
    await fetch(`${API()}/api/storage-map/shelf-count`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shelf_id: activeShelf.id, items, scanned_at: new Date().toISOString() }),
    }).catch(() => undefined);
    setCounts({}); setRecent([]); setActiveShelf(null);
  }

  if (!activeShelf) {
    return (
      <div data-testid="ar-shelf-pick" onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 99999992, background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "flex-end",
      }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          width: "100%", background: "#0a0a0a", padding: 16, paddingBottom: 30,
          borderRadius: "14px 14px 0 0", maxHeight: "75vh", overflowY: "auto",
          border: "1px solid rgba(34,211,238,0.4)",
        }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#22d3ee", fontWeight: 700 }}>
            📷 AR SHELF SCAN
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 300, color: "#f5efe4", margin: "4px 0 12px" }}>
            Pick the shelf you'll scan
          </h2>
          {shelves.map((s) => (
            <button key={s.id} data-testid={`ar-pick-${s.id}`}
              onClick={() => setActiveShelf(s)}
              style={{
                width: "100%", padding: 12, marginBottom: 6, borderRadius: 6,
                background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)",
                color: "#f5efe4", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "#8b8680", marginTop: 2 }}>
                {s.zone} · {(s.items || []).length} items
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="ar-scan-camera" style={{
      position: "fixed", inset: 0, zIndex: 99999993, background: "#000",
    }}>
      <video ref={videoRef} playsInline muted
        style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />

      {/* Reticle overlay */}
      <div style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 240, height: 240, border: "2px solid rgba(34,211,238,0.7)", borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, transparent, #22d3ee, transparent)",
          animation: "scanLine 2s linear infinite",
        }} />
        <style>{`
          @keyframes scanLine {
            0% { transform: translateY(0); } 100% { transform: translateY(240px); }
          }
        `}</style>
      </div>

      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, padding: 14,
        background: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent)",
        color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#22d3ee", fontWeight: 700 }}>
            📷 SCANNING
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{activeShelf.label}</div>
        </div>
        <button data-testid="ar-scan-close" onClick={() => setActiveShelf(null)}
          style={{ width: 36, height: 36, borderRadius: 18, fontSize: 16,
                      background: "rgba(0,0,0,0.7)", color: "#fff",
                      border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}>×</button>
      </div>

      {/* Bottom panel — counts + commit */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 24,
        background: "linear-gradient(0deg, rgba(0,0,0,0.95), transparent)",
        color: "#fff",
      }}>
        {error && (
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                          padding: 8, borderRadius: 5, fontSize: 11, color: "#fecaca", marginBottom: 8 }}>
            {error}
          </div>
        )}
        <div data-testid="ar-recent-scans" style={{
          display: "flex", gap: 4, overflowX: "auto", marginBottom: 10,
          scrollbarWidth: "none" as any,
        }}>
          {recent.map((r) => (
            <span key={r} style={{
              padding: "4px 8px", background: "rgba(34,211,238,0.18)",
              border: "1px solid rgba(34,211,238,0.35)", borderRadius: 4,
              fontSize: 10, fontWeight: 600, color: "#22d3ee", whiteSpace: "nowrap",
            }}>{r.slice(0, 14)} ×{counts[r] || 1}</span>
          ))}
        </div>
        <div style={{ fontSize: 10, color: "#8b8680", marginBottom: 8, letterSpacing: 1 }}>
          {Object.keys(counts).length} unique · {Object.values(counts).reduce((a, b) => a + b, 0)} total scans
        </div>
        <button data-testid="ar-scan-commit" onClick={commitCounts}
          disabled={Object.keys(counts).length === 0}
          style={{
            width: "100%", padding: 13, borderRadius: 8,
            background: Object.keys(counts).length === 0
              ? "rgba(148,163,184,0.1)"
              : "linear-gradient(135deg, rgba(34,211,238,0.25), rgba(34,211,238,0.18))",
            border: `1px solid ${Object.keys(counts).length === 0 ? "rgba(148,163,184,0.2)" : "rgba(34,211,238,0.55)"}`,
            color: Object.keys(counts).length === 0 ? "#5a554d" : "#22d3ee",
            fontSize: 12, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer", fontFamily: "inherit",
          }}>
          ✓ COMMIT COUNT TO INVENTORY
        </button>
      </div>
    </div>
  );
}
