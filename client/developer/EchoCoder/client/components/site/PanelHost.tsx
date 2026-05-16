import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "./ThemeToggle";
import LanguageSelect from "./LanguageSelect";

// Lazy panels from existing app
const ZaroPanel = lazy(() => import("@/echo-dev-core/ZaroPanel"));
const EchoControlsPage = lazy(() => import("@/pages/EchoControls"));
const EchoCoderPanel = lazy(() => import("@/components/studio/EchoCoderPanel"));

type PanelId = "zaro" | "echo" | "settings" | "echocoder";

type OpenDetail = { id: PanelId };

type PanelEntry = { id: PanelId; title: string; element: JSX.Element };

function SettingsPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Language</div>
        <LanguageSelect />
      </div>
      <p className="text-xs text-muted-foreground">
        Panels can be opened via a browser CustomEvent named open-panel.
      </p>
    </div>
  );
}

function EchoCoderAccessGuard() {
  const [passcode, setPasscode] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("echocoder.admin.session");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
          setAuthorized(true);
        }
      }
    } catch {}
  }, []);

  const persistSession = () => {
    try {
      localStorage.setItem(
        "echocoder.admin.session",
        JSON.stringify({
          expiresAt: Date.now() + 8 * 60 * 60 * 1000,
        }),
      );
    } catch {}
  };

  const handleAuthorize = async () => {
    if (!passcode.trim()) {
      setStatus("Enter the super admin passcode.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/echocoder/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Access denied");
      }
      persistSession();
      setAuthorized(true);
      setStatus("Access granted. Creating snapshot...");
      await fetch("/api/zaro/snapshot", { method: "POST" });
      setStatus("Snapshot created. Ready to proceed.");
    } catch (error: any) {
      setStatus(error?.message || "Access failed");
    } finally {
      setBusy(false);
    }
  };

  if (!authorized) {
    return (
      <div className="space-y-3">
        <div className="text-sm font-semibold">Super Admin Access</div>
        <p className="text-xs text-muted-foreground">
          Enter the super admin passcode to unlock EchoCoder.
        </p>
        <Input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Enter passcode"
        />
        <Button onClick={handleAuthorize} disabled={busy}>
          {busy ? "Authorizing..." : "Authorize"}
        </Button>
        {status && <div className="text-xs text-muted-foreground">{status}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {status && <div className="text-xs text-muted-foreground">{status}</div>}
      <EchoCoderPanel />
    </div>
  );
}

export default function PanelHost() {
  const [open, setOpen] = useState<PanelEntry | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const shortcutPrimed = useRef<number | null>(null);

  useEffect(() => {
    let el = document.getElementById("panel-host");
    if (!el) {
      el = document.createElement("div");
      el.id = "panel-host";
      document.body.appendChild(el);
    }
    setHost(el);
    const onOpen = (e: Event) => {
      const det = (e as CustomEvent<OpenDetail>).detail;
      if (!det) return;
      const registry: Record<PanelId, PanelEntry> = {
        zaro: { id: "zaro", title: "ZARO • Guardian", element: <ZaroPanel /> },
        echo: {
          id: "echo",
          title: "Echo Controls",
          element: <EchoControlsPage />,
        },
        echocoder: {
          id: "echocoder",
          title: "EchoCoder • Super Admin",
          element: <EchoCoderAccessGuard />,
        },
        settings: {
          id: "settings",
          title: "Settings",
          element: <SettingsPanel />,
        },
      };
      setOpen(registry[det.id] || null);
    };
    window.addEventListener("open-panel", onOpen as any);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.shiftKey && event.key === "Tab") {
        shortcutPrimed.current = Date.now();
        return;
      }
      if (
        shortcutPrimed.current &&
        Date.now() - shortcutPrimed.current < 1200 &&
        event.metaKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
        shortcutPrimed.current = null;
        window.dispatchEvent(
          new CustomEvent("open-panel", { detail: { id: "echocoder" } }),
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("open-panel", onOpen as any);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!open || !host) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-[min(960px,95vw)] max-h-[90vh] overflow-auto rounded-lg border bg-background p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{open.title}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(null)}
              aria-label="Close"
            >
              ✕
            </Button>
          </div>
        </div>
        <Suspense fallback={<div className="p-6">Loading…</div>}>
          {open.element}
        </Suspense>
      </div>
    </div>,
    host,
  );
}
