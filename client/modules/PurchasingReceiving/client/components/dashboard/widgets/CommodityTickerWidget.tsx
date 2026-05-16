import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
export interface CommodityTickerEntry {
  id: string;
  label: string;
  unit: string;
  price: number;
  changePct: number;
  changeNote: string;
  riskLevel: "elevated" | "watch" | "stable";
  driver: string;
  effectiveFrom: string;
}
interface CommodityTickerWidgetProps {
  entries: CommodityTickerEntry[];
  intervalMs?: number;
}
const riskBadge: Record<CommodityTickerEntry["riskLevel"], string> = {
  elevated: "bg-red-500/20 text-red-200",
  watch: "bg-amber-500/20 text-amber-200",
  stable: "bg-emerald-500/20 text-emerald-200",
};
export function CommodityTickerWidget({
  entries,
  intervalMs = 5000,
}: CommodityTickerWidgetProps) {
  const [index, setIndex] = useState(0);
  const ordered = useMemo(
    () => entries.slice().sort((a, b) => b.changePct - a.changePct),
    [entries],
  );
  useEffect(() => {
    if (!ordered.length) return;
    const handle = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ordered.length);
    }, intervalMs);
    return () => window.clearInterval(handle);
  }, [ordered.length, intervalMs]);
  if (!ordered.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Commodity feed is quiet. Connect pricing sources to power live
        monitoring.
      </p>
    );
  }
  const active = ordered[index];
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
  return (
    <div className="flex flex-col gap-4">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <h3 className="text-sm font-semibold text-slate-100">
          Macro commodity signal
        </h3>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-300 hover:text-white"
            onClick={() =>
              setIndex((prev) => (prev - 1 + ordered.length) % ordered.length)
            }
            aria-label="Previous commodity"
          >
            {" "}
            <ChevronLeft className="h-4 w-4" />{" "}
          </Button>{" "}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-300 hover:text-white"
            onClick={() => setIndex((prev) => (prev + 1) % ordered.length)}
            aria-label="Next commodity"
          >
            {" "}
            <ChevronRight className="h-4 w-4" />{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      <div className="relative overflow-hidden rounded-xl border border-slate-800/60 bg-card p-4">
        {" "}
        <AnimatePresence mode="wait" initial={false}>
          {" "}
          <motion.div
            key={active.id}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col gap-3"
          >
            {" "}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {" "}
              <div>
                {" "}
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {active.unit}
                </p>{" "}
                <h3 className="text-lg font-semibold text-slate-100">
                  {active.label}
                </h3>{" "}
                <p className="text-xs text-slate-400">
                  Signal refreshed{" "}
                  {new Date(active.effectiveFrom).toLocaleString()}
                </p>{" "}
              </div>{" "}
              <Badge
                className={`${riskBadge[active.riskLevel]} rounded-full px-3 py-1 text-xs uppercase tracking-wide`}
              >
                {" "}
                {active.riskLevel === "elevated"
                  ? "Escalate"
                  : active.riskLevel === "watch"
                    ? "Watch"
                    : "Stable"}{" "}
              </Badge>{" "}
            </div>{" "}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
              {" "}
              <span className="text-2xl font-semibold text-slate-100">
                {currency.format(active.price)}
              </span>{" "}
              <span
                className={
                  active.changePct >= 0 ? "text-emerald-300" : "text-red-300"
                }
              >
                {" "}
                {active.changePct >= 0 ? "+" : ""} {active.changePct.toFixed(2)}
                %{" "}
              </span>{" "}
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {active.changeNote}
              </span>{" "}
            </div>{" "}
            <p className="text-sm text-slate-300">{active.driver}</p>{" "}
            <div className="flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
              {" "}
              {ordered.map((entry, idx) => (
                <span
                  key={entry.id}
                  className={`h-1.5 w-5 rounded-sm ${idx === index ? "bg-sky-400" : "bg-slate-700"}`}
                />
              ))}{" "}
            </div>{" "}
          </motion.div>{" "}
        </AnimatePresence>{" "}
      </div>{" "}
    </div>
  );
}
