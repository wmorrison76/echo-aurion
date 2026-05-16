import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ProcurementOrder,
  ProcurementPlan,
} from "@/../shared/types/procurement";
import { osBus } from "@/lib/os-bus";
import {
  getLatestProcurementPlan,
  getProcurementPlan,
} from "@/lib/procurement-store";
function fmtMoney(n: number) {
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}
function fmtISO(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
export default function ProcurementPlanPanel(props: { planId?: string } = {}) {
  const [plan, setPlan] = useState<ProcurementPlan | null>(() => {
    if (props.planId) return getProcurementPlan(props.planId);
    return getLatestProcurementPlan();
  });
  useEffect(() => {
    if (!props.planId) return;
    setPlan(getProcurementPlan(props.planId) ?? getLatestProcurementPlan());
  }, [props.planId]);
  useEffect(() => {
    const off = osBus.on("procurement:plan_generated", (evt) => {
      const next = evt?.planId
        ? getProcurementPlan(evt.planId)
        : getLatestProcurementPlan();
      setPlan(next ?? getLatestProcurementPlan());
    });
    return () => off();
  }, []);
  const orders = useMemo(() => plan?.orders ?? [], [plan]);
  const orderKeys = useMemo(
    () =>
      orders.map((o) => ({
        key: `${o.vendorId}:${o.deliveryDateISO.slice(0, 10)}`,
        label: `${o.vendorName} • ${o.deliveryDateISO.slice(0, 10)}`,
      })),
    [orders],
  );
  const defaultTab = orderKeys[0]?.key ?? "no-orders";
  const totalCost = orders.reduce((sum, o) => sum + (o.totalCost ?? 0), 0);
  const totalLines = orders.reduce((sum, o) => sum + (o.lineCount ?? 0), 0);
  if (!plan) {
    return (
      <Card className="h-full">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Procurement Plan (Genesis C)</CardTitle>{" "}
          <CardDescription>
            {" "}
            No plan found yet. Generate a Group Intelligence snapshot to create
            a combined procurement plan.{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
      </Card>
    );
  }
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {" "}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold text-foreground">
              {" "}
              Procurement Plan (Genesis C){" "}
            </div>{" "}
            <div className="text-xs text-foreground/70 mt-1">
              {" "}
              Window: {plan.windowStartISO.slice(0, 10)} →{""}{" "}
              {plan.windowEndISO.slice(0, 10)}{" "}
            </div>{" "}
            {plan.groupId ? (
              <div className="text-xs text-foreground/70">
                {" "}
                Group: {plan.groupId}{" "}
              </div>
            ) : null}{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Badge>{orders.length} Drops</Badge>{" "}
            <Badge variant="secondary">{totalLines} Lines</Badge>{" "}
            <Badge variant="outline">{fmtMoney(totalCost)}</Badge>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {" "}
        {plan.warnings?.length ? (
          <Card>
            {" "}
            <CardHeader className="pb-2">
              {" "}
              <CardTitle className="text-base">Planner Notes</CardTitle>{" "}
              <CardDescription>
                {" "}
                Informational hints for consolidation and delivery
                constraints.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ul className="space-y-2">
                {" "}
                {plan.warnings.map((w, idx) => (
                  <li key={idx} className="text-sm">
                    {" "}
                    <Badge
                      className="mr-2"
                      variant={
                        w.severity === "critical" ? "destructive" : "secondary"
                      }
                    >
                      {" "}
                      {w.severity.toUpperCase()}{" "}
                    </Badge>{" "}
                    {w.message}{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
            </CardContent>{" "}
          </Card>
        ) : null}{" "}
        {orders.length === 0 ? (
          <Card>
            {" "}
            <CardContent className="p-4 text-sm text-foreground/70">
              {" "}
              Inventory covers all needs (or no deltas to order) for this
              window.{" "}
            </CardContent>{" "}
          </Card>
        ) : (
          <Tabs defaultValue={defaultTab}>
            {" "}
            <TabsList className="flex flex-wrap h-auto">
              {" "}
              {orderKeys.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {" "}
                  {t.label}{" "}
                </TabsTrigger>
              ))}{" "}
            </TabsList>{" "}
            {orders.map((o) => (
              <TabsContent
                key={`${o.vendorId}:${o.deliveryDateISO}`}
                value={`${o.vendorId}:${o.deliveryDateISO.slice(0, 10)}`}
              >
                {" "}
                <OrderCard order={o} />{" "}
              </TabsContent>
            ))}{" "}
          </Tabs>
        )}{" "}
        <div className="flex justify-end">
          {" "}
          <Button
            variant="secondary"
            onClick={() => setPlan(getLatestProcurementPlan())}
          >
            {" "}
            Reload Latest{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
function OrderCard({ order }: { order: ProcurementOrder }) {
  return (
    <Card>
      {" "}
      <CardHeader className="pb-2">
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-base">{order.vendorName}</CardTitle>{" "}
            <CardDescription className="mt-1">
              {" "}
              Delivery: {fmtISO(order.deliveryDateISO)} <br /> Cutoff:{" "}
              {fmtISO(order.cutoffAtISO)}{" "}
            </CardDescription>{" "}
            {order.rebateHint ? (
              <div className="text-xs text-foreground/70 mt-2">
                {" "}
                <Badge variant="outline" className="mr-2">
                  {" "}
                  Rebate Hint{" "}
                </Badge>{" "}
                {order.rebateHint}{" "}
              </div>
            ) : null}{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Badge>{order.lineCount} Lines</Badge>{" "}
            <Badge variant="outline">{fmtMoney(order.totalCost)}</Badge>{" "}
          </div>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <div className="overflow-auto">
          {" "}
          <table className="w-full text-sm">
            {" "}
            <thead className="text-xs text-foreground/70">
              {" "}
              <tr>
                {" "}
                <th className="text-left py-2 pr-2">Item</th>{" "}
                <th className="text-right py-2 pr-2">Qty</th>{" "}
                <th className="text-left py-2 pr-2">Unit</th>{" "}
                <th className="text-left py-2 pr-2">Pack</th>{" "}
                <th className="text-right py-2 pr-2">Cost</th>{" "}
                <th className="text-left py-2">Sources</th>{" "}
              </tr>{" "}
            </thead>{" "}
            <tbody>
              {" "}
              {order.lines.map((l, idx) => (
                <tr key={idx} className="border-t border-border/30">
                  {" "}
                  <td className="py-2 pr-2">{l.ingredientName}</td>{" "}
                  <td className="py-2 pr-2 text-right">{l.toOrderQty}</td>{" "}
                  <td className="py-2 pr-2">{l.unit}</td>{" "}
                  <td className="py-2 pr-2">
                    {" "}
                    {l.packName ? (
                      <span>
                        {" "}
                        {l.packName}{" "}
                        {l.packCount ? ` × ${l.packCount}` : ""}{" "}
                      </span>
                    ) : (
                      <span className="opacity-70">—</span>
                    )}{" "}
                  </td>{" "}
                  <td className="py-2 pr-2 text-right">
                    {" "}
                    {typeof l.lineCost === "number" ? (
                      fmtMoney(l.lineCost)
                    ) : (
                      <span className="opacity-70">—</span>
                    )}{" "}
                  </td>{" "}
                  <td className="py-2">
                    {" "}
                    <div className="flex flex-wrap gap-1">
                      {" "}
                      {(l.sources ?? []).slice(0, 3).map((s, i) => (
                        <Badge key={i} variant="secondary">
                          {" "}
                          {s.type}:{s.id}{" "}
                        </Badge>
                      ))}{" "}
                      {(l.sources ?? []).length > 3 ? (
                        <Badge variant="outline">
                          {" "}
                          +{(l.sources ?? []).length - 3}{" "}
                        </Badge>
                      ) : null}{" "}
                    </div>{" "}
                  </td>{" "}
                </tr>
              ))}{" "}
            </tbody>{" "}
          </table>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
