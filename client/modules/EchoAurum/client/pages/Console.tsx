import React, { useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { useToast } from "../hooks/use-toast";
import { SessionRequiredNotice } from "../modules/auth";
import {
  ConsoleNavRail,
  useConsoleNotifications,
  useConsoleOverview,
} from "../modules/console";
import { useAurumLayoutMode } from "../components/layout/AurumLayoutMode";
import {
  APInvoiceManager,
  GuardianOversightPanel,
  FinancialReportsDashboard,
  GLJournalEntrySystem,
  BankReconciliationSystem,
  ApprovalQueueDashboard,
  OutletManager,
  MultiOutletPnL,
  DriverConfiguration,
} from "../modules/aurum/components";
import type { ConsoleModuleDetail } from "../../shared/console";
const WORKSPACE_IDS = [
  "gl-entry",
  "ap",
  "approvals",
  "reconciliation",
  "reports",
  "guardian",
  "outlets",
] as const;
type WorkspaceId = (typeof WORKSPACE_IDS)[number];
function resolveFocusedWorkspace(hash: string): WorkspaceId | null {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  if ((WORKSPACE_IDS as readonly string[]).includes(normalized)) {
    return normalized as WorkspaceId;
  }
  if (normalized === "pnl-drivers") {
    return "outlets";
  }
  return null;
}
export default function Console() {
  const { embedded } = useAurumLayoutMode();
  const location = useLocation();
  const focusedWorkspace = useMemo(
    () => (embedded ? resolveFocusedWorkspace(location.hash) : null),
    [embedded, location.hash],
  );
  const { status, data } = useConsoleOverview();
  const notificationsState = useConsoleNotifications();
  const { toast } = useToast();
  const emittedNotifications = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (notificationsState.status !== "ready") {
      if (notificationsState.status === "unauthenticated") {
        emittedNotifications.current.clear();
      }
      return;
    }
    const notifications = notificationsState.data ?? [];
    notifications.forEach((notification) => {
      if (!emittedNotifications.current.has(notification.id)) {
        toast({
          title: notification.title,
          description: notification.description,
        });
        emittedNotifications.current.add(notification.id);
      }
    });
  }, [notificationsState.status, notificationsState.data, toast]);
  if (status === "loading") {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10 text-center">
          {" "}
          <Loader2 className="h-8 w-8 animate-spin text-aurum-300 mx-auto mb-4" />{" "}
          <p className="text-muted-foreground">Loading console...</p>{" "}
        </div>{" "}
      </PageLayout>
    );
  }
  if (status === "unauthenticated") {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          {" "}
          <SessionRequiredNotice description="Authenticate to access the console." />{" "}
        </div>{" "}
      </PageLayout>
    );
  }
  if (status === "error" || !data) {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          {" "}
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
            {" "}
            <p className="text-sm text-red-700 dark:text-red-200">
              {" "}
              Unable to load console. Please try again.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </PageLayout>
    );
  }
  return (
    <PageLayout>
      {" "}
      <div className="mr-auto ml-10 max-w-7xl overflow-hidden px-6 py-8 sm:px-10">
        {" "}
        <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
          {" "}
          <ConsoleNavRail modules={data.modules} />{" "}
          <div className="space-y-8">
            {" "}
            <ConsoleWorkspaces
              modules={data.modules}
              visibleIds={focusedWorkspace ? [focusedWorkspace] : undefined}
            />{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
function ConsoleWorkspaces({
  modules,
  visibleIds,
}: {
  modules: ConsoleModuleDetail[];
  visibleIds?: WorkspaceId[];
}) {
  const isVisible = (id: WorkspaceId) => !visibleIds || visibleIds.includes(id);
  return (
    <>
      {" "}
      {isVisible("gl-entry") && (
        <WorkspaceSection title="GL Operations" id="gl-entry">
          {" "}
          <GLJournalEntrySystem />{" "}
        </WorkspaceSection>
      )}{" "}
      {isVisible("ap") && (
        <WorkspaceSection title="Accounts Payable" id="ap">
          {" "}
          <APInvoiceManager />{" "}
        </WorkspaceSection>
      )}{" "}
      {isVisible("approvals") && (
        <WorkspaceSection title="Approvals & Controls" id="approvals">
          {" "}
          <ApprovalQueueDashboard />{" "}
        </WorkspaceSection>
      )}{" "}
      {isVisible("reconciliation") && (
        <WorkspaceSection title="Bank Reconciliation" id="reconciliation">
          {" "}
          <BankReconciliationSystem />{" "}
        </WorkspaceSection>
      )}{" "}
      {isVisible("reports") && (
        <WorkspaceSection title="Financial Reports" id="reports">
          {" "}
          <FinancialReportsDashboard />{" "}
        </WorkspaceSection>
      )}{" "}
      {isVisible("guardian") && (
        <WorkspaceSection title="Guardian AI Oversight" id="guardian">
          {" "}
          <GuardianOversightPanel />{" "}
        </WorkspaceSection>
      )}{" "}
      {isVisible("outlets") && (
        <WorkspaceSection title="Outlet Management" id="outlets">
          {" "}
          <div className="space-y-6">
            {" "}
            <OutletManager /> <MultiOutletPnL />{" "}
            <div id="pnl-drivers" className="scroll-mt-20">
              {" "}
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {" "}
                P&L Drivers{" "}
              </h4>{" "}
              <DriverConfiguration outletId="outlet_hotel_1" />{" "}
            </div>{" "}
          </div>{" "}
        </WorkspaceSection>
      )}{" "}
    </>
  );
}
function WorkspaceSection({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      {" "}
      <div className="mb-4">
        {" "}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>{" "}
        <p className="text-sm text-muted-foreground mt-1">
          {" "}
          Professional financial operations with Guardian AI oversight{" "}
        </p>{" "}
      </div>{" "}
      <div className="rounded-lg border border-border/40 bg-surface/60 p-6 shadow-sm">
        {" "}
        {children}{" "}
      </div>{" "}
    </section>
  );
}
