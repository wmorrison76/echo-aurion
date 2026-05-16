import React from "react";
/** * Genesis G — Inventory Control Panel (v1) * Location selector, quick inventory adjustments, and surplus broadcast feed. * Offsets procurement by on-hand/on-order and broadcasts surplus to outlets. */ import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { osBus } from "@/lib/os-bus";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import {
  initializeSampleLocations,
  listInventoryLocations,
  getInventoryState,
  upsertInventoryItem,
  appendLedger,
} from "@/lib/inventory-store";
import { createSurplus, listSurplus, claimSurplus } from "@/lib/surplus-store";
export default function GenesisGPanel() {
  const { t } = useI18n();
  const [locId, setLocId] = useState<string>("storeroom_main");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    initializeSampleLocations();
  }, []);
  const locations = useMemo(() => listInventoryLocations(), [tick]);
  const state = useMemo(() => getInventoryState(locId), [locId, tick]);
  const surplus = useMemo(() => listSurplus(), [tick]);
  function bump() {
    setTick((x) => x + 1);
  }
  function quickSet(
    ingredientName: string,
    unit: string,
    onHandQty: number,
    onOrderQty: number,
  ) {
    upsertInventoryItem(locId, {
      ingredientName,
      unit,
      onHandQty,
      onOrderQty,
      lastCountAtISO: new Date().toISOString(),
    });
    const item = {
      ingredientName,
      unit,
      onHandQty,
      onOrderQty,
      lastCountAtISO: new Date().toISOString(),
    };
    const ledger = appendLedger(locId, {
      locationId: locId,
      ingredientName,
      unit,
      deltaOnHand: 0,
      deltaOnOrder: 0,
      reason: "COUNT",
      sourceType: "MANUAL",
      sourceId: null,
      note: "Quick set inventory values (Genesis G panel).",
    });
    osBus.emit("inventory:updated", { locationId: locId, item, ledger });
    bump();
  }
  function broadcastSurplus() {
    const s = createSurplus({
      fromLocationId: "storeroom_main",
      ingredientName: "Chicken Breast 6oz",
      unit: "lb",
      availableQty: 20,
      reason: "CASE_OVERAGE",
      note: "Vendor shipped 60lb case; 20lb available for outlets (specials/REOs).",
      expiresAtISO: null,
      sourceType: "RECEIPT",
      sourceId: "demo_receipt_000001",
    });
    osBus.emit("inventory:surplus_broadcast", { surplus: s });
    bump();
  }
  function handleClaim(surplusId: string) {
    claimSurplus(surplusId, 5);
    bump();
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
            <div className="text-lg font-semibold text-foreground">
              {" "}
              {t("module.genesis-g.title")}{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              {t("module.genesis-g.description")}{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <ModuleChatButton
              moduleId="genesis-g"
              moduleName={t("module.genesis-g.title")}
            />{" "}
            <Badge>Inventory</Badge>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {" "}
        {/* Location Selector */}{" "}
        <Card className="p-4">
          {" "}
          <div className="font-semibold text-foreground mb-3">
            Location
          </div>{" "}
          <div className="flex gap-2 flex-wrap">
            {" "}
            {locations.map((l) => (
              <Button
                key={l.locationId}
                variant={l.locationId === locId ? "default" : "secondary"}
                onClick={() => setLocId(l.locationId)}
              >
                {" "}
                {l.locationName}{" "}
              </Button>
            ))}{" "}
          </div>{" "}
        </Card>{" "}
        {/* Quick Set Demo */}{" "}
        <Card className="p-4">
          {" "}
          <div className="font-semibold text-foreground mb-2">
            {" "}
            Quick Set (Demo){" "}
          </div>{" "}
          <div className="text-xs text-foreground/70 mb-3">
            {" "}
            Set sample inventory so Genesis C/G procurement offsets net-to-order
            correctly. Try setting different amounts to see how offsets
            work.{" "}
          </div>{" "}
          <div className="flex gap-2 flex-wrap">
            {" "}
            <Button
              variant="outline"
              onClick={() => quickSet("Chicken Breast 6oz", "lb", 40, 0)}
            >
              {" "}
              Set Chicken Breast = 40 lb{" "}
            </Button>{" "}
            <Button
              variant="outline"
              onClick={() => quickSet("Broccolini", "lb", 0, 0)}
            >
              {" "}
              Set Broccolini = 0 lb{" "}
            </Button>{" "}
            <Button
              variant="outline"
              onClick={() => quickSet("Glace de Veau", "gal", 0, 0)}
            >
              {" "}
              Set Glace de Veau = 0 gal{" "}
            </Button>{" "}
          </div>{" "}
        </Card>{" "}
        {/* Inventory State Display */}{" "}
        <Card className="p-4">
          {" "}
          <div className="font-semibold text-foreground mb-3">
            {" "}
            Inventory State{" "}
          </div>{" "}
          {state.length === 0 ? (
            <div className="text-sm text-foreground/70">
              {" "}
              No items yet for this location. Click"Quick Set" buttons above to
              populate sample inventory.{" "}
            </div>
          ) : (
            <div className="space-y-2">
              {" "}
              {state.map((item) => (
                <div
                  key={`${item.ingredientName}_${item.unit}`}
                  className="flex items-center justify-between border-t border-border/20 pt-2"
                >
                  {" "}
                  <div>
                    {" "}
                    <div className="font-semibold text-foreground">
                      {" "}
                      {item.ingredientName}{" "}
                    </div>{" "}
                    <div className="text-xs text-foreground/60">
                      {" "}
                      {item.unit}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <div className="text-sm">
                      {" "}
                      On Hand:{""}{" "}
                      <span className="font-semibold">
                        {item.onHandQty}
                      </span>{" "}
                    </div>{" "}
                    <div className="text-xs text-foreground/60">
                      {" "}
                      On Order: {item.onOrderQty}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </Card>{" "}
        {/* Surplus Broadcast Feed */}{" "}
        <Card className="p-4">
          {" "}
          <div className="flex items-center justify-between mb-3">
            {" "}
            <div className="font-semibold text-foreground">
              {" "}
              Surplus Broadcast Feed{" "}
            </div>{" "}
            <Button onClick={broadcastSurplus}>
              Broadcast Demo Surplus
            </Button>{" "}
          </div>{" "}
          {surplus.length === 0 ? (
            <div className="text-sm text-foreground/70">
              {" "}
              No surplus broadcasts yet. Click the button above to create a demo
              surplus and see it appear below.{" "}
            </div>
          ) : (
            <div className="space-y-3">
              {" "}
              {surplus.map((s) => (
                <Card key={s.surplusId} className="p-3 bg-surface/50">
                  {" "}
                  <div className="flex items-center justify-between mb-2">
                    {" "}
                    <div className="font-semibold text-foreground">
                      {" "}
                      {s.ingredientName}{" "}
                    </div>{" "}
                    <Badge variant="outline">
                      {" "}
                      {s.availableQty} {s.unit} available{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="text-xs text-foreground/70 mb-2">
                    {" "}
                    From: {s.fromLocationId}{" "}
                  </div>{" "}
                  {s.note && (
                    <div className="text-xs text-foreground/60 mb-2 italic">
                      {" "}
                      {s.note}{" "}
                    </div>
                  )}{" "}
                  <div className="flex gap-2">
                    {" "}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleClaim(s.surplusId)}
                    >
                      {" "}
                      Claim 5 {s.unit}{" "}
                    </Button>{" "}
                    {s.reason && (
                      <Badge variant="secondary">{s.reason}</Badge>
                    )}{" "}
                  </div>{" "}
                </Card>
              ))}{" "}
            </div>
          )}{" "}
        </Card>{" "}
        {/* Instructions */}{" "}
        <Card className="p-3 bg-surface/30">
          {" "}
          <div className="text-xs text-foreground/70">
            {" "}
            <div className="font-semibold text-foreground mb-1">
              {" "}
              How Genesis G works:{" "}
            </div>{" "}
            <ul className="list-disc list-inside space-y-1">
              {" "}
              <li>
                {" "}
                Set inventory amounts for locations (Storeroom, Commissaries,
                Outlets){" "}
              </li>{" "}
              <li>
                {" "}
                When you generate a BEO group, Genesis C/G automatically
                subtracts on-hand inventory from orders (offsets){" "}
              </li>{" "}
              <li>
                {" "}
                When vendors ship more than needed, broadcast surplus so outlets
                can claim it for specials/REOs{" "}
              </li>{" "}
              <li>
                {" "}
                Every movement creates an audit trail for Genesis D cost
                attribution{" "}
              </li>{" "}
            </ul>{" "}
          </div>{" "}
        </Card>{" "}
      </div>{" "}
    </div>
  );
}
