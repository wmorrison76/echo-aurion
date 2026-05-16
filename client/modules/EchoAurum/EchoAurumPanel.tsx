import React, { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  LineChart,
  ChevronRight,
  Activity,
  ShieldCheck,
  Landmark,
  Eye,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { AurumLayoutModeProvider } from "./client/components/layout/AurumLayoutMode";
import { useSession as useAurumSession } from "./client/modules/auth/hooks/useSession";
import SafePageLoader from "./EchoAurumPageLoader";

const Badge = ({ children, variant = "secondary", ...props }: any) => (
  <span
    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-surface/20 rounded-md"
    {...props}
  >
    {children}
  </span>
);

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface NavItem {
  label: string;
  id: string;
  icon: React.ReactNode;
  description: string;
  category: "operations" | "reporting" | "compliance" | "admin";
}

const APP_NAV_ITEMS: NavItem[] = [
  {
    label: "Financial Dashboard",
    id: "dashboard",
    icon: <Activity className="h-5 w-5" />,
    description: "Health grade + real-time monitoring",
    category: "operations",
  },
  {
    label: "GL Operations",
    id: "gl",
    icon: <LineChart className="h-5 w-5" />,
    description: "Journal entries & close workflows",
    category: "operations",
  },
  {
    label: "Accounts Payable",
    id: "ap",
    icon: <DollarSign className="h-5 w-5" />,
    description: "Invoice processing, matching & payments",
    category: "operations",
  },
  {
    label: "Approvals & Controls",
    id: "approvals",
    icon: <ShieldCheck className="h-5 w-5" />,
    description: "Approve postings & enforce policy",
    category: "operations",
  },
  {
    label: "Bank Reconciliation",
    id: "reconciliation",
    icon: <Landmark className="h-5 w-5" />,
    description: "Match statements to the GL",
    category: "operations",
  },
  {
    label: "CFO Console",
    id: "console",
    icon: <Activity className="h-5 w-5" />,
    description: "All workflows in one console",
    category: "operations",
  },
  {
    label: "Purchasing & Costing",
    id: "purchasing",
    icon: <LineChart className="h-5 w-5" />,
    description: "PO management & vendor insights",
    category: "operations",
  },
  {
    label: "Financial Reports",
    id: "reports",
    icon: <LineChart className="h-5 w-5" />,
    description: "P&L, balance sheet, variance",
    category: "reporting",
  },
  {
    label: "USALI Reports",
    id: "financial-reports",
    icon: <LineChart className="h-5 w-5" />,
    description: "Hotel accounting standards",
    category: "reporting",
  },
  {
    label: "P&L Drivers",
    id: "pnl-drivers",
    icon: <Sliders className="h-5 w-5" />,
    description: "Configure forecasting drivers",
    category: "reporting",
  },
  {
    label: "Guardian Oversight",
    id: "guardian",
    icon: <Eye className="h-5 w-5" />,
    description: "Fraud, controls, anomalies",
    category: "compliance",
  },
  {
    label: "Audit & Compliance",
    id: "audit",
    icon: <LineChart className="h-5 w-5" />,
    description: "Readiness, findings, evidence",
    category: "compliance",
  },
  {
    label: "Administration",
    id: "admin",
    icon: <LineChart className="h-5 w-5" />,
    description: "Users, outlets, config",
    category: "admin",
  },
];

export default function EchoAurumPanel() {
  const period = useMemo(() => getCurrentPeriod(), []);
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isAuthenticated } = useAuth();
  const { session, status, issueSession } = useAurumSession();

  useEffect(() => {
    if (isAuthenticated && !session && status === "unauthenticated") {
      issueSession("persona-william-admin").catch(() => {
        // Best-effort: panel still renders, and pages will show SessionRequiredNotice if needed.
      });
    }
  }, [isAuthenticated, issueSession, session, status]);

  const currentNav = APP_NAV_ITEMS.find((item) => item.id === currentPage);
  const categories = [
    "operations",
    "reporting",
    "compliance",
    "admin",
  ] as const;

  return (
    <AurumLayoutModeProvider embedded>
      <div className="w-full h-full relative overflow-hidden bg-background">
        {sidebarOpen && (
          <button
            type="button"
            className="absolute inset-0 z-20 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}
        <aside
          className={cn(
            "absolute left-4 top-4 bottom-4 z-40 flex flex-col overflow-visible rounded-[30px] border border-white/15 pt-4 backdrop-blur-[24px] transition-all duration-300 ease-out bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] shadow-[0_28px_90px_rgba(2,6,23,0.42)] ring-1 ring-white/10",
            sidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-[120%] w-[72px]",
          )}
        >
          <div className="flex-shrink-0 border-b border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
            <div className="text-center text-sm font-semibold tracking-wide text-white">
              EchoAurum
            </div>
          </div>
          <nav className="flex-1 space-y-8 overflow-y-auto px-3 py-4">
            {categories.map((category) => {
              const items = APP_NAV_ITEMS.filter(
                (item) => item.category === category,
              );
              const categoryLabel =
                category === "operations"
                  ? "Operations"
                  : category === "reporting"
                    ? "Reporting"
                    : category === "compliance"
                      ? "Compliance"
                      : "Administration";
              return (
                <div key={category} className="space-y-2">
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {categoryLabel}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={cn(
                          "w-full flex items-start gap-3 rounded-full border px-4 py-3 text-left text-sm transition-all backdrop-blur-xl group",
                          currentPage === item.id
                            ? "border-white/15 bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                            : "border-transparent bg-white/5 text-slate-200 hover:border-white/10 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <span className="flex-shrink-0 mt-0.5">
                          {item.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1 group-hover:text-foreground/70">
                            {item.description}
                          </div>
                        </div>
                        {currentPage === item.id && (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "absolute -right-5 top-1/2 hidden h-16 w-8 -translate-y-1/2 items-center justify-center border border-white/10 bg-[linear-gradient(180deg,rgba(30,21,53,0.96),rgba(12,14,24,0.96))] px-1.5 py-4 text-cyan-200 shadow-[0_16px_50px_rgba(2,6,23,0.55)] backdrop-blur-2xl transition-transform duration-200 hover:scale-105 hover:border-cyan-300/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:flex",
              "rounded-r-full",
            )}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="block h-4 w-0.5 rounded-full bg-current transition-all duration-200" />
              <span className="block h-4 w-0.5 rounded-full bg-current transition-all duration-200" />
              <span className="block h-4 w-0.5 rounded-full bg-current transition-all duration-200" />
            </div>
          </button>

          <div className="border-t border-white/10 p-4 flex-shrink-0 bg-white/5 backdrop-blur-xl">
            <div className="px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Period
              </div>
              <div className="mt-1 text-sm font-medium">{period}</div>
            </div>
          </div>
        </aside>
        <div
          className={`relative z-10 flex h-full min-w-0 flex-col overflow-hidden ${
            sidebarOpen ? "lg:pl-[300px]" : "lg:pl-[96px]"
          }`}
        >
          <div className="px-6 py-4 border-b border-border/40 bg-background/70 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-muted-foreground transition-colors flex-shrink-0 hover:text-foreground"
                title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <span className="text-lg">☰</span>
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold truncate">
                  {currentNav?.label || "Financial Operations"}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {currentNav?.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1 flex-shrink-0">
                <LineChart className="h-3 w-3" />
                Live
              </Badge>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto bg-background">
            <SafePageLoader pageId={currentPage} />
          </div>
        </div>
      </div>
    </AurumLayoutModeProvider>
  );
}
