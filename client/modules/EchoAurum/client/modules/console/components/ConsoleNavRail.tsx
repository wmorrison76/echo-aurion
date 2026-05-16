import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  CreditCard,
  BarChart3,
  Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionMenu, useSession } from "../../auth";
import { ROLE_LABELS } from "../../../../shared/auth";
export type ConsoleNavModule = {
  id: string;
  badge: string;
  name: string;
  summary: string;
}; // Primary navigation items - task-focused
const navigationItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Financial overview and alerts",
  },
  {
    label: "GL Operations",
    href: "/gl",
    icon: BookOpen,
    description: "Journal entries, reconciliation, and financial statements",
  },
  {
    label: "AP & Invoices",
    href: "/ap",
    icon: CreditCard,
    description: "Vendor invoices, approvals, and payments",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Financial statements, variance analysis, and exports",
  },
  {
    label: "Admin",
    href: "/admin",
    icon: Settings,
    description: "User management, configuration, and settings",
  },
];
export function ConsoleNavRail({ modules }: { modules: ConsoleNavModule[] }) {
  const { session, status } = useSession();
  const location = useLocation();
  return (
    <aside className="hidden lg:block">
      {" "}
      <div className="sticky top-24 space-y-6">
        {" "}
        {/* Identity Card */} <IdentityCard session={session} status={status} />{" "}
        {/* Primary Navigation */}{" "}
        <nav className="space-y-2">
          {" "}
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 transition",
                  isActive
                    ? "bg-aurum-500/20 text-aurum-300 border border-aurum-500/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-variant/40",
                )}
                title={item.description}
              >
                {" "}
                <Icon className="h-5 w-5 flex-shrink-0" />{" "}
                <span className="text-sm font-medium">{item.label}</span>{" "}
              </Link>
            );
          })}{" "}
        </nav>{" "}
        {/* Help Link */}{" "}
        <div className="border-t border-border/40 pt-4">
          {" "}
          <a
            href="/help"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground hover:bg-surface-variant/40"
          >
            {" "}
            <span>Help & Training</span>{" "}
          </a>{" "}
        </div>{" "}
      </div>{" "}
    </aside>
  );
}
interface SessionEnvelopeFormatted {
  name: string;
  role: string;
  expiresAt: string;
}
function IdentityCard({
  session,
  status,
}: {
  session: any;
  status: "loading" | "authenticated" | "unauthenticated" | "error";
}) {
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border/40 bg-surface/60 p-4">
        {" "}
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-aurum-300" />{" "}
        <span className="text-xs text-muted-foreground">Loading...</span>{" "}
      </div>
    );
  }
  if (!session) {
    return (
      <div className="rounded-lg border border-aurum-400/40 bg-aurum-500/10 p-4">
        {" "}
        <p className="text-xs font-semibold uppercase tracking-wider text-aurum-200">
          {" "}
          Authentication Required{" "}
        </p>{" "}
        <p className="mt-2 text-sm text-aurum-100">
          {" "}
          Sign in to access your financial data{" "}
        </p>{" "}
        <div className="mt-3">
          {" "}
          <SessionMenu buttonVariant="ghost" size="sm" />{" "}
        </div>{" "}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border/40 bg-surface/60 p-4 space-y-3">
      {" "}
      <div className="flex items-start justify-between gap-3">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-wider text-aurum-200">
            {" "}
            Authenticated{" "}
          </p>{" "}
          <p className="mt-2 text-sm font-semibold text-foreground">
            {" "}
            {session.name}{" "}
          </p>{" "}
          <p className="text-xs text-muted-foreground">
            {" "}
            {ROLE_LABELS[session.role]}{" "}
          </p>{" "}
        </div>{" "}
        <SessionMenu buttonVariant="ghost" size="sm" />{" "}
      </div>{" "}
      <div className="space-y-1 text-xs text-muted-foreground border-t border-border/40 pt-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <span>Session Status</span>{" "}
          <span className="text-green-400">✓ Active</span>{" "}
        </div>{" "}
        <div className="flex items-center justify-between">
          {" "}
          <span>Guardian AI</span>{" "}
          <span className="text-green-400">✓ Active</span>{" "}
        </div>{" "}
      </div>{" "}
      <Link
        to="/profile"
        className="mt-2 inline-block text-xs font-semibold text-aurum-300 hover:text-aurum-200 transition"
      >
        {" "}
        Manage identity →{" "}
      </Link>{" "}
    </div>
  );
}
