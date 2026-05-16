import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, ChevronUp, Loader2 } from "lucide-react";
import { useApprovalWorkflows } from "../hooks/useApprovalWorkflows";
interface EscalatedApproval {
  id: string;
  transactionId: string;
  approverName?: string;
  amount: number;
  escalationLevel: number;
  createdAt: string;
  hoursWaiting: number;
  accountCode?: string;
}
interface ApprovalEscalationPanelProps {
  entityId?: string;
}
export function ApprovalEscalationPanel({
  entityId,
}: ApprovalEscalationPanelProps) {
  const { getApprovalQueue } = useApprovalWorkflows();
  const [escalations, setEscalations] = useState<EscalatedApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 30000);
    return () => clearInterval(interval);
  }, [entityId]);
  const fetchEscalations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApprovalQueue(undefined, "escalated");
      if (data?.approvals) {
        const escalatedItems: EscalatedApproval[] = data.approvals.map(
          (approval: any) => ({
            id: approval.id,
            transactionId: approval.transactionId,
            approverName: approval.approver_role || "Pending",
            amount: approval.transactionDetails?.amount || 0,
            escalationLevel: approval.escalation_level || 1,
            createdAt: approval.createdAt,
            hoursWaiting: Math.floor(
              (new Date().getTime() - new Date(approval.createdAt).getTime()) /
                (1000 * 60 * 60),
            ),
            accountCode: approval.transactionDetails?.accountCode || "N/A",
          }),
        );
        setEscalations(escalatedItems);
      } else {
        setEscalations([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };
  const getEscalationColor = (level: number) => {
    if (level === 1) return "bg-yellow-100 text-yellow-800";
    if (level === 2) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Approval
            Escalations{" "}
          </CardTitle>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <Badge variant="secondary">{escalations.length} pending</Badge>{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchEscalations}
              disabled={loading}
            >
              {" "}
              <Loader2
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {loading && (
          <div className="flex items-center justify-center py-8">
            {" "}
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />{" "}
            <span className="ml-2 text-muted-foreground">
              {" "}
              Loading escalations...{" "}
            </span>{" "}
          </div>
        )}{" "}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            {" "}
            <p className="text-sm text-red-800">Error: {error}</p>{" "}
          </div>
        )}{" "}
        {!loading && escalations.length === 0 && (
          <div className="text-center py-8">
            {" "}
            <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />{" "}
            <p className="text-muted-foreground">
              {" "}
              No escalated approvals at this time{" "}
            </p>{" "}
          </div>
        )}{" "}
        {!loading && escalations.length > 0 && (
          <div className="space-y-3">
            {" "}
            {escalations.map((escalation) => (
              <div
                key={escalation.id}
                className={`p-4 rounded-lg border-l-4 ${getEscalationColor(escalation.escalationLevel)}`}
              >
                {" "}
                <div className="flex items-start justify-between mb-3">
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <div className="flex items-center gap-2 mb-1">
                      {" "}
                      {escalation.accountCode && (
                        <code className="text-xs bg-black/10 px-2 py-1 rounded">
                          {" "}
                          {escalation.accountCode}{" "}
                        </code>
                      )}{" "}
                      <span className="text-sm font-semibold">
                        {" "}
                        ${" "}
                        {escalation.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}{" "}
                      </span>{" "}
                    </div>{" "}
                    {escalation.approverName && (
                      <p className="text-sm text-muted-foreground">
                        {" "}
                        Role: {escalation.approverName}{" "}
                      </p>
                    )}{" "}
                  </div>{" "}
                  <Badge
                    className={getEscalationColor(escalation.escalationLevel)}
                  >
                    {" "}
                    Level {escalation.escalationLevel}{" "}
                  </Badge>{" "}
                </div>{" "}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  {" "}
                  <div className="flex items-center gap-1">
                    {" "}
                    <Clock className="h-3 w-3" />{" "}
                    {escalation.hoursWaiting.toFixed(0)} hours waiting{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex gap-2">
                  {" "}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={escalation.escalationLevel >= 3}
                  >
                    {" "}
                    <ChevronUp className="h-3 w-3 mr-1" /> Escalate Further{" "}
                  </Button>{" "}
                  <Button variant="ghost" size="sm">
                    {" "}
                    View Details{" "}
                  </Button>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
