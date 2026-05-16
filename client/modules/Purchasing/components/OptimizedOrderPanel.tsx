import React, { useEffect, useState } from "react";
import type { OptimizedOrderLine } from "@/lib/pack-optimizer";
import { osBus } from "@/lib/os-bus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, Package } from "lucide-react";
export default function OptimizedOrderPanel() {
  const [orders, setOrders] = useState<OptimizedOrderLine[]>([]);
  const [revision, setRevision] = useState<number>(0);
  useEffect(() => {
    const unsubscribe = osBus.on("purchasing:optimized", (payload) => {
      setOrders(payload.orders || []);
      setRevision(payload.revision);
    });
    return () => {
      unsubscribe();
    };
  }, []);
  if (!orders.length) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        {" "}
        <div className="text-center">
          {" "}
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-400" />{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            No optimized orders generated yet.{" "}
          </p>{" "}
          <p className="text-xs text-slate-400 mt-2">
            {" "}
            Generate a BEO to create optimized vendor orders.{" "}
          </p>{" "}
        </div>{" "}
      </div>
    );
  }
  const totalCost = orders.reduce((sum, order) => sum + order.totalCost, 0);
  const totalPacks = orders.reduce((sum, order) => sum + order.packsToOrder, 0);
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        {" "}
        <div className="space-y-3">
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {" "}
              <Package className="h-5 w-5" /> Optimized Vendor Orders{" "}
            </h2>{" "}
            <Badge variant="outline">Rev {revision}</Badge>{" "}
          </div>{" "}
          <p className="text-xs text-foreground/60">
            {" "}
            Vendor packs selected for lowest total cost{" "}
          </p>{" "}
          {/* Cost Summary */}{" "}
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/20">
            {" "}
            <div className="text-center">
              {" "}
              <div className="text-2xl font-bold text-foreground">
                {" "}
                {orders.length}{" "}
              </div>{" "}
              <div className="text-xs text-foreground/60">Line Items</div>{" "}
            </div>{" "}
            <div className="text-center">
              {" "}
              <div className="text-2xl font-bold text-emerald-600">
                {" "}
                {totalPacks}{" "}
              </div>{" "}
              <div className="text-xs text-foreground/60">Packs</div>{" "}
            </div>{" "}
            <div className="text-center">
              {" "}
              <div className="text-2xl font-bold text-primary">
                {" "}
                ${totalCost.toFixed(2)}{" "}
              </div>{" "}
              <div className="text-xs text-foreground/60">Total Cost</div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-auto">
        {" "}
        <Card className="border-0 shadow-none bg-transparent rounded-none h-full">
          {" "}
          <CardContent className="p-4">
            {" "}
            <div className="space-y-3">
              {" "}
              {orders.map((order, idx) => (
                <div
                  key={`${order.ingredientId}-${order.vendorId}`}
                  className="rounded-lg border border-border/30 p-4 hover:bg-muted/30 transition-colors"
                >
                  {" "}
                  <div className="flex items-start justify-between mb-3">
                    {" "}
                    <div className="flex-1">
                      {" "}
                      <h3 className="font-semibold text-foreground">
                        {" "}
                        {order.ingredientName}{" "}
                      </h3>{" "}
                      <p className="text-sm text-foreground/60 mt-1">
                        {" "}
                        {order.vendorName}{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <div className="text-lg font-bold text-primary">
                        {" "}
                        ${order.totalCost.toFixed(2)}{" "}
                      </div>{" "}
                      <div className="text-xs text-foreground/60 mt-1">
                        {" "}
                        {order.costPerUnit.toFixed(2)}/unit{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {" "}
                    <div className="bg-background dark:bg-black/20 rounded p-2">
                      {" "}
                      <div className="text-foreground/60 text-xs uppercase tracking-wide font-semibold mb-1">
                        {" "}
                        Pack Size{" "}
                      </div>{" "}
                      <div className="text-foreground">
                        {" "}
                        {order.packSize} {order.packUnit}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="bg-background dark:bg-black/20 rounded p-2">
                      {" "}
                      <div className="text-foreground/60 text-xs uppercase tracking-wide font-semibold mb-1">
                        {" "}
                        Packs to Order{" "}
                      </div>{" "}
                      <div className="text-lg font-bold text-foreground">
                        {" "}
                        {order.packsToOrder}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="bg-background dark:bg-black/20 rounded p-2 col-span-2">
                      {" "}
                      <div className="text-foreground/60 text-xs uppercase tracking-wide font-semibold mb-1">
                        {" "}
                        Total Quantity{" "}
                      </div>{" "}
                      <div className="text-foreground">
                        {" "}
                        {order.totalQuantity} {order.packUnit}{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Footer Summary */}{" "}
      <div className="flex-shrink-0 border-t border-border/30 p-4 bg-muted/30">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <p className="text-xs text-foreground/60">Total Order Value</p>{" "}
            <p className="text-2xl font-bold text-foreground mt-1">
              {" "}
              ${totalCost.toFixed(2)}{" "}
            </p>{" "}
          </div>{" "}
          <div className="flex items-center gap-2 text-emerald-600">
            {" "}
            <TrendingDown className="h-5 w-5" />{" "}
            <div className="text-right">
              {" "}
              <p className="text-xs text-foreground/60">Cost Optimized</p>{" "}
              <p className="text-sm font-semibold">Lowest per vendor</p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
