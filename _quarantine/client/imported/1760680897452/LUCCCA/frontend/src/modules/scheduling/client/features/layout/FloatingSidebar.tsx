import { useEffect, useRef, useState } from "react";
import {
  Layers3,
  BookOpen,
  CalendarDays,
  DollarSign,
  BarChart2,
  Star,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  ScrollText,
  Scale,
  CalendarClock,
  Users,
  Activity,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface Item {
  label: string;
  href?: string;
  icon: JSX.Element;
}

const DEFAULT_ITEMS: Item[] = [
  {
    icon: <Layers3 className="w-4 h-4" />,
    label: "Dashboard",
    href: "#dashboard",
  },
  {
    icon: <Layers3 className="w-4 h-4" />,
    label: "Scheduler Board",
    href: "#scheduler",
  },
  {
    icon: <BookOpen className="w-4 h-4" />,
    label: "LMS Control Panel",
    href: "#lms",
  },
  {
    icon: <CalendarDays className="w-4 h-4" />,
    label: "Schedule Checker",
    href: "#checker",
  },
  {
    icon: <DollarSign className="w-4 h-4" />,
    label: "Finance + GL Costing",
    href: "#finance",
  },
  {
    icon: <BarChart2 className="w-4 h-4" />,
    label: "Analytics & Reports",
    href: "#analytics",
  },
  {
    icon: <Star className="w-4 h-4" />,
    label: "Staff Ratings",
    href: "#ratings",
  },
  // New links from header chips
  {
    icon: <ShieldCheck className="w-4 h-4" />,
    label: "Legal & Compliance",
    href: "#legal",
  },
  {
    icon: <ScrollText className="w-4 h-4" />,
    label: "Union Agreements",
    href: "#union",
  },
  {
    icon: <Scale className="w-4 h-4" />,
    label: "Employee Rights",
    href: "#rights",
  },
  {
    icon: <BarChart2 className="w-4 h-4" />,
    label: "Analytics",
    href: "#analytics",
  },
  {
    icon: <DollarSign className="w-4 h-4" />,
    label: "Financial",
    href: "#financial",
  },
  {
    icon: <CalendarClock className="w-4 h-4" />,
    label: "Time-off",
    href: "#timeoff",
  },
  {
    icon: <Users className="w-4 h-4" />,
    label: "Attendance",
    href: "#attendance",
  },
  {
    icon: <Activity className="w-4 h-4" />,
    label: "Reliability",
    href: "#reliability",
  },
];

export default function FloatingSidebar({
  items = DEFAULT_ITEMS,
  autoCloseMs = 425,
}: {
  items?: Item[];
  autoCloseMs?: number;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>();
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

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
        "fixed left-2 top-14 z-40 select-none",
        "rounded-xl border backdrop-blur",
        // Neon/glow in dark, subtle in light
        "dark:shadow-[0_0_25px_rgba(56,189,248,0.25)] dark:border-cyan-500/40 dark:outline dark:outline-1 dark:outline-cyan-400/30",
        "shadow-md border-black/10",
        "bg-background/80",
        "transition-[width] duration-300 ease-out",
      ].join(" ")}
      style={{ width: open ? 232 : 56 }}
      aria-label="Floating sidebar"
    >
      <div className="p-2">
        <button
          aria-label={open ? "Collapse" : "Expand"}
          onClick={() => setOpen((o) => !o)}
          className="mb-2 w-full inline-flex items-center justify-center rounded-md border hover:bg-accent/60 transition-colors"
        >
          {open ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
        </button>
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
                  key === "dashboard"
                    ? "dashboard"
                    : key === "lms"
                      ? "lms"
                      : key === "analytics"
                        ? it.label.includes("Reports")
                          ? "analytics"
                          : "analytics-settings"
                        : key === "finance"
                          ? "financial"
                          : key === "financial"
                            ? "financial"
                            : key === "legal"
                              ? "legal"
                              : key === "union"
                                ? "union"
                                : key === "rights"
                                  ? "employee"
                                  : key === "ratings"
                                    ? "ratings"
                                    : key === "timeoff"
                                      ? "timeoff"
                                      : key === "attendance"
                                        ? "attendance"
                                        : key === "reliability"
                                          ? "reliability"
                                          : key === "checker"
                                            ? "checker"
                                            : "";
                if (target) {
                  e.preventDefault();
                  window.dispatchEvent(
                    new CustomEvent(`shiftflow:open-${target}` as any),
                  );
                  setOpen(false);
                } else {
                  window.location.hash = href;
                }
              }}
              className={`w-full text-left group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/60 transition-colors ${it.label.includes("Scheduler") ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              {it.icon}
              <span
                className={`whitespace-nowrap overflow-hidden transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 w-0"} `}
              >
                {it.label}
              </span>
            </button>
          ))}
        </nav>
        <div className="mt-2 h-px bg-border" />
        <div className="pt-2 flex justify-center">
          <div
            className={`transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <div className="text-xs text-muted-foreground">Theme</div>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-center">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
