import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/glass";
import { osBus } from "@/lib/os-bus";
import type { InventoryReward } from "@/../shared/types/inventory-rewards";
import {
  getInventoryRewardSettings,
  listInventoryRewards,
  updateInventoryRewardSettings,
} from "@/lib/inventory-rewards-store";
import { ensureInventoryRewardsWiring } from "@/lib/inventory-rewards-wiring";

function severityClass(sev: InventoryReward["severity"]): string {
  if (sev === "CELEBRATE")
    return "border-emerald-500/30 text-emerald-200 bg-emerald-600/10";
  if (sev === "PRAISE") return "border-sky-500/30 text-sky-200 bg-sky-600/10";
  return "border-amber-500/30 text-amber-200 bg-amber-600/10";
}

export default function InventoryRewardsPanel() {
  const [settings, setSettings] = React.useState(() =>
    getInventoryRewardSettings(),
  );
  const [rewards, setRewards] = React.useState<InventoryReward[]>(() =>
    listInventoryRewards(),
  );

  React.useEffect(() => {
    ensureInventoryRewardsWiring();
    const unsub = osBus.on("inventory:reward_issued", () => {
      setRewards(listInventoryRewards());
    });
    return () => unsub?.();
  }, []);

  const grouped = React.useMemo(() => {
    const map = new Map<string, InventoryReward[]>();
    for (const r of rewards) {
      const d = new Date(r.issuedAt).toLocaleDateString();
      map.set(d, [...(map.get(d) ?? []), r]);
    }
    return Array.from(map.entries());
  }, [rewards]);

  const toggleChefNet = React.useCallback(() => {
    const next = updateInventoryRewardSettings({
      publishToChefNet: !settings.publishToChefNet,
    });
    setSettings(next);
  }, [settings.publishToChefNet]);

  const toggleEnabled = React.useCallback(() => {
    const next = updateInventoryRewardSettings({ enabled: !settings.enabled });
    setSettings(next);
  }, [settings.enabled]);

  return (
    <div className="w-full h-full p-3">
      <Card className={cn("w-full h-full p-3 bg-black/40 border-white/10")}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">Inventory Rewards</div>
            <Badge variant="outline" className="border-white/10 text-white/70">
              Positive Reinforcement
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={toggleEnabled}>
              {settings.enabled ? "Rewards ON" : "Rewards OFF"}
            </Button>
            <Button variant="outline" onClick={toggleChefNet}>
              {settings.publishToChefNet ? "ChefNet ON" : "ChefNet OFF"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setRewards(listInventoryRewards())}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="h-[calc(100%-56px)] overflow-auto">
          {rewards.length === 0 ? (
            <div className="text-sm text-white/70">
              No rewards yet. Trigger a few inventory snapshot updates (U4.7)
              and the system will award streaks automatically.
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <div className="text-sm font-medium text-white/80 mb-2">
                    {date}
                  </div>
                  <div className="space-y-2">
                    {items.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-md border border-white/10 bg-black/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">
                              {r.title}
                            </div>
                            <div className="text-xs text-white/60">
                              {r.locationId} •{" "}
                              {new Date(r.issuedAt).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-xs",
                                severityClass(r.severity),
                              )}
                            >
                              {r.severity}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-white/10 text-white/70 text-xs"
                            >
                              {r.kind}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-sm text-white/80 mt-2">
                          {r.message}
                        </div>

                        <details className="mt-2">
                          <summary className="text-xs text-white/60 cursor-pointer">
                            Evidence
                          </summary>
                          <pre className="text-xs text-white/70 whitespace-pre-wrap mt-2 overflow-auto max-h-40">
                            {JSON.stringify(r.evidence, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
