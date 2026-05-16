import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import { fetchWithLucccaSession } from "../../auth";
interface Approver {
  id: string;
  name: string;
  role: string;
  email: string;
}
interface ApprovalDelegationPanelProps {
  approvalId: string;
  currentApprover: string;
  currentApproverRole: string;
  entityId: string;
}
export function ApprovalDelegationPanel({
  approvalId,
  currentApprover,
  currentApproverRole,
  entityId,
}: ApprovalDelegationPanelProps) {
  const [availableApprovers, setAvailableApprovers] = useState<Approver[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string>("");
  const [delegationReason, setDelegationReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  useEffect(() => {
    fetchAvailableApprovers();
  }, [entityId]);
  const fetchAvailableApprovers = async () => {
    setLoading(true);
    try {
      const response = await fetchWithLucccaSession(
        `/api/aurum/approvers?entityId=${entityId}&role=${currentApproverRole}`,
      );
      if (response.ok) {
        const data: Approver[] = await response.json();
        setAvailableApprovers(data.filter((a) => a.id !== currentApprover));
      }
    } catch (err) {
      console.error("Failed to fetch approvers:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleDelegate = async () => {
    if (!selectedApprover || !delegationReason.trim()) {
      return;
    }
    setDelegating(true);
    try {
      const response = await fetchWithLucccaSession(
        `/api/aurum/approvals/${approvalId}/delegate`,
        {
          method: "POST",
          body: JSON.stringify({
            toApproverId: selectedApprover,
            reason: delegationReason,
            entityId,
          }),
        },
      );
      if (response.ok) {
        setSuccess("Approval delegated successfully");
        setSelectedApprover("");
        setDelegationReason("");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error("Failed to delegate:", err);
    } finally {
      setDelegating(false);
    }
  };
  const selectedApproverData = availableApprovers.find(
    (a) => a.id === selectedApprover,
  );
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>Delegate Approval</CardTitle>{" "}
        <p className="text-xs text-muted-foreground mt-2">
          {" "}
          Current Approver:{""}{" "}
          <span className="font-medium">{currentApprover}</span>{" "}
        </p>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {success && (
          <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg text-sm">
            {" "}
            {success}{" "}
          </div>
        )}{" "}
        {loading ? (
          <div className="text-muted-foreground text-sm">
            {" "}
            Loading approvers...{" "}
          </div>
        ) : availableApprovers.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            {" "}
            No available approvers with the same role{" "}
          </div>
        ) : (
          <div className="space-y-4">
            {" "}
            {/* From Approver */}{" "}
            <div className="bg-muted/30 p-3 rounded-lg">
              {" "}
              <p className="text-xs text-muted-foreground mb-1">
                {" "}
                From Approver{" "}
              </p>{" "}
              <p className="font-medium">{currentApprover}</p>{" "}
            </div>{" "}
            {/* Arrow */}{" "}
            <div className="flex justify-center">
              {" "}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />{" "}
            </div>{" "}
            {/* To Approver Selector */}{" "}
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium">To Approver</label>{" "}
              <Select
                value={selectedApprover}
                onValueChange={setSelectedApprover}
              >
                {" "}
                <SelectTrigger>
                  {" "}
                  <SelectValue placeholder="Select an approver..." />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  {availableApprovers.map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      {" "}
                      <div className="flex items-center gap-2">
                        {" "}
                        <span>{approver.name}</span>{" "}
                        <Badge variant="outline" className="text-xs">
                          {" "}
                          {approver.role}{" "}
                        </Badge>{" "}
                      </div>{" "}
                    </SelectItem>
                  ))}{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
            {/* Selected Approver Details */}{" "}
            {selectedApproverData && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                {" "}
                <p className="text-xs text-muted-foreground mb-1">
                  {" "}
                  Selected Approver Details{" "}
                </p>{" "}
                <p className="text-sm font-medium">
                  {" "}
                  {selectedApproverData.name}{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground">
                  {" "}
                  {selectedApproverData.email}{" "}
                </p>{" "}
                <Badge variant="outline" className="mt-2">
                  {" "}
                  {selectedApproverData.role}{" "}
                </Badge>{" "}
              </div>
            )}{" "}
            {/* Delegation Reason */}{" "}
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium">
                {" "}
                Reason for Delegation{" "}
              </label>{" "}
              <Textarea
                placeholder="Explain why you're delegating this approval..."
                value={delegationReason}
                onChange={(e) => setDelegationReason(e.target.value)}
                className="min-h-20 resize-none"
              />{" "}
              <p className="text-xs text-muted-foreground">
                {" "}
                This reason will be visible to the delegated approver{" "}
              </p>{" "}
            </div>{" "}
            {/* Action Buttons */}{" "}
            <div className="flex gap-2 pt-2">
              {" "}
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedApprover("");
                  setDelegationReason("");
                }}
                disabled={delegating}
                className="flex-1"
              >
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button
                onClick={handleDelegate}
                disabled={
                  !selectedApprover || !delegationReason.trim() || delegating
                }
                className="flex-1"
              >
                {" "}
                {delegating ? "Delegating..." : "Delegate Approval"}{" "}
              </Button>{" "}
            </div>{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
