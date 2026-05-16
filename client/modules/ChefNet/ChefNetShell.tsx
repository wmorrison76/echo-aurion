import { useEffect, useRef, useState } from "react";
import {
  Bell,
  MessageSquare,
  PanelLeft,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "inbox", label: "Inbox", icon: MessageSquare },
  { id: "team", label: "Team", icon: Users },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "trust", label: "Trust & Safety", icon: ShieldCheck },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function ChefNetShell() {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("inbox");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const onEnter = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(true);
  };

  const onLeave = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), 125);
  };

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <aside
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="absolute left-0 top-0 z-40 select-none h-full border-r border-border/70 bg-background/85 backdrop-blur-xl shadow-xl transition-[width] duration-300 ease-out"
        style={{ width: open ? 236 : 56 }}
        aria-label="ChefNet sidebar"
      >
        <div className="flex h-full flex-col p-2">
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen((value) => !value)}
            className="mb-2 inline-flex h-9 w-full items-center justify-center rounded-md border border-border/70 bg-background/70 hover:bg-accent/60 transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="mb-3 px-2 pt-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">
              ChefNet
            </div>
            {open ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Team communication & approvals
              </div>
            ) : null}
          </div>

          <nav className="grid gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={
                    `flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition-colors ` +
                    (isActive
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span
                    className={`whitespace-nowrap overflow-hidden transition-all duration-200 ${
                      open ? "opacity-100 w-auto" : "opacity-0 w-0"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="min-h-svh pl-14 md:pl-60">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">ChefNet</h1>
            <p className="text-muted-foreground">
              Messaging, team status, and operational alerts.
            </p>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="text-sm font-medium">Inbox</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Open messages, action items, and unread mentions.
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="text-sm font-medium">Team</div>
              <div className="mt-2 text-sm text-muted-foreground">
                View who is on shift and what they are working on.
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="text-sm font-medium">Alerts</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Watch for urgent updates and operational escalations.
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
              Active section
            </div>
            <div className="mt-2 text-lg font-semibold capitalize">{activeTab}</div>
            <p className="mt-2 text-sm text-muted-foreground">
              ChefNet is ready to plug into the rest of the LUCCCA framework.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
