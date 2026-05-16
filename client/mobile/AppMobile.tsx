/**
 * PWA-first mobile shell
 * Minimal nav: Receiving, Inventory Count, Recipe View, Approvals, Tasks
 * Shares auth + org context; reuses domain contracts from shared/types.
 */

import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Package, ClipboardList, BookOpen, CheckSquare, ListTodo } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { MOBILE_BASE, MOBILE_ROUTES } from "./routes";
import { getTraceQueueStatus, flushTraceQueue } from "./offline/traceQueue";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<string, React.ReactNode> = {
  receiving: <Package className="h-5 w-5" />,
  "inventory-count": <ClipboardList className="h-5 w-5" />,
  "recipe-view": <BookOpen className="h-5 w-5" />,
  approvals: <CheckSquare className="h-5 w-5" />,
  tasks: <ListTodo className="h-5 w-5" />,
};

export default function AppMobile() {
  const auth = useAuth();
  const location = useLocation();
  const [queueStatus, setQueueStatus] = useState(getTraceQueueStatus());
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      flushTraceQueue("", token ?? undefined, false).then(() => {
        setQueueStatus(getTraceQueueStatus());
      });
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const orgName = auth?.organization?.name ?? auth?.user?.org_id ?? "Org";
  const userName = auth?.user?.name ?? "User";

  return (
    <div className="flex flex-col h-screen max-h-dvh bg-background text-foreground">
      {/* Top bar: org + user + offline indicator */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 safe-area-inset-top">
        <div className="text-sm font-medium truncate">{orgName}</div>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
              Offline
            </span>
          )}
          {queueStatus.pending > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
              {queueStatus.pending} queued
            </span>
          )}
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">{userName}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom nav: Receiving, Inventory Count, Recipe View, Approvals, Tasks */}
      <nav
        className="flex-shrink-0 flex items-center justify-around border-t border-border bg-muted/30 safe-area-inset-bottom py-1"
        role="navigation"
        aria-label="Mobile main"
      >
        {MOBILE_ROUTES.map((route) => {
          const isActive = location.pathname === route.path || location.pathname.startsWith(route.path + "/");
          const icon = NAV_ICONS[route.id] ?? null;
          return (
            <NavLink
              key={route.id}
              to={route.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 px-1 rounded-lg transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              end={route.exact}
            >
              {icon}
              <span className="text-[10px] font-medium truncate w-full text-center">
                {route.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileShellLayout() {
  return (
    <div className="mobile-shell">
      <AppMobile />
    </div>
  );
}
