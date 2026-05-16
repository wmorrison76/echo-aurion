/**
 * Approval Queue Component
 * Displays pending recipe change approvals for chefs
 */

import React, { useState, useEffect, useCallback } from "react";
import { useOutlet } from "@/context/OutletContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { PermissionGuard, RestrictedContent } from "@/components/PermissionGuard";
import { ApprovalDialog } from "@/components/ApprovalDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPendingApprovalsForOutlet,
  getApprovalStats,
  type ApprovalRequest,
} from "@/lib/approval-workflow";

interface ApprovalQueueProps {
  onApprovalStatusChange?: () => void;
}

export function ApprovalQueue({
  onApprovalStatusChange,
}: ApprovalQueueProps) {
  const { currentOutletId } = useOutlet();
  const { user } = useAuth();
  const permissions = usePermissions(currentOutletId || undefined);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadApprovals = useCallback(async () => {
    if (!currentOutletId) return;

    setIsLoading(true);
    try {
      const [approvalsData, statsData] = await Promise.all([
        getPendingApprovalsForOutlet(currentOutletId),
        getApprovalStats(currentOutletId),
      ]);

      setApprovals(approvalsData);
      setStats(statsData);
    } finally {
      setIsLoading(false);
    }
  }, [currentOutletId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleSelectApproval = useCallback((approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setIsDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedApproval(null), 200);
  }, []);

  const handleApprovalStatusChange = useCallback(() => {
    loadApprovals();
    onApprovalStatusChange?.();
  }, [loadApprovals, onApprovalStatusChange]);

  if (!permissions.canApproveGlobal()) {
    return (
      <RestrictedContent
        title="Approvals"
        message="You don't have permission to approve recipe changes."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recipe Change Approvals</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{stats.pending} Pending</Badge>
              <Badge variant="secondary">{stats.approved} Approved</Badge>
              <Badge variant="destructive">{stats.rejected} Rejected</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={loadApprovals}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            Refresh
          </Button>
        </CardContent>
      </Card>

      {isLoading && !approvals.length && (
        <div className="flex justify-center py-12">
          <p className="text-gray-600">Loading approvals...</p>
        </div>
      )}

      {!isLoading && approvals.length === 0 && (
        <Card>
          <CardContent className="flex justify-center py-12">
            <p className="text-gray-600">No pending approvals</p>
          </CardContent>
        </Card>
      )}

      {approvals.length > 0 && (
        <div className="grid gap-4">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onSelect={handleSelectApproval}
            />
          ))}
        </div>
      )}

      <ApprovalDialog
        request={selectedApproval}
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onApprovalStatusChange={handleApprovalStatusChange}
      />
    </div>
  );
}

/**
 * Approval Card Component
 */
interface ApprovalCardProps {
  approval: ApprovalRequest;
  onSelect: (approval: ApprovalRequest) => void;
}

function ApprovalCard({ approval, onSelect }: ApprovalCardProps) {
  const changeCount = Object.values(approval.changes).filter(
    (v) => v !== undefined && v !== null && v !== ""
  ).length;

  return (
    <Card
      className="cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => onSelect(approval)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900">
                Recipe ID: {approval.recipeId.substring(0, 8)}...
              </h4>
              <Badge variant="outline">
                {approval.sourceOutletId} → {approval.targetOutletId}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Requested By</p>
                <p className="font-medium text-gray-900">
                  {approval.requestedByUsername}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Requested At</p>
                <p className="font-medium text-gray-900">
                  {new Date(approval.requestedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Changes</p>
                <p className="font-medium text-gray-900">{changeCount} items</p>
              </div>
            </div>

            {approval.comments && approval.comments.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-600 mb-1">
                  {approval.comments.length} comment
                  {approval.comments.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <StatusBadgeDetailed status={approval.status} />
            <Button size="sm" onClick={(e) => {
              e.stopPropagation();
              onSelect(approval);
            }}>
              Review
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Status Badge with Color
 */
import { ApprovalStatus } from "@/lib/approval-workflow";

function StatusBadgeDetailed({ status }: { status: ApprovalStatus }) {
  const statusConfig = {
    [ApprovalStatus.PENDING]: { variant: "outline" as const, label: "Pending", color: "text-yellow-600" },
    [ApprovalStatus.APPROVED]: { variant: "default" as const, label: "Approved", color: "text-green-600" },
    [ApprovalStatus.REJECTED]: { variant: "destructive" as const, label: "Rejected", color: "text-red-600" },
    [ApprovalStatus.DRAFT]: { variant: "secondary" as const, label: "Draft", color: "text-gray-600" },
  };

  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={config.color}>
      {config.label}
    </Badge>
  );
}

/**
 * Approval Stats Widget
 */
interface ApprovalStatsWidgetProps {
  outletId: string;
}

export function ApprovalStatsWidget({ outletId }: ApprovalStatsWidgetProps) {
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const data = await getApprovalStats(outletId);
      setStats(data);
      setIsLoading(false);
    };

    loadStats();
  }, [outletId]);

  if (isLoading) {
    return <div className="text-sm text-gray-600">Loading...</div>;
  }

  return (
    <div className="flex gap-3">
      <div className="text-center">
        <p className="text-xs text-gray-600">Pending</p>
        <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-600">Approved</p>
        <p className="text-lg font-bold text-green-600">{stats.approved}</p>
      </div>
      <div className="text-center">
        <p className="text-xs text-gray-600">Rejected</p>
        <p className="text-lg font-bold text-red-600">{stats.rejected}</p>
      </div>
    </div>
  );
}
