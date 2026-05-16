import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Box, Calendar, BarChart3, Settings, Layout } from "lucide-react";

const NAV = [
  { to: "/layout", label: "EchoLayout", Icon: Layout, badge: "UNIFIED" },
  { to: "/studio", label: "Studio", Icon: Box },
  { to: "/events", label: "Events", Icon: Calendar },
  { to: "/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export default function SidebarGlass({
  autoCloseMs = 125,
  top = 48,
}: {
  autoCloseMs?: number;
  top?: number;
}) {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const t = window.setTimeout(() => setOpen(false), autoCloseMs);
    return () => window.clearTimeout(t);
  }, [autoCloseMs]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);

  const width = open ? 220 : 56;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sidebar:width", { detail: width }));
  }, [width]);

  return (
    <TooltipProvider>
      <aside
        className="fixed left-4 bottom-4 z-40"
        style={{ width, top }}
      >
        <div
          className={cn(
            "relative flex h-full w-full flex-col overflow-visible rounded-[2rem] border border-border bg-background/90 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-cyan-400/30 dark:bg-black/55 dark:text-slate-100 dark:shadow-[0_0_30px_rgba(34,211,238,0.35)]",
            "transition-[width] duration-500 ease-in-out will-change-[width]",
          )}
        >
          <button
            aria-label={open ? "Collapse" : "Expand"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="group absolute top-1/2 -right-4 z-50 hidden h-16 w-8 -translate-y-1/2 items-center justify-center rounded-r-full border border-border bg-background/85 px-1.5 py-4 shadow-lg shadow-black/10 backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:bg-background dark:border-cyan-400/40 dark:bg-slate-950/85 md:flex"
          >
            <span className="flex flex-col items-center gap-1">
              <span className="block h-4 w-0.5 rounded-full bg-current/50 transition-colors group-hover:bg-current/80" />
              <span className="block h-4 w-0.5 rounded-full bg-current/50 transition-colors group-hover:bg-current/80" />
              <span className="block h-4 w-0.5 rounded-full bg-current/50 transition-colors group-hover:bg-current/80" />
            </span>
          </button>

          <nav className="grid gap-1 p-2">
            {NAV.map(({ to, label, Icon }) => {
              const active = location.pathname === to;
              return (
                <Tooltip key={to} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <Link
                      to={to}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border border-border/70 dark:border-cyan-400/30",
                        "hover:bg-accent/40 transition-colors",
                        open ? "px-2 py-1.5" : "justify-center px-0 py-2.5",
                        active ? "ring-2 ring-primary" : undefined,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {open && <span className="text-sm font-medium">{label}</span>}
                    </Link>
                  </TooltipTrigger>
                  {!open && <TooltipContent side="right">{label}</TooltipContent>}
                </Tooltip>
              );
            })}
          </nav>

          <div className="mt-auto flex items-center justify-center p-2">
            <button
              aria-label="Toggle theme"
              onClick={() => {
                const isDark = document.documentElement.classList.toggle("dark");
                localStorage.setItem("theme", isDark ? "dark" : "light");
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/60 hover:bg-accent/50 dark:border-cyan-400/40"
              title="Light/Dark"
            >
              <span className="text-xs select-none">☀︎</span>
            </button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
