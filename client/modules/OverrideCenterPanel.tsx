/******************************************************************** * LUCCCA — BUILD 11 * OverrideCenterPanel (EC / Director Approval Center) * * PURPOSE: * - Central place to resolve conflicts flagged by governance * - EC / Directors can Approve or Deny * - Future: write decisions back to events, maintenance, and feed * * LOCATION: * client/modules/OverrideCenterPanel.tsx *********************************************************************/ import React, {
  useState,
} from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/glass";
type ConflictItem = {
  id: string;
  kind: "event" | "maintenance";
  space: string;
  description: string;
  severity: "warn" | "danger";
  requestedBy: string;
  status: "pending" | "approved" | "denied";
};
const initialConflicts: ConflictItem[] = [
  {
    id: "c1",
    kind: "event",
    space: "Aviva Ballroom",
    description: "New banquet requested during engineering buffer window.",
    severity: "warn",
    requestedBy: "Catering Manager",
    status: "pending",
  },
  {
    id: "c2",
    kind: "maintenance",
    space: "Aviva Ballroom",
    description: "Painting request overlaps existing BEO (Wedding Reception).",
    severity: "danger",
    requestedBy: "Engineering Manager",
    status: "pending",
  },
];
export default function OverrideCenterPanel() {
  const [items, setItems] = useState<ConflictItem[]>(initialConflicts);
  const handleDecision = (id: string, decision: "approved" | "denied") => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: decision } : item,
      ),
    );
  };
  const badgeColor = {
    warn: "bg-amber-500 text-white",
    danger: "bg-red-600 text-white",
  };
  const statusColor = {
    pending: "bg-slate-400",
    approved: "bg-emerald-600",
    denied: "bg-red-500",
  };
  const pendingCount = items.filter((i) => i.status === "pending").length;
  return (
    <div className="p-4 h-full overflow-y-auto font-sans bg-background space-y-4">
      {" "}
      <div className="sticky top-0 bg-background pb-4">
        {" "}
        <h2 className="text-lg font-semibold text-foreground">
          {" "}
          Override Center{" "}
        </h2>{" "}
        <p className="text-xs text-foreground/60 mt-1">
          {" "}
          View all space governance conflicts requiring EC / Director
          approval.{" "}
        </p>{" "}
        {pendingCount > 0 && (
          <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
            {" "}
            <p className="text-xs text-red-700 font-medium">
              {" "}
              🔔 {pendingCount} pending override
              {pendingCount !== 1 ? "s" : ""}{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {items.length === 0 && (
        <div className="text-xs text-foreground/60 bg-surface border border-border/20 rounded-md px-3 py-2">
          {" "}
          No pending overrides. All clear.{" "}
        </div>
      )}{" "}
      <div className="space-y-3">
        {" "}
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "border rounded-lg px-3 py-2 shadow-sm",
              item.status === "pending"
                ? "border-border/20 bg-surface"
                : "border-border/10 bg-surface/50 opacity-75",
            )}
          >
            {" "}
            <div className="flex items-start gap-2 text-xs">
              {" "}
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] uppercase text-white flex-shrink-0 mt-0.5",
                  item.kind === "event" ? "bg-primary" : "bg-fuchsia-600",
                )}
              >
                {" "}
                {item.kind === "event" ? "EV" : "EN"}{" "}
              </span>{" "}
              <div className="flex-1 min-w-0">
                {" "}
                <div className="font-semibold text-foreground">
                  {" "}
                  {item.space}{" "}
                </div>{" "}
                <div className="flex items-center gap-2 mt-0.5">
                  {" "}
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      badgeColor[item.severity],
                    )}
                  >
                    {" "}
                    {item.severity.toUpperCase()}{" "}
                  </span>{" "}
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-white font-medium",
                      statusColor[item.status],
                    )}
                  >
                    {" "}
                    {item.status === "pending" && "⏳ PENDING"}{" "}
                    {item.status === "approved" && "✓ APPROVED"}{" "}
                    {item.status === "denied" && "✕ DENIED"}{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div className="mt-2 text-xs text-foreground/80">
              {" "}
              {item.description}{" "}
            </div>{" "}
            <div className="mt-1 text-[10px] text-foreground/60">
              {" "}
              Requested by:{" "}
              <span className="font-medium">{item.requestedBy}</span>{" "}
            </div>{" "}
            {item.status === "pending" && (
              <div className="mt-3 flex gap-2">
                {" "}
                <button
                  onClick={() => handleDecision(item.id, "approved")}
                  className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-md py-1.5 font-medium transition-colors flex items-center justify-center gap-1"
                >
                  {" "}
                  <CheckCircle size={13} /> Approve{" "}
                </button>{" "}
                <button
                  onClick={() => handleDecision(item.id, "denied")}
                  className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md py-1.5 font-medium transition-colors flex items-center justify-center gap-1"
                >
                  {" "}
                  <XCircle size={13} /> Deny{" "}
                </button>{" "}
              </div>
            )}{" "}
          </div>
        ))}{" "}
      </div>{" "}
      <div className="mt-3 text-[11px] text-foreground/60 bg-surface border border-border/20 rounded-lg px-3 py-2 space-y-1">
        {" "}
        <div className="font-semibold text-foreground">
          {" "}
          💡 Integration Note{" "}
        </div>{" "}
        <p>
          {" "}
          This panel reads from mock data. In production, it should connect to a{" "}
          <code className="text-foreground/80">/api/conflicts</code> endpoint
          and post decisions to{""}{" "}
          <code className="text-foreground/80">/api/conflicts/:id/resolve</code>
          , which updates the event/maintenance job and notifies via Change
          Feed.{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
