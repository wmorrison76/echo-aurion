import React from "react";
/** * Genesis F — Procurement Calendar Panel * Displays vendor drops with delivery dates, cutoff deadlines, and assigned lines. * Shows which ingredients are assigned to which vendor deliveries to prevent missed due dates. */ import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { osBus } from "@/lib/os-bus";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import type { ProcurementCalendarPlan } from "@/../shared/types/procurement-calendar";
import { getLatestProcurementCalendarPlan } from "@/lib/procurement-calendar-store";
export default function GenesisFPanel() {
  const { t } = useI18n();
  const [plan, setPlan] = useState<ProcurementCalendarPlan | null>(() =>
    getLatestProcurementCalendarPlan(),
  );
  useEffect(() => {
    const unsubscribe = osBus.on(
      "procurement:calendar_plan_generated",
      (newPlan) => {
        setPlan(newPlan);
      },
    );
    return () => unsubscribe();
  }, []);
  const drops = useMemo(() => plan?.drops ?? [], [plan]);
  const totalLines = useMemo(() => {
    return drops.reduce((sum, drop) => sum + drop.lines.length, 0);
  }, [drops]);
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold text-foreground">
              {" "}
              LUCCCA Genesis F{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              Procurement Calendar: vendor drops by delivery day + cutoff
              deadlines. Orders split to prevent missed events while maximizing
              consolidation opportunities.{" "}
            </div>{" "}
          </div>{" "}
          <Badge>Calendar</Badge>{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {" "}
        {!plan ? (
          <Card className="p-4">
            {" "}
            <div className="text-sm text-foreground/70">
              {" "}
              No calendar plan yet. Generate a group BEO (with multiple events)
              to populate Genesis F.{" "}
            </div>{" "}
          </Card>
        ) : (
          <div className="space-y-4">
            {" "}
            {/* Plan Summary Card */}{" "}
            <Card className="p-4 bg-surface/50">
              {" "}
              <div className="space-y-2">
                {" "}
                <div className="text-xs text-foreground/60 font-mono">
                  {" "}
                  Plan ID:{""}{" "}
                  <span className="text-foreground/80">{plan.planId}</span>{" "}
                </div>{" "}
                <div className="text-xs text-foreground/60">
                  {" "}
                  Generated: {new Date(plan.createdAtISO).toLocaleString()}{" "}
                </div>{" "}
                <div className="text-xs text-foreground/60">
                  {" "}
                  Window:{""}{" "}
                  <span className="text-foreground/80">
                    {" "}
                    {new Date(plan.windowStartISO).toLocaleDateString()} →{""}{" "}
                    {new Date(plan.windowEndISO).toLocaleDateString()}{" "}
                  </span>{" "}
                </div>{" "}
                {plan.groupId && (
                  <div className="text-xs text-foreground/60">
                    {" "}
                    Group:{""}{" "}
                    <span className="text-foreground/80">
                      {plan.groupId}
                    </span>{" "}
                  </div>
                )}{" "}
                <div className="text-xs text-foreground/60 mt-3">
                  {" "}
                  <span className="font-semibold text-foreground">
                    {" "}
                    {drops.length}{" "}
                  </span>
                  {""} vendor drops •{""}{" "}
                  <span className="font-semibold text-foreground">
                    {" "}
                    {totalLines}{" "}
                  </span>
                  {""} lines assigned{" "}
                </div>{" "}
              </div>{" "}
            </Card>{" "}
            {/* Drops */}{" "}
            {drops.length === 0 ? (
              <Card className="p-4">
                {" "}
                <div className="text-sm text-foreground/70">
                  {" "}
                  No vendor drops in this plan. Check that procurement lines
                  exist and vendors are configured.{" "}
                </div>{" "}
              </Card>
            ) : (
              drops.map((drop) => (
                <Card key={drop.dropId} className="p-4">
                  {" "}
                  {/* Drop Header */}{" "}
                  <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-border/20">
                    {" "}
                    <div>
                      {" "}
                      <div className="font-semibold text-foreground">
                        {" "}
                        {drop.vendorName}{" "}
                      </div>{" "}
                      <div className="text-xs text-foreground/60 font-mono mt-0.5">
                        {" "}
                        {drop.dropId}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="flex gap-2">
                      {" "}
                      <Badge variant="outline">
                        {" "}
                        Deliver:{""}{" "}
                        {new Date(drop.deliverOnISO).toLocaleDateString()}{" "}
                      </Badge>{" "}
                      <Badge variant="secondary">
                        {" "}
                        Cutoff:{" "}
                        {new Date(drop.cutoffAtISO).toLocaleString()}{" "}
                      </Badge>{" "}
                    </div>{" "}
                  </div>{" "}
                  {/* Drop Lines */}{" "}
                  <div className="space-y-2">
                    {" "}
                    {drop.lines.map((line, lineIdx) => (
                      <div key={line.lineId} className="text-sm">
                        {" "}
                        <div className="flex items-start justify-between">
                          {" "}
                          <div className="flex-1">
                            {" "}
                            <div className="font-semibold text-foreground">
                              {" "}
                              {line.ingredientName}{" "}
                            </div>{" "}
                            <div className="text-xs text-foreground/60 mt-1">
                              {" "}
                              Qty: {line.requiredQty} {line.unit}{" "}
                              {line.onHandQty !== null &&
                                line.onHandQty !== undefined && (
                                  <span>
                                    {" "}
                                    {""} • On hand: {line.onHandQty}{" "}
                                    {line.unit}{" "}
                                  </span>
                                )}{" "}
                              {line.onOrderQty !== null &&
                                line.onOrderQty !== undefined && (
                                  <span>
                                    {" "}
                                    {""} • On order: {line.onOrderQty}{" "}
                                    {line.unit}{" "}
                                  </span>
                                )}{" "}
                            </div>{" "}
                            {line.sources.length > 0 && (
                              <div className="text-xs text-foreground/50 mt-1">
                                {" "}
                                Sources:{""}{" "}
                                {line.sources
                                  .map(
                                    (s) =>
                                      `${s.sourceType}:${s.sourceId.slice(0, 8)}... (due ${new Date(s.dueAtISO).toLocaleDateString()})`,
                                  )
                                  .join(",")}{" "}
                              </div>
                            )}{" "}
                            {line.packDescription && (
                              <div className="text-xs text-foreground/60 mt-1">
                                {" "}
                                Pack: {line.packDescription}{" "}
                                {line.packQty &&
                                  ` (${line.packQty} per case)`}{" "}
                              </div>
                            )}{" "}
                          </div>{" "}
                          <div className="text-right ml-4">
                            {" "}
                            {line.estimatedUnitCost && (
                              <div className="text-xs text-foreground/70">
                                {" "}
                                ${" "}
                                {(
                                  line.estimatedUnitCost * line.requiredQty
                                ).toFixed(2)}{" "}
                              </div>
                            )}{" "}
                          </div>{" "}
                        </div>{" "}
                        {lineIdx < drop.lines.length - 1 && (
                          <div className="mt-2 border-t border-border/10" />
                        )}{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                  {/* Drop Analytics Footer */}{" "}
                  {(drop.estimatedTotalCost || drop.rebateHint) && (
                    <div className="mt-3 pt-3 border-t border-border/20">
                      {" "}
                      <div className="flex items-center justify-between">
                        {" "}
                        {drop.estimatedTotalCost && (
                          <div className="text-sm">
                            {" "}
                            <span className="text-foreground/70">
                              {" "}
                              Est. Total:{" "}
                            </span>
                            {""}{" "}
                            <span className="font-semibold text-foreground">
                              {" "}
                              ${drop.estimatedTotalCost.toFixed(2)}{" "}
                            </span>{" "}
                          </div>
                        )}{" "}
                        {drop.rebateHint && (
                          <Badge
                            variant={
                              drop.rebateHint.eligible ? "outline" : "secondary"
                            }
                          >
                            {" "}
                            {drop.rebateHint.eligible
                              ? `✓ Eligible for ${drop.rebateHint.programId}`
                              : `${drop.rebateHint.programId} (${drop.rebateHint.minDropDollars} min)`}{" "}
                          </Badge>
                        )}{" "}
                      </div>{" "}
                    </div>
                  )}{" "}
                </Card>
              ))
            )}{" "}
            {/* Audit Note */}{" "}
            {plan.note && (
              <Card className="p-3 bg-surface/30">
                {" "}
                <div className="text-xs text-foreground/60 italic">
                  {" "}
                  {plan.note}{" "}
                </div>{" "}
              </Card>
            )}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
