import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  BarChart2,
  BookOpen,
  CalendarDays,
  Clock,
  DollarSign,
  FileText,
  Layers3,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

interface Item {
  label: string;
  href?: string;
  icon: ReactNode;
}

const DEFAULT_ITEMS: Item[] = [
  {
    icon: <Layers3 className="w-4 h-4" />,
    label: "Scheduler",
    href: "#scheduler",
  },
  {
    icon: <BookOpen className="w-4 h-4" />,
    label: "LMS Standards",
    href: "#lms",
  },
  {
    icon: <CalendarDays className="w-4 h-4" />,
    label: "Forecast",
    href: "#forecast",
  },
  {
    icon: <FileText className="w-4 h-4" />,
    label: "Reports",
    href: "#reports",
  },
  {
    icon: <BarChart2 className="w-4 h-4" />,
    label: "Analytics & Reports",
    href: "#analytics",
  },
  {
    icon: <DollarSign className="w-4 h-4" />,
    label: "Finance + GL Costing",
    href: "#finance",
  },
  {
    icon: <Star className="w-4 h-4" />,
    label: "Staff Ratings",
    href: "#ratings",
  },
  { icon: <Clock className="w-4 h-4" />, label: "Time Off", href: "#timeoff" },
  {
    icon: <Users className="w-4 h-4" />,
    label: "Attendance",
    href: "#attendance",
  },
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    label: "Legal & Compliance",
    href: "#legal",
  },
];

export default function FloatingSidebar({
  items = DEFAULT_ITEMS,
  autoCloseMs = 125,
}: {
  items?: Item[];
  autoCloseMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>();

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function onEnter() {
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(true);
  }

  function onLeave() {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), autoCloseMs);
  }

  return (
    <aside
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={[
        "absolute left-4 top-4 z-40 select-none",
        "h-[calc(100%-2rem)]",
      ].join(" ")}
      style={{ width: open ? 232 : 56 }}
      aria-label="Floating sidebar"
    >
      <div
        className={[
          "relative flex h-full w-full flex-col overflow-visible rounded-[2rem] border border-border bg-background/90 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl",
          "dark:border-cyan-500/40 dark:bg-black/55 dark:text-slate-100 dark:shadow-[0_0_25px_rgba(56,189,248,0.25)]",
          "transition-[width] duration-300 ease-out",
        ].join(" ")}
      >
        <button
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="group absolute top-1/2 -right-4 z-50 hidden h-16 w-8 -translate-y-1/2 items-center justify-center rounded-r-full border border-border bg-background/85 px-1.5 py-4 shadow-lg shadow-black/10 backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:bg-background dark:border-cyan-400/40 dark:bg-slate-950/85 md:flex"
        >
          <span className="flex flex-col items-center gap-1">
            <span className="block h-4 w-0.5 rounded-full bg-current/50 transition-colors group-hover:bg-current/80" />
            <span className="block h-4 w-0.5 rounded-full bg-current/50 transition-colors group-hover:bg-current/80" />
            <span className="block h-4 w-0.5 rounded-full bg-current/50 transition-colors group-hover:bg-current/80" />
          </span>
        </button>

        <div className="p-2">
          <nav className="space-y-1">
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                onClick={(e) => {
                  const href = it.href || "";
                  if (!href.startsWith("#")) return;
                  const key = href.slice(1);
                  const target =
                    key === "scheduler"
                      ? "scheduler"
                      : key === "lms"
                        ? "lms"
                        : key === "forecast"
                          ? "forecast"
                          : key === "reports"
                            ? "reports"
                            : key === "analytics"
                              ? "analytics"
                              : key === "finance"
                                ? "financial"
                                : key === "ratings"
                                  ? "ratings"
                                  : key === "timeoff"
                                    ? "timeoff"
                                    : key === "attendance"
                                      ? "attendance"
                                      : key === "legal"
                                        ? "legal"
                                        : "";

                  if (target) {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent(`shiftflow:open-${target}`));
                    setOpen(false);
                  } else {
                    window.location.hash = href;
                  }
                }}
                className={`w-full group flex items-center gap-2 rounded-2xl border border-border/70 px-2 py-2 text-left transition-colors hover:bg-accent/60 dark:border-cyan-400/30 ${
                  it.label.includes("Scheduler")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                } ${open ? "justify-start" : "justify-center px-0"}`}
              >
                {it.icon}
                <span
                  className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${open ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"}`}
                >
                  {it.label}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
