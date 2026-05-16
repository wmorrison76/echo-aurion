import React, { useMemo, useState } from "react";
import { useMaestro } from "@/contexts/MaestroContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCheckPermission } from "@/lib/maestro-hooks";
import {
  calculateCascadeEffects,
  describeCascades,
} from "@/lib/maestro-cascades";
import type { ChangelogEntry } from "@shared/types/maestro";
interface ApprovalWorkflowPanelProps {
  eventId: string;
}
export const ApprovalWorkflowPanel: React.FC<ApprovalWorkflowPanelProps> = ({
  eventId,
}) => {
  const { currentEvent, applyChange, rejectChange, isLoading } = useMaestro();
  const { user } = useAuth();
  const canApprove = useCheckPermission("approve");
  const [selectedChange, setSelectedChange] = useState<ChangelogEntry | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const pendingChanges = useMemo(() => {
    return (currentEvent?.changelog ?? []).filter(
      (c) => c.status === "pending",
    );
  }, [currentEvent?.changelog]);
  const cascadeEffects = useMemo(() => {
    if (!selectedChange || !currentEvent) return [];
    return calculateCascadeEffects(selectedChange, currentEvent);
  }, [selectedChange, currentEvent]);
  const handleApprove = async (changeId: string) => {
    try {
      await applyChange(changeId);
      setSelectedChange(null);
    } catch (err) {
      console.error("[APPROVAL] Error approving change:", err);
    }
  };
  const handleReject = async (changeId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    try {
      await rejectChange(changeId, rejectionReason);
      setSelectedChange(null);
      setRejectionReason("");
    } catch (err) {
      console.error("[APPROVAL] Error rejecting change:", err);
    }
  };
  if (!canApprove) {
    return (
      <div className="p-4 text-center text-slate-400">
        {" "}
        <p className="text-sm">
          You don't have permission to approve changes.
        </p>{" "}
        <p className="text-xs mt-2">
          {" "}
          Only Executive Chefs and Admins can approve changes.{" "}
        </p>{" "}
      </div>
    );
  }
  return (
    <div>
      {" "}
      <h3 className="text-lg font-semibold text-white mb-4">
        {" "}
        Pending Approvals{" "}
      </h3>{" "}
      {pendingChanges.length === 0 ? (
        <div className="bg-slate-700 rounded p-4 text-center text-slate-400">
          {" "}
          <p className="text-sm">No pending changes</p>{" "}
        </div>
      ) : (
        <div className="space-y-3">
          {" "}
          {/* Pending Changes List */}{" "}
          {!selectedChange && (
            <div className="space-y-2">
              {" "}
              {pendingChanges.map((change) => (
                <button
                  key={change.id}
                  onClick={() => setSelectedChange(change)}
                  className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded p-3 transition-colors"
                >
                  {" "}
                  <div className="flex items-start justify-between mb-1">
                    {" "}
                    <span className="font-medium text-white text-sm">
                      {" "}
                      {change.field}{" "}
                    </span>{" "}
                    <span className="text-xs text-slate-400">
                      {" "}
                      {change.affectedSystems.length} systems affected{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="text-xs text-slate-400">
                    {" "}
                    <span className="font-mono">
                      {" "}
                      {String(change.oldValue)} → {String(change.newValue)}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="text-xs text-muted-foreground mt-1">
                    {" "}
                    By {change.userName || "System"}{" "}
                  </div>{" "}
                </button>
              ))}{" "}
            </div>
          )}{" "}
          {/* Change Details & Cascades */}{" "}
          {selectedChange && (
            <div className="bg-slate-800 border border-border rounded p-4">
              {" "}
              {/* Header */}{" "}
              <div className="flex items-center justify-between mb-4">
                {" "}
                <h4 className="text-white font-semibold">Review Change</h4>{" "}
                <button
                  onClick={() => setSelectedChange(null)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  {" "}
                  ✕{" "}
                </button>{" "}
              </div>{" "}
              {/* Change Details */}{" "}
              <div className="bg-slate-700 rounded p-3 mb-4">
                {" "}
                <div className="text-sm mb-3">
                  {" "}
                  <div className="text-slate-400 mb-1">Field Changed</div>{" "}
                  <div className="text-white font-medium">
                    {" "}
                    {selectedChange.field}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {" "}
                  <div>
                    {" "}
                    <div className="text-xs text-slate-400 mb-1">
                      Previous
                    </div>{" "}
                    <div className="text-sm text-red-300 font-mono">
                      {" "}
                      {String(selectedChange.oldValue)}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <div className="text-xs text-slate-400 mb-1">
                      New Value
                    </div>{" "}
                    <div className="text-sm text-green-300 font-mono">
                      {" "}
                      {String(selectedChange.newValue)}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <div className="text-xs text-slate-400 mb-1">Source</div>{" "}
                  <div className="text-white text-sm">
                    {" "}
                    {selectedChange.source} by{""}{" "}
                    {selectedChange.userName || "System"}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {/* Cascade Effects */}{" "}
              {cascadeEffects.length > 0 && (
                <div className="mb-4">
                  {" "}
                  <h5 className="text-sm font-semibold text-slate-300 mb-2">
                    {" "}
                    Cascading Updates{" "}
                  </h5>{" "}
                  <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3 text-xs text-primary whitespace-pre-wrap">
                    {" "}
                    {describeCascades(cascadeEffects)}{" "}
                  </div>{" "}
                </div>
              )}{" "}
              {/* Rejection Reason Input */}{" "}
              <div className="mb-4">
                {" "}
                <label className="text-xs text-slate-400 mb-2 block">
                  {" "}
                  Rejection Reason (optional){" "}
                </label>{" "}
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide a reason if you reject this change..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                  rows={2}
                />{" "}
              </div>{" "}
              {/* Action Buttons */}{" "}
              <div className="flex gap-2">
                {" "}
                <button
                  onClick={() => handleApprove(selectedChange.id)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors"
                >
                  {" "}
                  {isLoading ? "Processing..." : "Approve"}{" "}
                </button>{" "}
                <button
                  onClick={() => handleReject(selectedChange.id)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors"
                >
                  {" "}
                  {isLoading ? "Processing..." : "Reject"}{" "}
                </button>{" "}
              </div>{" "}
              {/* Status Badge */}{" "}
              {cascadeEffects.some((e) => e.requiresApproval) && (
                <div className="mt-4 p-2 bg-yellow-900 border border-yellow-700 rounded text-xs text-yellow-200">
                  {" "}
                  ⚠️ This change will trigger high-impact cascading updates and
                  requires careful review.{" "}
                </div>
              )}{" "}
            </div>
          )}{" "}
          {/* Summary */}{" "}
          <div className="text-xs text-slate-400 mt-4 p-2 bg-slate-800 rounded">
            {" "}
            <strong>{pendingChanges.length}</strong> change{" "}
            {pendingChanges.length !== 1 ? "s" : ""} awaiting approval{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
};
