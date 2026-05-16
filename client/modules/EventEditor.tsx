/******************************************************************** * LUCCCA — BUILD 22 * Inline Event Editing + Approval Flows * * PURPOSE: * - Allow inline edits to event fields * - Route critical changes through approvals * - Auto-notify departments * - Audit everything *********************************************************************/ import React, {
  useState,
} from "react";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
export default function EventEditor({
  initial,
  canEdit,
  onSubmit,
}: {
  initial: any;
  canEdit: boolean;
  onSubmit: (patch: any) => void;
}) {
  const [data, setData] = useState(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "pending-approval" | "applied" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  if (!canEdit) {
    return (
      <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-border">
        {" "}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {" "}
          <AlertCircle className="w-4 h-4" /> You do not have permission to
          modify this event.{" "}
        </div>{" "}
      </div>
    );
  }
  function update(field: string, value: any) {
    setData({ ...data, [field]: value });
  }
  async function handleSubmit() {
    setIsSubmitting(true);
    setErrorMessage("");
    const changes: Record<string, any> = {};
    let hasChanges = false;
    Object.keys(data).forEach((key) => {
      if (data[key] !== initial[key]) {
        changes[key] = data[key];
        hasChanges = true;
      }
    });
    if (!hasChanges) {
      setIsSubmitting(false);
      return;
    }
    try {
      const result = await onSubmit(changes);
      setSubmitStatus(result.status || "applied");
      if (result.status === "pending-approval") {
        setErrorMessage("Changes submitted for approval");
      }
    } catch (err) {
      setSubmitStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to submit changes",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  const criticalFields = ["headcount", "start", "end", "space"];
  const hasChanges = Object.keys(data).some((k) => data[k] !== initial[k]);
  const criticalChanges = Object.keys(data).filter(
    (k) => criticalFields.includes(k) && data[k] !== initial[k],
  );
  return (
    <div className="space-y-3 p-3 border border-slate-200 dark:border-border rounded-md bg-slate-50 dark:bg-slate-800">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <h3 className="font-semibold text-foreground text-sm">
          {" "}
          Edit Event{" "}
        </h3>{" "}
        {submitStatus === "pending-approval" && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            {" "}
            <Clock className="w-3 h-3" /> Pending Approval{" "}
          </div>
        )}{" "}
        {submitStatus === "applied" && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            {" "}
            <CheckCircle className="w-3 h-3" /> Applied{" "}
          </div>
        )}{" "}
        {submitStatus === "error" && (
          <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            {" "}
            <AlertCircle className="w-3 h-3" /> Error{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Title */}{" "}
      <div>
        {" "}
        <label className="text-xs text-muted-foreground font-medium">
          {" "}
          Title{" "}
        </label>{" "}
        <input
          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-background dark:bg-slate-700 text-foreground"
          value={data.title}
          onChange={(e) => update("title", e.target.value)}
          disabled={isSubmitting}
        />{" "}
      </div>{" "}
      {/* Headcount */}{" "}
      <div>
        {" "}
        <label className="text-xs text-muted-foreground font-medium">
          {" "}
          Headcount{" "}
          {criticalChanges.includes("headcount") && (
            <span className="text-red-500">*</span>
          )}{" "}
        </label>{" "}
        <input
          type="number"
          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-background dark:bg-slate-700 text-foreground"
          value={data.headcount}
          onChange={(e) => update("headcount", Number(e.target.value))}
          disabled={isSubmitting}
        />{" "}
      </div>{" "}
      {/* Start time */}{" "}
      <div>
        {" "}
        <label className="text-xs text-muted-foreground font-medium">
          {" "}
          Start{" "}
          {criticalChanges.includes("start") && (
            <span className="text-red-500">*</span>
          )}{" "}
        </label>{" "}
        <input
          type="time"
          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-background dark:bg-slate-700 text-foreground"
          value={data.start}
          onChange={(e) => update("start", e.target.value)}
          disabled={isSubmitting}
        />{" "}
      </div>{" "}
      {/* End time */}{" "}
      <div>
        {" "}
        <label className="text-xs text-muted-foreground font-medium">
          {" "}
          End{" "}
          {criticalChanges.includes("end") && (
            <span className="text-red-500">*</span>
          )}{" "}
        </label>{" "}
        <input
          type="time"
          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-background dark:bg-slate-700 text-foreground"
          value={data.end}
          onChange={(e) => update("end", e.target.value)}
          disabled={isSubmitting}
        />{" "}
      </div>{" "}
      {/* Space */}{" "}
      <div>
        {" "}
        <label className="text-xs text-muted-foreground font-medium">
          {" "}
          Space{" "}
          {criticalChanges.includes("space") && (
            <span className="text-red-500">*</span>
          )}{" "}
        </label>{" "}
        <input
          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-background dark:bg-slate-700 text-foreground"
          value={data.space}
          onChange={(e) => update("space", e.target.value)}
          disabled={isSubmitting}
        />{" "}
      </div>{" "}
      {/* Status */}{" "}
      <div>
        {" "}
        <label className="text-xs text-muted-foreground font-medium">
          {" "}
          Status{" "}
        </label>{" "}
        <select
          className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-background dark:bg-slate-700 text-foreground"
          value={data.status}
          onChange={(e) => update("status", e.target.value)}
          disabled={isSubmitting}
        >
          {" "}
          <option>Pending</option> <option>Confirmed</option>{" "}
          <option>In Progress</option> <option>Completed</option>{" "}
          <option>Cancelled</option>{" "}
        </select>{" "}
      </div>{" "}
      {/* Info about critical changes */}{" "}
      {criticalChanges.length > 0 && (
        <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-200">
          {" "}
          <strong>⚠️ Critical Changes:</strong> Changes to{""}{" "}
          {criticalChanges.join(",")} will require approval from EC.{" "}
        </div>
      )}{" "}
      {/* Error message */}{" "}
      {errorMessage && submitStatus === "error" && (
        <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-xs text-red-800 dark:text-red-200">
          {" "}
          {errorMessage}{" "}
        </div>
      )}{" "}
      {/* Submit button */}{" "}
      <div className="flex gap-2">
        {" "}
        <button
          className="flex-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={handleSubmit}
          disabled={isSubmitting || !hasChanges}
        >
          {" "}
          {isSubmitting ? "Submitting..." : "Submit Changes"}{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
}
