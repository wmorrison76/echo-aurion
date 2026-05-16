/**
 * Genesis D — Cost Attribution Admin Panel
 * RBAC:
 * - COST_RULES_VIEW: can view cost rules
 * - COST_RULES_EDIT: can edit cost rules
 */

import React from "react";

import { AlertCircle, CheckCircle2, Lock, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { User } from "@/../shared/types/genesis-permissions";
import { osBus } from "@/lib/os-bus";
import { can } from "@/lib/genesis/permissions/permissionChecks";
import { getCurrentUser } from "@/stores/genesisAuthStore";
import {
  deleteCostRule,
  getCostRules,
  getCostRulesStats,
  getPending,
  getVersion,
  toggleCostRule,
  type CostAttributionRule,
} from "@/stores/genesisCostRulesStore";
import { listCostChangeEntries } from "@/lib/genesis-audit-store";

type TabId = "RULES" | "AUDIT" | "PENDING";

export default function GenesisD_CostAttributionAdminPanel() {
  const [user, setUser] = React.useState<User | null>(null);
  const [rules, setRules] = React.useState<CostAttributionRule[]>([]);
  const [stats, setStats] = React.useState<ReturnType<
    typeof getCostRulesStats
  > | null>(null);
  const [asOfDate, setAsOfDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [versionId, setVersionId] = React.useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = React.useState<any[]>([]);
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [tab, setTab] = React.useState<TabId>("RULES");

  React.useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  React.useEffect(() => {
    setRules(getCostRules());
    setStats(getCostRulesStats());

    const asOfDateTime = new Date(`${asOfDate}T00:00:00.000Z`);
    const version = getVersion(asOfDateTime);
    setVersionId(version.versionId);

    setPendingChanges(getPending());
  }, [asOfDate]);

  const canViewRules = can(user, "COST_RULES_VIEW");
  const canEditRules = can(user, "COST_RULES_EDIT");

  const pushFlash = React.useCallback(
    (next: { type: "success" | "error"; text: string }) => {
      setMessage(next);
      window.setTimeout(() => setMessage(null), 3000);
    },
    [],
  );

  const handleToggleRule = React.useCallback(
    (ruleId: string, enabled: boolean) => {
      if (!canEditRules) {
        pushFlash({
          type: "error",
          text: "Insufficient permission: COST_RULES_EDIT",
        });
        return;
      }
      toggleCostRule(ruleId, !enabled);
      setRules(getCostRules());
      setStats(getCostRulesStats());
      osBus.emit("genesis:cost_rule_toggled", {
        ruleId,
        enabled: !enabled,
        actor: user?.userId,
        timestamp: new Date().toISOString(),
      });
      pushFlash({
        type: "success",
        text: `Rule ${!enabled ? "enabled" : "disabled"} successfully!`,
      });
    },
    [canEditRules, pushFlash, user?.userId],
  );

  const handleDeleteRule = React.useCallback(
    (ruleId: string) => {
      if (!canEditRules) {
        pushFlash({
          type: "error",
          text: "Insufficient permission: COST_RULES_EDIT",
        });
        return;
      }
      deleteCostRule(ruleId);
      setRules(getCostRules());
      setStats(getCostRulesStats());
      osBus.emit("genesis:cost_rule_deleted", {
        ruleId,
        actor: user?.userId,
        timestamp: new Date().toISOString(),
      });
      pushFlash({ type: "success", text: "Rule deleted successfully!" });
    },
    [canEditRules, pushFlash, user?.userId],
  );

  if (!canViewRules) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background p-4">
        <Card className="p-6 max-w-md text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h3 className="text-lg font-semibold text-foreground">
            Access Restricted
          </h3>
          <p className="text-sm text-foreground/70 mt-2">
            You don't have permission to view cost rules.
          </p>
          <p className="text-xs text-foreground/60 mt-3">
            Required permission{" "}
            <code className="bg-foreground/10 px-2 py-1 rounded">
              COST_RULES_VIEW
            </code>
          </p>
        </Card>
      </div>
    );
  }

  const auditEntries = listCostChangeEntries();

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">
              Genesis D — Cost Attribution Admin
            </div>
            <div className="text-sm text-foreground/70 mt-1">
              Manage cost attribution rules that determine who pays for
              procurement costs
            </div>
          </div>
          <Badge variant="outline">Phase 4</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {message ? (
            <Card
              className={[
                "p-4 flex gap-3",
                message.type === "success"
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30",
              ].join(" ")}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={
                    message.type === "success"
                      ? "text-green-200"
                      : "text-red-200"
                  }
                >
                  {message.text}
                </p>
              </div>
            </Card>
          ) : null}

          {stats ? (
            <div className="grid grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="text-xs text-foreground/70">Total Rules</div>
                <div className="text-2xl font-bold text-foreground">
                  {stats.total}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-foreground/70">Enabled</div>
                <div className="text-2xl font-bold text-green-500">
                  {stats.enabled}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-foreground/70">SOURCE_PAYS</div>
                <div className="text-2xl font-bold text-blue-500">
                  {stats.byMode.SOURCE_PAYS}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-foreground/70">SPLIT</div>
                <div className="text-2xl font-bold text-purple-500">
                  {stats.byMode.SPLIT}
                </div>
              </Card>
            </div>
          ) : null}

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">
                View as of:
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="px-3 py-1 border border-border/30 rounded text-sm bg-background text-foreground"
              />
              {versionId ? (
                <div className="text-xs text-foreground/70">
                  Version{" "}
                  <code className="bg-foreground/10 px-1.5 py-0.5 rounded font-mono">
                    {versionId.slice(0, 24)}…
                  </code>
                </div>
              ) : null}
            </div>
          </Card>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabId)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="RULES">Cost Rules</TabsTrigger>
              <TabsTrigger value="AUDIT">Audit Trail</TabsTrigger>
              <TabsTrigger value="PENDING">
                Pending{" "}
                {pendingChanges.length > 0 ? `(${pendingChanges.length})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="RULES" className="space-y-4">
              <div className="space-y-3">
                {rules.map((rule) => (
                  <Card
                    key={rule.ruleId}
                    className={[
                      "p-4 border transition-colors",
                      !rule.isEnabled
                        ? "border-gray-500/30 bg-surface/5 opacity-75"
                        : "border-border/30",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">
                            {rule.outletName}
                          </h4>
                          <Badge
                            variant={rule.isEnabled ? "default" : "secondary"}
                          >
                            {rule.isEnabled ? "ENABLED" : "DISABLED"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            P{rule.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-foreground/70 space-y-1">
                          <div>
                            Mode{" "}
                            <span className="font-medium">
                              {rule.attributionMode}
                            </span>
                            {rule.attributionMode === "SPLIT" &&
                            rule.splitPercentage ? (
                              <span className="ml-2">
                                ({rule.splitPercentage}%)
                              </span>
                            ) : null}
                          </div>
                          {rule.note ? (
                            <div className="text-xs mt-2 italic">
                              {rule.note}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {canEditRules ? (
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleRule(rule.ruleId, rule.isEnabled)
                            }
                          >
                            {rule.isEnabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.ruleId)}
                            className="text-red-500 hover:text-red-600"
                            aria-label="Delete rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="AUDIT" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-medium text-foreground mb-3">
                  Cost + Rule Changes
                </div>
                {auditEntries.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {auditEntries.slice(0, 25).map((e) => (
                      <div
                        key={e.auditId}
                        className="flex items-start justify-between gap-2 p-2 border border-border/30 rounded"
                      >
                        <div className="min-w-0">
                          <div className="text-foreground/80 truncate">
                            {e.explain}
                          </div>
                          <div className="text-xs text-foreground/60 mt-1">
                            {e.timestamp} •{" "}
                            {e.actor?.userId ?? e.actor?.system ?? "unknown"}
                          </div>
                        </div>
                        <Badge variant="secondary">{e.category}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">
                    No audit entries yet.
                  </p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="PENDING" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-medium text-foreground mb-3">
                  Scheduled Rule Changes
                </div>
                {pendingChanges.length > 0 ? (
                  <div className="space-y-2">
                    {pendingChanges.map((change: any) => (
                      <div
                        key={change.changeId}
                        className="flex items-start justify-between p-3 border border-blue-500/30 bg-primary/5 rounded text-sm"
                      >
                        <div>
                          <div className="font-medium text-foreground">
                            {change.memo}
                          </div>
                          <div className="text-xs text-foreground/70 mt-1">
                            Outlet: {change.outletId} • Effective:{" "}
                            {change.effectiveDateISO}
                          </div>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">
                    No pending changes scheduled
                  </p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border/30 p-4 bg-background">
        {!canEditRules ? (
          <p className="text-sm text-amber-600 dark:text-amber-400 flex gap-2 mb-2">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            You don't have permission to edit cost rules.
          </p>
        ) : null}
        <Button disabled={!canEditRules} className="w-full" size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Cost Rule
        </Button>
      </div>
    </div>
  );
}
