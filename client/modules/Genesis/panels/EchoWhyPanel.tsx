/** * EchoWhy Panel (Patch G) * Diagnostic panel explaining procurement decisions in human-readable format */ import React, {
  useEffect,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, Lightbulb, TrendingDown } from "lucide-react";
import { getLastProcurementPlan } from "@/stores/genesisProcurementStore";
import {
  explainProcurementDecision,
  summarizePlan,
  type ProcurementExplanation,
} from "@/lib/genesis/echo/whyEngine";
export default function EchoWhyPanel() {
  const [plan, setPlan] = useState<any>(null);
  const [explanation, setExplanation] = useState<ProcurementExplanation | null>(
    null,
  );
  const [tab, setTab] = useState<"OVERVIEW" | "DEMAND" | "VENDORS" | "COSTS">(
    "OVERVIEW",
  );
  useEffect(() => {
    const lastPlan = getLastProcurementPlan();
    if (lastPlan) {
      setPlan(lastPlan);
      const exp = explainProcurementDecision(lastPlan);
      setExplanation(exp);
    }
  }, []);
  if (!plan || !explanation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background p-4">
        {" "}
        <Card className="p-8 text-center max-w-md">
          {" "}
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-amber-500" />{" "}
          <h3 className="text-lg font-semibold text-foreground">No Plan Yet</h3>{" "}
          <p className="text-sm text-foreground/70 mt-2">
            {" "}
            Run a procurement first to see the explanation of why decisions were
            made.{" "}
          </p>{" "}
        </Card>{" "}
      </div>
    );
  }
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
            <div className="text-lg font-semibold text-foreground flex gap-2">
              {" "}
              <Lightbulb className="w-5 h-5" /> Genesis EchoWhy{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              {explanation.summary}{" "}
            </div>{" "}
          </div>{" "}
          <Badge variant="outline">Diagnostic</Badge>{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-auto p-4">
        {" "}
        <div className="space-y-4">
          {" "}
          {/* Tabs */}{" "}
          <Tabs
            value={tab}
            onValueChange={(v: any) => setTab(v)}
            className="w-full"
          >
            {" "}
            <TabsList className="grid w-full grid-cols-4">
              {" "}
              <TabsTrigger value="OVERVIEW">Overview</TabsTrigger>{" "}
              <TabsTrigger value="DEMAND">Demand</TabsTrigger>{" "}
              <TabsTrigger value="VENDORS">Vendors</TabsTrigger>{" "}
              <TabsTrigger value="COSTS">Costs</TabsTrigger>{" "}
            </TabsList>{" "}
            {/* Overview Tab */}{" "}
            <TabsContent value="OVERVIEW" className="space-y-4">
              {" "}
              <Card className="p-4">
                {" "}
                <div className="text-sm font-medium text-foreground mb-3">
                  {" "}
                  Plan Summary{" "}
                </div>{" "}
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {" "}
                  {summarizePlan(plan)}{" "}
                </p>{" "}
                {explanation.anomalies.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30 space-y-2">
                    {" "}
                    <div className="text-sm font-medium text-foreground flex gap-2">
                      {" "}
                      <AlertCircle className="w-4 h-4 text-amber-500" />{" "}
                      Anomalies Detected{" "}
                    </div>{" "}
                    {explanation.anomalies.map((a, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-amber-900/20 text-amber-200 text-sm"
                      >
                        {" "}
                        {a.message}{" "}
                        {a.recommendation && (
                          <div className="text-xs mt-1 opacity-80">
                            {" "}
                            💡 {a.recommendation}{" "}
                          </div>
                        )}{" "}
                      </div>
                    ))}{" "}
                  </div>
                )}{" "}
              </Card>{" "}
            </TabsContent>{" "}
            {/* Demand Tab */}{" "}
            <TabsContent value="DEMAND" className="space-y-4">
              {" "}
              <Card className="p-4">
                {" "}
                <div className="text-sm font-medium text-foreground mb-3">
                  {" "}
                  Demand Mapping{" "}
                </div>{" "}
                <div className="space-y-3">
                  {" "}
                  {explanation.demandMapping.map((dm) => (
                    <div
                      key={dm.itemSku}
                      className="p-3 border border-border/30 rounded"
                    >
                      {" "}
                      <div className="font-semibold text-foreground text-sm">
                        {" "}
                        {dm.itemName} ({dm.itemSku}){" "}
                      </div>{" "}
                      <div className="mt-2 space-y-1">
                        {" "}
                        <div className="text-xs text-foreground/70 mb-2">
                          {" "}
                          Total Demand:{""}{" "}
                          <span className="font-semibold">
                            {" "}
                            {dm.totalDemand}{" "}
                          </span>
                          {""} units{" "}
                        </div>{" "}
                        {dm.sources.map((src) => (
                          <div
                            key={src.outletId}
                            className="flex items-center justify-between p-1.5 bg-foreground/5 rounded text-xs"
                          >
                            {" "}
                            <span>{src.outletName}</span>{" "}
                            <Badge variant="secondary">
                              {src.quantity}
                            </Badge>{" "}
                          </div>
                        ))}{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </Card>{" "}
            </TabsContent>{" "}
            {/* Vendors Tab */}{" "}
            <TabsContent value="VENDORS" className="space-y-4">
              {" "}
              <Card className="p-4">
                {" "}
                <div className="text-sm font-medium text-foreground mb-3">
                  {" "}
                  Vendor Selections{" "}
                </div>{" "}
                <div className="space-y-3">
                  {" "}
                  {explanation.vendorSelections.map((vs, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-blue-500/30 bg-primary/5 rounded"
                    >
                      {" "}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        {" "}
                        <div>
                          {" "}
                          <div className="font-semibold text-foreground text-sm">
                            {" "}
                            {vs.vendorName}{" "}
                          </div>{" "}
                          <div className="text-xs text-foreground/70 mt-0.5">
                            {" "}
                            {vs.deliveryDate} • {vs.lineCount} lines{" "}
                          </div>{" "}
                        </div>{" "}
                      </div>{" "}
                      <p className="text-xs text-foreground/70 italic">
                        {" "}
                        {vs.reason}{" "}
                      </p>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </Card>{" "}
            </TabsContent>{" "}
            {/* Costs Tab */}{" "}
            <TabsContent value="COSTS" className="space-y-4">
              {" "}
              <Card className="p-4">
                {" "}
                <div className="text-sm font-medium text-foreground mb-3 flex gap-2">
                  {" "}
                  <TrendingDown className="w-4 h-4" /> Cost Attribution
                  Rules{" "}
                </div>{" "}
                <div className="space-y-3">
                  {" "}
                  {explanation.costAttributions.map((ca, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-green-500/30 bg-green-500/5 rounded"
                    >
                      {" "}
                      <div className="flex items-center justify-between mb-2">
                        {" "}
                        <div className="font-semibold text-foreground text-sm">
                          {" "}
                          {ca.outletName}{" "}
                        </div>{" "}
                        <Badge variant="outline">
                          {" "}
                          ${ca.estimatedCost.toFixed(2)}{" "}
                        </Badge>{" "}
                      </div>{" "}
                      <div className="text-xs text-foreground/70 space-y-1">
                        {" "}
                        <div>
                          {" "}
                          Rule:{" "}
                          <span className="font-medium">{ca.rule}</span>{" "}
                        </div>{" "}
                        <div>{ca.mode}</div>{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </Card>{" "}
            </TabsContent>{" "}
          </Tabs>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
