import { useState } from "react";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const links = [
  { to: "/culinary", label: "Culinary" },
  { to: "/baking", label: "Baking & Pastry" },
  { to: "/sommelier", label: "Sommelier" },
  { to: "/mixology", label: "Mixology" },
  { to: "/maestro-bqts", label: "Maestro Bqts" },
  { to: "/calendar", label: "Global Calendar" },
  { to: "/echo-event-studio", label: "Echo Event Studio", external: true },
  { to: "/purchasing", label: "Purchasing & Receiving" },
  { to: "/ordering", label: "Ordering" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const [settings, setSettings] = useState(false);
  return (
    <>
      <nav
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={
          "fixed left-3 top-24 z-40 transition-[width,box-shadow] duration-200 " +
          (open ? "w-56" : "w-12") +
          " rounded-lg border bg-background/90 backdrop-blur " +
          "shadow-[0_8px_24px_rgba(0,0,0,0.15)] ring-1 ring-border/60 " +
          "dark:shadow-neon dark:ring-white/10"
        }
        style={
          { outline: "1px solid", outlineColor: "rgb(0 0 0 / 0.2)" } as any
        }
      >
        <div className="p-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold opacity-70">Menu</span>
            <button
              aria-label="Settings"
              onClick={() => setSettings(true)}
              className="p-1 rounded hover:bg-muted/50"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {links.map((l) => (
              <button
                key={l.label}
                onClick={() => {
                  if (l.external) {
                    const u = new URL(window.location.href);
                    u.port = "8080";
                    window.open(u.origin, "_blank", "noopener");
                  } else {
                    window.location.assign(l.to);
                  }
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-accent/20"
              >
                {open ? l.label : l.label[0]}
              </button>
            ))}
            <div className="h-4" />
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-panel", { detail: { id: "echo" } }),
                )
              }
              className="w-full text-left px-2 py-1 rounded hover:bg-accent/20"
            >
              {open ? "Echo Controls" : "E"}
            </button>
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-panel", { detail: { id: "echocoder" } }),
                )
              }
              className="w-full text-left px-2 py-1 rounded hover:bg-accent/20"
            >
              {open ? "EchoCoder Admin" : "C"}
            </button>
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-panel", { detail: { id: "zaro" } }),
                )
              }
              className="w-full text-left px-2 py-1 rounded hover:bg-accent/20"
            >
              {open ? "ZARO Guardian" : "Z"}
            </button>
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-panel", { detail: { id: "settings" } }),
                )
              }
              className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/20"
            >
              <Settings className="h-4 w-4" />
              {open ? "Settings" : "S"}
            </button>
          </div>
        </div>
      </nav>

      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-3">
            <div>Access EchoCoder Studio:</div>
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-1 hover:bg-accent/20"
            >
              Open Studio
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
