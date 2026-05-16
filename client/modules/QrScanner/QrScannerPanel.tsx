/**
 * QR Scanner — iter265 P1 enhancement.
 *
 * Three flows in one camera-based panel:
 *   1. MyEcho Punch (hourly/salary)  — scan employee badge → record clock-in
 *   2. Guest Concierge magic-link    — scan magic-link QR → /api/concierge-magic/verify
 *   3. Asset / PO scan               — scan equipment or PO QR → look up record
 *
 * Uses the browser-native BarcodeDetector API where available (Chrome,
 * Android Chrome, Safari 17+). Falls back to a paste-the-token textbox
 * so the panel still works on older browsers or desktops without a
 * camera.
 */
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { QrCode, Camera, Clock, Users, Package, CheckCircle2, XCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

type Mode = "punch" | "concierge" | "asset";

interface ScanResult {
  ok: boolean;
  mode: Mode;
  raw: string;
  parsed?: any;
  message: string;
  at: string;
}

declare global {
  interface Window {
    BarcodeDetector?: any;
  }
}

export default function QrScannerPanel() {
  const [mode, setMode] = useState<Mode>("punch");
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [manual, setManual] = useState("");
  const [history, setHistory] = useState<ScanResult[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);

  // ─── Detect BarcodeDetector support ───
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("BarcodeDetector" in window) {
      setSupported(true);
      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ["qr_code", "code_128", "ean_13", "ean_8"],
        });
      } catch {
        setSupported(false);
      }
    } else {
      setSupported(false);
    }
  }, []);

  // ─── Start/stop camera ───
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      if (detectorRef.current && videoRef.current) {
        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            if (codes && codes.length > 0) {
              await handleScan(codes[0].rawValue);
            }
          } catch {
            /* keep scanning */
          }
        }, 500);
      }
    } catch (e: any) {
      pushResult({
        ok: false,
        mode,
        raw: "",
        message: `Camera denied: ${e?.message ?? e}`,
        at: new Date().toISOString(),
      });
    }
  }

  function stopCamera() {
    setScanning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function pushResult(r: ScanResult) {
    setHistory((prev) => [r, ...prev].slice(0, 20));
  }

  // ─── Handle a scanned (or pasted) value ───
  async function handleScan(raw: string) {
    if (!raw) return;
    stopCamera();
    try {
      if (mode === "punch") {
        // MyEcho punch: payload is employee badge token
        const res = await fetch(`${API_BASE}/api/myecho/punch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ badge_token: raw, direction: "auto" }),
        });
        const data = await res.json();
        pushResult({
          ok: res.ok,
          mode,
          raw,
          parsed: data,
          message: res.ok
            ? `${data.employee_name || "Employee"} · ${data.direction || "punched"}`
            : data.detail || "Punch failed",
          at: new Date().toISOString(),
        });
      } else if (mode === "concierge") {
        const res = await fetch(`${API_BASE}/api/concierge-magic/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: raw }),
        });
        const data = await res.json();
        pushResult({
          ok: res.ok,
          mode,
          raw,
          parsed: data,
          message: res.ok
            ? `${data.guest_name || "Guest"} · room ${data.room || "?"}`
            : data.detail || "Invalid magic link",
          at: new Date().toISOString(),
        });
      } else {
        // Asset/PO — try asset first, fall back to PO
        let res = await fetch(
          `${API_BASE}/api/assets/lookup?code=${encodeURIComponent(raw)}`,
        );
        let kind = "asset";
        if (!res.ok || res.status === 404) {
          res = await fetch(
            `${API_BASE}/api/purchasing/po/lookup?code=${encodeURIComponent(raw)}`,
          );
          kind = "po";
        }
        const data = res.ok ? await res.json() : { detail: "not found" };
        pushResult({
          ok: res.ok,
          mode,
          raw,
          parsed: { kind, ...data },
          message: res.ok
            ? `${kind === "asset" ? "Asset" : "PO"} ${data.id || raw} found`
            : `Not found: ${raw}`,
          at: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      pushResult({
        ok: false,
        mode,
        raw,
        message: e?.message ?? String(e),
        at: new Date().toISOString(),
      });
    }
  }

  return (
    <div className="p-4 space-y-4" data-testid="qr-scanner-panel">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <QrCode className="h-6 w-6 text-sky-600" />
          QR Scanner
        </h2>
        {supported === false && (
          <Badge variant="outline" className="text-amber-700 border-amber-300">
            BarcodeDetector not supported — use paste fallback
          </Badge>
        )}
      </header>

      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} data-testid="qr-mode-tabs">
        <TabsList>
          <TabsTrigger value="punch" data-testid="qr-mode-punch">
            <Clock className="h-4 w-4 mr-1" />
            MyEcho Punch
          </TabsTrigger>
          <TabsTrigger value="concierge" data-testid="qr-mode-concierge">
            <Users className="h-4 w-4 mr-1" />
            Guest Concierge
          </TabsTrigger>
          <TabsTrigger value="asset" data-testid="qr-mode-asset">
            <Package className="h-4 w-4 mr-1" />
            Asset / PO
          </TabsTrigger>
        </TabsList>

        {(["punch", "concierge", "asset"] as Mode[]).map((m) => (
          <TabsContent key={m} value={m}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Camera
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video bg-black rounded overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                      data-testid="qr-video"
                    />
                    {!scanning && (
                      <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                        Camera idle
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {!scanning ? (
                      <Button
                        size="sm"
                        onClick={startCamera}
                        disabled={supported === false}
                        data-testid="qr-start-camera-btn"
                      >
                        Start
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={stopCamera}
                        data-testid="qr-stop-camera-btn"
                      >
                        Stop
                      </Button>
                    )}
                    <Input
                      placeholder="…or paste token / code here"
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                      data-testid="qr-manual-input"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (manual.trim()) {
                          handleScan(manual.trim());
                          setManual("");
                        }
                      }}
                      data-testid="qr-manual-submit-btn"
                    >
                      Submit
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent scans</CardTitle>
                </CardHeader>
                <CardContent className="max-h-80 overflow-y-auto space-y-2">
                  {history.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No scans yet</p>
                  ) : (
                    history.map((h, i) => (
                      <div
                        key={i}
                        className={`text-sm border-l-4 pl-3 py-1 ${
                          h.ok ? "border-emerald-400 bg-emerald-50/40" : "border-red-400 bg-red-50/40"
                        }`}
                        data-testid={`scan-result-${i}`}
                      >
                        <p className="flex items-center gap-1 font-medium">
                          {h.ok ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          {h.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {h.raw.slice(0, 60)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(h.at).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
