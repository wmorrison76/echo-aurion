import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Store, FINANCE_CONTROLS_EVENT_NAME } from "@/lib/store";
import type {
  FinanceControlSettings,
  OrderingAccessRule,
  InvoiceApprovalRoleLimit,
} from "@shared/finance";
import type { Role } from "@shared/auth";
const ROLE_ORDER: Role[] = ["Admin", "Finance", "Manager", "Chef", "Receiver"];
export function FinancePermissionsPanel() {
  const [controls, setControls] = useState<FinanceControlSettings>(() =>
    Store.getFinanceControls(),
  );
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => {
      setControls(Store.getFinanceControls());
      setVersion((value) => value + 1);
    };
    window.addEventListener(FINANCE_CONTROLS_EVENT_NAME, handler);
    return () =>
      window.removeEventListener(FINANCE_CONTROLS_EVENT_NAME, handler);
  }, []);
  const orderingAccess = useMemo<OrderingAccessRule[]>(() => {
    const map = new Map(
      controls.orderingAccess.map((rule) => [rule.role, rule]),
    );
    return ROLE_ORDER.map((role) => {
      const existing = map.get(role);
      if (existing) return existing;
      const fallback = Store.getFinanceControls().orderingAccess.find(
        (entry) => entry.role === role,
      );
      if (fallback) return fallback;
      return {
        role,
        canOrder: false,
        canPunchout: false,
        maxOrderAmount: null,
      };
    });
  }, [controls.orderingAccess]);
  const roleLimits = useMemo<InvoiceApprovalRoleLimit[]>(() => {
    const map = new Map(
      controls.approvals.roleLimits.map((limit) => [limit.role, limit]),
    );
    return ROLE_ORDER.map((role) => {
      const existing = map.get(role);
      if (existing) return existing;
      const fallback = Store.getFinanceControls().approvals.roleLimits.find(
        (entry) => entry.role === role,
      );
      if (fallback) return fallback;
      return { role, maxAmount: 0, requiresSecondApprovalOver: null };
    });
  }, [controls.approvals.roleLimits]);
  return (
    <Card className="border-2">
      {" "}
      <CardHeader className="border-b bg-muted/40">
        {" "}
        <CardTitle>Ordering &amp; Approvals</CardTitle>{" "}
        <CardDescription>
          {" "}
          Grant purchasing access, enforce approval thresholds, and codify
          variance escalation rules for finance and operations.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6 pt-6">
        {" "}
        <section className="space-y-4">
          {" "}
          <div>
            {" "}
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {" "}
              Ordering access by role{" "}
            </h3>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              Toggle who can initiate purchasing, enable punch-out catalogs, and
              cap order amounts per role.{" "}
            </p>{" "}
          </div>{" "}
          <div className="overflow-hidden rounded-lg border">
            {" "}
            <table className="w-full text-sm">
              {" "}
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                {" "}
                <tr>
                  {" "}
                  <th className="px-4 py-3 text-left">Role</th>{" "}
                  <th className="px-4 py-3 text-center">Can order</th>{" "}
                  <th className="px-4 py-3 text-center">Punch-out</th>{" "}
                  <th className="px-4 py-3 text-right">Max order ($)</th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody>
                {" "}
                {orderingAccess.map((access) => (
                  <tr key={`${access.role}-${version}`} className="border-t">
                    {" "}
                    <td className="px-4 py-3 font-medium">
                      {access.role}
                    </td>{" "}
                    <td className="px-4 py-3 text-center">
                      {" "}
                      <Switch
                        checked={access.canOrder}
                        onCheckedChange={(checked) =>
                          Store.setFinanceOrderingAccess(access.role, {
                            canOrder: Boolean(checked),
                          })
                        }
                      />{" "}
                    </td>{" "}
                    <td className="px-4 py-3 text-center">
                      {" "}
                      <Switch
                        checked={access.canPunchout}
                        onCheckedChange={(checked) =>
                          Store.setFinanceOrderingAccess(access.role, {
                            canPunchout: Boolean(checked),
                          })
                        }
                      />{" "}
                    </td>{" "}
                    <td className="px-4 py-3 text-right">
                      {" "}
                      <Input
                        type="number"
                        min={0}
                        step={50}
                        defaultValue={access.maxOrderAmount ?? ""}
                        className="h-9 text-right"
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          Store.setFinanceOrderingAccess(access.role, {
                            maxOrderAmount: value.length ? Number(value) : null,
                          });
                        }}
                      />{" "}
                    </td>{" "}
                  </tr>
                ))}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
        </section>{" "}
        <section className="grid gap-4 lg:grid-cols-2">
          {" "}
          <div className="space-y-3 rounded-lg border p-4">
            {" "}
            <Label
              htmlFor="auto-approve"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              {" "}
              Auto-approve invoices under{" "}
            </Label>{" "}
            <Input
              id="auto-approve"
              type="number"
              min={0}
              step={10}
              defaultValue={controls.approvals.autoApproveUnder ?? ""}
              className="h-9"
              onBlur={(event) => {
                const value = event.target.value.trim();
                Store.setFinanceAutoApproveUnder(
                  value.length ? Number(value) : null,
                );
              }}
            />{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              Invoices below this amount will auto-route to paid unless flagged
              by variance or exception rules.{" "}
            </p>{" "}
          </div>{" "}
          <div className="space-y-3 rounded-lg border p-4">
            {" "}
            <Label
              htmlFor="variance-escalation"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              {" "}
              Variance escalation (%){" "}
            </Label>{" "}
            <Input
              id="variance-escalation"
              type="number"
              min={0}
              step={0.5}
              defaultValue={controls.approvals.varianceEscalationPct ?? ""}
              className="h-9"
              onBlur={(event) => {
                const value = event.target.value.trim();
                Store.setFinanceVarianceEscalationPct(
                  value.length ? Number(value) : null,
                );
              }}
            />{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              Variances above this percentage immediately flag for finance
              approval and can trigger an audit.{" "}
            </p>{" "}
          </div>{" "}
        </section>{" "}
        <section className="space-y-4">
          {" "}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {" "}
            <div>
              {" "}
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {" "}
                Approval tiers{" "}
              </h3>{" "}
              <p className="text-xs text-muted-foreground">
                {" "}
                Define signature thresholds per role and when secondary approval
                is required.{" "}
              </p>{" "}
            </div>{" "}
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-wide"
            >
              {" "}
              Finance governance{" "}
            </Badge>{" "}
          </div>{" "}
          <div className="overflow-hidden rounded-lg border">
            {" "}
            <table className="w-full text-sm">
              {" "}
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                {" "}
                <tr>
                  {" "}
                  <th className="px-4 py-3 text-left">Role</th>{" "}
                  <th className="px-4 py-3 text-right">Max approval ($)</th>{" "}
                  <th className="px-4 py-3 text-right">
                    Second approval over ($)
                  </th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody>
                {" "}
                {roleLimits.map((limit) => (
                  <tr
                    key={`${limit.role}-limits-${version}`}
                    className="border-t"
                  >
                    {" "}
                    <td className="px-4 py-3 font-medium">{limit.role}</td>{" "}
                    <td className="px-4 py-3 text-right">
                      {" "}
                      <Input
                        type="number"
                        min={0}
                        step={50}
                        defaultValue={limit.maxAmount ?? ""}
                        className="h-9 text-right"
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          Store.setFinanceRoleLimit(limit.role, {
                            maxAmount: value.length
                              ? Number(value)
                              : limit.maxAmount,
                          });
                        }}
                      />{" "}
                    </td>{" "}
                    <td className="px-4 py-3 text-right">
                      {" "}
                      <Input
                        type="number"
                        min={0}
                        step={50}
                        defaultValue={limit.requiresSecondApprovalOver ?? ""}
                        className="h-9 text-right"
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          Store.setFinanceRoleLimit(limit.role, {
                            requiresSecondApprovalOver: value.length
                              ? Number(value)
                              : null,
                          });
                        }}
                      />{" "}
                    </td>{" "}
                  </tr>
                ))}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
        </section>{" "}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
          {" "}
          <div className="space-y-1">
            {" "}
            <p>
              {" "}
              Changes save instantly and broadcast to finance dashboards via the
              live controls event bus.{" "}
            </p>{" "}
            <p>
              {" "}
              For enterprise rollouts, connect to Supabase or Neon via MCP to
              persist these rules centrally.{" "}
            </p>{" "}
          </div>{" "}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setControls(Store.getFinanceControls())}
          >
            {" "}
            Refresh{" "}
          </Button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
