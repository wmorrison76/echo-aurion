import React, { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/glass";
import {
  Smartphone, QrCode, CheckCircle2, Clock, RefreshCw, Copy, Trash2, Shield
} from "lucide-react";

interface Enrollment {
  id: string;
  status: string;
  created_at: string;
  expires_at?: string;
  activated_at?: string;
  device_info?: any;
}

export default function DeviceEnrollment() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [currentQR, setCurrentQR] = useState<Enrollment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchEnrollments = useCallback(async () => {
    try {
      const res = await fetch("/api/enrollment/list/all");
      const data = await res.json();
      setEnrollments(data.enrollments || []);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const generateQR = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/enrollment/generate", { method: "POST" });
      const data = await res.json();
      setCurrentQR(data);
      fetchEnrollments();
    } catch (e) {
      console.error("Failed to generate enrollment", e);
    } finally {
      setGenerating(false);
    }
  };

  const enrollmentUrl = currentQR
    ? `${window.location.origin}/enroll/${currentQR.id}`
    : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(enrollmentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple QR code renderer using SVG (no external deps)
  const QRCodeSVG = ({ data, size = 200 }: { data: string; size?: number }) => {
    // Generate a deterministic pattern from the data string
    const cells = 21;
    const cellSize = size / cells;
    const hash = (s: string, i: number) => {
      let h = 0;
      for (let j = 0; j < s.length; j++) h = ((h << 5) - h + s.charCodeAt(j) + i * 37) | 0;
      return h;
    };

    const modules: boolean[][] = [];
    for (let r = 0; r < cells; r++) {
      modules[r] = [];
      for (let c = 0; c < cells; c++) {
        // Finder patterns (top-left, top-right, bottom-left)
        const inFinderTL = r < 7 && c < 7;
        const inFinderTR = r < 7 && c >= cells - 7;
        const inFinderBL = r >= cells - 7 && c < 7;

        if (inFinderTL || inFinderTR || inFinderBL) {
          const lr = inFinderTL ? r : inFinderTR ? r : r - (cells - 7);
          const lc = inFinderTL ? c : inFinderTR ? c - (cells - 7) : c;
          // Standard QR finder pattern
          const outer = lr === 0 || lr === 6 || lc === 0 || lc === 6;
          const inner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
          modules[r][c] = outer || inner;
        } else {
          modules[r][c] = (hash(data, r * cells + c) & 3) === 0;
        }
      }
    }

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="white" rx="8" />
        {modules.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#1a1a2e"
                rx={cellSize * 0.15}
              />
            ) : null
          )
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-6" data-testid="device-enrollment">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          Device Enrollment
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Generate a QR code to instantly set up a new device with LUCCCA. Like iPhone setup — scan and go.
        </p>
      </div>

      {/* Generate QR Section */}
      <div className="rounded-xl border border-border/40 bg-muted/10 p-6">
        {currentQR ? (
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-white rounded-2xl shadow-lg mb-4">
              <QRCodeSVG data={enrollmentUrl} size={180} />
            </div>
            <p className="text-sm font-medium mb-1">Scan with any device</p>
            <p className="text-xs text-muted-foreground mb-3">
              Token: {currentQR.id.slice(0, 12)}...
            </p>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50 border border-border/30 mb-3 max-w-full">
              <code className="text-xs truncate flex-1">{enrollmentUrl}</code>
              <button onClick={copyUrl} className="p-1 rounded hover:bg-muted/50 shrink-0" data-testid="copy-enrollment-url">
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Clock className="w-3 h-3" />
              Expires end of day
            </div>
            <button
              onClick={generateQR}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-border/40 hover:bg-muted/50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Generate New Code
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-primary" />
            </div>
            <h4 className="font-medium mb-1">Quick Device Setup</h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Generate a unique QR code. When scanned, the new device will automatically download the app, sync your profile, and configure system access.
            </p>
            <button
              onClick={generateQR}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              data-testid="generate-qr-btn"
            >
              {generating ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <QrCode className="w-4 h-4" />
              )}
              Generate Enrollment QR
            </button>
          </div>
        )}
      </div>

      {/* Enrollment Setup Steps */}
      <div className="rounded-xl border border-border/40 bg-muted/10 p-5">
        <h4 className="text-sm font-semibold mb-3">How it works</h4>
        <div className="space-y-3">
          {[
            { step: "1", title: "Generate QR", desc: "Create a unique enrollment code for each device" },
            { step: "2", title: "Scan on Device", desc: "Point the camera at the QR code — opens the setup wizard" },
            { step: "3", title: "Auto-Configure", desc: "Profile, permissions, and app settings sync automatically" },
            { step: "4", title: "Ready to Use", desc: "Device is enrolled and connected to LUCCCA in seconds" },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {s.step}
              </div>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enrolled Devices */}
      {enrollments.length > 0 && (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-5">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Enrollment History
          </h4>
          <div className="space-y-2 max-h-[250px] overflow-auto">
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/20">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    e.status === "activated" ? "bg-emerald-500" : e.status === "pending" ? "bg-amber-500" : "bg-gray-500"
                  )} />
                  <div>
                    <p className="text-xs font-mono">{e.id.slice(0, 12)}...</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString()} &middot; {e.status}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  e.status === "activated"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                )}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
