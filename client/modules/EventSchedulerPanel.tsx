/******************************************************************** * LUCCCA — BUILD 9 * EventSchedulerPanel (Event Creation + Governance Pipeline) * * PURPOSE: * - Let Events/Banquet schedule new events * - Run them through governance evaluation * - Log success / conflicts to the Change Feed * * LOCATION: * client/modules/EventSchedulerPanel.tsx * * INTEGRATION: * - Register as module in PANEL_REGISTRY ("Event Scheduler") * - Future: replace mockEvaluateEvent with server call to space-governance *********************************************************************/ import React, {
  useState,
} from "react";
import { cn } from "@/lib/glass";
type GovernanceResult = {
  ok: boolean;
  severity?: "info" | "warn" | "danger";
  reason?: string;
  overrideRequired?: boolean;
};
type NewEventInput = {
  title: string;
  space: string;
  outlet: string;
  start: string;
  end: string;
  headcount: number;
};
const mockExistingEvents = [
  {
    id: "1",
    space: "Aviva Ballroom",
    start: new Date("2025-02-05T18:00:00").getTime(),
    end: new Date("2025-02-05T22:00:00").getTime(),
    type: "banquet",
  },
];
function mockEvaluateEvent(input: NewEventInput): GovernanceResult {
  const incoming = {
    id: "new",
    space: input.space,
    start: new Date(input.start).getTime(),
    end: new Date(input.end).getTime(),
    type: "banquet",
  };
  const overlaps = mockExistingEvents.filter(
    (e) =>
      e.space === incoming.space &&
      e.end > incoming.start &&
      incoming.end > e.start,
  );
  if (overlaps.length > 0) {
    return {
      ok: false,
      severity: "danger",
      reason: "Time conflict with existing event",
      overrideRequired: true,
    };
  }
  return { ok: true, severity: "info" };
}
export default function EventSchedulerPanel() {
  const [form, setForm] = useState<NewEventInput>({
    title: "",
    space: "Aviva Ballroom",
    outlet: "Banquets",
    start: "",
    end: "",
    headcount: 0,
  });
  const [result, setResult] = useState<GovernanceResult | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const handleChange = (field: keyof NewEventInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value as any }));
  };
  const handleSubmit = () => {
    if (!form.title || !form.start || !form.end) {
      setStatusMsg("Please fill title, start, and end.");
      return;
    }
    const govResult = mockEvaluateEvent(form);
    setResult(govResult);
    if (govResult.ok) {
      setStatusMsg("Event scheduled successfully.");
    } else {
      setStatusMsg(
        `Event requires review: ${govResult.reason || "see details"}`,
      );
    }
  };
  return (
    <div className="p-4 h-full overflow-y-auto font-sans bg-background space-y-3">
      {" "}
      <div className="sticky top-0 bg-background pb-4">
        {" "}
        <h2 className="text-lg font-semibold text-foreground">
          Event Scheduler
        </h2>{" "}
        <p className="text-xs text-foreground/60 mt-1">
          {" "}
          Create a new event and validate it against space governance
          rules.{" "}
        </p>{" "}
      </div>{" "}
      <div className="space-y-2 text-sm">
        {" "}
        <label className="block">
          {" "}
          <span className="text-xs font-medium text-foreground/70">
            Title
          </span>{" "}
          <input
            className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Wedding Reception, Corporate Dinner, etc."
          />{" "}
        </label>{" "}
        <label className="block">
          {" "}
          <span className="text-xs font-medium text-foreground/70">
            Space
          </span>{" "}
          <select
            className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={form.space}
            onChange={(e) => handleChange("space", e.target.value)}
          >
            {" "}
            <option>Aviva Ballroom</option> <option>Pool Deck</option>{" "}
            <option>Courtyard</option> <option>Sky Lounge</option>{" "}
          </select>{" "}
        </label>{" "}
        <label className="block">
          {" "}
          <span className="text-xs font-medium text-foreground/70">
            Outlet
          </span>{" "}
          <select
            className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={form.outlet}
            onChange={(e) => handleChange("outlet", e.target.value)}
          >
            {" "}
            <option>Banquets</option> <option>Steakhouse</option>{" "}
            <option>Pool Grill</option>{" "}
          </select>{" "}
        </label>{" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          <label className="block">
            {" "}
            <span className="text-xs font-medium text-foreground/70">
              Start
            </span>{" "}
            <input
              type="datetime-local"
              className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={form.start}
              onChange={(e) => handleChange("start", e.target.value)}
            />{" "}
          </label>{" "}
          <label className="block">
            {" "}
            <span className="text-xs font-medium text-foreground/70">
              End
            </span>{" "}
            <input
              type="datetime-local"
              className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={form.end}
              onChange={(e) => handleChange("end", e.target.value)}
            />{" "}
          </label>{" "}
        </div>{" "}
        <label className="block">
          {" "}
          <span className="text-xs font-medium text-foreground/70">
            {" "}
            Headcount{" "}
          </span>{" "}
          <input
            type="number"
            className="mt-1 w-full border border-border/30 rounded-md px-2 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={form.headcount}
            onChange={(e) => handleChange("headcount", Number(e.target.value))}
          />{" "}
        </label>{" "}
      </div>{" "}
      <button
        onClick={handleSubmit}
        className="w-full bg-primary text-primary-foreground text-sm rounded-md py-2 font-medium hover:bg-primary/90 transition-colors"
      >
        {" "}
        Validate & Schedule{" "}
      </button>{" "}
      {statusMsg && (
        <div className="text-xs text-foreground/80 bg-surface border border-border/20 rounded-md px-3 py-2">
          {" "}
          {statusMsg}{" "}
        </div>
      )}{" "}
      {result && (
        <div className="text-xs bg-surface border border-border/20 rounded-md px-3 py-2 space-y-1">
          {" "}
          <div className="font-semibold text-foreground mb-1">
            {" "}
            Governance Result{" "}
          </div>{" "}
          <div className="text-foreground/70">OK: {String(result.ok)}</div>{" "}
          {result.reason && (
            <div className="text-foreground/70">Reason: {result.reason}</div>
          )}{" "}
          {result.overrideRequired && (
            <div className="text-red-600 font-medium">
              {" "}
              ⚠️ Requires Override{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
    </div>
  );
}
